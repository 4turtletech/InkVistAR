export const mapPasswordRecoveryFailure = (result) => {
  const message = result?.message || 'Unable to update the password. Please try again.';
  const code = String(result?.code || '').toLowerCase();

  if (
    code === 'password_reused'
    || code === 'password_policy_failed'
    || /password.*same as.*old password/i.test(message)
  ) {
    return { password: message };
  }

  if (code === 'recovery_token_invalid' || /recovery code.*invalid|invalid or expired/i.test(message)) {
    return { recoveryToken: message };
  }

  return { submit: message };
};
