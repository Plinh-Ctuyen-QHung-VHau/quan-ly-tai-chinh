# Quan Ly Chi Tieu Thong Minh - Mobile

MVP mobile app for a smart personal expense management system.

## Tech Stack

- Expo
- React Native
- TypeScript
- React Navigation
- Supabase JS
- Axios
- Expo Image Picker
- AsyncStorage
- Zustand

## Features in this MVP

- Supabase Auth sign up / sign in / sign out
- Pick receipt image from camera or library
- Upload receipt image to Supabase Storage bucket `receipts`
- Send `imageUrl` / storage path to OCR service via API Gateway
- Confirm OCR result before saving transaction
- Transaction history, detail, edit, delete
- Budget view and budget form
- Notifications list and read actions
- Profile and notification settings

## Project Setup

1. Install dependencies inside `mobile/`:

```bash
npm install
```

If you prefer Expo-managed installs for native-safe packages, use:

```bash
npx expo install expo-image-picker expo-status-bar react-native-gesture-handler react-native-safe-area-context react-native-screens
npx expo install @react-native-async-storage/async-storage
npm install axios zustand @supabase/supabase-js react-native-url-polyfill @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
```

2. Copy env file:

```bash
cp .env.example .env
```

3. Fill values in `.env`:

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
