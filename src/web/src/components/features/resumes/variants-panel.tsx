"use client";

import { useState, type ReactElement } from "react";
import { Delete, OpenInNew } from "@mui/icons-material";
import { Box, Chip, IconButton, Skeleton, Stack, Typography } from "@mui/material";
import { ConfirmDialog } from "@/components/ui/feedback";
import { SectionCard } from "@/components/ui/layout";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { variantPdfUrl } from "@/lib/api/resume-urls";
import type { ResumeVariantListItem } from "@/types/api";
import { TailorForJobButton } from "./tailor-for-job-button";

interface VariantsPanelProps {
  resumeId: number;
  resumeLabel: string;
}

export function VariantsPanel(props: VariantsPanelProps): ReactElement {
  const { resumeId, resumeLabel } = props;
  const [confirmDelete, setConfirmDelete] = useState<ResumeVariantListItem | null>(null);

  const query = useApiQuery<ResumeVariantListItem[]>(queryKeys.resume.variants(resumeId), () =>
    apiClient.get<ResumeVariantListItem[]>(`/api/resumes/${resumeId}/variants`),
  );

  const remove = useApiMutation<{ deleted: number }, number>(
    (id) => apiClient.del<{ deleted: number }>(`/api/resumes/variants/${id}`),
    {
      successMessage: "Variant deleted",
      invalidate: [queryKeys.resume.variants(resumeId)],
      onSuccess: () => setConfirmDelete(null),
    },
  );

  const variants = query.data ?? [];

  return (
    <SectionCard
      title="Tailored variants"
      description={`AI-generated copies of "${resumeLabel}" tailored to specific jobs. Bases are not modified.`}
      actions={<TailorForJobButton />}
    >
      {query.isLoading ? (
        <Skeleton variant="rounded" height={64} />
      ) : variants.length === 0 ? (
        <Typography variant="body2Muted">
          No variants yet. Click "Tailor for job", paste a job description or URL, and the AI will
          either reuse a close match (if you had previous variants) or create a new one.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {variants.map((v) => (
            <Stack
              key={v.id}
              direction="row"
              spacing={1.5}
              sx={(t) => ({
                alignItems: "center",
                p: 1.5,
                border: `1px solid ${t.palette.line.divider}`,
                borderRadius: t.radii.sm,
              })}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {v.label}
                  </Typography>
                  {v.applicationId && (
                    <Chip
                      label={`Application #${v.applicationId}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>
                <Typography variant="captionMuted">
                  {v.jobUrl ? `${v.jobUrl} · ` : ""}created{" "}
                  {new Date(v.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
              <IconButton
                component="a"
                href={variantPdfUrl(v.id, v.updatedAt)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open variant PDF"
              >
                <OpenInNew fontSize="md" />
              </IconButton>
              <IconButton onClick={() => setConfirmDelete(v)} aria-label="Delete variant">
                <Delete fontSize="md" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      )}
      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete variant?"
        description={confirmDelete ? `Remove "${confirmDelete.label}"? This cannot be undone.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </SectionCard>
  );
}
