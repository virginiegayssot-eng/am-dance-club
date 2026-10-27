// A real phone number needs real digits — not just characters that look like
// formatting (a dash, a space, a lone "+"). A regex that only checks for
// characters in [\d\s\-] (e.g. /^\+?[\d\s\-]{8,15}$/) lets someone type
// "--------" and pass, since dashes are themselves allowed characters.
// Strip everything but digits and check there are enough of them for a real
// number instead — shortest real-world mobile numbers are 8 digits, most are
// 10-11 with a country code.
export function isValidPhone(phone: string): boolean {
  const digitsOnly = phone.replace(/\D/g, "");
  return digitsOnly.length >= 8;
}
