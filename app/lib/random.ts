// app/lib/random.ts
type CryptoLike = { getRandomValues: (arr: Uint32Array) => Uint32Array };

function getCryptoLike(): CryptoLike | null {
  const g = globalThis as unknown as { crypto?: { getRandomValues?: (arr: Uint32Array) => Uint32Array } };
  const c = g.crypto;
  return c && typeof c.getRandomValues === 'function'
    ? { getRandomValues: c.getRandomValues.bind(c) as (arr: Uint32Array) => Uint32Array }
    : null;
}

const cryptoLike = getCryptoLike();

function randIndex(n: number): number {
  if (n <= 0) return 0;
  if (cryptoLike) {
    const buf = new Uint32Array(1);
    cryptoLike.getRandomValues(buf);
    return Math.floor((buf[0] / 0x1_0000_0000) * n); // 2^32
  }
  return Math.floor(Math.random() * n);
}

export function cryptoShuffle<T>(arr: readonly T[]): T[] { // readonly для сигнала «не мутируем вход»
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randIndex(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickRandomIds(ids: readonly number[], count: number): number[] {
  if (count >= ids.length) return cryptoShuffle(ids);
  return cryptoShuffle(ids).slice(0, count);
}
