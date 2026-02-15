const PREFIX = 'farmreact:cache:';

export function readCache(key, maxAgeMs = Number.POSITIVE_INFINITY) {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const age = Date.now() - Number(parsed.saved_at || 0);
    if (age > maxAgeMs) return null;

    return parsed.payload;
  } catch {
    return null;
  }
}

export function writeCache(key, payload) {
  try {
    localStorage.setItem(
      `${PREFIX}${key}`,
      JSON.stringify({
        saved_at: Date.now(),
        payload
      })
    );
  } catch {
    // Ignore storage quota errors for now.
  }
}

export async function withCache(key, fetcher, options = {}) {
  const maxAgeMs = Number(options.maxAgeMs || Number.POSITIVE_INFINITY);

  try {
    const payload = await fetcher();
    writeCache(key, payload);
    return {
      payload,
      source: 'remote',
      stale: false
    };
  } catch (error) {
    const fallback = readCache(key, maxAgeMs);
    if (fallback) {
      return {
        payload: fallback,
        source: 'cache',
        stale: true
      };
    }
    throw error;
  }
}
