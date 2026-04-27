import Axios from 'axios';

// Determine the API URL based on the environment
const isProduction = process.env.NODE_ENV === 'production';

// Prefer explicit env vars; fall back to same-origin relative API (useful when frontend and backend are served together).
const explicitApi =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_BACKEND_URL;

// The direct backend server URL (Railway). Socket.IO MUST connect here directly
// because Vercel's rewrite proxy does NOT support WebSocket upgrades.
const BACKEND_DIRECT_URL = 'https://api.inkvictusstudio.com';

// For regular HTTP API calls: use explicit env var, or fall back to the direct backend URL.
// An empty string ('') causes Socket.IO and some API calls to fail on Vercel.
export const API_URL = explicitApi || (isProduction ? BACKEND_DIRECT_URL : 'http://localhost:3001');

// For Socket.IO: always connect directly to the backend server, never through Vercel proxy.
export const SOCKET_URL = explicitApi || (isProduction ? BACKEND_DIRECT_URL : 'http://localhost:3001');

if (!explicitApi) {
  console.warn(
    `API_URL not provided via env. Using ${API_URL}; set REACT_APP_API_URL for production.`
  );
}

// ── Global Axios Interceptor: Inject Admin Identity ──
// Automatically attaches the logged-in user's ID as X-Admin-Id header
// so every admin mutation is attributed in audit logs.
Axios.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.id) {
        config.headers['X-Admin-Id'] = String(user.id);
      }
    }
  } catch (_) {
    // localStorage parse failure — skip silently
  }
  return config;
});

// Google reCAPTCHA v3 site key
// In production, set REACT_APP_RECAPTCHA_SITE_KEY to override.
export const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '6Le9F78sAAAAAFJyu6LCOBNGjUaJJEHhQwqmoOLu';
