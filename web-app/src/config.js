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

let accessToken = null;
let refreshPromise = null;
const refreshClient = Axios.create({ withCredentials: true });

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const getAccessToken = () => accessToken;

const isAccessTokenExpired = (token) => {
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=');
    const payload = JSON.parse(window.atob(padded));
    return !payload.exp || payload.exp <= Math.floor(Date.now() / 1000) + 30;
  } catch (_) {
    return true;
  }
};

const refreshWebAccessToken = async () => {
  if (accessToken) return accessToken;
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post(`${API_URL}/api/auth/refresh`, {})
      .then((response) => {
        setAccessToken(response.data.accessToken);
        if (response.data.user) localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data.accessToken;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

export const getSocketAccessToken = async () => {
  if (accessToken && isAccessTokenExpired(accessToken)) accessToken = null;
  if (accessToken || !localStorage.getItem('user')) return accessToken;
  try {
    return await refreshWebAccessToken();
  } catch (_) {
    clearWebSession();
    return null;
  }
};

export const clearWebSession = () => {
  accessToken = null;
  localStorage.removeItem('user');
  localStorage.removeItem('token');
};

export const logoutWebSession = async () => {
  try {
    await refreshClient.post(`${API_URL}/api/auth/logout`, {});
  } catch (_) {
    // Local cleanup still happens if the network is unavailable.
  } finally {
    clearWebSession();
  }
};

if (!explicitApi) {
  console.warn(
    `API_URL not provided via env. Using ${API_URL}; set REACT_APP_API_URL for production.`
  );
}

Axios.defaults.withCredentials = true;

Axios.interceptors.request.use(async (config) => {
  const requestUrl = String(config.url || '');
  const isAuthRequest = ['/api/login', '/api/auth/refresh', '/api/auth/logout'].some((path) => requestUrl.includes(path));
  if (!accessToken && !isAuthRequest && localStorage.getItem('user')) {
    try {
      await refreshWebAccessToken();
    } catch (refreshError) {
      clearWebSession();
      throw refreshError;
    }
  }
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

Axios.interceptors.response.use(
  (response) => {
    if (response.data?.accessToken) setAccessToken(response.data.accessToken);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = String(originalRequest?.url || '');
    const isAuthRequest = ['/api/login', '/api/auth/refresh', '/api/auth/logout'].some((path) => requestUrl.includes(path));

    if (error.response?.status !== 401 || originalRequest?._authRetried || isAuthRequest || !localStorage.getItem('user')) {
      return Promise.reject(error);
    }

    originalRequest._authRetried = true;
    try {
      const nextAccessToken = await refreshWebAccessToken();
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
      return Axios(originalRequest);
    } catch (refreshError) {
      clearWebSession();
      if (window.location.pathname !== '/login' && window.location.pathname !== '/admin') {
        window.location.assign('/login');
      }
      return Promise.reject(refreshError);
    }
  }
);

// Google reCAPTCHA v3 site key
// In production, set REACT_APP_RECAPTCHA_SITE_KEY to override.
export const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '6Le9F78sAAAAAFJyu6LCOBNGjUaJJEHhQwqmoOLu';
