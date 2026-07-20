"use client";

import { type ReactElement, useEffect, useState } from "react";
import { usernameSchema } from "@jobpilot/contracts/user";
import { OpenInNew } from "@mui/icons-material";
import { Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { api } from "@/api/client";
import { useApiMutation, useApiQuery } from "@/api/hooks";
import { userQueries } from "@/api/queries";
import { queryKeys } from "@/api/query-keys";
import type { PortfolioSettingsDto } from "@/api/types";
import { CopyField } from "@/components/ui/display";
import { LoadingSpinner } from "@/components/ui/feedback";
import { SectionCard } from "@/components/ui/layout/section-card";
import { PortfolioView } from "./portfolio-view";

type Availability = PortfolioSettingsDto["availability"];

export function PortfolioSettings(): ReactElement {
  const settingsQuery = useApiQuery(userQueries.portfolio());

  if (!settingsQuery.data) {
    return (
      <SectionCard title="Public portfolio">
        <LoadingSpinner />
      </SectionCard>
    );
  }

  return <PortfolioForm settings={settingsQuery.data} />;
}

interface PortfolioFormProps {
  settings: PortfolioSettingsDto;
}

function PortfolioForm(props: PortfolioFormProps): ReactElement {
  const { settings } = props;
  const [username, setUsername] = useState(settings.username);
  const [available, setAvailable] = useState<boolean | null>(null);

  const usernameError = username.length > 0 ? usernameSchema.safeParse(username).error : undefined;
  const validUsername = !usernameError;

  // Live availability check; skips the caller's own current username (always "free").
  useEffect(() => {
    if (usernameError || username === settings.username) {
      setAvailable(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data } = await api.user.portfolio.available.get({ query: { username } });
      if (!cancelled) setAvailable(data?.available ?? null);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, usernameError, settings.username]);

  const save = useApiMutation(
    (body: { username?: string; availability?: Availability }) => api.user.portfolio.patch(body),
    {
      successMessage: "Portfolio settings saved",
      invalidate: [queryKeys.user.portfolio(), queryKeys.user.portfolioPreview()],
    },
  );

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/u/${settings.username}`;
  const usernameTaken = available === false;

  const usernameHelp = (): string => {
    if (!validUsername) return usernameError?.issues[0]?.message ?? "";
    if (usernameTaken) return "That username is already taken.";
    if (available === true) return "Available!";
    return "Your page lives at /u/<username>.";
  };

  return (
    <Stack spacing={3}>
      <SectionCard
        title="Public portfolio"
        description="Your always-on hire-me page, built from your active resume and job-search activity. Pick a memorable username to share it."
      >
        <Stack spacing={2.5}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            fullWidth
            error={!validUsername || usernameTaken}
            helperText={usernameHelp()}
          />

          <TextField
            select
            label="Availability"
            value={settings.availability ?? "unset"}
            onChange={(e) => {
              const value = e.target.value;
              save.mutate({ availability: value === "unset" ? null : (value as Availability) });
            }}
            fullWidth
          >
            <MenuItem value="unset">Not shown</MenuItem>
            <MenuItem value="open">Open to work</MenuItem>
            <MenuItem value="not_looking">Not looking</MenuItem>
          </TextField>

          <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1 }}>
            <Button
              variant="contained"
              disabled={
                !validUsername || usernameTaken || username === settings.username || save.isPending
              }
              onClick={() => save.mutate({ username })}
            >
              Save username
            </Button>
            <Button
              component="a"
              href={publicUrl}
              target="_blank"
              rel="noopener"
              variant="outlined"
              endIcon={<OpenInNew />}
            >
              View public page
            </Button>
          </Stack>

          <CopyField value={publicUrl} copyMessage="Portfolio link copied" />
        </Stack>
      </SectionCard>

      <SectionCard
        title="Preview"
        description="Exactly what visitors see - drawn from your primary resume."
      >
        <PortfolioPreview />
      </SectionCard>
    </Stack>
  );
}

function PortfolioPreview(): ReactElement {
  const previewQuery = useApiQuery(userQueries.portfolioPreview());

  if (previewQuery.isPending) {
    return <LoadingSpinner />;
  }
  if (!previewQuery.data) {
    return <Typography variant="body2Muted">Add a primary resume to see your preview.</Typography>;
  }
  return <PortfolioView portfolio={previewQuery.data} showFooter={false} />;
}
