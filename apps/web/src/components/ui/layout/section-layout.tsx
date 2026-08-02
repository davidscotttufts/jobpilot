import type { ReactElement, ReactNode } from "react";
import { Box } from "@mui/material";
import { type SectionAnchor, SectionAnchorNav } from "./section-anchor-nav";

interface SectionLayoutProps {
  anchors: SectionAnchor[];
  children: ReactNode;
}

/**
 * Sticky section rail beside a column of `data-section-id` blocks. The rail hides below `lg`, where
 * the blocks just stack.
 */
export function SectionLayout(props: SectionLayoutProps): ReactElement {
  const { anchors, children } = props;
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", lg: "row" },
        gap: { xs: 2, sm: 3 },
        alignItems: "flex-start",
      }}
    >
      <SectionAnchorNav anchors={anchors} />
      <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>{children}</Box>
    </Box>
  );
}
