const SERVICE_TYPES = new Map([
  ['tattoo', 'Tattoo Session'],
  ['tattoo session', 'Tattoo Session'],
  ['piercing', 'Piercing'],
  ['piercing session', 'Piercing'],
  ['tattoo + piercing', 'Tattoo + Piercing'],
  ['consultation', 'Consultation'],
  ['touch-up', 'Touch-up'],
  ['touch up', 'Touch-up'],
]);

function normalizeServiceType(value) {
  return typeof value === 'string' ? SERVICE_TYPES.get(value.trim().toLowerCase()) || null : null;
}

// Only an explicit service prefix can recover a legacy classification. A design
// name, booking code, photo, or payment is not evidence of the procedure performed.
function resolveAftercareService(appointment) {
  const stored = String(appointment.service_type || '').trim().toLowerCase();
  const explicit = normalizeServiceType(stored);
  if (explicit) return explicit;
  if (stored && stored !== 'general session') return null;
  const title = String(appointment.design_title || '');
  if (!title.includes(':')) return null;
  return normalizeServiceType(title.split(':')[0]);
}

function isTattooAftercare(appointment) {
  return ['Tattoo Session', 'Tattoo + Piercing', 'Touch-up'].includes(resolveAftercareService(appointment));
}

// Shared by the dashboard, guide and daily reminders. Keep this in step with the
// resolver above; never reinterpret an explicitly classified non-tattoo service.
const TATTOO_AFTERCARE_SQL = `(
  LOWER(TRIM(ap.service_type)) IN ('tattoo', 'tattoo session', 'tattoo + piercing', 'touch-up', 'touch up')
  OR (
    COALESCE(LOWER(TRIM(ap.service_type)), '') IN ('', 'general session')
    AND LOCATE(':', ap.design_title) > 0
    AND LOWER(TRIM(SUBSTRING_INDEX(ap.design_title, ':', 1))) IN ('tattoo', 'tattoo session', 'tattoo + piercing', 'touch-up', 'touch up')
  )
)`;

module.exports = { normalizeServiceType, resolveAftercareService, isTattooAftercare, TATTOO_AFTERCARE_SQL };
