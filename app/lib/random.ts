// app/lib/random.ts
type WebCryptoLike = {
  getRandomValues?: (arr: Uint32Array) => Uint32Array;
} | undefined | null;

let webCrypto: WebCryptoLike = undefined;

try {
  // Prefer globalThis.crypto when available (Edge/Browser/Node 20+)
  // Fallback to Node's crypto.webcrypto if present.
  const maybe = (globalThis as any)?.crypto;
  if (maybe?.getRandomValues) {
    webCrypto = maybe as WebCryptoLike;
  } else {
    // dynamic require keeps typings minimal and avoids DOM lib
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('node:crypto');
    webCrypto = (nodeCrypto?.webcrypto ?? null) as WebCryptoLike;
  }
} catch {
  webCrypto = null;
}

function randIndex(n: number): number {
  if (webCrypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    webCrypto.getRandomValues(buf);
    return Math.floor((buf[0] / 0x100000000) * n); // map [0, 2^32) -> [0, n)
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


