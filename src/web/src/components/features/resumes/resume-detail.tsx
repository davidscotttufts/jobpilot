"use client";

import type { ReactElement } from "react";
import { LinearProgress, Stack, useMediaQuery, useTheme } from "@mui/material";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { EMPTY_RESUME_DATA, type ResumeData } from "@/lib/schemas/resume";
import type { ResumeDto } from "@/types/api";
import { ResumeEditor } from "./resume-editor";
import { ResumeHeaderBar } from "./resume-header-bar";
import { ResumePdfPreview } from "./resume-pdf-preview";
import { SourceUploadCard } from "./source-upload-card";
import { VariantsPanel } from "./variants-panel";

interface ResumeDetailProps {
  resumeId: number;
}

export function ResumeDetail(props: ResumeDetailProps): ReactElement {
  const { resumeId } = props;
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  const detail = useApiQuery<ResumeDto>(
    queryKeys.resume.detail(resumeId),
    () => apiClient.get<ResumeDto>(`/api/resumes/${resumeId}`),
    { errorMessage: "Failed to load resume" },
  );

  if (detail.isLoading || !detail.data) return <LinearProgress />;
  const resume = detail.data;
  const initialData: ResumeData = resume.content ?? EMPTY_RESUME_DATA;

  return (
    <Stack
      direction={isDesktop ? "row" : "column"}
      spacing={3}
      sx={{ alignItems: "flex-start" }}
    >
      <Stack spacing={3} sx={{ flex: 1, minWidth: 0, width: "100%" }}>
        <ResumeHeaderBar resume={resume} />
        <SourceUploadCard resume={resume} />
        <ResumeEditor resumeId={resumeId} initialData={initialData} />
        <VariantsPanel resumeId={resumeId} resumeLabel={resume.label} />
      </Stack>
      <Stack
        spacing={2}
        sx={{
          width: isDesktop ? 480 : "100%",
          position: isDesktop ? "sticky" : "static",
          top: isDesktop ? 16 : "auto",
        }}
      >
        <ResumePdfPreview resumeId={resumeId} updatedAt={resume.updatedAt} />
      </Stack>
    </Stack>
  );
}
