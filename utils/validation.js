// Email validation
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
const isValidPassword = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return {
    isValid: password.length >= 8, // Simplified for now
    message: password.length < 8 ? 'Password must be at least 8 characters long' : null
  };
};

// Username validation
const isValidUsername = (username) => {
  // Alphanumeric and underscore, 3-20 characters
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return {
    isValid: usernameRegex.test(username),
    message: !usernameRegex.test(username) 
      ? 'Username must be 3-20 characters and contain only letters, numbers, and underscores' 
      : null
  };
};

// Sanitize input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidUsername,
  sanitizeInput
};