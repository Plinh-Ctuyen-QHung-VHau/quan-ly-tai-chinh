#!/bin/bash

# Monitoring Stack Smoke Test
# Tests that Prometheus, Grafana, and all service metrics endpoints are working

set -e

PROMETHEUS_URL="http://localhost:9090"
GRAFANA_URL="http://localhost:3005"
ALERTMANAGER_URL="http://localhost:9093"
SERVICES=("api-gateway" "identity-service" "transaction-service" "ocr-service" "budget-notification-service")

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Monitoring Stack Smoke Test"
echo "=========================================="
echo ""

# Test 1: Check Docker Compose Status
echo "Test 1: Checking Docker Compose Status..."
if docker-compose -f docker-compose.monitoring.yml ps | grep -q "healthy"; then
    echo -e "${GREEN}✓ Monitoring services are running${NC}"
else
    echo -e "${YELLOW}⚠ Monitoring services status unclear. Continuing...${NC}"
fi
echo ""

# Test 2: Prometheus Connectivity
echo "Test 2: Testing Prometheus Connectivity..."
if curl -s "$PROMETHEUS_URL/-/healthy" > /dev/null; then
    echo -e "${GREEN}✓ Prometheus is healthy${NC}"
else
    echo -e "${RED}✗ Prometheus is not responding${NC}"
    exit 1
fi
echo ""

# Test 3: Grafana Connectivity
echo "Test 3: Testing Grafana Connectivity..."
if curl -s "$GRAFANA_URL/api/health" > /dev/null; then
    echo -e "${GREEN}✓ Grafana is healthy${NC}"
else
    echo -e "${RED}✗ Grafana is not responding${NC}"
    exit 1
fi
echo ""

# Wait for Prometheus to complete initial scrapes
echo "Waiting for Prometheus to scrape service targets..."
MAX_RETRIES=12
RETRY=1
while [ $RETRY -le $MAX_RETRIES ]; do
    UP_COUNT=$(curl -s "$PROMETHEUS_URL/api/v1/targets" | jq '[.data.activeTargets[] | select(.labels.job != "prometheus" and .health == "up")] | length')
    if [ "$UP_COUNT" -eq 5 ]; then
        echo -e "${GREEN}✓ All 5 service targets are up${NC}"
        break
    fi
    echo "  Attempt $RETRY/$MAX_RETRIES: $UP_COUNT/5 targets up"
    sleep 5
    RETRY=$((RETRY + 1))
done
echo ""

# Test 4: Prometheus Targets
echo "Test 4: Checking Prometheus Targets..."
TARGETS=$(curl -s "$PROMETHEUS_URL/api/v1/targets" | jq '.data.activeTargets | length')
echo "Active targets: $TARGETS"

for service in "${SERVICES[@]}"; do
    if curl -s "$PROMETHEUS_URL/api/v1/targets" | jq -e ".data.activeTargets[] | select(.labels.job == \"$service\" and .health == \"up\")" > /dev/null; then
        echo -e "${GREEN}✓ $service target is UP${NC}"
    else
        LAST_ERROR=$(curl -s "$PROMETHEUS_URL/api/v1/targets" | jq -r ".data.activeTargets[] | select(.labels.job == \"$service\") | .lastError" | head -n 1)
        echo -e "${RED}✗ $service target is DOWN${NC}"
        if [ -n "$LAST_ERROR" ] && [ "$LAST_ERROR" != "null" ]; then
            echo "  Last error: $LAST_ERROR"
        fi
    fi
done
echo ""

# Test 5: Service Metrics Endpoints (validated by Prometheus health)
echo "Test 5: Service Metrics Endpoint Health (via Prometheus)..."
DOWN_TARGETS=$(curl -s "$PROMETHEUS_URL/api/v1/targets" | jq '[.data.activeTargets[] | select(.labels.job != "prometheus" and .health != "up")] | length')
if [ "$DOWN_TARGETS" -eq 0 ]; then
    echo -e "${GREEN}✓ All service metrics endpoints are reachable by Prometheus${NC}"
else
    echo -e "${YELLOW}⚠ $DOWN_TARGETS service target(s) are still down${NC}"
fi
echo ""

# Test 6: Basic Prometheus Query
echo "Test 6: Testing Prometheus Queries..."
QUERY_RESULT=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=up" | jq '.data.result | length')
echo "Services reporting 'up' metric: $QUERY_RESULT"

if [ "$QUERY_RESULT" -gt 0 ]; then
    echo -e "${GREEN}✓ Prometheus is collecting metrics${NC}"
else
    echo -e "${YELLOW}⚠ No 'up' metrics found yet (normal if services just started)${NC}"
fi
echo ""

# Test 8: Grafana Datasource
echo "Test 8: Testing Grafana Datasource..."
DATASOURCES=$(curl -s -u admin:admin "$GRAFANA_URL/api/datasources" | jq '.[] | select(.type=="prometheus")')

if [ -n "$DATASOURCES" ]; then
    echo -e "${GREEN}✓ Prometheus datasource configured in Grafana${NC}"
else
    echo -e "${RED}✗ Prometheus datasource not found in Grafana${NC}"
fi
echo ""

# Test 9: Alertmanager Connectivity
echo "Test 9: Testing Alertmanager Connectivity..."
if curl -s "$ALERTMANAGER_URL/-/healthy" > /dev/null; then
    echo -e "${GREEN}✓ Alertmanager is healthy${NC}"
else
    echo -e "${RED}✗ Alertmanager is not responding${NC}"
    exit 1
fi
echo ""

# Test 10: Generate Test Traffic
echo "Test 10: Generating Test Traffic..."
echo "Sending 5 requests to generate metrics..."
for i in {1..5}; do
    if docker-compose ps | grep -q "api-gateway"; then
        curl -s "http://localhost:3000/api/health" > /dev/null 2>&1 || true
        curl -s "http://localhost:3000/api/metrics" > /dev/null 2>&1 || true
    fi
    sleep 0.5
done
echo -e "${GREEN}✓ Test traffic generated${NC}"
echo ""

# Test 7: Check for specific metrics
echo "Test 7: Checking for Application Metrics..."
METRICS_TO_CHECK=(
    "http_requests_total"
    "http_request_duration_seconds"
    "transactions_created_total"
    "ocr_requests_total"
    "budget_notification_service_notifications_created_total"
)

for metric in "${METRICS_TO_CHECK[@]}"; do
    METRIC_COUNT=$(curl -s "$PROMETHEUS_URL/api/v1/label/__name__/values" | jq "[.data[] | select(startswith(\"${metric}\"))] | length")
    if [ "$METRIC_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ Found metric: $metric${NC}"
    else
        echo -e "${YELLOW}⚠ Metric not found yet: $metric (may be pending)${NC}"
    fi
done
echo ""

# Summary
echo "=========================================="
echo "Smoke Test Summary"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Open Prometheus UI: $PROMETHEUS_URL"
echo "   - Go to Status > Targets to verify all services"
echo "   - Go to Alerts to check alert rules"
echo ""
echo "2. Open Grafana Dashboard: $GRAFANA_URL"
echo "   - Login with admin/admin"
echo "   - Navigate to 'System Overview' dashboard"
echo "   - Check that panels have data"
echo ""
echo "3. To monitor logs:"
echo "   docker-compose -f docker-compose.monitoring.yml logs -f prometheus"
echo "   docker-compose -f docker-compose.monitoring.yml logs -f grafana"
echo ""
echo "4. To test alerting:"
echo "   docker-compose pause transaction-service"
echo "   (Wait 70 seconds, then check Prometheus Alerts)"
echo "   docker-compose unpause transaction-service"
echo ""
echo -e "${GREEN}✓ Smoke tests completed!${NC}"
