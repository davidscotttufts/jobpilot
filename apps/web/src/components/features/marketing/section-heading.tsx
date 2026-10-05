import type { ReactElement, ReactNode } from "react";
import { Stack, Typography } from "@mui/material";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  align?: "left" | "center";
}

export function SectionHeading(props: SectionHeadingProps): ReactElement {
  const { eyebrow, title, lead, align = "left" } = props;
  const centered = align === "center";

  return (
    <Stack
      spacing={1.5}
      sx={{
        maxWidth: 640,
        textAlign: align,
        alignItems: centered ? "center" : "flex-start",
        marginInline: centered ? "auto" : 0,
      }}
    >
      {eyebrow && (
        <Typography variant="eyebrow" color="primary">
          {eyebrow}
        </Typography>
      )}
      <Typography variant="h2" sx={{ textWrap: "balance" }}>
        {title}
      </Typography>
      {lead && <Typography variant="lead">{lead}</Typography>}
    </Stack>
  );
}
