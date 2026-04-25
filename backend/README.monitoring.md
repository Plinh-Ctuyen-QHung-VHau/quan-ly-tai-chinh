# Backend Microservices Monitoring

This directory contains the configuration for a simple monitoring setup using Prometheus and Grafana.

## Components

- **Prometheus**: Scrapes metrics from all backend services.
- **Grafana**: Visualizes the metrics collected by Prometheus.

## How to Run

This monitoring stack is designed to run alongside the main backend services. It requires the main services to be running so that Prometheus can scrape their `/metrics` endpoints.

1.  **Ensure the main backend services are running.**
    You can start them from the `backend` directory:

    ```bash
    docker-compose up -d
    ```

2.  **Start the monitoring stack.**
    From the `backend` directory, run the monitoring-specific compose file:

    ```bash
    docker-compose -f docker-compose.monitoring.yml up -d
    ```

    _Note: This command uses the `-f` flag to specify a different compose file._

## Accessing the Tools

- **Prometheus**: [http://localhost:9090](http://localhost:9090)
  You can check the status of the scrape targets under `Status > Targets`.

- **Grafana**: [http://localhost:3005](http://localhost:3005)
  - **Login**: `admin`
  - **Password**: `admin`
  - The "System Overview" dashboard should be set as the default home dashboard.

## Dashboard

A pre-configured dashboard `system-overview.json` is provided to visualize key metrics:

- **Services Status**: Shows if each microservice is `Up` or `Down`.
- **Total HTTP Requests**: A time-series graph of the request rate across all services.
- **HTTP Request Errors**: A time-series graph of 4xx and 5xx error rates.
- **95th Percentile Request Duration**: The request latency that 95% of requests fall under.
- **Transactions Created**: A count of new transactions created in the `transaction-service`.
- **OCR Processing**: A count of successful vs. failed OCR jobs in the `ocr-service`.
- **Notifications Created**: A count of new notifications created in the `budget-notification-service`.

## File Structure

```
backend/
├── docker-compose.monitoring.yml  # Docker Compose for the monitoring stack
└── monitoring/
    ├── prometheus.yml             # Prometheus configuration (scrape targets)
    └── grafana/
        ├── provisioning/
        │   ├── dashboards/
        │   │   └── default.yml    # Grafana dashboard provider config
        │   └── datasources/
        │       └── prometheus.yml # Grafana datasource config (points to Prometheus)
        └── dashboards/
            └── system-overview.json # The actual dashboard definition
```
