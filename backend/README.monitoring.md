# Backend Microservices Monitoring

This directory contains the configuration for a monitoring setup using Prometheus, Grafana, and Alertmanager.

## Quick Links

- **Complete Guide**: See [MONITORING.md](./MONITORING.md) for detailed setup, troubleshooting, and metrics reference
- **Alert Rules**: [alert-rules.yml](./alert-rules.yml)
- **Prometheus Config**: [prometheus.yml](./prometheus.yml)
- **Smoke Test**: `./test-monitoring.sh`

## Overview

The monitoring stack provides:

- **Prometheus**: Collects metrics from all backend services every 15 seconds
- **Grafana**: Visualizes metrics with pre-built dashboards
- **Alertmanager**: Routes alerts to Slack, email, or other channels
- **Alert Rules**: Automated detection of service issues (down, high error rate, latency)

## Components

- **Prometheus**: Scrapes metrics from all backend services.
- **Grafana**: Visualizes the metrics collected by Prometheus with pre-configured dashboards.
- **Alertmanager**: Sends notifications when alerts are triggered.

## Architecture

```
Microservices (expose /metrics)
    ↓
Prometheus (scrapes every 15s)
    ↓
Time-Series Database (/prometheus_data volume)
    ↓
Grafana (visualizes)
    ↓
Alertmanager (routes alerts)
```

## How to Run

The main services must be running first (they expose the `/metrics` endpoint).

### 1. Start the Main Backend Services

```bash
cd backend
docker-compose up -d
```

Wait for all services to be healthy:

```bash
docker-compose ps
```

### 2. Start the Monitoring Stack

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

Wait for monitoring services to be healthy:

```bash
docker-compose -f docker-compose.monitoring.yml ps
```

### 3. Run Smoke Tests (Optional)

```bash
chmod +x test-monitoring.sh
./test-monitoring.sh
```

## Accessing the Tools

### Prometheus

URL: [http://localhost:9090](http://localhost:9090)

**Key Pages:**

- **Targets** (`Status > Targets`): Verify that all 5 services are scraping successfully
- **Alerts** (`Alerts`): View alert rules and their current status
- **Graph** (`Graph`): Query metrics manually using PromQL
- **Query Examples:**
  ```
  up                                    # Service status
  http_requests_total                   # Total requests
  histogram_quantile(0.95, http_request_duration_seconds) # p95 latency
  ```

### Grafana

URL: [http://localhost:3005](http://localhost:3005)

**Credentials:**

- **Login**: `admin`
- **Password**: `admin`

**Default Dashboard:** "System Overview" is automatically loaded on first visit

- **Dashboards** → **System Overview** shows all key metrics
- **Data Sources** → **Prometheus** is pre-configured

### Alertmanager (if enabled)

URL: [http://localhost:9093](http://localhost:9093) _(requires enablement in docker-compose.monitoring.yml)_

## Metrics Exposed

All services expose metrics on `/metrics` endpoint:

### Common Metrics (All Services)

- `http_requests_total{method, route, status_code}` — HTTP request counter
- `http_request_duration_seconds{method, route, status_code}` — Request latency histogram

### Service-Specific Metrics

See [MONITORING.md](./MONITORING.md) for the complete metrics reference, including:

- Transaction Service: transaction counts, query latency
- OCR Service: request counts, success/failure rates, processing duration
- Budget Notification Service: notification counts, budget alerts
- Identity Service: user creation metrics

## Alert Rules

Configured in [alert-rules.yml](./alert-rules.yml):

| Alert                           | Trigger                        | Severity |
| ------------------------------- | ------------------------------ | -------- |
| **ServiceDown**                 | Service unavailable for >1 min | Critical |
| **HighErrorRate**               | 5xx errors > 5% for 5 min      | Warning  |
| **HighLatency**                 | p95 latency > 2s for 5 min     | Warning  |
| **OCRHighFailureRate**          | Failures > 10% for 5 min       | Warning  |
| **OCRTimeouts**                 | >5 timeouts in 5 min           | Warning  |
| **TransactionQueryLatencyHigh** | DB query p95 > 1s              | Warning  |
| **HighUserCreationRate**        | >10 users/min (spam detection) | Warning  |

To configure Slack notifications, set `SLACK_WEBHOOK_URL` environment variable.

## Dashboard

The **System Overview** dashboard displays:

- **Services Status**: Up/Down indicator for each service
- **Total HTTP Requests**: Request rate (req/sec) across all services
- **HTTP Request Errors**: 4xx and 5xx error rates
- **Request Latency p95**: 95th percentile response time
- **Transaction Operations**: Created/Updated/Deleted counts (1-hour window)
- **OCR Processing**: Success/Failure/Timeout counts (1-hour window)
- **Budget Notifications**: Notification counts by type (1-hour window)
- **OCR Processing Duration**: p95 latencies for processing steps
- **Transaction Query Latency**: Database query performance
- **Budget Threshold Alerts**: Threshold breach rates

## File Structure

```
backend/
├── docker-compose.monitoring.yml  # Docker Compose for monitoring stack
├── prometheus.yml                  # Prometheus configuration (scrape targets, evaluations)
├── alert-rules.yml                 # Prometheus alert rules
├── alertmanager.yml                # Alertmanager configuration (notification routing)
├── MONITORING.md                   # Complete monitoring guide
├── test-monitoring.sh              # Smoke test script
├── README.monitoring.md            # This file
└── monitoring/
    ├── prometheus.yml              # (old, use backend/prometheus.yml instead)
    └── grafana/
        ├── provisioning/
        │   ├── dashboards/
        │   │   └── default.yml      # Grafana dashboard provider configuration
        │   └── datasources/
        │       └── prometheus.yml   # Grafana Prometheus datasource configuration
        └── dashboards/
            └── system-overview.json # The System Overview dashboard definition
```

## Troubleshooting

### Prometheus Not Scraping

1. Check service connectivity from Prometheus container:

   ```bash
   docker-compose -f docker-compose.monitoring.yml logs prometheus | grep -i "target"
   ```

2. Verify services are exposing metrics:
   ```bash
   docker-compose exec api-gateway wget -O- http://localhost:3000/metrics
   ```

### Dashboard Empty

1. Ensure time range is not too narrow (try "Last 1 hour")
2. Check Prometheus has data: [http://localhost:9090/api/v1/query?query=http_requests_total](http://localhost:9090/api/v1/query?query=http_requests_total)
3. Verify Grafana datasource: [http://localhost:3005/api/datasources](http://localhost:3005/api/datasources)

### Alerts Not Firing

1. Query the alert: `http://localhost:9090/api/v1/rules`
2. Manually trigger a condition (e.g., `docker-compose pause transaction-service`)
3. Wait 1-2 minutes for evaluation
4. Check Prometheus Alerts tab

For more troubleshooting, see [MONITORING.md](./MONITORING.md).

## Data Retention

- **Prometheus**: 7 days (configurable via `--storage.tsdb.retention.time`)
- **Grafana**: Permanent (stored in `grafana_data` volume)

## Performance Tips

For production environments:

1. Increase Prometheus `--storage.tsdb.retention.time` to match SLA requirements
2. Adjust `scrape_interval` in prometheus.yml if you need finer granularity
3. Use persistent volumes (already configured)
4. Monitor Prometheus resource usage and adjust memory limits

## Best Practices

✅ **Do:**

- Export metrics with clear, descriptive names
- Use consistent label structures
- Document custom metrics
- Test alerting paths regularly
- Review dashboards for insights

❌ **Don't:**

- Export too many metrics (impacts cardinality)
- Create alerts on metrics that don't have clear remediation
- Ignore alert fatigue (tune thresholds)
- Skip monitoring setup

## Next Steps

1. **Verify Setup**: Run `./test-monitoring.sh`
2. **Review Metrics**: Check Prometheus UI for data collection
3. **Configure Alerts**: Set up Slack webhook in `.env` file
4. **Add Custom Metrics**: Follow patterns in service metrics files
5. **Set Up Backup**: Back up Grafana dashboards regularly

---

For detailed information on metrics, alerts, troubleshooting, and integration guides, see [MONITORING.md](./MONITORING.md).
