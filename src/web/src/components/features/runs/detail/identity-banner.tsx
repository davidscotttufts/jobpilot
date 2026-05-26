"use client";

import type { ReactNode } from "react";
import { PersonOutlined } from "@mui/icons-material";
import { Chip, Stack, Typography } from "@mui/material";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ProfileResponse } from "@/types/api";

/**
 * Shows the active profile's name + email next to a run so a wrong-identity
 * issue (e.g. the agent filling the wrong email) is obvious at a glance.
 */
export function RunIdentityBanner(): ReactNode {
  const query = useApiQuery<ProfileResponse>(queryKeys.profile.detail(), () =>
    apiClient.get<ProfileResponse>("/api/profile"),
  );
  const profile = query.data?.profile;

  if (!profile) {
    return null;
  }

  const name = `${profile.firstName} ${profile.lastName}`.trim();

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={(t) => ({
        alignItems: "center",
        px: 1.5,
        py: 1,
        borderRadius: t.radii.sm,
        border: `1px solid ${t.palette.line.divider}`,
        backgroundColor: t.palette.surfaces.elevated,
      })}
    >
      <PersonOutlined fontSize="sm" color="action" />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Applying as {name || "your profile"}
      </Typography>
      <Chip size="small" label={profile.email} variant="outlined" />
    </Stack>
  );
}
