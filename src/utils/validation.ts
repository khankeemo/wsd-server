const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[0-9()\-\s]{7,20}$/;
const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export const isValidEmail = (value: unknown) =>
  EMAIL_REGEX.test(String(value || "").trim().toLowerCase());

export const isValidPhone = (value: unknown) => {
  const phone = String(value || "").trim();
  if (!phone) return true;
  return PHONE_REGEX.test(phone);
};

export const isStrongPassword = (value: unknown) =>
  STRONG_PASSWORD_REGEX.test(String(value || ""));

export const getPasswordValidationMessage = () =>
  "Password must include uppercase, lowercase, number, and special character, with at least 8 characters.";
