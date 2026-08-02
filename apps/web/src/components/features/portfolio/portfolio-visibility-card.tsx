"use client";

import { Alert, Link as MuiLink, Stack, Typography } from "@mui/material";
import { withForm } from "@/components/ui/form/tanstack";
import { SectionCard } from "@/components/ui/layout/section-card";
import { PORTFOLIO_FORM_DEFAULTS } from "./portfolio-form-values";

const ROWS = [
  { name: "showResume", label: "Resume download" },
  { name: "showWebsite", label: "Website" },
  { name: "showLinkedin", label: "LinkedIn" },
  { name: "showGithub", label: "GitHub" },
] as const;

export const PortfolioVisibilityCard = withForm({
  defaultValues: PORTFOLIO_FORM_DEFAULTS,
  render: function PortfolioVisibilityCard({ form }) {
    return (
      <SectionCard
        title="Visible on your page"
        description="Everything here is off until you turn it on. Your name, headline, and activity are always shown."
      >
        <Stack spacing={1.5}>
          <form.Subscribe
            selector={(state) =>
              !state.values.showResume &&
              !state.values.showWebsite &&
              !state.values.showLinkedin &&
              !state.values.showGithub
            }
          >
            {(allHidden) =>
              allHidden && (
                <Alert severity="info">
                  Visitors can see your name, headline, and activity, but not your resume or links.
                </Alert>
              )
            }
          </form.Subscribe>

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
      </SectionCard>
    );
  },
});
