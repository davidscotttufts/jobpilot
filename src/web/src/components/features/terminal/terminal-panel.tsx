"use client";

import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef, type ReactElement } from "react";
import { Box, useTheme } from "@mui/material";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { startSession, TERMINAL_WS_URL } from "@/lib/terminal";

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

    let socket: WebSocket | null = null;
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

      socket = new WebSocket(TERMINAL_WS_URL);
      socket.binaryType = "arraybuffer";

      socket.addEventListener("open", () => {
        socket?.send(JSON.stringify({ type: "resize", cols: terminal.cols, rows: terminal.rows }));
      });

      socket.addEventListener("message", (event) => {
        if (event.data instanceof ArrayBuffer) {
          terminal.write(new Uint8Array(event.data));
        } else if (typeof event.data === "string") {
          terminal.write(event.data);
        }
      });

      socket.addEventListener("close", () => {
        terminal.writeln("\r\n\x1b[33m[terminal] disconnected\x1b[0m");
      });

      terminal.onData((data) => {
        if (socket?.readyState === WebSocket.OPEN) {
          const base64 = btoa(unescape(encodeURIComponent(data)));
          socket.send(JSON.stringify({ type: "input", data: base64 }));
        }
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
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({ type: "resize", cols: terminal.cols, rows: terminal.rows }),
            );
          }
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
