# API Gateway

This service is the single entry point for all client requests.

## Responsibilities

- Route requests to the appropriate downstream service.
- Authenticate incoming requests by verifying Supabase JWTs.
- Forward user context (user_id, roles) to downstream services.
- Provide health check and metrics endpoints.

## Running the service

```bash
npm install
npm run start:dev
```

The service will be available at `http://localhost:3000`.
