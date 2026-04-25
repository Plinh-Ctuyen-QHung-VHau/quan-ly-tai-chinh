# OCR Service

Handles Optical Character Recognition (OCR) for receipt images.

## Responsibilities

- Receive image URLs/paths for processing.
- (Mock) Interact with a third-party OCR provider.
- Return structured data from receipts.
- Provide health check and metrics endpoints.

## Running the service

```bash
npm install
npm run start:dev
```

The service will be available at `http://localhost:3003`.
