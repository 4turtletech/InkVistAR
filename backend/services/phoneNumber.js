const PH_LOCAL_MOBILE_PATTERN = /^9\d{9}$/;

function extractPhilippineLocalMobileNumber(value) {
  if (value === undefined || value === null) return null;

  const input = String(value).trim();
  if (!/^\+?[\d\s()-]+$/.test(input)) return null;

  const digits = input.replace(/\D/g, '');
  let localNumber = digits;

  if (digits.startsWith('63')) localNumber = digits.slice(2);
  if (localNumber.startsWith('0')) localNumber = localNumber.slice(1);

  return PH_LOCAL_MOBILE_PATTERN.test(localNumber) ? localNumber : null;
}

function normalizePhilippineMobileNumber(value) {
  const localNumber = extractPhilippineLocalMobileNumber(value);
  return localNumber ? `+63${localNumber}` : null;
}

module.exports = {
  extractPhilippineLocalMobileNumber,
  normalizePhilippineMobileNumber,
};
