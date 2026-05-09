"use client";

import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef, type ReactElement } from "react";
import { Box, useTheme } from "@mui/material";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { startSession, TERMINAL_WS_URL } from "@/lib/terminal";
import { connectWebSocket, type WebSocketClient } from "@/lib/websocket";
import { toBase64 } from "@/utils/base64";

export function TerminalPanel(): ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const theme = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontSize: 13,
      theme: {
        background: theme.palette.surfaces.base,
        foreground: theme.palette.text.primary,
        cursor: theme.palette.primary.main,
        selectionBackground: `${theme.palette.primary.main}40`,
      },
    });

    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(container);
    fit.fit();

    let socket: WebSocketClient | null = null;
    let inputDisposable: { dispose: () => void } | null = null;
    let disposed = false;

    const initialize = async () => {
      try {
        await startSession({ cols: terminal.cols, rows: terminal.rows });
      } catch (err) {
        terminal.writeln(
          `\x1b[31m[terminal] failed to start session: ${(err as Error).message}\x1b[0m`,
        );
        return;
      }

      if (disposed) {
        return;
      }

      socket = connectWebSocket(TERMINAL_WS_URL, {
        onOpen(client) {
          client.sendJson({ type: "resize", cols: terminal.cols, rows: terminal.rows });
        },
        onBinary(data) {
          if (!disposed) {
            terminal.write(data);
          }
        },
        onText(data) {
          if (!disposed) {
            terminal.write(data);
          }
        },
        onClose() {
          if (!disposed) {
            terminal.writeln("\r\n\x1b[33m[terminal] disconnected\x1b[0m");
          }
        },
      });

      inputDisposable = terminal.onData((data) => {
        socket?.sendJson({ type: "input", data: toBase64(data) });
      });
    };

    initialize();

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const observer = new ResizeObserver(() => {
      if (resizeTimer !== null) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeTimer = null;
        try {
          fit.fit();
          socket?.sendJson({ type: "resize", cols: terminal.cols, rows: terminal.rows });
        } catch {
          // ignore until container is laid out
        }
      }, 120);
    });
    observer.observe(container);

    return () => {
      disposed = true;
      if (resizeTimer !== null) clearTimeout(resizeTimer);
      observer.disconnect();
      inputDisposable?.dispose();
      socket?.close(1000, "panel unmounted");
      terminal.dispose();
    };
  }, [theme]);

  return (
    <Box
      ref={containerRef}
      sx={(t) => ({
        flex: 1,
        minHeight: 0,
        backgroundColor: t.palette.surfaces.base,
        px: 1,
        py: 0.5,
      })}
    />
  );
}
