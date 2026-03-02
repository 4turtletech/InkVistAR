// src/api/commonAPI.js
import { fetchAPI } from '../utils/api';

// Search artists
export const searchArtists = async (filters = {}) => {
  const queryParams = new URLSearchParams(filters).toString();
  return fetchAPI(`/artists/search?${queryParams}`);
};

// Get artist details
export const getArtistDetails = async (artistId) => {
  return fetchAPI(`/artists/${artistId}`);
};

// Get trending designs
export const getTrendingDesigns = async () => {
  return fetchAPI('/designs/trending');
};

// Search designs
export const searchDesigns = async (filters = {}) => {
  const queryParams = new URLSearchParams(filters).toString();
  return fetchAPI(`/designs/search?${queryParams}`);
};

// Get design details
export const getDesignDetails = async (designId) => {
  return fetchAPI(`/designs/${designId}`);
};

// Get design categories
export const getDesignCategories = async () => {
  return fetchAPI('/designs/categories');
};

// Get styles
export const getStyles = async () => {
  return fetchAPI('/styles');
};

// Get placement suggestions
export const getPlacementSuggestions = async (designId = null, style = null) => {
  let url = '/placements/suggestions';
  const params = [];
  
  if (designId) params.push(`designId=${designId}`);
  if (style) params.push(`style=${style}`);
  
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  
  return fetchAPI(url);
};

// Get aftercare instructions
export const getAftercareInstructions = async (type = 'standard') => {
  return fetchAPI(`/aftercare/${type}`);
};

// Get pricing estimates
export const getPricingEstimates = async (size, style, placement, complexity) => {
  return fetchAPI(`/pricing/estimate?size=${size}&style=${style}&placement=${placement}&complexity=${complexity}`);
};

// Get studio locations
export const getStudioLocations = async (city = null) => {
  let url = '/studios/locations';
  if (city) {
    url += `?city=${encodeURIComponent(city)}`;
  }
  return fetchAPI(url);
};

// Get studio details
export const getStudioDetails = async (studioId) => {
  return fetchAPI(`/studios/${studioId}`);
};

// Contact artist/studio
export const sendContactMessage = async (toId, message, fromType, fromId) => {
  return fetchAPI('/contact/message', {
    method: 'POST',
    body: JSON.stringify({ toId, message, fromType, fromId }),
  });
};

// Report issue
export const reportIssue = async (issueData) => {
  return fetchAPI('/report/issue', {
    method: 'POST',
    body: JSON.stringify(issueData),
  });
};