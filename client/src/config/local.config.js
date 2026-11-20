// Settings for CLIENT_ENV=local (npm run dev). NO secrets: everything in a browser bundle is public.
// The Clerk *publishable* key is designed to be public (it only identifies your Clerk app).
export default {
  apiBaseUrl: 'http://localhost:8000/api/v1',
  clerkPublishableKey: 'pk_test_REPLACE_WITH_YOUR_DEV_CLERK_KEY',
  defaultLocale: 'en',
}
