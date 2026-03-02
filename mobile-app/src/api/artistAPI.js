// src/api/artistAPI.js
import { fetchAPI } from '../utils/api';

// Get artist dashboard data
export const getArtistDashboard = async (artistId) => {
  return fetchAPI(`/artist/dashboard/${artistId}`);
};

// Get artist clients
export const getArtistClients = async (artistId) => {
  return fetchAPI(`/artist/clients/${artistId}`);
};

// Get artist earnings with time filter
export const getArtistEarnings = async (artistId, period = 'month') => {
  return fetchAPI(`/artist/earnings/${artistId}?period=${period}`);
};

// Get artist schedule with filter
export const getArtistSchedule = async (artistId, filter = 'today') => {
  return fetchAPI(`/artist/schedule/${artistId}?filter=${filter}`);
};

// Get artist portfolio works
export const getArtistPortfolio = async (artistId, category = 'all', page = 1, limit = 10) => {
  return fetchAPI(`/artist/portfolio/${artistId}?category=${category}&page=${page}&limit=${limit}`);
};

// Upload portfolio work
export const uploadPortfolioWork = async (artistId, workData) => {
  const formData = new FormData();
  formData.append('artistId', artistId.toString());
  formData.append('title', workData.title);
  formData.append('category', workData.category);
  
  if (workData.description) {
    formData.append('description', workData.description);
  }
  
  if (workData.image) {
    formData.append('image', {
      uri: workData.image,
      type: 'image/jpeg',
      name: `portfolio-${Date.now()}.jpg`,
    });
  }
  
  return fetchAPI('/artist/portfolio/upload', {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Update portfolio work
export const updatePortfolioWork = async (workId, updates) => {
  return fetchAPI(`/artist/portfolio/${workId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

// Delete portfolio work
export const deletePortfolioWork = async (workId) => {
  return fetchAPI(`/artist/portfolio/${workId}`, {
    method: 'DELETE',
  });
};

// Get artist appointments
export const getArtistAppointments = async (artistId, status = null, startDate = null, endDate = null) => {
  let url = `/artist/appointments/${artistId}`;
  const params = [];
  
  if (status) params.push(`status=${status}`);
  if (startDate) params.push(`startDate=${startDate}`);
  if (endDate) params.push(`endDate=${endDate}`);
  
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  
  return fetchAPI(url);
};

// Update appointment status
export const updateAppointmentStatus = async (appointmentId, status, notes = null) => {
  const data = { status };
  if (notes) data.notes = notes;
  
  return fetchAPI(`/artist/appointments/${appointmentId}/status`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// Get artist statistics
export const getArtistStatistics = async (artistId) => {
  return fetchAPI(`/artist/statistics/${artistId}`);
};

// Get artist reviews
export const getArtistReviews = async (artistId, page = 1, limit = 10) => {
  return fetchAPI(`/artist/reviews/${artistId}?page=${page}&limit=${limit}`);
};

// Update artist profile
export const updateArtistProfile = async (artistId, profileData) => {
  return fetchAPI(`/artist/profile/${artistId}`, {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

// Get artist availability
export const getArtistAvailability = async (artistId) => {
  return fetchAPI(`/artist/availability/${artistId}`);
};

// Update artist availability
export const updateArtistAvailability = async (artistId, availability) => {
  return fetchAPI(`/artist/availability/${artistId}`, {
    method: 'PUT',
    body: JSON.stringify({ availability }),
  });
};

// Withdraw earnings
export const withdrawEarnings = async (artistId, amount, paymentMethod) => {
  return fetchAPI(`/artist/withdraw/${artistId}`, {
    method: 'POST',
    body: JSON.stringify({ amount, paymentMethod }),
  });
};