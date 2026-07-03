import type { SxProps, Theme } from "@mui/material";

/** Muted nav/footer link, brightening to primary on hover. Shared by the marketing chrome. */
export const marketingLinkSx: SxProps<Theme> = {
  fontSize: "0.8125rem",
  color: "text.secondary",
  "&:hover": { color: "text.primary" },
};
