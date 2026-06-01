import { z } from "zod/v4";
import type { RunSource } from "@/lib/contracts/run";
import type { CreateRunRequest } from "@/types/api";
import { buildCliArgs } from "@/utils/cli-args";
import { slugify } from "@/utils/slug";

export const composerFormSchema = z
  .object({
    mode: z.enum(["search", "auto-apply", "outreach"]),
    query: z.string().trim().min(2, "Enter a query"),
    board: z.string(),
    minScore: z.number().int().min(0).max(100),
    maxApps: z.union([z.number().int().min(1).max(500), z.null(), z.undefined()]),
    maxJobs: z.number().int().min(1).max(100),
    // Outreach campaign settings (mode === "outreach").
    channels: z.array(z.enum(["email", "linkedin"])),
    linkedinTier: z.enum(["free", "premium"]),
    autonomy: z.enum(["draft", "review", "auto"]),
    dailyCap: z.number().int().min(1).max(100),
    scope: z.enum(["per-job", "networking", "both"]),
    resumeInclude: z.enum(["none", "link", "attach-on-reply"]),
  })
  .superRefine((v, ctx) => {
    if (v.mode !== "outreach" && !v.board) {
      ctx.addIssue({ code: "custom", message: "Pick a board", path: ["board"] });
    }
    if (v.mode === "outreach" && v.channels.length === 0) {
      ctx.addIssue({ code: "custom", message: "Pick at least one channel", path: ["channels"] });
    }
  });

export type RunMode = Extract<RunSource, "search" | "auto-apply" | "outreach">;
export type ComposerFormValues = z.infer<typeof composerFormSchema>;

/**
 * Static defaults shared by the parent `useAppForm` and the `withForm` field
 * groups so their form types line up. The parent overlays runtime values
 * (first board, profile min-score) before mounting.
 */
export const COMPOSER_DEFAULT_VALUES: ComposerFormValues = {
  mode: "auto-apply",
  query: "",
  board: "",
  minScore: 70,
  maxApps: null,
  maxJobs: 15,
  channels: ["email", "linkedin"],
  linkedinTier: "free",
  autonomy: "draft",
  dailyCap: 20,
  scope: "per-job",
  resumeInclude: "none",
};

export function makeRunId(query: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").replace(/Z$/, "");
  return `${ts}_${slugify(query, { maxLength: 40, fallback: "run" })}`;
}

function hasMaxApps(values: ComposerFormValues): values is ComposerFormValues & { maxApps: number } {
  return values.maxApps != null && Number.isFinite(values.maxApps);
}

export function buildRunConfig(values: ComposerFormValues): CreateRunRequest["config"] {
  if (values.mode === "outreach") {
    return {
      outreach: {
        channels: values.channels,
        ...(values.channels.includes("linkedin") ? { linkedinTier: values.linkedinTier } : {}),
        autonomy: values.autonomy,
        ...(values.autonomy === "auto" ? { dailyCap: values.dailyCap } : {}),
        scope: values.scope,
        resumeInclude: values.resumeInclude,
      },
    };
  }
  if (values.mode !== "auto-apply") {
    return { board: values.board, maxJobs: values.maxJobs };
  }
  return {
    board: values.board,
    minScore: values.minScore,
    ...(hasMaxApps(values) ? { maxApplications: values.maxApps } : {}),
  };
}

export function buildSkillArg(values: ComposerFormValues, runId: string): string {
  if (values.mode === "outreach") {
    // The skill reads channels/tier/autonomy from the run's config.outreach.
    return buildCliArgs({ positional: [values.query.trim()], flags: { run: runId } });
  }
  return buildCliArgs({
    positional: [values.query.trim()],
    flags: {
      board: values.board,
      "min-score": values.mode === "auto-apply" ? values.minScore : undefined,
      "max-apps": values.mode === "auto-apply" && hasMaxApps(values) ? values.maxApps : undefined,
      "max-jobs": values.mode === "search" ? values.maxJobs : undefined,
      // Search saves results onto this run; pass the id the UI just created so
      // the skill doesn't have to rediscover it.
      run: values.mode === "search" ? runId : undefined,
    },
  });
}

export const SUBMIT_LABELS: Record<RunMode, string> = {
  search: "Start search",
  "auto-apply": "Start auto-apply",
  outreach: "Start outreach",
};
