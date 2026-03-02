// src/api/index.js
// Export all API functions from one place

// Authentication
export * from './authAPI';

// Artist APIs
export * from './artistAPI';

// Customer APIs
export * from './customerAPI';

// Common APIs
export * from './commonAPI';

// Base API utilities
export { fetchAPI, saveAuthToken, removeAuthToken, isAuthenticated } from '../utils/api';