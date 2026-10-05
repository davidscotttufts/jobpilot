/**
 * One async load, cached for `ttlMs`. It holds the in-flight promise, not the resolved value, so N
 * concurrent misses share one load.
 */
export class TtlCache<T> {
  private entry: { expiresAt: number; value: Promise<T> } | null = null;

  constructor(
    private readonly load: () => Promise<T>,
    private readonly ttlMs: number,
  ) {}

  get(): Promise<T> {
    const now = Date.now();
    if (this.entry && this.entry.expiresAt > now) {
      return this.entry.value;
    }

    const value = this.load();
    const entry = { expiresAt: now + this.ttlMs, value };
    this.entry = entry;
    // A failed load must not be cached for the whole TTL.
    value.catch(() => {
      if (this.entry === entry) {
        this.entry = null;
      }
    });
    return value;
  }
}
