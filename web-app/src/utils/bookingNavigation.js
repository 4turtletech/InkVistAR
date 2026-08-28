export const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch (error) {
    localStorage.removeItem('user');
    return null;
  }
};

export const getBookingDestination = (user) => (
  user?.type === 'customer'
    ? { pathname: '/customer/bookings', state: { autoOpenBooking: true } }
    : { pathname: '/book', state: undefined }
);

export const navigateToBooking = (navigate, user = readStoredUser(), options = {}) => {
  const destination = getBookingDestination(user);
  const navigationOptions = {
    ...options,
    ...(destination.state ? { state: destination.state } : {}),
  };
  navigate(destination.pathname, navigationOptions);
};
