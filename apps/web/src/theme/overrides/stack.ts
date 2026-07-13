import type { Components, Theme } from "@mui/material/styles";

/**
 * `spacing` as a real flex `gap`, not MUI's default `margin-left` on every child but the first.
 * Margins survive wrapping, so any `flexWrap` row indents its second line by one gap.
 */
export const stackOverrides: Components<Theme>["MuiStack"] = {
  defaultProps: { useFlexGap: true },
};
