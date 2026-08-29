export const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch (error) {
    localStorage.removeItem('user');
    return null;
  }
};

export const getBookingDestination = (user) => {
  if (!user) return { pathname: '/book', state: undefined };

  const roleDestinations = {
    customer: { pathname: '/customer/bookings', state: { autoOpenBooking: true } },
    admin: { pathname: '/admin/dashboard', state: undefined },
    manager: { pathname: '/manager', state: undefined },
    artist: { pathname: '/artist', state: undefined },
  };

  return roleDestinations[user.type] || { pathname: '/', state: undefined };
};

export const navigateToBooking = (navigate, user = readStoredUser(), options = {}) => {
  const destination = getBookingDestination(user);
  const navigationOptions = {
    ...options,
    ...(destination.state ? { state: destination.state } : {}),
  };
  navigate(destination.pathname, navigationOptions);
};
