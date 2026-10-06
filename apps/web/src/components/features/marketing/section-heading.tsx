import type { ReactElement, ReactNode } from "react";
import { Stack, Typography } from "@mui/material";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
}

export function SectionHeading(props: SectionHeadingProps): ReactElement {
  const { eyebrow, title, lead } = props;

  return (
    <Stack spacing={1.5} sx={{ maxWidth: 640, alignItems: "flex-start" }}>
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
