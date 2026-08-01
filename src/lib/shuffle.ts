/**
 * Deterministic, seeded shuffle so consecutive prompts (which are often
 * minimal-pair "siblings" added back-to-back, e.g. خر/خار) don't land next
 * to each other, while still giving each returning speaker a *stable*
 * order across page reloads — reshuffling on every visit would otherwise
 * make "resume where I left off" feel random.
 */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const random = mulberry32(hashString(seed));
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Simple string hash (32-bit) used to seed the PRNG. */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/** Mulberry32: tiny, fast, deterministic PRNG — good enough for shuffling. */
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
