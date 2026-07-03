/** A single failed fetch (transient D1 contention, a cold Worker, a blip)
 * used to leave client islands stuck on their initial loading state forever
 * — nothing retried, nothing errored visibly. Retry with backoff so a
 * one-off failure self-heals instead of requiring a manual page refresh. */
export async function fetchJsonWithRetry<T>(url: string, attempts = 3, delayMs = 1000): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} -> ${res.status}`);
      return await res.json<T>();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}
