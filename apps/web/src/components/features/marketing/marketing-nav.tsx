"use client";

import type { ReactElement } from "react";
import { Box, Container, Stack } from "@mui/material";
import { LinkButton } from "@/components/ui/buttons";
import { BrandMark } from "./brand-mark";

export function MarketingNav(): ReactElement {
  return (
    <Box
      component="header"
      sx={(theme) => ({
        position: "sticky",
        top: 0,
        zIndex: theme.zIndex.appBar,
        borderBottom: `1px solid ${theme.palette.line.divider}`,
        backgroundColor: `color-mix(in srgb, ${theme.palette.surfaces.base} 86%, transparent)`,
        backdropFilter: "blur(8px)",
      })}
    >
      <Container maxWidth="lg">
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between", height: 64 }}
        >
          <BrandMark />
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <LinkButton href="/login" variant="text" size="small">
              Sign in
            </LinkButton>
            <LinkButton href="/register" variant="contained" size="small">
              Get started
            </LinkButton>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
