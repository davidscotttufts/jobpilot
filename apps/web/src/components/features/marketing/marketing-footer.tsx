"use client";

import type { ReactElement } from "react";
import { Box, Container, Stack, Typography } from "@mui/material";
import { LinkButton } from "@/components/ui/buttons";
import { BrandMark } from "./brand-mark";

export function MarketingFooter(): ReactElement {
  return (
    <Box component="footer" sx={{ borderTop: 1, borderColor: "line.divider" }}>
      <Container maxWidth="lg" sx={{ paddingBlock: 4 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
        >
          <Stack spacing={0.5}>
            <BrandMark />
            <Typography variant="captionMuted">
              Your local control center for AI-driven job applications.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <LinkButton href="/login" variant="text" size="small">
              Sign in
            </LinkButton>
            <LinkButton href="/register" variant="text" size="small">
              Create account
            </LinkButton>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
