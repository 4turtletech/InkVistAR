const { artistCommission } = require('./commissionPolicy');

const PAID_PAYOUT_STATUSES = new Set(['paid', 'completed']);
const MAX_PAYOUT_AMOUNT = 99999999.99;
const PAYOUT_METHODS_REQUIRING_REFERENCE = new Set(['Bank Transfer', 'GCash']);

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

function isPaidPayout(payout) {
  return PAID_PAYOUT_STATUSES.has(String(payout?.status || '').trim().toLowerCase());
}

function isAppointmentFullyPaid(appointment) {
  const price = Math.max(0, Number(appointment?.price) || 0);
  const totalPaid = Math.max(0, Number(appointment?.total_paid) || 0);
  return String(appointment?.payment_status || '').toLowerCase() === 'paid'
    || (price > 0 && totalPaid >= price);
}

function summarizeArtistPayout(artist, appointments = [], payouts = []) {
  const artistId = Number(artist.id ?? artist.artist_id);
  let totalEarned = 0;
  let awaitingCustomerPayment = 0;

  appointments.forEach((appointment) => {
    if (String(appointment.status || '').toLowerCase() !== 'completed' || Number(appointment.is_deleted || 0) !== 0) return;
    const share = artistCommission(appointment, artistId).artistShare;
    if (isAppointmentFullyPaid(appointment)) totalEarned += share;
    else awaitingCustomerPayment += share;
  });

  const totalPaidOut = payouts
    .filter(isPaidPayout)
    .reduce((sum, payout) => sum + Math.max(0, Number(payout.amount) || 0), 0);

  totalEarned = roundMoney(totalEarned);
  awaitingCustomerPayment = roundMoney(awaitingCustomerPayment);
  const paid = roundMoney(totalPaidOut);

  return {
    artistId,
    artistName: artist.name || artist.artist_name || `Artist #${artistId}`,
    totalEarned,
    totalPaidOut: paid,
    availableBalance: Math.max(0, roundMoney(totalEarned - paid)),
    awaitingCustomerPayment,
  };
}

function query(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.query(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
  });
}

const APPOINTMENT_EARNINGS_SQL = `
  SELECT ap.id, ap.artist_id, ap.secondary_artist_id, ap.commission_split,
         ap.price, ap.discount_amount, ap.discount_type, ap.payment_status,
         ap.status, ap.is_deleted,
         (COALESCE(payment_totals.gateway_paid, 0) / 100)
           + COALESCE(ap.manual_paid_amount, 0) AS total_paid
  FROM appointments ap
  LEFT JOIN (
    SELECT appointment_id, SUM(amount) AS gateway_paid
    FROM payments
    WHERE status = 'paid'
    GROUP BY appointment_id
  ) payment_totals ON payment_totals.appointment_id = ap.id
  WHERE ap.status = 'completed' AND ap.is_deleted = 0
`;

async function getAdminPayoutBalances(database) {
  const [artists, appointments, payouts] = await Promise.all([
    query(database, `SELECT id, name FROM users WHERE user_type = 'artist' AND is_deleted = 0 ORDER BY name ASC`),
    query(database, APPOINTMENT_EARNINGS_SQL),
    query(database, `SELECT artist_id, amount, status FROM payouts`),
  ]);

  return artists.map((artist) => summarizeArtistPayout(
    artist,
    appointments.filter((appointment) => Number(appointment.artist_id) === Number(artist.id)
      || Number(appointment.secondary_artist_id) === Number(artist.id)),
    payouts.filter((payout) => Number(payout.artist_id) === Number(artist.id)),
  ));
}

async function getArtistPayoutBalance(database, artistId) {
  const artists = await query(database,
    `SELECT id, name FROM users WHERE id = ? AND user_type = 'artist' AND is_deleted = 0 LIMIT 1`,
    [artistId]);
  if (!artists.length) return null;

  const [appointments, payouts] = await Promise.all([
    query(database, `${APPOINTMENT_EARNINGS_SQL} AND (ap.artist_id = ? OR ap.secondary_artist_id = ?)`, [artistId, artistId]),
    query(database, `SELECT artist_id, amount, status FROM payouts WHERE artist_id = ?`, [artistId]),
  ]);
  return summarizeArtistPayout(artists[0], appointments, payouts);
}

function normalizePayoutInput(body = {}) {
  const artistId = Number(body.artistId);
  const amountText = String(body.amount ?? '').trim();
  const amount = roundMoney(body.amount);
  const rawMethod = String(body.method || body.paymentMethod || 'Bank Transfer').trim();
  const method = rawMethod.toLowerCase() === 'g-cash'
    ? 'GCash'
    : rawMethod === 'Cash Disbursement' ? 'Cash' : rawMethod;
  const reference = String(body.reference ?? body.referenceNumber ?? '').trim().slice(0, 100);

  if (!Number.isInteger(artistId) || artistId <= 0) throw new Error('Select a valid artist.');
  if (!Number.isFinite(Number(body.amount)) || amount <= 0) throw new Error('Payout amount must be greater than zero.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(amountText)) throw new Error('Payout amount must use at most two decimal places.');
  if (amount > MAX_PAYOUT_AMOUNT) throw new Error('Payout amount is too large.');
  if (!['Bank Transfer', 'Cash', 'GCash'].includes(method)) {
    throw new Error('Select a valid payout method.');
  }
  if (PAYOUT_METHODS_REQUIRING_REFERENCE.has(method) && !reference) {
    throw new Error(`Reference number is required for ${method}.`);
  }
  return { artistId, amount, method, reference: reference || 'N/A' };
}

module.exports = {
  getAdminPayoutBalances,
  getArtistPayoutBalance,
  isAppointmentFullyPaid,
  isPaidPayout,
  MAX_PAYOUT_AMOUNT,
  normalizePayoutInput,
  roundMoney,
  summarizeArtistPayout,
};
