export const REPORT_DETAILS_MIN_LENGTH = 10;
export const REPORT_DETAILS_MAX_LENGTH = 2000;

export const reportDetailsError = (value) => {
  const details = String(value ?? '').trim();

  if (!details) return 'Details are required.';
  if (details.length < REPORT_DETAILS_MIN_LENGTH) {
    return `Please enter at least ${REPORT_DETAILS_MIN_LENGTH} characters.`;
  }
  if (details.length > REPORT_DETAILS_MAX_LENGTH) {
    return `Details cannot exceed ${REPORT_DETAILS_MAX_LENGTH.toLocaleString()} characters.`;
  }

  return '';
};
