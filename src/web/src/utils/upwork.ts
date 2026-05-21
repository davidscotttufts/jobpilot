import type { UpworkProposal } from "@/generated/prisma/client";
import type { ScreeningAnswer } from "@/lib/schemas/upwork";

/** Parse the JSON-encoded `screeningAnswers` column into the DTO shape. */
export function serializeProposal(row: UpworkProposal) {
  return {
    ...row,
    screeningAnswers: JSON.parse(row.screeningAnswers) as ScreeningAnswer[],
  };
}
