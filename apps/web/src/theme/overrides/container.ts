import type { Components, Theme } from "@mui/material/styles";

/**
 * Page containers are vertical stacks that rely on `gap` for spacing between the
 * header and content cards.
 */
export const containerOverrides: Components<Theme>["MuiContainer"] = {
  styleOverrides: {
    root: ({ theme }) => ({
      display: "flex",
      flexDirection: "column",
      // Tighter than MUI's 16px: the gutter stacks with the padding of the cards nested inside.
      [theme.breakpoints.down("sm")]: {
        paddingLeft: theme.spacing(1.5),
        paddingRight: theme.spacing(1.5),
      },
    }),
  },
};
