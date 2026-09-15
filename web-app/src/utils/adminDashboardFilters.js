export function matchesAppointmentSearch(appointment, search) {
  const query = String(search || '').trim().toLowerCase();
  if (!query) return true;

  return [
    appointment?.client_name,
    appointment?.artist_name,
    appointment?.service_type,
    appointment?.design_title,
    appointment?.booking_code,
  ].some((value) => String(value || '').toLowerCase().includes(query));
}
