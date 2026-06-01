"use client";

import type { ReactNode } from "react";
import { PersonOutlined } from "@mui/icons-material";
import { Chip, Stack, Typography } from "@mui/material";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/client/api";
import { queryKeys } from "@/lib/client/query-keys";
import type { ProfileResponse } from "@/types/api";

/**
 * Compact inline identity line for the run header — the active profile's name +
 * email, so a wrong-identity issue (e.g. the agent filling the wrong email) is
 * obvious at a glance.
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
      spacing={0.75}
      sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.75 }}
    >
      <PersonOutlined fontSize="sm" color="action" />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Applying as {name || "your profile"}
      </Typography>
      <Chip size="small" label={profile.email} variant="outlined" />
    </Stack>
  );
}
