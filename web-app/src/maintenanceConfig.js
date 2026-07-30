/**
 * Maintenance & Access Control Configuration
 * 
 * Set these flags to true to temporarily disable specific features
 * and redirect users to the maintenance notification page.
 * To revert, simply set them to false.
 */
export const MAINTENANCE_CONFIG = {
  disableRegistration: false, // Replaces /register page with maintenance notice
  disableBooking: false,      // Replaces public /book and customer /customer/book with maintenance notice
  facebookUrl: 'https://www.facebook.com/inkvictus'
};
