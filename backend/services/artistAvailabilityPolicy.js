class ArtistAvailabilityInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ArtistAvailabilityInputError';
    this.statusCode = 400;
  }
}

function normalizeBlockedDate(value, today) {
  const date = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ArtistAvailabilityInputError('Select a valid date to block.');
  }

  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new ArtistAvailabilityInputError('Select a valid date to block.');
  }

  if (today && date < today) {
    throw new ArtistAvailabilityInputError('Past dates cannot be blocked.');
  }

  return date;
}

module.exports = { ArtistAvailabilityInputError, normalizeBlockedDate };
