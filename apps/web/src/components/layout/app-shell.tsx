"use client";

import type { PropsWithChildren, ReactElement } from "react";
import { Box } from "@mui/material";
import { AgentDock } from "@/components/features/agent-dock";
import { VerifyEmailBanner } from "@/components/features/auth";
import { Rail } from "./rail";

export function AppShell(props: PropsWithChildren): ReactElement {
  const { children } = props;
  return (
    <Box
      sx={(theme) => ({
        display: "flex",
        height: "100vh",
        minHeight: 0,
        backgroundColor: theme.palette.surfaces.base,
        color: "text.primary",
      })}
    >
      <Rail />
      <Box component="main" sx={{ flex: 1, minWidth: 0, height: "100%", overflowY: "auto" }}>
        <VerifyEmailBanner />
        {children}
      </Box>
      <AgentDock />
    </Box>
  );
}
