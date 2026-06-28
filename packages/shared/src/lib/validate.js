// Input validation + sanitization. Used on the public search inputs so untrusted
// text is normalized before it ever reaches routing/state. (Both apps reuse this.)

// VINs are 17 chars, A-Z/0-9 excluding I, O, Q.
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/

export function normalizeVin(input) {
  return String(input || '')
    .toUpperCase()
    .replace(/[^A-HJ-NPR-Z0-9]/g, '') // strip separators & disallowed letters
    .slice(0, 17)
}

export const isValidVin = (input) => VIN_RE.test(normalizeVin(input))

// License plates: alphanumeric, a handful of allowed separators, capped length.
export function sanitizePlate(input) {
  return String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 -]/g, '')
    .trim()
    .slice(0, 10)
}

// Generic short-text sanitizer for free-text search boxes.
export function sanitizeText(input, max = 64) {
  return String(input || '').replace(/[<>]/g, '').trim().slice(0, max)
}

// Pragmatic email check (good enough for client-side gating; server must re-validate).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const isValidEmail = (input) => EMAIL_RE.test(String(input || '').trim())

// Nepal phone: +977 then 9-10 digits, or a local 9/10-digit number. Lenient.
export function isValidPhone(input) {
  const digits = String(input || '').replace(/[^\d]/g, '')
  return digits.length >= 7 && digits.length <= 15
}
