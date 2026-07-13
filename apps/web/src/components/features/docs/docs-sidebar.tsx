"use client";

import type { ReactElement } from "react";
import { Box, Link, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { DOCS_NAV } from "./docs-nav";

interface SidebarLinkProps {
  href: Route;
  label: string;
  active: boolean;
}

function SidebarLink(props: SidebarLinkProps): ReactElement {
  const { href, label, active } = props;
  return (
    <Link
      href={href}
      underline="none"
      sx={{
        display: "block",
        whiteSpace: "nowrap",
        fontSize: "0.8125rem",
        paddingBlock: 0.75,
        paddingInline: 1.5,
        color: active ? "text.primary" : "text.secondary",
        fontWeight: active ? 600 : 400,
        borderRadius: { xs: 99, md: 0 },
        backgroundColor: { xs: active ? "surfaces.elevated" : "transparent", md: "transparent" },
        borderLeft: { xs: 0, md: 2 },
        borderLeftColor: { md: active ? "accent.primary" : "line.divider" },
        "&:hover": { color: "text.primary" },
      }}
    >
      {label}
    </Link>
  );
}

/** Docs navigation: sticky rail on md+, horizontal scrollable pill row on xs. */
export function DocsSidebar(): ReactElement {
  const pathname = usePathname();
  return (
    <Box component="nav" aria-label="Documentation">
      <Typography variant="overlineMuted" sx={{ display: { xs: "none", md: "block" }, mb: 1.5 }}>
        Docs
      </Typography>
      <Stack
        direction={{ xs: "row", md: "column" }}
        spacing={{ xs: 1, md: 0 }}
        sx={{ overflowX: { xs: "auto", md: "visible" }, paddingBottom: { xs: 1, md: 0 } }}
      >
        <SidebarLink href="/docs" label="Overview" active={pathname === "/docs"} />
        {DOCS_NAV.map((entry) => (
          <SidebarLink
            key={entry.href}
            href={entry.href}
            label={entry.title}
            active={pathname === entry.href}
          />
        ))}
      </Stack>
    </Box>
  );
}
