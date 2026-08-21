const PASSWORD_POLICY_MESSAGE = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';

const isStrongPassword = (value) => {
  if (typeof value !== 'string' || value.length > 128) return false;
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value);
};

module.exports = {
  PASSWORD_POLICY_MESSAGE,
  isStrongPassword,
};
