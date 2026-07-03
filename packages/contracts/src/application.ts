import { z } from "zod/v4";

export const STATUSES = [
  "applied",
  "screening",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export const statusSchema = z.enum(STATUSES);
export const APPLICATION_SOURCES = ["apply", "auto-apply", "manual"] as const;
export const sourceSchema = z.enum(APPLICATION_SOURCES);

/** Activity-timeline event kinds on an application. */
export const APPLICATION_EVENT_KINDS = ["status_change", "note", "email"] as const;
export const applicationEventKindSchema = z.enum(APPLICATION_EVENT_KINDS);

/** What originated an activity event. */
export const APPLICATION_EVENT_SOURCES = ["manual", "email", "campaign"] as const;
export const applicationEventSourceSchema = z.enum(APPLICATION_EVENT_SOURCES);

export const statusTransitionSchema = z.object({
  toStatus: statusSchema,
  note: z.string().optional().nullable(),
});

export type ApplicationStatus = z.infer<typeof statusSchema>;
export type ApplicationSource = z.infer<typeof sourceSchema>;
export type ApplicationEventKind = z.infer<typeof applicationEventKindSchema>;
export type ApplicationEventSource = z.infer<typeof applicationEventSourceSchema>;
export type StatusTransitionInput = z.infer<typeof statusTransitionSchema>;
