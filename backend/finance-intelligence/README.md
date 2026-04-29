# Finance Intelligence Service

Provides finance intelligence capabilities such as chat, NLP intent parsing, anomaly detection, and basic analytics.

## Endpoints

- GET /health
- GET /metrics
- POST /chat
- GET /analytics/summary
- POST /events/transactions

## Environment Variables

See .env.example for a full list of required variables.

## Notes

- NLP requests use Gemini for intent extraction only. Financial logic runs in backend code.
- PII is redacted before sending prompts to Gemini.
- Event idempotency uses app_common.processed_events.

## Sample Event

See samples/sample-event.json
