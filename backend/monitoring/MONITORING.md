# Monitoring Setup - Complete Guide

## Overview

This guide covers the complete monitoring stack for the backend microservices using Prometheus, Grafana, and Alertmanager.

## Architecture

```
Microservices (/metrics)
         ↓
    Prometheus (scrapes every 15s)
         ↓
    Grafana (visualizes)
         ↓
    Dashboards
         ↓
    Alertmanager (notifications)
```

## Quick Start

### 1. Start the Monitoring Stack

From the `backend` directory:

```bash
# Start main services first
docker-compose up -d

# Then start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d
```

Wait for ~30 seconds for all services to be healthy:

```bash
docker-compose -f docker-compose.monitoring.yml ps
```

All services should show "healthy" status.

### 2. Access the Tools

- **Prometheus**: `http://localhost:9090`
  - Go to `Status > Targets` to verify all 5 services are scraping
  - Go to `Alerts` to check alert rules

- **Grafana**: `http://localhost:3005`
  - Login with `admin` / `admin`
  - Dashboard "System Overview" should load automatically
  - Datasource "Prometheus" should be pre-configured

## Key Metrics by Service

### Common HTTP Metrics (all services)

```
http_requests_total{method, route, status_code} - Counter
http_request_duration_seconds{method, route, status_code} - Histogram (buckets: 0.1s, 0.5s, 1s, 1.5s, 2s, 5s)
```

### Transaction Service

```
transactions_created_total{type}
transactions_updated_total{type}
transactions_deleted_total{type}
transactions_read_total
transaction_query_duration_seconds{method} - Histogram
```

### OCR Service

```
ocr_requests_total
ocr_success_total
ocr_failures_total
ocr_timeout_total
ocr_engine_errors_total
ocr_processing_duration_seconds - Histogram (buckets: 0.5s, 1s, 5s, 10s, 15s, 30s, 60s)
ocr_preprocessing_duration_seconds - Histogram (buckets: 0.1s, 0.2s, 0.5s, 1s, 2s, 5s)
```

### Budget Notification Service

```
budget_notification_service_budgets_created_total
budget_notification_service_notifications_created_total{type}
budget_notification_service_budget_threshold_reached_total{threshold}
budget_notification_service_budget_exceeded_total
```

### Identity Service

```
identity_service_users_created_total
(Additional metrics can be defined)
```

## Alert Rules

Located in `alert-rules.yml`. Current alerts:

| Alert                       | Condition               | Severity | Action                       |
| --------------------------- | ----------------------- | -------- | ---------------------------- |
| ServiceDown                 | `up == 0` for 1m        | Critical | Notify ops + page on-call    |
| HighErrorRate               | 5xx errors > 5% for 5m  | Warning  | Notify team                  |
| HighLatency                 | p95 latency > 2s for 5m | Warning  | Investigate performance      |
| OCRHighFailureRate          | Failures > 10% for 5m   | Warning  | Check OCR service logs       |
| OCRTimeouts                 | >5 timeouts in 5m       | Warning  | Investigate hanging requests |
| TransactionQueryLatencyHigh | p95 query latency > 1s  | Warning  | Check database performance   |
| HighUserCreationRate        | >10 users/min           | Warning  | Check for spam/attack        |

### Alert Notifications

Alerts can be sent to:

- Slack (configure `SLACK_WEBHOOK_URL`)
- Email
- PagerDuty
- Custom webhooks

To enable Slack notifications:

1. Create a Slack app and get webhook URL
2. Add to `.env`:
   ```
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```
3. Restart alertmanager

## Dashboard Panels

### System Overview Dashboard Includes:

1. **Services Status** - Shows up/down status of all services
2. **Total HTTP Requests** - Request rate (req/sec) over time
3. **HTTP Request Errors** - 4xx and 5xx error rates
4. **Request Latency p95** - 95th percentile response time
5. **Transaction Operations** - Created/updated/deleted counts (1h)
6. **OCR Processing** - Success/failure/timeout counts (1h)
7. **Budget Notifications** - Notification counts by type (1h)
8. **OCR Processing Duration** - p95 latencies for processing pipeline
9. **Transaction Query Latency** - Database query performance by method
10. **Budget Threshold Alerts** - Budget threshold breaches by threshold level

## Verification & Smoke Tests

### Verify Prometheus Scraping

```bash
# Check targets
curl http://localhost:9090/api/v1/targets

# Query a metric
curl 'http://localhost:9090/api/v1/query?query=up'
```

Expected response should show all 5 services with `value: [<timestamp>, "1"]` (1 = up).

### Verify Grafana Datasource

1. Go to `http://localhost:3005/api/datasources`
2. Should see Prometheus datasource with status `ok`

### Generate Test Traffic

```bash
# From another terminal, call an endpoint to generate metrics
for i in {1..10}; do
  curl http://localhost:3000/api/v1/transactions
  sleep 1
done
```

Then check in Grafana:

- "Total HTTP Requests" panel should show activity
- "Request Latency p95" should have data points

### Test Alert Firing

Create a temporary alert by stopping a service:

```bash
docker-compose pause transaction-service
# Wait 70 seconds
# Check Prometheus Alerts tab - should show "ServiceDown" alert
# Check Grafana - "Services Status" should show "Down" for transaction-service
docker-compose unpause transaction-service
```

## Troubleshooting

### Prometheus Not Scraping Targets

Check:

1. Service network: `docker network inspect backend_app-network`
2. Prometheus logs: `docker-compose -f docker-compose.monitoring.yml logs prometheus`
3. Verify service is exposing `/metrics`: `curl http://localhost:3000/metrics` (from inside container)

### Grafana Dashboard Empty

1. Verify Prometheus has data: `http://localhost:9090/api/v1/query?query=http_requests_total`
2. Check dashboard queries in edit mode
3. Verify time range selection (try "Last 1 hour")

### Alerts Not Working

1. Check alert rules: `http://localhost:9090/api/v1/rules`
2. Verify alertmanager is running: `docker-compose -f docker-compose.monitoring.yml ps`
3. Check alertmanager config: `cat alertmanager.yml`
4. View alert status: Go to Grafana > Alerting > Alert Rules

## Data Retention

- **Prometheus**: 7 days (configured in docker-compose.monitoring.yml)
- **Grafana**: Permanent (stored in grafana_data volume)

To backup:

```bash
docker run --rm -v grafana_data:/data -v $(pwd):/backup alpine tar -czf /backup/grafana-backup.tar.gz -C /data .
```

## Performance Tuning

For production:

1. **Increase Prometheus retention**: Modify `--storage.tsdb.retention.time` in docker-compose.monitoring.yml
2. **Adjust scrape interval**: Change `scrape_interval` in prometheus.yml (lower = more data)
3. **Add persistent volumes**: Already configured with `prometheus_data` and `grafana_data`
4. **Adjust evaluation interval**: Change `evaluation_interval` in prometheus.yml for faster alert evaluation

## Adding Custom Metrics

To add new metrics in a service:

```typescript
// In metrics/app.metrics.ts
export const customCounter = new Counter({
  name: "custom_events_total",
  help: "Description",
  labelNames: ["label_name"],
});

// In service code
customCounter.labels("label_value").inc();
```

Then:

1. Add metric to dashboard queries
2. Add alert rules if needed
3. Document in this file

## Best Practices

1. ✅ Always export metrics with descriptive names
2. ✅ Use consistent label structures across services
3. ✅ Add histogram buckets that match your SLOs
4. ✅ Create alerts for actionable events only
5. ✅ Document all custom metrics
6. ✅ Review dashboards weekly for insight
7. ✅ Test alerting path monthly

## References

- [Prometheus Docs](https://prometheus.io/docs)
- [Grafana Dashboards](https://grafana.com/docs)
- [prom-client (Node.js)](https://github.com/prom-client/prom-client)
- [SRE Book - Monitoring](https://sre.google/books/)
