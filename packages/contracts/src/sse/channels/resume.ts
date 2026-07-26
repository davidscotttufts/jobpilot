import { defineChannel } from "../channel";

export type ResumeEvent =
  | { type: "content.updated"; resumeId: string; version: number }
  | { type: "variant.created"; resumeId: string; variantId: string }
  // Batched: one bulk prune is a single event rather than one per row.
  | { type: "variant.deleted"; resumeId: string; variantIds: string[] };

/** Push updates when a resume's content changes (extraction) or its variants are added or removed. */
export const resumeChannel = defineChannel<ResumeEvent, { resumeId: string }>({
  name: "resume",
  path: ({ resumeId }) => `/api/resumes/${resumeId}/events`,
  topic: ({ resumeId }) => String(resumeId),
});
