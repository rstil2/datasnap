export const validateEmail = (email: string): string | null => {
  if (!email) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email address';
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  return null;
};

export const validateFullName = (fullName: string): string | null => {
  if (!fullName) {
    return 'Full name is required';
  }
  if (fullName.length < 2) {
    return 'Full name must be at least 2 characters long';
  }
  return null;
};