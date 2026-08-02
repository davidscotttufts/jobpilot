import type { ResumeData } from "@jobpilot/contracts/resume";
import {
  AccountCircleOutlined,
  Build,
  DescriptionOutlined,
  SchoolOutlined,
  StarOutlined,
  WorkOutlined,
} from "@mui/icons-material";
import type { SvgIconProps } from "@mui/material";
import type { ComponentType } from "react";
import { plural } from "@/utils/format";

export interface EditorSection {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<SvgIconProps>;
  /** Collapsed-header line: what is already in this section, or "empty". */
  summary: (data: ResumeData) => string;
}

const count = (items: unknown[], noun: string): string =>
  items.length === 0 ? "empty" : plural(items.length, noun);

export const RESUME_SECTIONS: EditorSection[] = [
  {
    id: "basics",
    label: "Basics",
    description: "Name, contact info, and links.",
    icon: AccountCircleOutlined,
    summary: (data) => data.basics.name.trim() || "empty",
  },
  {
    id: "summary",
    label: "Summary",
    description: "Short professional summary at the top of the resume.",
    icon: DescriptionOutlined,
    summary: (data) =>
      data.summary?.trim() ? `${data.summary.trim().length} characters` : "empty",
  },
  {
    id: "experience",
    label: "Experience",
    description: "Work history with role bullets.",
    icon: WorkOutlined,
    summary: (data) => count(data.experience, "role"),
  },
  {
    id: "projects",
    label: "Projects",
    description: "Notable side, open-source, or freelance projects.",
    icon: Build,
    summary: (data) => count(data.projects, "project"),
  },
  {
    id: "skills",
    label: "Skills",
    description: "Grouped skill keywords.",
    icon: StarOutlined,
    summary: (data) => count(data.skills, "group"),
  },
  {
    id: "education",
    label: "Education",
    description: "Degrees, schools, and details.",
    icon: SchoolOutlined,
    summary: (data) => count(data.education, "entry"),
  },
];
