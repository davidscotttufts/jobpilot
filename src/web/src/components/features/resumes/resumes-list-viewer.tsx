"use client";

import { useRef, useState, type ReactElement } from "react";
import { Add, CloudUpload, Description, PictureAsPdf, Star, StarBorder } from "@mui/icons-material";
import { Box, Button, Chip, IconButton, LinearProgress, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { SectionCard } from "@/components/ui/layout";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/api/query-keys";
import { resumePdfUrl } from "@/lib/api/resume-urls";
import type { ResumeListItem } from "@/types/api";
import { NewResumeDialog } from "./new-resume-dialog";

export function ResumeListViewer(): ReactElement {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const list = useApiQuery<ResumeListItem[]>(queryKeys.resume.list(), () =>
    apiClient.get<ResumeListItem[]>("/api/resumes"),
  );

  const upload = useApiMutation<{ id: number }, File>(
    (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return apiClient.upload<{ id: number }>("/api/resumes", fd);
    },
    {
      successMessage: "Resume uploaded",
      invalidate: [queryKeys.resume.all, queryKeys.profile.all],
      onSuccess: () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    },
  );

  const setPrimary = useApiMutation<{ primaryResumeId: number | null }, number>(
    (id) =>
      apiClient.post<{ primaryResumeId: number | null }>("/api/profile/primary-resume", {
        resumeId: id,
      }),
    {
      successMessage: "Primary resume updated",
      invalidate: [queryKeys.resume.all, queryKeys.profile.all],
    },
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upload.mutate(file);
  };

  if (list.isLoading) {
    return <LinearProgress />;
  }
  const rows = list.data ?? [];

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={(t) => ({
          alignItems: "center",
          p: 2,
          border: `1px dashed ${t.palette.line.border}`,
          borderRadius: t.radii.md,
        })}
      >
        <Button
          variant="contained"
          size="small"
          startIcon={<CloudUpload />}
          onClick={() => fileInputRef.current?.click()}
          disabled={upload.isPending}
        >
          {upload.isPending ? "Uploading…" : "Upload PDF"}
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
        >
          Start blank
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={handleFile}
        />
        <Box sx={{ flex: 1 }} />
        <Typography variant="captionMuted">
          {rows.length} resume{rows.length === 1 ? "" : "s"}
        </Typography>
      </Stack>

      {rows.length === 0 ? (
        <SectionCard title="No resumes yet">
          <Typography variant="body2Muted">
            Upload a PDF to bootstrap your first base resume, or start blank and fill out the
            editor.
          </Typography>
        </SectionCard>
      ) : (
        <Stack spacing={1}>
          {rows.map((r) => (
            <Stack
              key={r.id}
              direction="row"
              spacing={2}
              sx={(t) => ({
                alignItems: "center",
                p: 1.75,
                borderRadius: t.radii.md,
                border: `1px solid ${t.palette.line.divider}`,
                bgcolor: r.isPrimary ? t.palette.action.selected : "transparent",
              })}
            >
              <Description fontSize="lg" sx={{ color: "text.secondary" }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Link
                    href={`/resumes/${r.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      {r.label}
                    </Typography>
                  </Link>
                  {r.isPrimary && <Chip label="Primary" size="small" color="primary" />}
                  {!r.hasData && <Chip label="No structure" size="small" variant="outlined" />}
                  {r.variantCount > 0 && (
                    <Chip
                      label={`${r.variantCount} variant${r.variantCount === 1 ? "" : "s"}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>
                <Typography variant="captionMuted">
                  {r.sourceFilename ?? "no source PDF"} · updated{" "}
                  {new Date(r.updatedAt).toLocaleDateString()}
                </Typography>
              </Box>
              <IconButton
                onClick={() => setPrimary.mutate(r.id)}
                aria-label={r.isPrimary ? "Primary resume" : "Set as primary"}
                disabled={setPrimary.isPending}
              >
                {r.isPrimary ? <Star fontSize="md" /> : <StarBorder fontSize="md" />}
              </IconButton>
              <IconButton
                component="a"
                href={resumePdfUrl(r.id, r.updatedAt)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open PDF"
              >
                <PictureAsPdf fontSize="md" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      )}

      <NewResumeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Stack>
  );
}
