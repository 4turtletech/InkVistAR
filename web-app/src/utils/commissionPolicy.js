export const DEFAULT_COMMISSION_RATE = 0.60;

// Fixed artist pool. Legacy per-artist rates and referral flags cannot override it.
export function resolveCommissionRate() {
  return DEFAULT_COMMISSION_RATE;
}

export function normalizeCommissionSplit(value) {
  if (value === undefined || value === null || value === '') return 50;
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new Error('Artist share must be a whole percentage from 0 to 100.');
  }
  const split = Number(value);
  if (!Number.isInteger(split) || split < 0 || split > 100) {
    throw new Error('Artist share must be a whole percentage from 0 to 100.');
  }
  return split;
}

// commission_split is the primary artist's agreed percentage of the 60% pool.
export function artistCommission(appointment, artistId) {
  const price = Math.max(0, Number(appointment.price) || 0);
  const discount = Math.max(0, Number(appointment.discount_amount) || 0);
  const basePrice = appointment.discount_type === 'percent'
    ? price * (1 - Math.min(100, discount) / 100)
    : Math.max(0, price - discount);
  const primaryId = Number(appointment.artist_id);
  const secondaryId = Number(appointment.secondary_artist_id);
  const isCollab = secondaryId > 0 && secondaryId !== primaryId;
  const isPrimary = Number(artistId) === primaryId;
  const assigned = isPrimary || (isCollab && Number(artistId) === secondaryId);
  let primarySplit;
  try { primarySplit = normalizeCommissionSplit(appointment.commission_split); }
  catch { primarySplit = 50; } // Safe display fallback for invalid legacy records.
  const splitPercent = !assigned ? 0 : !isCollab ? 100 : isPrimary ? primarySplit : 100 - primarySplit;
  const poolCents = Math.round(basePrice * DEFAULT_COMMISSION_RATE * 100);
  const primaryCents = Math.round(poolCents * primarySplit / 100);
  const shareCents = !assigned ? 0 : !isCollab ? poolCents : isPrimary ? primaryCents : poolCents - primaryCents;
  return {
    basePrice, isCollab, isPrimary, splitPercent,
    effectiveRate: DEFAULT_COMMISSION_RATE * splitPercent / 100,
    artistShare: shareCents / 100,
    artistPool: poolCents / 100,
    studioShare: (Math.round(basePrice * 100) - poolCents) / 100,
  };
}
