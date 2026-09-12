export const normalizeConsentIdentity = (value = '') => String(value)
  .normalize('NFKC')
  .replace(/\s+/g, ' ')
  .trim()
  .toLocaleLowerCase('en-US');

export const signatureMatchesFullName = (signature, fullName) => {
  const normalizedSignature = normalizeConsentIdentity(signature);
  const normalizedName = normalizeConsentIdentity(fullName);
  return Boolean(normalizedSignature && normalizedName && normalizedSignature === normalizedName);
};

export const customerSignatureError = (signature, fullName) => {
  if (String(signature || '').trim().length < 3) return 'Type your full legal name.';
  if (!String(fullName || '').trim()) return 'Unable to verify your profile name. Refresh the appointment and try again.';
  if (!signatureMatchesFullName(signature, fullName)) return 'Signature must match your profile full name exactly.';
  return '';
};
