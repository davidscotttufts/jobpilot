interface MemoryCacheOptions {
  ttlMs: number;
  /** Past this many keys the least recently used one is dropped. Unbounded when omitted. */
  maxEntries?: number;
  /** Clock override, for tests. */
  now?: () => number;
}

interface Entry<V> {
  expiresAt: number;
  value: Promise<V>;
}

/**
 * Async values cached per key for `ttlMs`. An entry holds the in-flight promise, not the resolved
 * value, so concurrent misses on a key share one load; a load that fails is dropped, not cached.
 * In-process only: each API instance keeps its own copy.
 */
export class MemoryCache<K, V> {
  private readonly entries = new Map<K, Entry<V>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(options: MemoryCacheOptions) {
    this.ttlMs = options.ttlMs;
    this.maxEntries = options.maxEntries ?? Number.POSITIVE_INFINITY;
    this.now = options.now ?? Date.now;
  }

  getOrLoad(key: K, load: () => Promise<V>): Promise<V> {
    const now = this.now();
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > now) {
      // Re-inserting moves the key to the back of the Map, which is what makes eviction LRU.
      this.entries.delete(key);
      this.entries.set(key, cached);
      return cached.value;
    }

    // The executor turns a synchronous throw in `load` into a rejection like any other failure.
    const value = new Promise<V>((resolve) => resolve(load()));
    const entry = { expiresAt: now + this.ttlMs, value };
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.evictOverflow();

    value.catch(() => {
      // Only if still current: a newer load for the key may have replaced this one.
      if (this.entries.get(key) === entry) {
        this.entries.delete(key);
      }
    });
    return value;
  }

  delete(key: K): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }

  private evictOverflow(): void {
    for (const key of this.entries.keys()) {
      if (this.entries.size <= this.maxEntries) {
        return;
      }
      this.entries.delete(key);
    }
  }
}
