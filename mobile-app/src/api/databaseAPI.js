// src/api/databaseAPI.js
import { API_URL } from '../utils/api';

// Enhanced API calls with database integration

// ========== ARTIST API FUNCTIONS ==========

// Get artist dashboard data
export const getArtistDashboard = async (artistId) => {
  try {
    const response = await fetch(`${API_URL}/artist/dashboard/${artistId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching artist dashboard:', error);
    return { success: false, message: 'Network error' };
  }
};

// Get artist clients
export const getArtistClients = async (artistId) => {
  try {
    const response = await fetch(`${API_URL}/artist/clients/${artistId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching artist clients:', error);
    return { success: false, message: 'Network error' };
  }
};

// Get artist earnings
export const getArtistEarnings = async (artistId, timeFilter = 'month') => {
  try {
    const response = await fetch(`${API_URL}/artist/earnings/${artistId}?period=${timeFilter}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching artist earnings:', error);
    return { success: false, message: 'Network error' };
  }
};

// Get artist schedule
export const getArtistSchedule = async (artistId, filter = 'today') => {
  try {
    const response = await fetch(`${API_URL}/artist/schedule/${artistId}?filter=${filter}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching artist schedule:', error);
    return { success: false, message: 'Network error' };
  }
};

// Get artist portfolio
export const getArtistPortfolio = async (artistId, category = 'all') => {
  try {
    const response = await fetch(`${API_URL}/artist/portfolio/${artistId}?category=${category}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching artist portfolio:', error);
    return { success: false, message: 'Network error' };
  }
};

// Upload portfolio work
export const uploadPortfolioWork = async (artistId, workData) => {
  try {
    const formData = new FormData();
    formData.append('artistId', artistId);
    formData.append('title', workData.title);
    formData.append('category', workData.category);
    if (workData.description) formData.append('description', workData.description);
    if (workData.image) {
      formData.append('image', {
        uri: workData.image,
        type: 'image/jpeg',
        name: 'portfolio-work.jpg',
      });
    }

    const response = await fetch(`${API_URL}/artist/portfolio/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Error uploading portfolio work:', error);
    return { success: false, message: 'Network error' };
  }
};

// ========== CUSTOMER API FUNCTIONS ==========

// Get customer dashboard
export const getCustomerDashboard = async (customerId) => {
  try {
    const response = await fetch(`${API_URL}/customer/dashboard/${customerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching customer dashboard:', error);
    return { success: false, message: 'Network error' };
  }
};

// Get saved designs
export const getSavedDesigns = async (customerId) => {
  try {
    const response = await fetch(`${API_URL}/customer/saved-designs/${customerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching saved designs:', error);
    return { success: false, message: 'Network error' };
  }
};

// Get customer appointments
export const getCustomerAppointments = async (customerId) => {
  try {
    const response = await fetch(`${API_URL}/customer/appointments/${customerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return { success: false, message: 'Network error' };
  }
};

// Book appointment
export const bookAppointment = async (appointmentData) => {
  try {
    const response = await fetch(`${API_URL}/customer/appointments/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });
    return await response.json();
  } catch (error) {
    console.error('Error booking appointment:', error);
    return { success: false, message: 'Network error' };
  }
};

// ========== COMMON API FUNCTIONS ==========

// Search artists
export const searchArtists = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await fetch(`${API_URL}/artists/search?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Error searching artists:', error);
    return { success: false, message: 'Network error' };
  }
};

// Get artist details
export const getArtistDetails = async (artistId) => {
  try {
    const response = await fetch(`${API_URL}/artists/${artistId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching artist details:', error);
    return { success: false, message: 'Network error' };
  }
};

// Get trending designs
export const getTrendingDesigns = async () => {
  try {
    const response = await fetch(`${API_URL}/designs/trending`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching trending designs:', error);
    return { success: false, message: 'Network error' };
  }
};