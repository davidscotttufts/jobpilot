/**
 * One shared value behind `useSyncExternalStore`. Module-scoped stores exist because several
 * components mount against the same live data (the journal buffer, the clock tick) and per-hook
 * state would fan one update into N copies.
 *
 * `onActive` runs when the first subscriber arrives and its teardown when the last one leaves, so a
 * store backed by a timer or a socket costs nothing while nothing is watching.
 */
export class ExternalStore<T> {
  private readonly listeners = new Set<() => void>();
  private teardown: (() => void) | null = null;

  constructor(
    private value: T,
    private readonly onActive?: () => () => void,
  ) {
    // `useSyncExternalStore` re-subscribes whenever it gets a new function identity, so the two
    // members it receives must be stable and already bound.
    this.subscribe = this.subscribe.bind(this);
    this.get = this.get.bind(this);
  }

  get(): T {
    return this.value;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    if (this.listeners.size === 1) {
      this.teardown = this.onActive?.() ?? null;
    }

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.teardown?.();
        this.teardown = null;
      }
    };
  }

  /** Replaces the value and notifies. An `Object.is`-equal write is a no-op, so callers can be lazy. */
  set(next: T): void {
    if (Object.is(next, this.value)) {
      return;
    }
    this.value = next;
    for (const listener of this.listeners) {
      listener();
    }
  }

  update(next: (current: T) => T): void {
    this.set(next(this.value));
  }
}
