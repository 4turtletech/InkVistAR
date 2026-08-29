import { getBookingDestination, navigateToBooking, readStoredUser } from './bookingNavigation';

beforeEach(() => localStorage.clear());

test('routes authenticated customers to My Bookings with the new-booking flow open', () => {
  const customer = { id: 7, type: 'customer', name: 'Customer' };
  expect(getBookingDestination(customer)).toEqual({
    pathname: '/customer/bookings',
    state: { autoOpenBooking: true },
  });

  const navigate = jest.fn();
  navigateToBooking(navigate, customer, { replace: true });
  expect(navigate).toHaveBeenCalledWith('/customer/bookings', {
    replace: true,
    state: { autoOpenBooking: true },
  });
});

test('keeps guests in the public consultation flow and clears malformed stored sessions', () => {
  expect(getBookingDestination(null)).toEqual({ pathname: '/book', state: undefined });
  localStorage.setItem('user', '{invalid');
  expect(readStoredUser()).toBeNull();
  expect(localStorage.getItem('user')).toBeNull();
});

test.each([
  ['admin', '/admin/dashboard'],
  ['manager', '/manager'],
  ['artist', '/artist'],
])('routes authenticated %s accounts away from public consultation booking', (type, pathname) => {
  expect(getBookingDestination({ id: 10, type })).toEqual({ pathname, state: undefined });
});
