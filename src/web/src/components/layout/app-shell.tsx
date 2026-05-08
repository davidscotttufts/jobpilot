"use client";

import type { PropsWithChildren, ReactElement } from "react";
import { Box } from "@mui/material";
import { Sidebar } from "./sidebar";

export function AppShell(props: PropsWithChildren): ReactElement {
  const { children } = props;
  return (
    <Box
      sx={(t) => ({
        display: "flex",
        minHeight: "100vh",
        backgroundColor: t.palette.surfaces.base,
        color: t.palette.text.primary,
      })}
    >
      <Sidebar />
      <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
