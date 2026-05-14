"use client";

import { useState, type ReactElement } from "react";
import { Save } from "@mui/icons-material";
import { Box, Button, Stack, Tab, Tabs } from "@mui/material";
import { SectionCard } from "@/components/ui/layout";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ResumeData } from "@/lib/schemas/resume";
import { BasicsTab } from "./editor/basics-tab";
import { EducationTab } from "./editor/education-tab";
import { ExperienceTab } from "./editor/experience-tab";
import { ProjectsTab } from "./editor/projects-tab";
import { SkillsTab } from "./editor/skills-tab";
import { SummaryTab } from "./editor/summary-tab";

interface ResumeEditorProps {
  resumeId: number;
  initialData: ResumeData;
}

const TAB_KEYS = ["basics", "summary", "experience", "projects", "skills", "education"] as const;
type TabKey = (typeof TAB_KEYS)[number];

export function ResumeEditor(props: ResumeEditorProps): ReactElement {
  const { resumeId, initialData } = props;
  const [tab, setTab] = useState<TabKey>("basics");
  const [data, setData] = useState<ResumeData>(initialData);
  const [dirty, setDirty] = useState(false);

  const save = useApiMutation<{ id: number; version: number }, ResumeData>(
    (vars) => apiClient.put<{ id: number; version: number }>(`/api/resumes/${resumeId}`, { data: vars }),
    {
      successMessage: "Resume saved",
      invalidate: [queryKeys.resume.all, queryKeys.profile.all],
      onSuccess: () => setDirty(false),
    },
  );

  const patch = (next: Partial<ResumeData>) => {
    setData((prev) => ({ ...prev, ...next }));
    setDirty(true);
  };

  return (
    <SectionCard
      title="Structured resume"
      description="Edit fields here; the PDF preview re-renders after saving."
      actions={
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={() => save.mutate(data)}
          disabled={!dirty || save.isPending}
        >
          {save.isPending ? "Saving…" : dirty ? "Save" : "Saved"}
        </Button>
      }
    >
      <Stack spacing={2}>
        <Tabs
          value={tab}
          onChange={(_, v: TabKey) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab value="basics" label="Basics" />
          <Tab value="summary" label="Summary" />
          <Tab value="experience" label={`Experience (${data.experience.length})`} />
          <Tab value="projects" label={`Projects (${data.projects.length})`} />
          <Tab value="skills" label={`Skills (${data.skills.length})`} />
          <Tab value="education" label={`Education (${data.education.length})`} />
        </Tabs>
        <Box>
          {tab === "basics" && (
            <BasicsTab value={data.basics} onChange={(v) => patch({ basics: v })} />
          )}
          {tab === "summary" && (
            <SummaryTab value={data.summary ?? ""} onChange={(v) => patch({ summary: v })} />
          )}
          {tab === "experience" && (
            <ExperienceTab
              value={data.experience}
              onChange={(v) => patch({ experience: v })}
            />
          )}
          {tab === "projects" && (
            <ProjectsTab value={data.projects} onChange={(v) => patch({ projects: v })} />
          )}
          {tab === "skills" && (
            <SkillsTab value={data.skills} onChange={(v) => patch({ skills: v })} />
          )}
          {tab === "education" && (
            <EducationTab value={data.education} onChange={(v) => patch({ education: v })} />
          )}
        </Box>
      </Stack>
    </SectionCard>
  );
}
