// app/lib/random.ts
type CryptoLike = {
  getRandomValues: (arr: Uint32Array) => Uint32Array;
};

function getCryptoLike(): CryptoLike | null {
  // We avoid DOM typings: treat globalThis as unknown object with optional crypto that has getRandomValues
  const g = globalThis as unknown as { crypto?: { getRandomValues?: (arr: Uint32Array) => Uint32Array } };
  const c = g.crypto;
  if (c && typeof c.getRandomValues === 'function') {
    // narrow to our minimal interface
    return { getRandomValues: c.getRandomValues.bind(c) as (arr: Uint32Array) => Uint32Array };
  }
  return null;
}

const cryptoLike = getCryptoLike();

function randIndex(n: number): number {
  if (n <= 0) return 0;
  if (cryptoLike) {
    const buf = new Uint32Array(1);
    cryptoLike.getRandomValues(buf);
    // map [0, 2^32) -> [0, n)
    return Math.floor((buf[0] / 0x100000000) * n);
  }
  return Math.floor(Math.random() * n);
}

export function cryptoShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randIndex(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickRandomIds(ids: number[], count: number): number[] {
  if (count >= ids.length) return cryptoShuffle(ids);
  return cryptoShuffle(ids).slice(0, count);
}