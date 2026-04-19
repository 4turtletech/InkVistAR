// Determine the API URL based on the environment
const isProduction = process.env.NODE_ENV === 'production';

// Prefer explicit env vars; fall back to same-origin relative API (useful when frontend and backend are served together).
const explicitApi =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_BACKEND_URL;

// Vercel preview/prod: require REACT_APP_API_URL to avoid hitting a non-existent relative /api.
// Local dev: default to localhost:3001.
export const API_URL = explicitApi || (isProduction ? '' : 'http://localhost:3001');

if (!explicitApi) {
  console.warn(
    `API_URL not provided via env. Using ${API_URL || 'relative /api'}; set REACT_APP_API_URL for production.`
  );
}

// Google reCAPTCHA v2 site key
// In production, set REACT_APP_RECAPTCHA_SITE_KEY to your real key.
// The fallback is Google's test key that always passes (for development only).
export const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
