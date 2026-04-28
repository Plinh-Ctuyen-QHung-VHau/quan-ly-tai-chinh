# OCR Service

This service is responsible for processing receipt images using Optical Character Recognition (OCR) to extract transaction data. It uses Tesseract.js for text recognition and Sharp for image preprocessing.

## Features

- Scans an image from a URL or Supabase Storage path.
- **Image Preprocessing**: Automatically resizes, grayscales, and normalizes images for better OCR accuracy.
- **Reusable OCR Worker**: Uses a singleton Tesseract.js worker for improved performance and stability.
- **Async Processing with Timeout**: OCR tasks run asynchronously and will time out to prevent long-running requests.
- Parses the extracted text to suggest transaction details like amount, date, merchant, and category.
- Stores OCR requests and results in the database.
- Allows retrying a failed OCR scan.

## API Endpoints

- `POST /ocr/scan`: Initiates an OCR scan for a given image.
  - Body: `{ "image_url": "..." }` or `{ "storagePath": "..." }`
- `GET /ocr/result/:id`: Retrieves the result of a completed OCR scan.
- `POST /ocr/retry/:id`: Retries a failed OCR scan request.
- `GET /health`: Health check endpoint.
- `GET /metrics`: Prometheus metrics endpoint.

## Environment Variables

Create a `.env` file in this directory based on the `.env.example` file and provide the necessary values.

- `PORT`: The port the service will run on.
- `DATABASE_URL`: The connection string for the PostgreSQL database.
- `SUPABASE_URL`: The URL of your Supabase project.
- `SUPABASE_SERVICE_ROLE_KEY`: The service role key for your Supabase project, used for backend storage access.
- `SUPABASE_STORAGE_BUCKET`: The name of the Supabase Storage bucket where receipts are stored (default: `receipts`).

### OCR Configuration

- `OCR_ENGINE`: Determines which engine to use.
  - `tesseract`: (Default) Uses the real Tesseract.js engine.
  - `mock`: Uses a mock adapter that returns predefined text, useful for testing.
- `OCR_LANG`: Specifies the languages for Tesseract.js, separated by `+`.
  - `vie+eng`: (Default) Best for receipts in Vietnamese with some English words.
  - `vie` or `eng`: Can be faster if the receipt is in a single language.
- `OCR_TIMEOUT_MS`: Timeout for the entire OCR process in milliseconds (default: `60000`).
- `OCR_PREPROCESS_ENABLED`: `true` (default) or `false`. Enables or disables image preprocessing.
- `OCR_MAX_IMAGE_WIDTH`: The maximum width to resize large images to (default: `1600`).

## Installation and Setup

This service requires `tesseract.js` and `sharp`.

1.  **Install dependencies:**
    ```bash
    npm install
    ```
    This will install `tesseract.js`, `sharp`, and other Node.js dependencies. `tesseract.js` will download the required language data (`vie` and `eng` by default) on its first run.

## Input Image Requirements for Better OCR

For the best OCR results, please provide clear and well-lit images.

- **Clarity**: The image should be sharp and not blurry or out of focus.
- **Framing**: The entire receipt should be visible within the frame.
- **Lighting**: Avoid shadows, glare, or lighting that is too dim or too bright.
- **Angle**: Capture the receipt from a straight-on angle, avoiding significant tilting.
- **Background**: Use a plain, uncluttered background.

**Note for Frontend**: You can display a helpful tip to the user after they select or capture an image: _"For best results, please ensure the receipt is flat, well-lit, and fits entirely within the frame."_

The backend will automatically resize very large images, but starting with a good quality image is crucial. Remember, the OCR provides a _suggestion_. The user will always have the final say to edit the details before saving a transaction.

## Running the Service

### Using Docker Compose (Recommended)

From the `backend` root directory, you can run all services:

```bash
docker-compose up -d ocr-service
```

To run all services defined in the main `docker-compose.yml`:

```bash
docker-compose up -d
```

### Running Locally

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Run the development server:**
    ```bash
    npm run start:dev
    ```

The service will be running on the port specified in your `.env` file.
