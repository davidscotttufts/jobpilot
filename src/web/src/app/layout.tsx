import "./globals.css";
import type { PropsWithChildren, ReactElement } from "react";
import type { Metadata } from "next";
import { Container } from "@mui/material";
import { AppShell } from "@/components/layout/app-shell";
import { NotificationProvider } from "@/providers/notification-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";

export const metadata: Metadata = {
  title: "JobPilot",
  description: "Local control center for AI-driven job applications",
};

export default function RootLayout(props: PropsWithChildren): ReactElement {
  const { children } = props;
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ThemeProvider>
          <QueryProvider>
            <NotificationProvider>
              <AppShell>
                <Container maxWidth="lg" sx={{ py: 4 }}>
                  {children}
                </Container>
              </AppShell>
            </NotificationProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
