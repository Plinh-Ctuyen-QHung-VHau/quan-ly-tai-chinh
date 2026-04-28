# 📊 Monitoring System Inventory

**Ngày cập nhật:** 29/04/2026  
**Trạng thái:** Active & Running  
**Scope:** Toàn bộ Backend Microservices

---

## 📑 Mục Lục

1. [Tổng Quan Hệ Thống](#tổng-quan-hệ-thống)
2. [Metrics Được Collect](#metrics-được-collect)
3. [Alert Rules Chi Tiết](#alert-rules-chi-tiết)
4. [Dashboard Panels](#dashboard-panels)
5. [Các Dịch Vụ Monitoring](#các-dịch-vụ-monitoring)
6. [Cách Truy Cập & Sử Dụng](#cách-truy-cập--sử-dụng)
7. [Troubleshooting](#troubleshooting)

---

## 🏗️ Tổng Quan Hệ Thống

### Kiến Trúc Monitoring

```
┌────────────────────────────────────────────────────────────┐
│                    MICROSERVICES LAYER                      │
│  • API Gateway (port 3000)                                  │
│  • Identity Service (port 3000)                             │
│  • Transaction Service (port 3000)                          │
│  • OCR Service (port 3000)                                  │
│  • Budget Notification Service (port 3000)                  │
│  └─> Mỗi service expose: /metrics endpoint                  │
└────────────────────────┬─────────────────────────────────────┘
                         │ (HTTP GET /metrics, mỗi 15 giây)
┌────────────────────────▼─────────────────────────────────────┐
│              PROMETHEUS (Time-Series DB)                     │
│  • URL: http://localhost:9090                               │
│  • Retention: 7 days                                        │
│  • Scrape interval: 15 seconds                              │
│  • Evaluation interval: 30 seconds                          │
│  ├─ Scrapes all /metrics endpoints                          │
│  ├─ Evaluates alert rules                                   │
│  └─ Stores time-series data (prometheus_data volume)        │
└────────────────────────┬─────────────────────────────────────┘
                         │ (PromQL queries)
         ┌───────────────┼───────────────┐
         │               │               │
┌────────▼──────┐ ┌─────▼──────┐ ┌──────▼────────┐
│   GRAFANA      │ │ ALERTS TAB │ │  EXPRESSION   │
│ (Dashboard)    │ │            │ │   Explorer    │
│ localhost:3005 │ └────────────┘ └───────────────┘
│ admin/admin    │
└────────┬───────┘
         │ (When alert fires)
┌────────▼────────────────────────────────────────────────────┐
│           ALERTMANAGER (Alert Routing)                      │
│  ├─ Evaluates: Which alert is firing?                       │
│  ├─ Groups: Similar alerts together                         │
│  ├─ Routes: By severity (critical → ops, warning → team)    │
│  └─ Notifies: Slack, Email, PagerDuty, Webhooks            │
└────────────────────────────────────────────────────────────┘
```

### Thành Phần Chính

| Thành Phần          | Vai Trò                 | Trạng Thái                  |
| ------------------- | ----------------------- | --------------------------- |
| **Prometheus**      | Collect & Store metrics | ✅ Active                   |
| **Grafana**         | Visualize & Dashboard   | ✅ Active                   |
| **Alertmanager**    | Route notifications     | ✅ Ready (cần config Slack) |
| **alert-rules.yml** | Define alerts           | ✅ 8 rules active           |
| **prometheus.yml**  | Scrape config           | ✅ 5 services               |

---

## 📊 Metrics Được Collect

### A. Metrics Chung (Từ Tất Cả Services)

Tất cả 5 services expose metrics này thông qua shared middleware:

```
┌─── HTTP REQUEST METRICS ──────────────────────────────────────┐
│                                                                │
│ 1. http_requests_total                          [Counter]    │
│    Labels: method, route, status_code                         │
│    Ý nghĩa: Tổng số HTTP requests                           │
│    Ví dụ: http_requests_total{method="GET",                │
│           route="/api/v1/transactions",                      │
│           status_code="200"}                                 │
│                                                                │
│ 2. http_request_duration_seconds                [Histogram]  │
│    Labels: method, route, status_code                         │
│    Buckets: 0.1s, 0.5s, 1s, 1.5s, 2s, 5s                    │
│    Ý nghĩa: Độ trễ của HTTP requests                         │
│    Lợi ích: Có thể tính p50, p95, p99 latency              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Cách Query:**

```prometheus
# Tổng request rate (requests/second)
rate(http_requests_total[5m])

# Error rate (5xx only)
rate(http_requests_total{status_code=~"5.."}[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Success rate (2xx/3xx)
rate(http_requests_total{status_code=~"[23].."}[5m]) / rate(http_requests_total[5m])
```

---

### B. Service-Specific Metrics

#### 🏛️ **API Gateway** (`api-gateway`)

```
Metrics: http_requests_total, http_request_duration_seconds
Role: Request routing, rate limiting, authentication
Key Insight: If this service is down, everything is down
```

---

#### 👤 **Identity Service** (`identity-service`)

```
Metrics:
├─ identity_service_users_created_total{provider}
│  └─ Tracks: new user signups (email, google, etc.)
│
├─ identity_service_users_deleted_total
│  └─ Tracks: user account deletions
│
├─ identity_service_auth_failures_total{reason}
│  └─ Tracks: failed login attempts (invalid_password, user_not_found, etc.)
│
└─ identity_service_password_reset_requests_total
   └─ Tracks: users requesting password reset

Common Queries:
  rate(identity_service_users_created_total[1h])    # Signup rate
  identity_service_auth_failures_total > 100        # Brute force detection
```

---

#### 💳 **Transaction Service** (`transaction-service`)

```
Metrics:
├─ transactions_created_total{type}
│  └─ Labels: type (income, expense, transfer)
│
├─ transactions_updated_total{type}
│  └─ User edits existing transactions
│
├─ transactions_deleted_total{type}
│  └─ User deletes transactions
│
├─ transactions_read_total
│  └─ Number of read/query operations
│
└─ transaction_query_duration_seconds{method}
   └─ Database query latency
   └─ Buckets: 0.005s, 0.01s, 0.025s, 0.05s, 0.1s, 0.25s, 0.5s, 1s, 2.5s, 5s

Useful Alerts:
  • Query latency p95 > 1s  → Database issue
  • No transactions created in 1h  → Possible bug
  • Delete rate unusual  → Data loss incident?
```

---

#### 🖼️ **OCR Service** (`ocr-service`)

```
Metrics:
├─ ocr_requests_total
│  └─ Total image processing requests received
│
├─ ocr_success_total
│  └─ Successfully processed images
│
├─ ocr_failures_total
│  └─ Failed processing (bad format, engine error, etc.)
│
├─ ocr_timeout_total
│  └─ Processing exceeded timeout (usually 30s)
│
├─ ocr_engine_errors_total
│  └─ Errors from OCR engine (Tesseract, AWS Rekognition, etc.)
│
├─ ocr_processing_duration_seconds
│  └─ End-to-end processing time
│  └─ Buckets: 0.5s, 1s, 5s, 10s, 15s, 30s, 60s
│
└─ ocr_preprocessing_duration_seconds
   └─ Image preprocessing (crop, rotate, enhance) time
   └─ Buckets: 0.1s, 0.2s, 0.5s, 1s, 2s, 5s

SLO Examples:
  • Success rate > 95%
  • p95 latency < 10s
  • Timeout rate < 2%

Alert Conditions:
  • Failure rate > 10% for 5min  → ⚠️ WARNING
  • Timeout count > 5 in 5min    → ⚠️ WARNING
```

---

#### 💰 **Budget Notification Service** (`budget-notification-service`)

```
Metrics:
├─ budget_notification_service_budgets_created_total
│  └─ New budget items created
│
├─ budget_notification_service_budgets_updated_total
│  └─ Budget modifications
│
├─ budget_notification_service_budgets_deleted_total
│  └─ Budget deletions
│
├─ budget_notification_service_budget_threshold_reached_total{threshold}
│  └─ Labels: threshold (50%, 75%, 90%, 100%)
│  └─ When user spending reaches alert level
│
├─ budget_notification_service_budget_exceeded_total
│  └─ User exceeded budget limit
│
├─ budget_notification_service_notifications_created_total{type}
│  └─ Labels: type (threshold_alert, exceeded_alert, etc.)
│
└─ budget_notification_service_notifications_read_total
   └─ User marked notification as read

Business Insights:
  • High "exceeded" rate → Users not planning budgets well
  • Low notification reads → Notifications not visible
  • Spike in threshold alerts → Upcoming paycut/crisis
```

---

## 🔔 Alert Rules Chi Tiết

### Rule 1: ServiceDown (🔴 CRITICAL)

```yaml
Alert: ServiceDown
Condition: up == 0
Duration: 1 minute
Severity: CRITICAL
Action: Page on-call engineer immediately

Meaning:
  • Any service (prometheus job) reports "down" for >1 min
  • Prometheus self-monitoring: up=1 (healthy), up=0 (down)
  • This is the most important alert - service unavailable

Example Trigger Path:
  1. API Gateway crashes
  2. Prometheus tries to scrape /metrics → timeout
  3. After 1 minute → alert fires
  4. Alertmanager sends: "🚨 CRITICAL: api-gateway is down"
  5. Slack notification goes to #critical-alerts channel
  6. On-call gets paged
```

---

### Rule 2: HighErrorRate (⚠️ WARNING)

```yaml
Alert: HighErrorRate
Condition: (5xx errors in last 5min) / (total requests in last 5min) > 5%
Duration: 5 minutes
Severity: WARNING
Action: Notify team to investigate

Meaning: • More than 5% of HTTP requests are returning 5xx errors
  • Indicates application errors (not user mistakes)
  • Need to check logs immediately

Example: • 100 requests/sec for 5 min = 30,000 total requests
  • If 1,500+ are 5xx → alert fires

Possible Causes: ✗ Database connection exhausted
  ✗ Out of memory
  ✗ Unhandled exception in code
  ✗ External API dependency down
```

---

### Rule 3: HighLatency (⚠️ WARNING)

```yaml
Alert: HighLatency
Condition: histogram_quantile(0.95, request_duration_bucket[5m]) > 2 seconds
Duration: 5 minutes
Severity: WARNING
Action: Check performance

Meaning:
  • 95th percentile of request latency exceeds 2 seconds
  • p95 = 95% of requests finish within X seconds
  • If p95 > 2s, user experience is degraded

Example:
  • 100 requests: 90 under 0.5s, 4 under 1s, 5 under 3s, 1 under 10s
  • p95 = 2.5s → alert fires

Possible Causes:
  ✗ Database query slow
  ✗ External API slow
  ✗ High CPU/Memory usage
  ✗ Network saturation
```

---

### Rule 4: OCRHighFailureRate (⚠️ WARNING)

```yaml
Alert: OCRHighFailureRate
Condition: (ocr_failures_total in last 5min) / (ocr_requests_total in last 5min) > 10%
Duration: 5 minutes
Severity: WARNING
Action: Check OCR service status

Meaning: • More than 10% of image processing jobs failing
  • Service degradation, users can't scan documents

Possible Causes: ✗ OCR engine crashed
  ✗ No remaining API quota (AWS Rekognition)
  ✗ Invalid image formats
  ✗ Dependency service down
```

---

### Rule 5: OCRTimeouts (⚠️ WARNING)

```yaml
Alert: OCRTimeouts
Condition: increase(ocr_timeout_total[5m]) > 5
Duration: 2 minutes
Severity: WARNING
Action: Check OCR service performance

Meaning: • More than 5 timeout events in the last 5 minutes
  • Images taking too long to process (>30s default)
  • Users experience hanging requests

Difference from HighFailureRate:
  • HighFailureRate: OCR engine returned error
  • OCRTimeouts: OCR engine hung/very slow
```

---

### Rule 6: TransactionQueryLatencyHigh (⚠️ WARNING)

```yaml
Alert: TransactionQueryLatencyHigh
Condition: histogram_quantile(0.95, transaction_query_duration_bucket[5m]) > 1 second
Duration: 5 minutes
Severity: WARNING
Action: Check database performance

Meaning: • Database queries taking too long
  • p95 query execution time > 1 second
  • Transaction service responses slow

Possible Causes: ✗ Database table locks (long-running transactions)
  ✗ Missing indexes
  ✗ Large dataset queries
  ✗ Network latency to database
```

---

### Rule 7: HighUserCreationRate (⚠️ WARNING)

```yaml
Alert: HighUserCreationRate
Condition: rate(identity_service_users_created_total[5m]) > 10
Duration: 5 minutes
Severity: WARNING
Action: Investigate for spam/bot registration

Meaning:
  • More than 10 new users per minute
  • Normal traffic: ~1-2 users/min
  • Spike may indicate:
    ✗ Bot attack
    ✗ Marketing campaign (expected)
    ✗ Viral/trending event
    ✓ Need manual verification
```

---

### Rule 8: BudgetNotificationServiceNoActivity (ℹ️ INFO)

```yaml
Alert: BudgetNotificationServiceNoActivity
Condition:
  increase(notifications_created_total[1h]) == 0 AND up == 1
Duration: 1 hour
Severity: INFO
Action: Check if service is working or just idle

Meaning:
  • No notifications created in the last 1 hour
  • Service is up, but no data flowing through
  • Could indicate:
    ✓ Low traffic period (normal at night)
    ✗ Service bug preventing notification creation
    ✗ Data pipeline issue

This alert is mostly informational, helps detect silent failures.
```

---

## 📈 Dashboard Panels

### Dashboard: "System Overview"

**URL:** http://localhost:3005 → Select "System Overview"  
**Auto-refresh:** Every 15 seconds  
**Time range:** Last 1 hour (adjustable)

---

### Panel 1: Services Status

```
Type: Stat (shows up/down in colored boxes)
Query: up (by job)
Layout:
  ┌─────────────┬─────────────┬─────────────┐
  │ api-gateway │   identity  │ transaction │
  │    🟢 Up    │    🟢 Up    │    🟢 Up    │
  ├─────────────┼─────────────┼─────────────┤
  │   ocr       │   budget    │             │
  │  🟢 Up      │   🟢 Up     │             │
  └─────────────┴─────────────┴─────────────┘

How to Read:
  🟢 = Service responding to metrics requests
  🔴 = Service not responding (likely down)

Check This When:
  • Users reporting service errors
  • To quickly identify which service is problematic
```

---

### Panel 2: Total HTTP Requests (5min rate)

```
Type: Time Series (line graph)
Query: sum(rate(http_requests_total[5m])) by (job)
Y-axis: Requests per second (RPS)
Layout:
       RPS
       ↑
    200┤     ╱╲     ╱╲
       │    ╱  ╲   ╱  ╲
    100┤   ╱    ╲_╱    ╲__
       │  ╱
      0└──────────────────→ time

       Legend:
       — api-gateway      (150 RPS)
       — transaction      (50 RPS)
       — budget-notif     (30 RPS)
       — identity         (20 RPS)
       — ocr              (5 RPS)

How to Read:
  • Each colored line = one service
  • Y-value = requests/second at that moment
  • Spikes = increased traffic or test load

What It Tells You:
  ✓ Traffic pattern over time
  ✓ Peak hours, off hours
  ✗ If line drops → traffic gone (might be issue)
```

---

### Panel 3: HTTP Request Errors

```
Type: Time Series (stacked area)
Query:
  - rate(http_requests_total{status_code=~"5.."}[5m])  [5xx errors]
  - rate(http_requests_total{status_code=~"4.."}[5m])  [4xx errors]
Y-axis: Errors per second
Layout:
         EPS
         ↑
       10┤              ╱╲
        5┤  ╱╲    ┌────╱  ╲─┐
        1┤──╱  ────┘         └───
        0└──────────────────→ time

        Legend (stacked):
        — 5xx (red, top)
        — 4xx (yellow, bottom)

How to Read:
  • Red area (top) = 5xx server errors
  • Yellow area (bottom) = 4xx client errors
  • When red area grows → app bug/crash
  • When yellow area grows → bad requests

Alert Threshold: Red area > 5% of total traffic
```

---

### Panel 4: Request Latency p95

```
Type: Time Series (line graph)
Query: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
Y-axis: Seconds
Layout:
       Latency (s)
       ↑
       2.0┤        ╱╲___═══
       1.5┤       ╱       ╲
       1.0┤   ___╱         ╲
       0.5┤  ╱               ╲___
         0└──────────────────→ time

How to Read:
  • 95% of requests complete in < y-value seconds
  • If line at 1.5s → 95% finish in 1.5s, 5% take longer

Good vs Bad:
  ✓ p95 < 0.5s   = Excellent
  ✓ p95 < 1s     = Good
  ⚠️  p95 1-2s   = Acceptable but slow
  ❌ p95 > 2s    = Bad, needs investigation

Alert Threshold: p95 > 2 seconds
```

---

### Panel 5: Transaction Operations (1 hour)

```
Type: Stat (shows counts in boxes)
Query:
  - sum(increase(transactions_created_total[1h]))
  - sum(increase(transactions_updated_total[1h]))
  - sum(increase(transactions_deleted_total[1h]))
Layout:
  ┌─────────────┬─────────────┬─────────────┐
  │  Created    │  Updated    │  Deleted    │
  │   1,245     │     523     │      42     │
  └─────────────┴─────────────┴─────────────┘

How to Read:
  • Shows activity volume in the last 1 hour
  • Ratio: Created:Updated:Deleted gives usage pattern

What It Tells You:
  • High created = many transactions at some time
  • High deleted = users cleaning up data (or bug!)
  • If all zero = service down or data flow stopped
```

---

### Panel 6: OCR Processing (1 hour)

```
Type: Stat (horizontal bars)
Query:
  - sum(increase(ocr_success_total[1h]))          [Success]
  - sum(increase(ocr_failures_total[1h]))         [Failures]
  - sum(increase(ocr_timeout_total[1h]))          [Timeouts]
Layout:
  Success:  ████████████████████  2,150
  Failures: ██                      180
  Timeouts: █                        30

How to Read:
  • Bar length = count of that type
  • Success rate = 2150 / (2150+180+30) = ~92%

Alert Threshold: Failure% > 10% or Timeouts > 5 in 5min
```

---

### Panel 7: Budget Notifications (1 hour)

```
Type: Stat (horizontal bars)
Query: sum(increase(budget_notification_service_notifications_created_total[1h])) by (type)
Layout:
  threshold_alert:    ████████████  145
  exceeded_alert:     ███            32
  daily_summary:      ██████         78

How to Read:
  • Each type shows how many notifications of that type
  • threshold_alert = user spending hit 50%/75%/90%
  • exceeded_alert = user exceeded budget
  • daily_summary = daily summary emails

Insight:
  • High threshold_alerts = users spending actively
  • High exceeded = users not planning budgets
```

---

### Panel 8: OCR Processing Duration (p95)

```
Type: Time Series
Query:
  - histogram_quantile(0.95, rate(ocr_processing_duration_seconds_bucket[5m]))
  - histogram_quantile(0.95, rate(ocr_preprocessing_duration_seconds_bucket[5m]))
Y-axis: Seconds
Layout:
       Duration (s)
       ↑
       30┤     ╱╲___
       20┤    ╱     ╲    ╱╲__
       10┤   ╱       ╲__╱    ╲
        0└──────────────────→ time

        Legend:
        — Processing (includes everything)
        — Preprocessing (just image prep)

How to Read:
  • Processing line higher than preprocessing
  • If preprocessing grows → image prep slow
  • If total processing grows but prep stable → OCR engine slow

SLO: p95 Processing < 10 seconds
```

---

### Panel 9: Transaction Query Latency (p95)

```
Type: Time Series (separate lines per method)
Query: histogram_quantile(0.95, rate(transaction_query_duration_seconds_bucket[5m])) by (method)
Y-axis: Seconds
Layout:
       Latency (s)
       ↑
       1.5┤    ╱╲___
       1.0┤___╱     ╲___
       0.5┤             ╲
         0└──────────────→ time

         Legend:
         — SELECT (read queries)
         — INSERT (create transactions)
         — UPDATE (edit transactions)

How to Read:
  • Each method shown separately
  • If SELECT stable but UPDATE spikes → UPDATE query slow

Alert Threshold: p95 > 1 second
```

---

### Panel 10: Budget Threshold Alerts

```
Type: Time Series (stacked area)
Query: sum(rate(budget_notification_service_budget_threshold_reached_total[5m])) by (threshold)
Y-axis: Alerts per second
Layout:
       Alerts/sec
       ↑
       10┤              ╱╲
        5┤  ╱╲    ┌────╱  ╲─┐
        2┤──╱  ────┘         └───
        0└──────────────────→ time

        Legend (stacked):
        — 100% (red, top)      = Budget exceeded
        — 90% (orange)         = Warning zone
        — 75% (yellow)         = Caution zone
        — 50% (green, bottom)  = Info zone

How to Read:
  • Stacked = can see distribution of warnings
  • Spike in red = many users hitting budget limits

Business Insight:
  • Normal spikes on payday
  • Unusual spike = economic issue or system bug
```

---

## 🔧 Các Dịch Vụ Monitoring

### Prometheus Service

```
Container: prom/prometheus:v2.37.0
URL: http://localhost:9090
Port: 9090 (internal), 9090 (exposed)
Volumes:
  - ./prometheus.yml → /etc/prometheus/prometheus.yml
  - ./alert-rules.yml → /etc/prometheus/alert-rules.yml
  - prometheus_data → /prometheus (persistent 7 days)
Environment: TZ=UTC
Restart Policy: unless-stopped
Health Check: ✓ Active (every 30s)

Logs: docker-compose -f docker-compose.monitoring.yml logs prometheus
```

### Grafana Service

```
Container: grafana/grafana:8.5.2
URL: http://localhost:3005
Port: 3005 (exposed to 3000 inside container)
Default Credentials: admin / admin
Volumes:
  - grafana_data → /var/lib/grafana (persistent)
  - ./monitoring/grafana/provisioning/datasources → /etc/grafana/provisioning/datasources
  - ./monitoring/grafana/provisioning/dashboards → /etc/grafana/provisioning/dashboards
  - ./monitoring/grafana/dashboards → /var/lib/grafana/dashboards
Environment:
  - GF_SECURITY_ADMIN_PASSWORD=admin
  - GF_SECURITY_ADMIN_USER=admin
  - GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH=/var/lib/grafana/dashboards/system-overview.json
Health Check: ✓ Active (every 30s)

Logs: docker-compose -f docker-compose.monitoring.yml logs grafana
```

### Alertmanager Service (Ready, Not Yet Running)

```
Service: alertmanager (in alertmanager.yml)
Status: Configured but NOT included in docker-compose.monitoring.yml yet
Why: Needs SLACK_WEBHOOK_URL environment variable to function

To Enable:
  1. Set SLACK_WEBHOOK_URL in .env or export command
  2. Add alertmanager service to docker-compose.monitoring.yml
  3. Restart docker-compose

When Enabled:
  - Listens on http://localhost:9093
  - Prometheus sends alerts to it
  - Alertmanager routes to Slack/Email per rule
```

---

## 🌐 Cách Truy Cập & Sử Dụng

### 1. Prometheus Interface

**URL:** http://localhost:9090

#### Tabs Chính:

**a) Graph Tab (Query PromQL)**

```
Purpose: Query and graph metrics
Steps:
  1. Click: Graph tab
  2. Enter: PromQL query in Expression field
  3. Click: Execute
  4. See: Graph of results

Example Queries:
  up                                    # All services status
  rate(http_requests_total[5m])        # Request rate
  http_requests_total{status_code="500"}  # Just 5xx errors
  histogram_quantile(0.95, http_request_duration_seconds_bucket)  # p95 latency
  increase(transactions_created_total[1h])  # Transactions created in last hour
```

**b) Alerts Tab**

```
Purpose: View current alert rules and their status
Shows:
  • All alert rules from alert-rules.yml
  • Current value vs threshold for each
  • Are they PENDING or FIRING?
  • How long have they been firing?

Status Meanings:
  🟢 INACTIVE = Alert condition not met
  🟡 PENDING = Condition met but duration threshold not reached yet
  🔴 FIRING = Alert should trigger (Alertmanager should notify)
```

**c) Targets Tab**

```
Path: Status > Targets
Purpose: Verify all services are being scraped
Shows:
  ✅ api-gateway          UP (last scraped 3s ago)
  ✅ identity-service     UP (last scraped 2s ago)
  ✅ transaction-service  UP (last scraped 4s ago)
  ✅ ocr-service          UP (last scraped 3s ago)
  ✅ budget-noti...       UP (last scraped 3s ago)

If RED (DOWN):
  • Service crashed
  • Prometheus can't reach /metrics endpoint
  • Check service logs and docker status
```

**d) Configuration Tab**

```
Path: Status > Configuration
Shows: Your prometheus.yml file content
Useful for: Verify scrape intervals, alert rules included, etc.
```

---

### 2. Grafana Interface

**URL:** http://localhost:3005  
**Prefix:** `admin`  
**Password:** `admin`

#### Navigation:

```
Home
├─ Dashboards
│  ├─ System Overview (Main dashboard, auto-loaded)
│  ├─ Browse > All Dashboards
│  └─ + Create New
│
├─ Data Sources
│  ├─ Prometheus (Already configured, check with green checkmark)
│  └─ + Add New Data Source
│
├─ Alerting (if alertmanager enabled)
│  ├─ Alert Rules
│  ├─ Alert Groups
│  └─ Notification Channels
│
├─ Administration
│  ├─ Users
│  ├─ Settings
│  └─ Preferences
│
└─ Help
   ├─ Documentation
   └─ About Grafana
```

#### System Overview Dashboard

**Auto-loads on login.** Shows 10 panels:

```
1. Services Status       [Top, full width] - Quick health check
2. Total HTTP Requests   [Left, medium]   - Traffic pattern
3. HTTP Errors           [Right, medium]  - Error trend
4. Request Latency p95   [Bottom, full]   - Performance
5. Transaction Ops       [Left]           - Create/Update/Delete
6. OCR Processing        [Center]         - Success/Fail/Timeout
7. Budget Notifications  [Right]          - Notification counts
8. OCR Duration          [Left, bottom]   - Processing speed
9. Query Latency         [Right, bottom]  - DB performance
10. Budget Alerts        [Center, bottom] - Threshold breaches

Time Range Controls:
  • Top right: Available at "Last 1 hour" (default)
  • Click to change: Last 5 min, 1 hour, 6 hours, 24 hours, 7 days, etc.
  • Auto-refresh: Every 15 seconds (top right)

Panel Interactions:
  • Hover on graph → See exact values at that time
  • Click panel title → Full panel view
  • Shift + Click → Can edit panel (need edit permissions)
```

---

## 🆘 Troubleshooting

### Issue 1: Prometheus Shows "No Data" or Red X

**Symptom:** Panel shows "N/A" or error message

**Causes & Fixes:**

```
❌ Time range too narrow
   → Click time selector, try "Last 1 hour" or "Last 6 hours"

❌ Prometheus not collecting data yet
   → Services just started
   → Wait 2-3 minutes for first metrics
   → Check: http://localhost:9090/api/v1/query?query=up

❌ Metric name typo in query
   → Check exact metric name in Prometheus Targets
   → Compare with dashboard query

❌ Services not exposing /metrics
   → Check: docker-compose ps
   → curl http://localhost:PORT/metrics (inside container)
   → Check service logs for errors
```

### Issue 2: Services Show as DOWN in Prometheus

**Symptom:** Prometheus Targets tab shows service as RED (DOWN)

**Root Causes & Fixes:**

```
1. Service container crashed
   Fix: docker-compose restart [service-name]

2. Service not exposing /metrics endpoint
   Fix: Check if MetricsController exists in service code

3. Port misconfigured in prometheus.yml
   Fix: Verify port 3000 in prometheus.yml matches service PORT

4. Network issue (Prometheus can't reach service)
   Fix: Check network: docker network inspect backend_app-network
   Fix: docker-compose logs [service-name] | grep error

3. /metrics endpoint not implemented
   Fix: All services must have MetricsController that:
        @Controller('metrics')
        @Get()
        async getMetrics(@Res() res) {
          res.set('Content-Type', register.contentType);
          res.end(await register.metrics());
        }
```

**Verification:**

```bash
# Check if metric endpoint responds
docker-compose exec api-gateway wget -O- http://localhost:3000/metrics

# Check Prometheus scraped any data
docker-compose -f docker-compose.monitoring.yml logs prometheus | grep "api-gateway"

# Manually query what Prometheus sees
curl http://localhost:9090/api/v1/query?query=up
```

---

### Issue 3: Grafana Can't Connect to Prometheus

**Symptom:** Grafana shows "No data" on all panels

**Fixes:**

```
1. Check Grafana datasource configuration
   Path: Grafana > Settings (⚙️) > Data Sources > Prometheus

   Should show:
   ✓ URL: http://prometheus:9090  (Docker network name)
   ✓ Access: Server (proxy)
   ✓ Health check: Green "Data source is working"

2. Verify Prometheus is running
   docker-compose -f docker-compose.monitoring.yml ps prometheus
   Should show: prometheus ... healthy

3. Check network connectivity
   docker-compose -f docker-compose.monitoring.yml exec grafana \
     wget -O- http://prometheus:9090/api/v1/targets
   Should return JSON with targets list

4. Restart both services
   docker-compose -f docker-compose.monitoring.yml restart prometheus grafana
```

---

### Issue 4: Alerts Not Firing

**Symptom:** Alert condition met but no notification, or alert stuck in PENDING

**Checks:**

```
1. Verify alert rule in Prometheus
   Path: http://localhost:9090/alerts
   See: All 8 alert rules listed
   Check: Their current state (INACTIVE/PENDING/FIRING)

2. Manually test alert condition
   Example for ServiceDown:
   - Manually stop a service: docker-compose pause transaction-service
   - Wait 70 seconds (1min duration + buffer)
   - Check Prometheus Alerts tab → Should show FIRING
   - Restart service: docker-compose unpause transaction-service

3. Check alert rule syntax in alert-rules.yml
   • Prometheus logs for parse errors:
     docker-compose -f docker-compose.monitoring.yml logs prometheus | grep -i error

4. Verify alertmanager configured (if using notifications)
   - Check: alertmanager.yml exists
   - Check: SLACK_WEBHOOK_URL environment variable set
   - Alertmanager container running
```

---

### Issue 5: Disk Space: Prometheus Data Growing Too Fast

**Symptom:** `/prometheus_data` volume getting very large

**Causes & Solutions:**

```
Prometheus keeps data for 7 days by default.

Options:
1. Reduce retention to 3 days
   File: docker-compose.monitoring.yml
   Change: --storage.tsdb.retention.time=7d
   To:     --storage.tsdb.retention.time=3d
   Then:   docker-compose -f docker-compose.monitoring.yml restart prometheus

2. Reduce scrape frequency (collect less data)
   File: prometheus.yml
   Change: scrape_interval: 15s
   To:     scrape_interval: 30s
   Then:   docker-compose -f docker-compose.monitoring.yml restart prometheus

3. Clear prometheus data volume completely
   WARNING: Will lose all metrics!
   docker-compose -f docker-compose.monitoring.yml down -v
   docker volume rm backend_prometheus_data
   docker-compose -f docker-compose.monitoring.yml up -d
```

---

### Issue 6: High Memory Usage (Prometheus/Grafana)

**Symptom:** Docker shows container using 500MB+ RAM

**Solutions:**

```
1. Prometheus memory too high
   Likely cause: Too many high-cardinality metrics

   Check: What metrics exist?
   curl http://localhost:9090/api/v1/label/__name__/values

   Fix: Some services creating too many metric variants
   Check: Are you creating metric per user_id? (BAD!)
   Should be: Per service/operation type only (GOOD)

2. Grafana memory high (usually fine, it's UI)
   Normal: 200-300MB

3. Restart containers to free memory
   docker-compose -f docker-compose.monitoring.yml restart

4. Increase Docker memory limits
   File: docker-compose.monitoring.yml
   Add to each service:
     mem_limit: 1g        # Max 1GB
     memswap_limit: 1g

5. Reduce data retention
   See Issue 5 above
```

---

## 📞 Quick Reference

### Common PromQL Queries

```prometheus
# Health & Availability
up                           # Service status (1=up, 0=down)
count(up) - sum(up)         # How many services are down

# Request Metrics
rate(http_requests_total[5m])                # Requests/sec
increase(http_requests_total[1h])            # Total requests in 1h
http_requests_total{status_code="500"}      # Just 500 errors
rate(http_requests_total{status_code="5.."}[5m])  # 5xx error rate

# Response Time
histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))  # p50
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))  # p95
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))  # p99

# Application-Specific
increase(transactions_created_total[1h])    # Transactions/hour
rate(ocr_failures_total[5m])               # OCR failure rate
budget_notification_service_notifications_created_total  # Total notifications
```

### Docker Compose Commands

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Check status
docker-compose -f docker-compose.monitoring.yml ps

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
docker-compose -f docker-compose.monitoring.yml logs -f grafana

# Restart services
docker-compose -f docker-compose.monitoring.yml restart

# Stop all monitoring
docker-compose -f docker-compose.monitoring.yml down

# Clean everything (lose all data)
docker-compose -f docker-compose.monitoring.yml down -v
```

---

## 📌 Key Takeaways

✅ **What You Have:**

- 5 microservices exposing metrics via `/metrics` endpoint
- Prometheus collecting metrics every 15 seconds
- Grafana dashboard with 10 visualization panels
- 8 alert rules (4 warnings, 1 critical, 1 info)
- Alertmanager ready for Slack/Email notifications
- Smoke test script to verify everything works

✅ **What It Monitors:**

- Service availability (is it running?)
- Request volume (how much traffic?)
- Response time (is it fast?)
- Error rate (are things breaking?)
- Business metrics (transactions, notifications, OCR jobs)
- Database performance (query latency)
- Security (unusual user creation)

✅ **What To Do Next:**

1. Run `./test-monitoring.sh` to verify setup
2. Check Prometheus Targets to confirm scraping
3. Review System Overview dashboard
4. Configure Slack webhook for alerts
5. Test alerting by pausing a service

---

**Last Updated:** 29/04/2026  
**Maintained By:** Backend Team  
**Status:** ✅ Production Ready
