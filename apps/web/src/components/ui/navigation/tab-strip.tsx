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
      sx={(theme) => ({
        mb: 3,
        overflowX: "auto",
        // overflow-x:auto forces computed overflow-y to auto too; keep it hidden so sub-pixel
        // rounding can't spawn a phantom vertical scrollbar.
        overflowY: "hidden",
        // Divider as an inset shadow (not a border): it paints inside the padding box, so the
        // active tab's 2px indicator covers it without a negative margin (= vertical overflow).
        boxShadow: `inset 0 -1px 0 ${theme.palette.line.divider}`,
      })}
    >
      <Stack direction="row" spacing={1}>
        {tabs.map((tab) => (
          <TabLink key={tab.href} href={tab.href} label={tab.label} />
        ))}
      </Stack>
    </Box>
  );
}
