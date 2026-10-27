// Read-only dry run for the JSON column policy: every Json column is now parsed on read, so any
// stored row that fails its schema would 500. Run against a restored copy (db-migrate skill) before
// deploying: `bun scripts/check-json-columns.ts`. Exits 1 when a row fails.
import { campaignConfigSchema } from "@jobpilot/contracts/campaign";
import {
  pilotInstructionsConfigSchema,
  pilotRunSchema,
  taskListSchema,
} from "@jobpilot/contracts/pilot";
import { resumeDataSchema } from "@jobpilot/contracts/resume";
import { portfolioProjectSchema, screeningAnswerSchema } from "@jobpilot/contracts/upwork";
import { z } from "zod/v4";
import { db } from "@/common/database/prisma.client";
import { variantRewriteAuditSchema } from "@/modules/resume/variants/variant.schema";

interface Check {
  label: string;
  rows: () => Promise<{ id: string; value: unknown }[]>;
  schema: z.ZodType;
}

const checks: Check[] = [
  {
    label: "resumes.content",
    schema: resumeDataSchema,
    rows: async () =>
      (await db.resume.findMany({ select: { id: true, content: true } }))
        .filter((r) => r.content !== null)
        .map((r) => ({ id: r.id, value: r.content })),
  },
  {
    label: "resume_variants.content",
    schema: resumeDataSchema,
    rows: async () =>
      (await db.resumeVariant.findMany({ select: { id: true, content: true } })).map((r) => ({
        id: r.id,
        value: r.content,
      })),
  },
  {
    label: "resume_variants.rewrites",
    schema: variantRewriteAuditSchema,
    rows: async () =>
      (await db.resumeVariant.findMany({ select: { id: true, rewrites: true } }))
        .filter((r) => r.rewrites !== null)
        .map((r) => ({ id: r.id, value: r.rewrites })),
  },
  {
    label: "campaigns.config",
    schema: campaignConfigSchema,
    rows: async () =>
      (await db.campaign.findMany({ select: { id: true, config: true } })).map((r) => ({
        id: r.id,
        value: r.config,
      })),
  },
  {
    label: "pilot_states.instructions_config",
    schema: pilotInstructionsConfigSchema,
    rows: async () =>
      (await db.pilotState.findMany({ select: { userId: true, instructionsConfig: true } })).map(
        (r) => ({ id: r.userId, value: r.instructionsConfig }),
      ),
  },
  {
    label: "pilot_states.task_list_snapshot",
    schema: taskListSchema,
    rows: async () =>
      (await db.pilotState.findMany({ select: { userId: true, taskListSnapshot: true } }))
        .filter((r) => r.taskListSnapshot !== null)
        .map((r) => ({ id: r.userId, value: r.taskListSnapshot })),
  },
  {
    label: "pilot_runs",
    schema: pilotRunSchema,
    rows: async () => (await db.pilotRun.findMany()).map((r) => ({ id: r.id, value: r })),
  },
  {
    label: "pilot_questions.options",
    schema: z.array(z.string()),
    rows: async () =>
      (await db.pilotQuestion.findMany({ select: { id: true, options: true } })).map((r) => ({
        id: r.id,
        value: r.options,
      })),
  },
  {
    label: "upwork_proposals.screening_answers",
    schema: z.array(screeningAnswerSchema),
    rows: async () =>
      (await db.upworkProposal.findMany({ select: { id: true, screeningAnswers: true } })).map(
        (r) => ({ id: r.id, value: r.screeningAnswers }),
      ),
  },
  {
    label: "upwork_profiles.current_portfolio",
    schema: z.array(portfolioProjectSchema),
    rows: async () =>
      (await db.upworkProfile.findMany({ select: { id: true, currentPortfolio: true } })).map(
        (r) => ({ id: r.id, value: r.currentPortfolio }),
      ),
  },
  {
    label: "upwork_profiles.suggested_portfolio",
    schema: z.array(portfolioProjectSchema),
    rows: async () =>
      (await db.upworkProfile.findMany({ select: { id: true, suggestedPortfolio: true } })).map(
        (r) => ({ id: r.id, value: r.suggestedPortfolio }),
      ),
  },
];

let failures = 0;
for (const check of checks) {
  const rows = await check.rows();
  const failed = rows.filter((row) => !check.schema.safeParse(row.value).success);
  failures += failed.length;
  console.log(`${check.label}: ${rows.length} rows, ${failed.length} failing`);
  for (const row of failed.slice(0, 5)) {
    const issues = check.schema.safeParse(row.value).error?.issues.slice(0, 3);
    console.log(`  ${row.id}: ${JSON.stringify(issues)}`);
  }
}
await db.$disconnect();
process.exit(failures > 0 ? 1 : 0);
