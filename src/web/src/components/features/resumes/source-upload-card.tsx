"use client";

import { useRef, type ReactElement } from "react";
import { CloudUpload, Delete, PictureAsPdf } from "@mui/icons-material";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import { SectionCard } from "@/components/ui/layout";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ResumeDto } from "@/types/api";
import { ExtractResumeButton } from "./extract-resume-button";

interface SourceUploadCardProps {
  resume: ResumeDto;
}

export function SourceUploadCard(props: SourceUploadCardProps): ReactElement {
  const { resume } = props;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const upload = useApiMutation<{ id: number }, File>(
    (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return apiClient.upload<{ id: number }>(`/api/resumes/${resume.id}/source`, fd);
    },
    {
      successMessage: "Source PDF uploaded",
      invalidate: [queryKeys.resume.all, queryKeys.profile.all],
      onSuccess: () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    },
  );

  const remove = useApiMutation<{ id: number }, void>(
    () => apiClient.del<{ id: number }>(`/api/resumes/${resume.id}/source`),
    {
      successMessage: "Source PDF removed",
      invalidate: [queryKeys.resume.all, queryKeys.profile.all],
    },
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload.mutate(file);
  };

  return (
    <SectionCard
      title="Source PDF"
      description={
        resume.sourceFilename
          ? "The PDF this resume was bootstrapped from. Extract structured fields from it, or tailor it for a specific job."
          : "Upload a PDF to bootstrap this resume, or fill out the editor below directly."
      }
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        {resume.sourceFilename ? (
          <>
            <PictureAsPdf sx={{ color: "text.secondary" }} fontSize="lg" />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {resume.sourceFilename}
              </Typography>
              <Typography variant="captionMuted">
                {resume.sourceSizeBytes
                  ? `${(resume.sourceSizeBytes / 1024).toFixed(0)} KB`
                  : "unknown size"}
              </Typography>
            </Box>
            <ExtractResumeButton resume={resume} />
            <Button
              size="small"
              variant="outlined"
              startIcon={<CloudUpload />}
              onClick={() => fileInputRef.current?.click()}
              disabled={upload.isPending}
            >
              Replace
            </Button>
            <IconButton
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              aria-label="Remove source PDF"
            >
              <Delete fontSize="md" />
            </IconButton>
          </>
        ) : (
          <Button
            variant="outlined"
            startIcon={<CloudUpload />}
            onClick={() => fileInputRef.current?.click()}
            disabled={upload.isPending}
          >
            {upload.isPending ? "Uploading…" : "Upload PDF"}
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={handleFile}
        />
      </Stack>
    </SectionCard>
  );
}
