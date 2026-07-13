import type { ReactElement } from "react";
import { Box, Stack } from "@mui/material";
import type { Route } from "next";
import { TabLink } from "./tab-link";

export interface Tab {
  label: string;
  href: Route;
}

interface TabStripProps {
  tabs: Tab[];
  ariaLabel: string;
}

/** Server-rendered section tab strip; only the active-link highlight is client-side. */
export function TabStrip(props: TabStripProps): ReactElement {
  const { tabs, ariaLabel } = props;

  return (
    <Box
      component="nav"
      aria-label={ariaLabel}
      sx={{ mb: 3, borderBottom: 1, borderColor: "line.divider", overflowX: "auto" }}
    >
      <Stack direction="row" spacing={1}>
        {tabs.map((tab) => (
          <TabLink key={tab.href} href={tab.href} label={tab.label} />
        ))}
      </Stack>
    </Box>
  );
}
