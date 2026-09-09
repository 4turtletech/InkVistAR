import { isValidEmail } from './validators.js';
import { nationalPHPhone, artistPasswordRules } from './artistProfileValidation.js';

export const adminUserErrors = (form, editing = false) => {
  const errors = {};
  if (!String(form.name || '').trim()) errors.name = 'Name is required';
  if (!String(form.email || '').trim()) errors.email = 'Email is required';
  else if (!isValidEmail(String(form.email).trim())) errors.email = 'Please enter a valid email address';
  if (!String(form.phone || '').trim()) errors.phone = 'Phone number is required';
  else if (!/^9\d{9}$/.test(nationalPHPhone(form.phone))) errors.phone = 'Enter a valid PH mobile number: 10 digits starting with 9';
  if (!editing) {
    if (!form.password) errors.password = 'Password is required';
    else if (!artistPasswordRules(form.password).every(rule => rule.met)) errors.password = 'Complete every password requirement below';
    if (!form.confirmPassword) errors.confirmPassword = 'Please confirm password';
    else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
};

export const invoiceFormErrors = (form) => {
  const errors = {};
  if (!String(form.clientName || '').trim()) errors.clientName = 'Client name is required';
  const amount = Number(form.amount);
  if (!String(form.amount ?? '').trim() || !Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Enter a valid amount greater than 0';
  }
  return errors;
};

export const sessionTimeSelection = (value) => {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(value || ''));
  return match && Number(match[1]) < 24 && Number(match[2]) < 60 ? `${match[1]}:${match[2]}` : '';
};
