import type { ReactElement, ReactNode } from "react";
import { Box, Card, Stack, Typography } from "@mui/material";

const TRAFFIC_LIGHTS = ["error.main", "warning.main", "success.main"] as const;

interface PanelFrameProps {
  label: string;
  children: ReactNode;
}

export function PanelFrame(props: PanelFrameProps): ReactElement {
  const { label, children } = props;
  return (
    <Card aria-hidden variant="showcase">
      <Stack
        direction="row"
        spacing={0.75}
        sx={{
          alignItems: "center",
          paddingInline: 1.5,
          paddingBlock: 1.25,
          borderBottom: 1,
          borderColor: "line.divider",
          backgroundColor: "surfaces.elevated",
        }}
      >
        {TRAFFIC_LIGHTS.map((color) => (
          <Box
            key={color}
            sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: color }}
          />
        ))}
        <Typography variant="monoCaption" sx={{ pl: 1 }}>
          {label}
        </Typography>
      </Stack>
      <Box sx={{ padding: 2 }}>{children}</Box>
    </Card>
  );
}
