"use client";

import type { ReactElement } from "react";
import { Box, Container, Link, Stack } from "@mui/material";
import NextLink from "next/link";
import { LinkButton } from "@/components/ui/buttons";
import { BrandMark } from "./brand-mark";
import { marketingLinkSx } from "./marketing-link-sx";

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
          <Stack direction="row" spacing={4} sx={{ alignItems: "center" }}>
            <BrandMark />
            <Stack
              direction="row"
              spacing={3}
              sx={{ alignItems: "center", display: { xs: "none", sm: "flex" } }}
            >
              <Link component={NextLink} href="/docs" underline="none" sx={marketingLinkSx}>
                Docs
              </Link>
              <Link href="#how-it-works" underline="none" sx={marketingLinkSx}>
                How it works
              </Link>
              <Link
                href="https://github.com/suxrobGM/jobpilot"
                target="_blank"
                rel="noopener noreferrer"
                underline="none"
                sx={marketingLinkSx}
              >
                GitHub
              </Link>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <LinkButton href="/login" variant="text" size="small">
              Sign in
            </LinkButton>
            <LinkButton href="/install" variant="contained" size="small">
              Get started
            </LinkButton>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
