"use client";

import { Stack, Typography } from "@mui/material";
import { useStore } from "@tanstack/react-form";
import { withForm } from "@/components/ui/form/tanstack";
import { COMPOSER_DEFAULT_VALUES } from "./form-config";

/** Outreach campaign fields: channels, LinkedIn tier, scope, autonomy, resume handling. */
export const OutreachFields = withForm({
  defaultValues: COMPOSER_DEFAULT_VALUES,
  render: function OutreachFields({ form }) {
    const channels = useStore(form.store, (s) => s.values.channels);
    const autonomy = useStore(form.store, (s) => s.values.autonomy);
    const resumeInclude = useStore(form.store, (s) => s.values.resumeInclude);

    return (
      <Stack spacing={2}>
        <form.AppField name="channels">
          {(field) => (
            <field.Toggle
              label="Channels"
              exclusive={false}
              options={[
                { value: "email", label: "Email" },
                { value: "linkedin", label: "LinkedIn" },
              ]}
            />
          )}
        </form.AppField>

        {channels.includes("linkedin") && (
          <form.AppField name="linkedinTier">
            {(field) => (
              <field.Toggle
                label="LinkedIn tier"
                options={[
                  { value: "free", label: "Free (connect → DM)" },
                  { value: "premium", label: "Premium (InMail)" },
                ]}
              />
            )}
          </form.AppField>
        )}

        <form.AppField name="scope">
          {(field) => (
            <field.Toggle
              label="Scope"
              options={[
                { value: "per-job", label: "Per-job" },
                { value: "networking", label: "Networking" },
                { value: "both", label: "Both" },
              ]}
            />
          )}
        </form.AppField>

        <form.AppField name="autonomy">
          {(field) => (
            <field.Toggle
              label="Autonomy"
              options={[
                { value: "draft", label: "Draft only" },
                { value: "review", label: "Review each" },
                { value: "auto", label: "Auto-send" },
              ]}
            />
          )}
        </form.AppField>

        {autonomy === "auto" && (
          <form.AppField name="dailyCap">
            {(field) => (
              <field.TextField
                label="Daily send cap"
                type="number"
                helperText="Auto-send applies to email only; LinkedIn stays human-approved."
                slotProps={{ htmlInput: { min: 1, max: 100, step: 1 } }}
              />
            )}
          </form.AppField>
        )}

        <form.AppField name="resumeInclude">
          {(field) => (
            <field.Select
              label="Resume"
              items={[
                { value: "none", label: "Don't include (recommended)" },
                { value: "link", label: "Public resume link" },
                { value: "attach-on-reply", label: "Attach on reply only" },
              ]}
            />
          )}
        </form.AppField>
        {resumeInclude === "link" && (
          <form.AppField name="resumeUrl">
            {(field) => (
              <field.TextField
                label="Resume URL"
                placeholder="https://example.com/resume.pdf"
                helperText="A publicly reachable link the recipient can open — not a localhost URL."
              />
            )}
          </form.AppField>
        )}
        <Typography variant="captionMuted">
          Cold-email attachments hurt deliverability — the tailored resume shapes the message either
          way and is best sent as a link or on the warm reply.
        </Typography>
      </Stack>
    );
  },
});
