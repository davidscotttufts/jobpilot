import { z } from "zod/v4";

export const UPWORK_PROPOSAL_STATUSES = ["draft", "submitted", "closed"] as const;
const upworkProposalStatusSchema = z.enum(UPWORK_PROPOSAL_STATUSES);
export type UpworkProposalStatus = z.infer<typeof upworkProposalStatusSchema>;

export const UPWORK_PROPOSAL_OUTCOMES = ["hired", "declined", "no_response"] as const;
const upworkProposalOutcomeSchema = z.enum(UPWORK_PROPOSAL_OUTCOMES);
export type UpworkProposalOutcome = z.infer<typeof upworkProposalOutcomeSchema>;

export const screeningAnswerSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export const createUpworkProposalSchema = z.object({
  jobTitle: z.string().min(1),
  clientName: z.string().optional().nullable(),
  jobUrl: z.string().optional().nullable(),
  jobDescription: z.string().optional().nullable(),
  proposalText: z.string().optional(),
  screeningAnswers: z.array(screeningAnswerSchema).optional(),
  status: upworkProposalStatusSchema.optional(),
  notes: z.string().optional().nullable(),
});

export const patchUpworkProposalSchema = z.object({
  jobTitle: z.string().min(1).optional(),
  clientName: z.string().optional().nullable(),
  jobUrl: z.string().optional().nullable(),
  jobDescription: z.string().optional().nullable(),
  proposalText: z.string().optional(),
  screeningAnswers: z.array(screeningAnswerSchema).optional(),
  status: upworkProposalStatusSchema.optional(),
  outcome: upworkProposalOutcomeSchema.optional().nullable(),
  notes: z.string().optional().nullable(),
  submittedAt: z.iso.datetime().optional().nullable(),
});

export type ScreeningAnswer = z.infer<typeof screeningAnswerSchema>;
export type UpworkProposalInput = z.infer<typeof createUpworkProposalSchema>;
export type UpworkProposalPatch = z.infer<typeof patchUpworkProposalSchema>;
