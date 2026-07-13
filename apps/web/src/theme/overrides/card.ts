import type { Components, Theme } from "@mui/material/styles";

export const cardOverrides: Components<Theme>["MuiCard"] = {
  defaultProps: { elevation: 0 },
  styleOverrides: {
    root: ({ theme }) => ({
      borderRadius: theme.radii.md,
      border: `1px solid ${theme.palette.line.border}`,
      backgroundColor: theme.palette.surfaces.card,
      // Top-edge highlight so panels read as lit surfaces, not flat rectangles.
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      transition: theme.motion.fast,
    }),
  },
  variants: [
    {
      props: { variant: "interactive" },
      style: ({ theme }) => ({
        cursor: "pointer",
        "&:hover": {
          borderColor: theme.palette.line.borderHi,
          backgroundColor: theme.palette.surfaces.elevated,
        },
      }),
    },
    {
      props: { variant: "live" },
      style: ({ theme }) => ({
        cursor: "pointer",
        border: `1px solid ${theme.palette.accent.primary}73`,
        backgroundColor: `${theme.palette.accent.primary}12`,
        boxShadow: `0 0 0 1px ${theme.palette.accent.primary}2E, 0 6px 24px ${theme.palette.accent.primary}26`,
        "&:hover": {
          borderColor: `${theme.palette.accent.primary}B3`,
          backgroundColor: `${theme.palette.accent.primary}1C`,
        },
      }),
    },
    {
      props: { variant: "lift" },
      style: ({ theme }) => ({
        height: "100%",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: `${theme.palette.accent.primary}80`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 32px -16px ${theme.palette.accent.primary}59`,
        },
      }),
    },
    {
      props: { variant: "accent" },
      style: ({ theme }) => ({
        borderColor: `${theme.palette.accent.primary}59`,
      }),
    },
  ],
};

// Tighter below sm: cards nest, and two levels at the desktop 20px eat a fifth of a phone's width.
export const cardHeaderOverrides: Components<Theme>["MuiCardHeader"] = {
  styleOverrides: {
    root: ({ theme }) => ({
      paddingInline: 14,
      paddingTop: 14,
      paddingBottom: 8,
      [theme.breakpoints.up("sm")]: { paddingInline: 20, paddingTop: 16 },
    }),
    title: { fontSize: "1.0625rem", fontWeight: 600, lineHeight: 1.3 },
    subheader: { fontSize: "0.8125rem", marginTop: 2 },
  },
};

export const cardContentOverrides: Components<Theme>["MuiCardContent"] = {
  styleOverrides: {
    root: ({ theme }) => ({
      padding: 14,
      "&:last-child": { paddingBottom: 14 },
      [theme.breakpoints.up("sm")]: {
        padding: 20,
        "&:last-child": { paddingBottom: 20 },
      },
    }),
  },
};

export const cardActionsOverrides: Components<Theme>["MuiCardActions"] = {
  styleOverrides: {
    root: ({ theme }) => ({
      padding: 12,
      gap: 8,
      [theme.breakpoints.up("sm")]: { padding: 16 },
    }),
  },
};
