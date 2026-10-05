"use client";

import type { PropsWithChildren, ReactElement, ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@mui/material";

interface SectionCardProps extends PropsWithChildren {
  title?: string;
  description?: string;
  actions?: ReactNode;
  /** Stretches to its grid cell so side-by-side cards line up. */
  fullHeight?: boolean;
}

export function SectionCard(props: SectionCardProps): ReactElement {
  const { title, description, actions, fullHeight, children } = props;
  return (
    <Card sx={fullHeight ? { height: "100%" } : undefined}>
      {(title || actions) && <CardHeader title={title} subheader={description} action={actions} />}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
