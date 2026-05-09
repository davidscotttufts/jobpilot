import "server-only";

/**
 * Lightweight in-process SSE broker. Subscribers get a ReadableStream that
 * emits structured `data:` events whenever publish() is called for a topic.
 *
 * Only meaningful within a single Next.js process; for a multi-instance
 * deployment we'd need a shared bus (Redis pub/sub). Local single-user
 * tool, so in-process is fine.
 */

type Subscriber = ReadableStreamDefaultController<Uint8Array>;

const encoder = new TextEncoder();

/**
 * Topic-based SSE pub/sub surface.
 *
 * Each topic maps to an independent set of connected response streams. Events
 * are encoded as standard SSE `data:` frames, while heartbeat comments keep
 * idle connections from being treated as dead by intermediaries.
 */
export interface SseBroker<TEvent> {
  /** Publish one event to every active subscriber for the topic. */
  publish: (topic: string, event: TEvent) => void;

  /**
   * Open a ReadableStream for a topic. The caller is responsible for returning
   * it with `content-type: text/event-stream`.
   */
  subscribe: (topic: string) => ReadableStream<Uint8Array>;
}

interface SseBrokerOptions {
  /** Interval for SSE comment heartbeats. Defaults to 15 seconds. */
  heartbeatMs?: number;
}

function formatEvent(event: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function formatComment(comment: string): Uint8Array {
  return encoder.encode(`: ${comment}\n\n`);
}

/**
 * Create an in-memory SSE broker scoped to the current Next.js process.
 *
 * This is intentionally small: it does not persist events, replay missed
 * messages, or coordinate across server instances.
 */
export function createSseBroker<TEvent = unknown>(
  options: SseBrokerOptions = {},
): SseBroker<TEvent> {
  const subscribers = new Map<string, Set<Subscriber>>();
  const cleanups = new Map<Subscriber, () => void>();
  const heartbeatMs = options.heartbeatMs ?? 15_000;

  const remove = (topic: string, controller: Subscriber): void => {
    const current = subscribers.get(topic);
    if (!current) {
      return;
    }

    current.delete(controller);
    if (current.size === 0) {
      subscribers.delete(topic);
    }
  };

  return {
    publish(topic, event) {
      const set = subscribers.get(topic);
      if (!set) {
        return;
      }

      const chunk = formatEvent(event);
      for (const sub of set) {
        try {
          sub.enqueue(chunk);
        } catch {
          cleanups.get(sub)?.();
        }
      }
    },

    subscribe(topic) {
      let cleanup: () => void = () => {};

      return new ReadableStream<Uint8Array>({
        start(controller) {
          let set = subscribers.get(topic);
          if (!set) {
            set = new Set();
            subscribers.set(topic, set);
          }
          set.add(controller);

          // Initial heartbeat so the client sees the connection is alive.
          controller.enqueue(formatComment("connected"));

          const heartbeat = setInterval(() => {
            try {
              controller.enqueue(formatComment("ping"));
            } catch {
              cleanup();
            }
          }, heartbeatMs);

          cleanup = () => {
            clearInterval(heartbeat);
            cleanups.delete(controller);
            remove(topic, controller);
          };
          cleanups.set(controller, cleanup);
        },

        cancel() {
          cleanup();
        },
      });
    },
  };
}
