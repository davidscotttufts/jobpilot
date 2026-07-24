"use client";

import type { ReactElement } from "react";
import type { OAuthProviderInput } from "@jobpilot/contracts/auth";
import { GitHub, Google } from "@mui/icons-material";
import { Button, Divider, Stack, Typography } from "@mui/material";
import { OAUTH_PROVIDERS, oauthStartUrl } from "./oauth";

const ICONS: Record<OAuthProviderInput, ReactElement> = {
  google: <Google />,
  github: <GitHub />,
};

/** Google/GitHub sign-in buttons; the API drives the whole redirect flow. */
export function OAuthButtons(): ReactElement {
  return (
    <Stack spacing={2}>
      <Divider>
        <Typography variant="captionMuted">or continue with</Typography>
      </Divider>
      <Stack direction="row" spacing={1.5}>
        {OAUTH_PROVIDERS.map(({ id, label }) => (
          <Button
            key={id}
            variant="outlined"
            fullWidth
            startIcon={ICONS[id]}
            onClick={() => {
              window.location.href = oauthStartUrl(id);
            }}
          >
            {label}
          </Button>
        ))}
      </Stack>
    </Stack>
  );
}
