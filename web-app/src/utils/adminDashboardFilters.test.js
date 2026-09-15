import { matchesAppointmentSearch } from './adminDashboardFilters';

describe('admin dashboard appointment search', () => {
  const appointment = {
    client_name: 'Maria Santos',
    artist_name: 'Juan Cruz',
    service_type: 'Tattoo + Piercing',
    design_title: 'Floral sleeve',
    booking_code: 'W-T-0042',
  };

  test('matches service type as well as existing appointment identifiers', () => {
    expect(matchesAppointmentSearch(appointment, 'piercing')).toBe(true);
    expect(matchesAppointmentSearch(appointment, 'floral')).toBe(true);
    expect(matchesAppointmentSearch(appointment, 'w-t-0042')).toBe(true);
    expect(matchesAppointmentSearch(appointment, 'laser')).toBe(false);
  });
});
