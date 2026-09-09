export const getPortfolioTitleError = (value) => {
  const title = String(value || '').trim();
  if (!title) return 'Title is required.';
  if (title.length < 3 || title.length > 50) return 'Title must be between 3 and 50 characters.';
  if (!/^[a-zA-Z0-9 ]+$/.test(title)) return 'Only letters, numbers, and spaces allowed.';
  return '';
};
