"use client";

import type { ReactNode } from "react";
import { SUGGESTED_REWRITE_LABEL } from "@jobpilot/contracts/resume";
import { AutoFixHigh } from "@mui/icons-material";
import { Alert, AlertTitle, Button, Skeleton, Stack, Typography } from "@mui/material";
import { api } from "@/api/client";
import { useApiMutation, useApiQuery } from "@/api/hooks";
import { resumeQueries } from "@/api/queries";
import { invalidations, queryKeys } from "@/api/query-keys";
import { useConfirm } from "@/providers/confirm-provider";

interface SuggestedRewriteCardProps {
  resumeId: string;
}

/**
 * Surfaces the `Suggested rewrite` variant `review-resume` leaves after an upload. Accept writes it
 * onto the base via the ordinary update route; the uploaded PDF stays the way back.
 */
export function SuggestedRewriteCard(props: SuggestedRewriteCardProps): ReactNode {
  const { resumeId } = props;
  const confirm = useConfirm();

  const variants = useApiQuery(resumeQueries.variants(resumeId));
  const suggestion = variants.data?.find((v) => v.label === SUGGESTED_REWRITE_LABEL);

  // Only the list is cached up front; the body arrives with the detail fetch.
  const detail = useApiQuery(resumeQueries.variantDetail(suggestion?.id ?? ""), {
    enabled: suggestion !== undefined,
  });

  const discard = useApiMutation<{ deleted: string }, string>(
    (id) => api.resumes.variants({ id }).delete(),
    {
      successMessage: "Suggestion discarded",
      invalidate: [queryKeys.resume.variants(resumeId)],
    },
  );

  // One call: the API writes the content onto the base and drops the suggestion in one transaction.
  const accept = useApiMutation<{ id: string; version: number }, string>(
    (variantId) => api.resumes.variants({ id: variantId }).apply.post(),
    {
      successMessage: "Resume updated",
      invalidate: [queryKeys.resume.variants(resumeId), ...invalidations.resume],
    },
  );

  if (!suggestion) {
    return null;
  }

  if (detail.isLoading || !detail.data) {
    return <Skeleton variant="rounded" height={120} />;
  }

  const notes = detail.data.diffNotes?.trim();

  const handleAccept = async (): Promise<void> => {
    const confirmed = await confirm({
      title: "Apply the suggested rewrite?",
      description:
        "Replaces your resume's text with the version listed here. Your uploaded PDF is untouched, so you can always re-extract from it.",
      confirmLabel: "Apply",
    });
    if (confirmed) {
      accept.mutate(suggestion.id);
    }
  };

  const handleDiscard = async (): Promise<void> => {
    const confirmed = await confirm({
      title: "Discard the suggestion?",
      description: "Your resume stays as it is.",
      confirmLabel: "Discard",
      destructive: true,
    });
    if (confirmed) {
      discard.mutate(suggestion.id);
    }
  };

  const busy = accept.isPending || discard.isPending;

  return (
    <Alert severity="info" variant="outlined" icon={<AutoFixHigh fontSize="md" />}>
      <AlertTitle>Suggested improvements</AlertTitle>
      {notes ? (
        <Stack spacing={0.5} sx={{ mb: 1.5 }}>
          {notes.split("\n").map((line) => (
            <Typography key={line} variant="body2">
              {line}
            </Typography>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          A rewritten version is ready. Open its PDF to compare before applying.
        </Typography>
      )}
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          size="small"
          disabled={busy}
          onClick={() => void handleAccept()}
        >
          Apply
        </Button>
        <Button
          variant="outlined"
          size="small"
          color="inherit"
          disabled={busy}
          onClick={() => void handleDiscard()}
        >
          Discard
        </Button>
      </Stack>
    </Alert>
  );
}
