// Settings for CLIENT_ENV=local (npm run dev). NO secrets: everything in a browser bundle is public.
// The Clerk *publishable* key is designed to be public (it only identifies your Clerk app).
export default {
  apiBaseUrl: 'http://localhost:8000/api/v1',
  clerkPublishableKey: 'pk_test_c3R1bm5pbmctY295b3RlLTQyMTEuY2xlcmsuYWNjb3VudHMuZGV2JA',
  defaultLocale: 'en',
}
