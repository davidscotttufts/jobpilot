import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import { componentOverrides } from "./overrides";
import { accent, feedback, line, stages, surfaces, textColors } from "./palette";
import { controlHeights, gradients, iconSizes, motion, radii, shadows } from "./tokens";
import { typography } from "./typography";

const baseTheme = createTheme({
  cssVariables: true,
  palette: {
    mode: "dark",
    primary: { main: accent.primary, contrastText: "#1A0A05" },
    secondary: { main: accent.secondary, contrastText: "#0A1220" },
    warning: { main: feedback.warning },
    // Measured: white on either of these is 3.9:1 and 3.7:1, and a filled chip's label is 12px, so
    // AA wants 4.5. MUI's own pick is white because its contrast threshold is 3 - fine for the
    // 18px+ text the default assumes, not for a status chip. Ink of the same hue clears it at ~5:1.
    error: { main: feedback.error, contrastText: "#200607" },
    success: { main: feedback.success },
    info: { main: feedback.info, contrastText: "#0A1220" },
    background: { default: surfaces.base, paper: surfaces.card },
    text: {
      primary: textColors.primary,
      secondary: textColors.secondary,
      disabled: textColors.disabled,
      prose: textColors.prose,
    },
    divider: line.divider,
    surfaces,
    accent,
    line,
    stages,
  },
  // Keep the sx multiplier at 1 so a `radii` token in sx means that many px, exactly as in
  // styleOverrides. Component overrides pin the real radii (card md, dialog lg) explicitly.
  shape: { borderRadius: 1 },
  typography,
  gradients,
  motion,
  radii,
  shadows_custom: shadows,
  iconSizes,
  controlHeights,
  components: componentOverrides,
});

// Scale headings (h1-h4) down on smaller viewports so page/marketing titles fit phones.
export const theme = responsiveFontSizes(baseTheme, { variants: ["h1", "h2", "h3", "h4"] });
