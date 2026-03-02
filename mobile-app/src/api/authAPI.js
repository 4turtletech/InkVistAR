// src/api/authAPI.js
import { fetchAPI, saveAuthToken, removeAuthToken } from '../utils/api';

// Login with email/password
export const login = async (email, password, userType) => {
  const result = await fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, userType }),
  });
  
  if (result.success && result.token) {
    await saveAuthToken(result.token);
    await saveUserData(result.user);
  }
  
  return result;
};

// Register new user
export const register = async (userData) => {
  const result = await fetchAPI('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  
  if (result.success && result.token) {
    await saveAuthToken(result.token);
    await saveUserData(result.user);
  }
  
  return result;
};

// Logout
export const logout = async () => {
  const result = await fetchAPI('/auth/logout', {
    method: 'POST',
  });
  
  await removeAuthToken();
  await removeUserData();
  
  return result;
};

// Verify email
export const verifyEmail = async (token) => {
  return fetchAPI('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
};

// Request password reset
export const requestPasswordReset = async (email) => {
  return fetchAPI('/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

// Reset password
export const resetPassword = async (token, newPassword) => {
  return fetchAPI('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
};

// Change password
export const changePassword = async (currentPassword, newPassword) => {
  return fetchAPI('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
};

// Get current user
export const getCurrentUser = async () => {
  return fetchAPI('/auth/me');
};

// Update profile
export const updateProfile = async (profileData) => {
  return fetchAPI('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

// Delete account
export const deleteAccount = async (password) => {
  const result = await fetchAPI('/auth/account', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
  
  if (result.success) {
    await removeAuthToken();
    await removeUserData();
  }
  
  return result;
};

// Helper functions for local storage
const saveUserData = async (user) => {
  try {
    // await AsyncStorage.setItem('user_data', JSON.stringify(user));
    console.log('User data saved:', user.id);
  } catch (error) {
    console.error('Error saving user data:', error);
  }
};

const removeUserData = async () => {
  try {
    // await AsyncStorage.removeItem('user_data');
    console.log('User data removed');
  } catch (error) {
    console.error('Error removing user data:', error);
  }
};