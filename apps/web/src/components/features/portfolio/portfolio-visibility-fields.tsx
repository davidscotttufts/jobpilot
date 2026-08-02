"use client";

import { Link as MuiLink, Stack, Typography } from "@mui/material";
import { withForm } from "@/components/ui/form/tanstack";
import { PORTFOLIO_FORM_DEFAULTS } from "./portfolio-form-values";

const ROWS = [
  { name: "showResume", label: "Resume download" },
  { name: "showWebsite", label: "Website" },
  { name: "showLinkedin", label: "LinkedIn" },
  { name: "showGithub", label: "GitHub" },
] as const;

/** Part of the settings form, not a card of its own - the toggles save with everything else. */
export const PortfolioVisibilityFields = withForm({
  defaultValues: PORTFOLIO_FORM_DEFAULTS,
  render: function PortfolioVisibilityFields({ form }) {
    return (
      <Stack spacing={1}>
        <Stack spacing={0.25}>
          <Typography variant="overlineMuted">Visible on your page</Typography>
          <Typography variant="captionMuted">
            Everything here is off until you turn it on. Your name, headline, and activity are
            always shown.
          </Typography>
        </Stack>

        <Stack>
          {ROWS.map((row) => (
            <form.AppField key={row.name} name={row.name}>
              {(field) => <field.Switch label={row.label} />}
            </form.AppField>
          ))}
        </Stack>

        <Typography variant="captionMuted">
          A link only appears once you have filled it in on your{" "}
          <MuiLink href="/settings/profile">profile settings</MuiLink>.
        </Typography>
      </Stack>
    );
  },
});
