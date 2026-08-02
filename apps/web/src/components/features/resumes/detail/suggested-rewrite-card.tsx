"use client";

import { type ReactNode, useState } from "react";
import { type ResumeData, SUGGESTED_REWRITE_LABEL } from "@jobpilot/contracts/resume";
import { AutoFixHigh } from "@mui/icons-material";
import { Alert, AlertTitle, Button, Skeleton, Stack, Typography } from "@mui/material";
import { api } from "@/api/client";
import { useApiMutation, useApiQuery } from "@/api/hooks";
import { resumeQueries } from "@/api/queries";
import { invalidations, queryKeys } from "@/api/query-keys";
import { useConfirm } from "@/providers/confirm-provider";
import { plural } from "@/utils/format";
import { diffRewrite } from "./rewrite-diff";
import { RewriteReviewDialog } from "./rewrite-review-dialog";

interface SuggestedRewriteCardProps {
  resumeId: string;
  base: ResumeData;
  resumeUpdatedAt: string | Date;
}

/**
 * Surfaces the `Suggested rewrite` variant `review-resume` leaves after an upload. Accept writes it
 * onto the base via the ordinary update route; the uploaded PDF stays the way back.
 */
export function SuggestedRewriteCard(props: SuggestedRewriteCardProps): ReactNode {
  const { resumeId, base, resumeUpdatedAt } = props;
  const confirm = useConfirm();
  const [reviewing, setReviewing] = useState(false);

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

  const notes = detail.data.diffNotes?.trim() ?? null;
  const changeCount = diffRewrite(base, detail.data.content).length;

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
    <>
      <Alert severity="info" variant="outlined" icon={<AutoFixHigh fontSize="md" />}>
        <AlertTitle>
          {changeCount > 0 ? plural(changeCount, "suggested change") : "A rewrite is ready"}
        </AlertTitle>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Review them side by side before anything replaces your text.
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            size="small"
            disabled={busy}
            onClick={() => setReviewing(true)}
          >
            Review
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

      <RewriteReviewDialog
        open={reviewing}
        onClose={() => setReviewing(false)}
        resumeId={resumeId}
        resumeUpdatedAt={resumeUpdatedAt}
        variantId={suggestion.id}
        variantUpdatedAt={detail.data.updatedAt}
        base={base}
        suggested={detail.data.content}
        notes={notes}
        busy={busy}
        onApply={() => accept.mutate(suggestion.id)}
      />
    </>
  );
}
