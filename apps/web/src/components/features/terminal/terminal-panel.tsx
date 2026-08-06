"use client";

import "@xterm/xterm/css/xterm.css";
import { type ReactElement, useEffect, useRef } from "react";
import { Box, useTheme } from "@mui/material";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { API_BASE_URL } from "@/api/base-url";
import { api } from "@/api/client";
import { startSession, TERMINAL_WS_URL, type TerminalProviderId } from "@/lib/terminal";
import { connectWebSocket, type WebSocketClient } from "@/lib/websocket";
import { toBase64 } from "@/utils/base64";

const RESIZE_DEBOUNCE_MS = 220;
/**
 * Serializes session starts across every mount of this panel. The `disposed`
 * guard inside `start()` is only checked after the token fetch resolves, so
 * against a local API that round-trip routinely beats effect cleanup and two
 * mounts both reach `startSession()`.
 */
let sessionStartInFlight: Promise<unknown> | null = null;
const TERMINAL_FONT_FAMILY = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const SHIFT_ENTER_B64 = toBase64("\x1b[13;2u");
const CTRL_C_B64 = toBase64("\x03");

interface TerminalPanelProps {
  provider: TerminalProviderId;
}

/** Shift+Enter as CSI-u, Ctrl+C copy-or-interrupt, Ctrl+V paste; everything else falls through to xterm. */
function createKeyHandler(
  terminal: Terminal,
  sendInput: (b64: string) => void,
): (event: KeyboardEvent) => boolean {
  return (event) => {
    if (event.type !== "keydown") {
      return true;
    }

    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      sendInput(SHIFT_ENTER_B64);
      return false;
    }
    if (event.ctrlKey && !event.altKey && !event.metaKey && event.code === "KeyC") {
      // Copy when there's a selection, otherwise forward a single interrupt.
      // Ctrl+C only interrupts the running process; the Stop button kills the session.
      if (terminal.hasSelection()) {
        event.preventDefault();
        void navigator.clipboard?.writeText(terminal.getSelection());
        return false;
      }

      event.preventDefault();
      sendInput(CTRL_C_B64);
      return false;
    }
    if (event.ctrlKey && !event.altKey && !event.metaKey && event.code === "KeyV") {
      event.preventDefault();
      void navigator.clipboard?.readText().then((text) => {
        if (text) {
          sendInput(toBase64(text));
        }
      });
      return false;
    }
    return true;
  };
}

/** xterm.js bridged to a JobPilot.Terminal PTY over WebSocket; Shift+Enter sent as CSI-u `ESC[13;2u`. */
export function TerminalPanel(props: TerminalPanelProps): ReactElement {
  const { provider } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const theme = useTheme();

  const background = theme.palette.surfaces.base;
  const foreground = theme.palette.text.primary;
  const cursor = theme.palette.primary.main;
  const selection = `${theme.palette.primary.main}40`;

  const themeRef = useRef({ background, foreground, cursor, selectionBackground: selection });

  // Retheme the live terminal in place - remounting it would wipe the visible session.
  useEffect(() => {
    const next = { background, foreground, cursor, selectionBackground: selection };
    themeRef.current = next;
    const terminal = terminalRef.current;
    if (terminal) {
      terminal.options.theme = next;
    }
  }, [background, foreground, cursor, selection]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // A previous instance can still be attached when this effect re-runs before its
    // cleanup lands (StrictMode double-invoke, concurrent remount, fast-refresh).
    // Two xterm layers in one container each paint their own glyphs into the same
    // box, which renders as character-interleaved output. Tear down first.
    terminalRef.current?.dispose();
    terminalRef.current = null;
    container.replaceChildren();

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: TERMINAL_FONT_FAMILY,
      fontSize: 13,
      scrollOnUserInput: true,
      smoothScrollDuration: 0,
      windowsPty: { backend: "conpty" },
      theme: themeRef.current,
    });
    terminalRef.current = terminal;

    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(container);

    let socket: WebSocketClient | null = null;
    let disposed = false;

    const fitAndResize = (): void => {
      try {
        fit.fit();
        socket?.sendJson({ type: "resize", cols: terminal.cols, rows: terminal.rows });
      } catch {
        // container not laid out yet
      }
    };

    // sendJson is a no-op after the socket closes, so late key events are harmless.
    const sendInput = (data: string): void => {
      socket?.sendJson({ type: "input", data });
    };

    terminal.attachCustomKeyEventHandler(createKeyHandler(terminal, sendInput));
    terminal.onData((data) => sendInput(toBase64(data)));

    const start = async (): Promise<void> => {
      terminal.writeln("\x1b[2m[terminal] connecting…\x1b[0m");

      // Fetch the token while the container settles - it's independent of terminal size.
      const tokenPromise = api.auth.tokens.terminal.post();

      const { data, error } = await tokenPromise;
      if (disposed) {
        return;
      }
      if (error) {
        terminal.writeln(
          `\x1b[31m[terminal] couldn't authenticate the agent - sign in to JobPilot, then restart the terminal. (${error.value.message})\x1b[0m`,
        );
        return;
      }

      try {
        fit.fit();
        sessionStartInFlight ??= startSession({
          cols: terminal.cols,
          rows: terminal.rows,
          provider,
          apiToken: data.token,
          webUrl: window.location.origin,
          apiUrl: API_BASE_URL,
        }).finally(() => {
          sessionStartInFlight = null;
        });
        await sessionStartInFlight;
      } catch (err) {
        if (disposed) {
          return;
        }
        const message = (err as Error).message;
        terminal.writeln(`\x1b[31m[terminal] failed to start session: ${message}\x1b[0m`);
        if (/Failed to start '(claude|codex)'/.test(message)) {
          terminal.writeln(
            "\x1b[33m[terminal] Install the CLI and make sure it's on PATH, then restart the JobPilot host.\x1b[0m",
          );
        }
        return;
      }
      if (disposed) {
        return;
      }

      // socket.close() in the cleanup detaches these callbacks, so none can hit a disposed terminal.
      const write = (data: string | Uint8Array): void => {
        terminal.write(data);
      };
      socket = connectWebSocket(TERMINAL_WS_URL, {
        onOpen: () => fitAndResize(),
        onBinary: write,
        onText: write,
        onClose: () => write("\r\n\x1b[33m[terminal] disconnected\x1b[0m\r\n"),
      });
    };

    start();

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      resizeTimer = setTimeout(fitAndResize, RESIZE_DEBOUNCE_MS);
    });
    observer.observe(container);

    return () => {
      disposed = true;
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      observer.disconnect();
      socket?.close(1000, "panel unmounted");
      terminalRef.current = null;
      terminal.dispose();
    };
  }, [provider]);

  return (
    <Box
      ref={containerRef}
      sx={(t) => ({
        flex: 1,
        minHeight: 0,
        backgroundColor: t.palette.surfaces.base,
        overflow: "hidden",
        position: "relative",
        px: 1,
        py: 0.5,
        "& .xterm": { height: "100%", maxWidth: "100%" },
        "& .xterm-viewport": { overscrollBehavior: "contain" },
      })}
    />
  );
}
