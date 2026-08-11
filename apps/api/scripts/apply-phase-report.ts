/**
 * Where the time inside an apply actually goes.
 *
 * Claim timings say an apply took five minutes; they cannot say whether that was page loads, the
 * cover letter, or the fill loop. Workers report per-phase durations on the terminal write, and
 * this turns them into the p50/p90 that make a change to the apply loop provable instead of
 * plausible.
 *
 *   bun apps/api/scripts/apply-phase-report.ts [--since 7d]
 */
// The shared client: it carries the adapter and connection settings this Prisma build requires.

import { prisma } from "../src/common/database/prisma.client";
import { Prisma } from "../src/generated/prisma/client";

const PHASES = ["navigate", "read", "tailor", "coverLetter", "fill", "submit"] as const;

function parseSince(argv: string[]): Date | null {
  const flag = argv.indexOf("--since");
  if (flag === -1) return null;
  const raw = argv[flag + 1] ?? "";
  const match = /^(\d+)([dh])$/.exec(raw);
  if (!match) return null;
  const amount = Number(match[1]);
  const ms = match[2] === "d" ? amount * 24 * 60 * 60 * 1000 : amount * 60 * 60 * 1000;
  return new Date(Date.now() - ms);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[index] ?? 0;
}

const since = parseSince(process.argv);

const jobs = await prisma.job.findMany({
  // DbNull, not null: a JSON column filters on the database NULL, and `null` is a type error.
  where: { phaseTimings: { not: Prisma.DbNull }, ...(since ? { updatedAt: { gte: since } } : {}) },
  select: { phaseTimings: true, status: true },
});

if (jobs.length === 0) {
  console.log("No phase timings recorded yet.");
  console.log("Workers report them on the terminal write; run some applies, then re-run this.");
  await prisma.$disconnect();
  process.exit(0);
}

const byPhase = new Map<string, number[]>();
let totalPerApply: number[] = [];

for (const job of jobs) {
  const timings = job.phaseTimings as Record<string, unknown> | null;
  if (!timings) continue;
  let sum = 0;
  for (const phase of PHASES) {
    const value = timings[phase];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const list = byPhase.get(phase) ?? [];
    list.push(value);
    byPhase.set(phase, list);
    sum += value;
  }
  if (sum > 0) totalPerApply.push(sum);
}

totalPerApply = totalPerApply.sort((a, b) => a - b);

const s = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
console.log(
  `applies with timings: ${jobs.length}${since ? ` (since ${since.toISOString()})` : ""}\n`,
);
console.log("phase         n      p50      p90      max     share");
for (const phase of PHASES) {
  const values = (byPhase.get(phase) ?? []).sort((a, b) => a - b);
  if (values.length === 0) continue;
  const median = percentile(values, 0.5);
  const share = totalPerApply.length ? (median / percentile(totalPerApply, 0.5)) * 100 : 0;
  console.log(
    `${phase.padEnd(12)} ${String(values.length).padStart(3)} ${s(median).padStart(8)} ${s(
      percentile(values, 0.9),
    ).padStart(8)} ${s(values.at(-1) ?? 0).padStart(8)} ${`${share.toFixed(0)}%`.padStart(9)}`,
  );
}
console.log(
  `\ntotal per apply  p50 ${s(percentile(totalPerApply, 0.5))}  p90 ${s(percentile(totalPerApply, 0.9))}`,
);
console.log("Share is of the median total, so it indicates weight rather than summing to 100%.");

await prisma.$disconnect();
