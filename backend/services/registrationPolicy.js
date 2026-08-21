const PUBLIC_ACCOUNT_TYPE = 'customer';
const ADMIN_CREATABLE_ACCOUNT_TYPES = new Set(['admin', 'manager', 'artist', 'customer']);

const publicAccountType = () => PUBLIC_ACCOUNT_TYPE;
const isAdminCreatableAccountType = (value) => ADMIN_CREATABLE_ACCOUNT_TYPES.has(value);

module.exports = {
  PUBLIC_ACCOUNT_TYPE,
  publicAccountType,
  isAdminCreatableAccountType,
};
