export async function track(type: string, payload: unknown) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, payload }),
      keepalive: true,
    });
  } catch {
    // silent
  }
}

