// Deterministic, seedable PRNG + small numeric helpers. Shared by both apps so their
// generated demo data stays in sync (drift here would silently desync the two datasets).

// FNV-1a string hash -> 32-bit seed.
export function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// mulberry32: returns a () => float in [0,1) from a seed.
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const pick = (r, arr) => arr[Math.floor(r() * arr.length)]
export const between = (r, lo, hi) => lo + r() * (hi - lo)
export const intBetween = (r, lo, hi) => Math.floor(between(r, lo, hi + 1))
export const roundTo = (n, step) => Math.round(n / step) * step
export const pad2 = (n) => String(n).padStart(2, '0')
