export function cryptoShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  // @ts-ignore: crypto доступен в edge/runtime
  const getRand = (n: number) => {
    const buf = new Uint32Array(1);
    // @ts-ignore
    crypto.getRandomValues(buf);
    return buf[0] % n;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = getRand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickRandomIds(ids: number[], count: number): number[] {
  return cryptoShuffle(ids).slice(0, count);
}


