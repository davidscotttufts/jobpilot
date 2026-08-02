"use client";

import type { ReactElement } from "react";
import type { ResumeData } from "@jobpilot/contracts/resume";
import { OpenInNew } from "@mui/icons-material";
import { Button, Divider, Paper, Stack, Typography } from "@mui/material";
import { resumePdfUrl, variantPdfUrl } from "@/api/resume-urls";
import { FormDialogShell } from "@/components/ui/form";
import { diffRewrite } from "./rewrite-diff";

interface RewriteReviewDialogProps {
  open: boolean;
  onClose: () => void;
  resumeId: string;
  resumeUpdatedAt: string | Date;
  variantId: string;
  variantUpdatedAt: string | Date;
  base: ResumeData;
  suggested: ResumeData;
  notes: string | null;
  busy: boolean;
  onApply: () => void;
}

/** Before and after for every changed field, so applying a rewrite is not a leap of faith. */
export function RewriteReviewDialog(props: RewriteReviewDialogProps): ReactElement {
  const {
    open,
    onClose,
    resumeId,
    resumeUpdatedAt,
    variantId,
    variantUpdatedAt,
    base,
    suggested,
    notes,
    busy,
    onApply,
  } = props;
  const changes = diffRewrite(base, suggested);

  return (
    <FormDialogShell
      open={open}
      onClose={onClose}
      title="Suggested rewrite"
      maxWidth="md"
      onSubmit={onApply}
      submit={
        <Button type="submit" variant="contained" disabled={busy}>
          Apply rewrite
        </Button>
      }
    >
      <Stack spacing={2}>
        <Typography variant="body2Muted">
          Your uploaded PDF is untouched either way, so you can always re-extract from it.
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<OpenInNew fontSize="sm" />}
            component="a"
            href={resumePdfUrl(resumeId, resumeUpdatedAt)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Current PDF
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<OpenInNew fontSize="sm" />}
            component="a"
            href={variantPdfUrl(variantId, variantUpdatedAt)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Rewritten PDF
          </Button>
        </Stack>

        {notes && <Typography variant="body2Muted">{notes}</Typography>}

        {changes.length === 0 ? (
          <Typography variant="body2Muted">
            The rewrite matches your current text field for field. Discard it, or open both PDFs to
            compare the layout.
          </Typography>
        ) : (
          <Stack spacing={1.5} divider={<Divider />}>
            {changes.map((change) => (
              <Stack key={change.where} spacing={1}>
                <Typography variant="body2Strong">{change.where}</Typography>
                <Paper variant="panel" sx={{ p: 1.5 }}>
                  <Typography variant="captionMuted">Now</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {change.before || "(empty)"}
                  </Typography>
                </Paper>
                <Paper variant="panel" sx={{ p: 1.5, borderColor: "primary.main" }}>
                  <Typography variant="captionMuted">Suggested</Typography>
                  <Typography variant="body2">{change.after || "(empty)"}</Typography>
                </Paper>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </FormDialogShell>
  );
}
