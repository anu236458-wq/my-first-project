/**
 * Phone Number Validation & Formatting Utility
 * Enforces E.164 international standard e.g. +91XXXXXXXXXX
 */

function formatWhatsAppNumber(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters except leading plus
  let cleaned = phone.trim().replace(/[^\d+]/g, '');

  // If starts with +, verify standard format
  if (cleaned.startsWith('+')) {
    const digitsOnly = cleaned.slice(1);
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      return cleaned;
    }
    return null;
  }

  // If starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
    return formatWhatsAppNumber(cleaned);
  }

  // If 10 digits (Standard Indian Mobile without prefix e.g. 9876543210)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return '+91' + cleaned;
  }

  // If 11 digits starting with 0 (e.g. 09876543210)
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return '+91' + cleaned.slice(1);
  }

  // If 12 digits starting with 91 (e.g. 919876543210)
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return '+' + cleaned;
  }

  return null;
}

function isValidPhone(phone) {
  return formatWhatsAppNumber(phone) !== null;
}

/**
 * Generate a wa.me Click-to-Chat direct fallback link
 */
function getWhatsAppDirectLink(phone, messageText) {
  const formatted = formatWhatsAppNumber(phone);
  if (!formatted) return null;
  const digits = formatted.replace('+', '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(messageText)}`;
}

module.exports = {
  formatWhatsAppNumber,
  isValidPhone,
  getWhatsAppDirectLink
};
