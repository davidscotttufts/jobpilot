"use client";

import { useEffect, useRef } from "react";

interface UseEventSourceOptions<TEvent> {
  /** Set to false to keep the hook mounted without opening a connection. */
  enabled?: boolean;

  /** Convert the SSE `data` string into the event passed to `onMessage`. */
  parse?: (data: string) => TEvent;

  /** Called for each parsed SSE message. */
  onMessage?: (event: TEvent, raw: MessageEvent<string>) => void;

  /** Called when EventSource reports a connection error or reconnect attempt. */
  onError?: (event: Event) => void;

  /** Called when `parse` throws for an incoming message. */
  onParseError?: (error: unknown, raw: MessageEvent<string>) => void;
}

function parseJson<TEvent>(data: string): TEvent {
  return JSON.parse(data) as TEvent;
}

/**
 * Subscribe to a server-sent event stream for the lifetime of the component.
 *
 * The hook defaults to JSON parsing, keeps callback refs fresh without
 * reconnecting, and relies on the browser's built-in EventSource retry logic.
 */
export function useEventSource<TEvent = unknown>(
  url: string | null | undefined,
  options: UseEventSourceOptions<TEvent> = {},
): void {
  const parseRef = useRef(options.parse ?? parseJson<TEvent>);
  const onMessageRef = useRef(options.onMessage);
  const onErrorRef = useRef(options.onError);
  const onParseErrorRef = useRef(options.onParseError);

  useEffect(() => {
    parseRef.current = options.parse ?? parseJson<TEvent>;
    onMessageRef.current = options.onMessage;
    onErrorRef.current = options.onError;
    onParseErrorRef.current = options.onParseError;
  }, [options.parse, options.onMessage, options.onError, options.onParseError]);

  useEffect(() => {
    if (options.enabled === false || !url) {
      return;
    }

    const source = new EventSource(url);

    source.onmessage = (event) => {
      try {
        onMessageRef.current?.(parseRef.current(event.data), event);
      } catch (err) {
        onParseErrorRef.current?.(err, event);
      }
    };

    source.onerror = (event) => {
      onErrorRef.current?.(event);
    };

    return () => {
      source.close();
    };
  }, [url, options.enabled]);
}
