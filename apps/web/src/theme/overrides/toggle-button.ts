import { alpha, type Components, type Theme } from "@mui/material/styles";
import { controlBox, controlBoxSmall, outlinedControl } from "./control-box";

/** Shares the Button's box and outlined shell - the two sit side by side in every filter bar. */
export const toggleButtonOverrides: Components<Theme>["MuiToggleButton"] = {
  styleOverrides: {
    root: ({ theme }) => ({
      ...controlBox(theme),
      ...outlinedControl(theme),
      color: (theme.vars ?? theme).palette.text.secondary,
      textTransform: "none",
      // Tinted accent fill, not surfaces.hover, so selected != hovered-but-off.
      "&.Mui-selected": {
        color: theme.palette.accent.primary,
        borderColor: theme.palette.accent.primary,
        backgroundColor: alpha(theme.palette.accent.primary, 0.16),
        "&:hover": { backgroundColor: alpha(theme.palette.accent.primary, 0.24) },
      },
    }),
    sizeSmall: ({ theme }) => controlBoxSmall(theme),
  },
};
