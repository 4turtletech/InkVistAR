/**
 * InkVistAR Mobile -- Centralized API Configuration
 * Single source of truth for backend URL.
 */

// Production: Railway backend via custom domain
export const API_BASE_URL = 'https://api.inkvictusstudio.com';
export const API_URL = `${API_BASE_URL}/api`;

// reCAPTCHA v3 must run on a hostname registered in the Google reCAPTCHA console.
// The web bridge returns a short-lived token to the native WebView; the secret key
// remains exclusively on the backend.
export const CAPTCHA_WEB_URL =
  process.env.EXPO_PUBLIC_CAPTCHA_WEB_URL ||
  'https://www.inkvictusstudio.com/?mobileCaptcha=register';
