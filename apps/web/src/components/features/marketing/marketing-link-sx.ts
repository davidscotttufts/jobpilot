import type { SxProps, Theme } from "@mui/material";

/** The sticky nav's height; anchored sections scroll clear of it. */
export const MARKETING_NAV_HEIGHT = 64;

export const marketingLinkSx: SxProps<Theme> = {
  typography: "body1",
  color: "text.secondary",
  "&:hover": { color: "text.primary" },
};
