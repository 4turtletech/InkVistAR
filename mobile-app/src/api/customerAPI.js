// src/api/customerAPI.js
import { fetchAPI } from '../utils/api';

// Get customer dashboard
export const getCustomerDashboard = async (customerId) => {
  return fetchAPI(`/customer/dashboard/${customerId}`);
};

// Get customer appointments
export const getCustomerAppointments = async (customerId, status = null) => {
  let url = `/customer/appointments/${customerId}`;
  if (status) {
    url += `?status=${status}`;
  }
  return fetchAPI(url);
};

// Book appointment
export const bookAppointment = async (appointmentData) => {
  return fetchAPI('/customer/appointments/book', {
    method: 'POST',
    body: JSON.stringify(appointmentData),
  });
};

// Cancel appointment
export const cancelAppointment = async (appointmentId) => {
  return fetchAPI(`/customer/appointments/${appointmentId}/cancel`, {
    method: 'PUT',
  });
};

// Reschedule appointment
export const rescheduleAppointment = async (appointmentId, newDate, newTime) => {
  return fetchAPI(`/customer/appointments/${appointmentId}/reschedule`, {
    method: 'PUT',
    body: JSON.stringify({ newDate, newTime }),
  });
};

// Get saved designs
export const getSavedDesigns = async (customerId) => {
  return fetchAPI(`/customer/saved-designs/${customerId}`);
};

// Save design
export const saveDesign = async (customerId, designId) => {
  return fetchAPI('/customer/save-design', {
    method: 'POST',
    body: JSON.stringify({ customerId, designId }),
  });
};

// Unsave design
export const unsaveDesign = async (customerId, designId) => {
  return fetchAPI('/customer/unsave-design', {
    method: 'DELETE',
    body: JSON.stringify({ customerId, designId }),
  });
};

// Get customer favorites (artists)
export const getFavoriteArtists = async (customerId) => {
  return fetchAPI(`/customer/favorites/artists/${customerId}`);
};

// Add favorite artist
export const addFavoriteArtist = async (customerId, artistId) => {
  return fetchAPI('/customer/favorites/artists', {
    method: 'POST',
    body: JSON.stringify({ customerId, artistId }),
  });
};

// Remove favorite artist
export const removeFavoriteArtist = async (customerId, artistId) => {
  return fetchAPI('/customer/favorites/artists', {
    method: 'DELETE',
    body: JSON.stringify({ customerId, artistId }),
  });
};

// Submit review
export const submitReview = async (appointmentId, rating, comment, images = []) => {
  return fetchAPI('/customer/reviews', {
    method: 'POST',
    body: JSON.stringify({ appointmentId, rating, comment, images }),
  });
};

// Update customer profile
export const updateCustomerProfile = async (customerId, profileData) => {
  return fetchAPI(`/customer/profile/${customerId}`, {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

// Get customer preferences
export const getCustomerPreferences = async (customerId) => {
  return fetchAPI(`/customer/preferences/${customerId}`);
};

// Update customer preferences
export const updateCustomerPreferences = async (customerId, preferences) => {
  return fetchAPI(`/customer/preferences/${customerId}`, {
    method: 'PUT',
    body: JSON.stringify({ preferences }),
  });
};

// Get customer gallery favorite works
export const getCustomerFavoriteWorks = async (customerId) => {
  return fetchAPI(`/customer/${customerId}/favorites`);
};

// Get customer's tattoo history
export const getCustomerMyTattoos = async (customerId) => {
  return fetchAPI(`/customer/${customerId}/my-tattoos`);
};

// Toggle favorite work
export const toggleFavoriteWork = async (customerId, workId) => {
  return fetchAPI('/customer/favorites', {
    method: 'POST',
    body: JSON.stringify({ userId: customerId, workId })
  });
};