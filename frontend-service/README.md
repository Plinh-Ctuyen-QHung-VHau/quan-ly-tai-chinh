# Frontend Service (Mobile App)

This is the Frontend Service for the "Smart Personal Expense Management System", implemented as a React Native mobile application using Expo.

It acts as the primary user interface for mobile clients.

## Role in Microservice Architecture

The Frontend Service is responsible for:

- Rendering the mobile user interface.
- Handling user authentication (Sign Up, Sign In, Sign Out) directly with Supabase Auth.
- Uploading receipt images directly to Supabase Storage.
- Communicating with backend microservices via a central API Gateway. All requests to the gateway are authenticated using a Supabase JWT Bearer token.
- Displaying data such as transactions, budgets, notifications, and user profiles.

This service is a pure client-side application and does not contain any backend logic, server, or endpoints like `/health`.

## Backend Dependencies

This service depends on the following backend components, accessible through the API Gateway:

- **API Gateway**: The single entry point for all backend requests. It validates Supabase JWTs.
- **Transaction Service**: Manages financial transactions.
- **OCR Service**: Scans receipt images and extracts data.
- **Budget Service**: Manages user budgets.
- **Notification Service**: Manages user notifications and settings.
- **Identity Service**: Manages user profiles.

## Tech Stack

- Expo
- React Native
- TypeScript
- React Navigation
- Supabase JS (for Auth and Storage)
- Axios (for API Gateway communication)
- Expo Image Picker
- Zustand

## Project Setup

1.  **Install dependencies** inside the `frontend-service/` directory:

    ```bash
    npm install
    ```

2.  **Set up environment variables**:

    Create a `.env` file by copying the example:

    ```bash
    cp .env.example .env
    ```

    Then, fill in the required values:

    ```
    EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
    EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    EXPO_PUBLIC_API_BASE_URL=YOUR_API_GATEWAY_BASE_URL
    ```

3.  **Run the application**:

    Start the Expo development server:

    ```bash
    npm start
    ```

    You can then run the app on your phone using the Expo Go app by scanning the QR code.

## Supabase Configuration

For the application to work, you need to configure:

1.  **Supabase Auth**: Ensure user authentication is enabled in your Supabase project.
2.  **Supabase Storage**: Create a public bucket named `receipts`. You will need to set up Row Level Security (RLS) policies to ensure users can only upload to their own folder and read their own files.

    Example RLS policy for uploads:

    ```sql
    -- Allow authenticated users to upload to their own folder
    CREATE POLICY "Allow authenticated uploads"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'receipts' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
    ```

3.  Fill values in `.env`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_BASE_URL`

4. Start the app:

```bash
npm start
```

Then scan the QR code with Expo Go on your phone.

## Supabase Configuration

### Auth

- Enable email/password sign-in in Supabase Auth.
- App uses `signInWithPassword` and `signUp` directly from Supabase JS.
- Registration sends `full_name` in user metadata.

### Storage

Create a bucket named `receipts`.

Recommended settings:

- Public access: off
- Uploads: authenticated users only
- Object path format: `<user_id>/<timestamp>_receipt.jpg`

The app stores and sends only the object path to the OCR service.

## API Gateway Configuration

Set `EXPO_PUBLIC_API_BASE_URL` to the gateway base URL, for example:

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.example.com
```

All backend requests use:

- `Authorization: Bearer <supabase_access_token>`

No backend auth endpoints are used from the mobile app.

## Backend Contracts Expected by the App

Success response:

```json
{
  "success": true,
  "message": "string",
  "data": {},
  "meta": null
}
```

Error response:

```json
{
  "success": false,
  "message": "string",
  "error": {
    "code": "string",
    "details": {}
  }
}
```

## Notes

- This is an MVP only.
- No chatbot, NLP, insights, export reports, multi-currency, or recommendation/forecast features are included.
- The app is designed to run in Expo Go without custom native code.

## Environment Variables

This project uses environment variables to configure the connection to the Supabase backend and the API server.

Create a `.env` file in the root of the `frontend-service` directory. You can use the `.env.example` file as a template.

```
EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

**IMPORTANT**: Because this is an Expo project, all environment variables that need to be accessible in the client-side code **must** be prefixed with `EXPO_PUBLIC_`.

After creating or modifying the `.env` file, you must clear the Expo cache and restart the development server:

```bash
npx expo start -c
```
