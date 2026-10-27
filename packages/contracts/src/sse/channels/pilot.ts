import type { PilotJournalEntry, PilotQuestion, PilotState, Promotion } from "../../pilot";
import { defineChannel } from "../channel";

export type PilotEvent =
  | { type: "journal.appended"; entry: PilotJournalEntry }
  | { type: "question.created"; question: PilotQuestion }
  | { type: "question.answered"; question: PilotQuestion }
  | { type: "state.changed"; state: PilotState }
  | { type: "promotion.created"; promotion: Promotion }
  | { type: "promotion.updated"; promotion: Promotion }
  | { type: "run.started"; runId: string; taskType: string }
  | { type: "run.finished"; runId: string; outcome: string };

/** Parameter-free path: the server resolves the user from the session. */
export const pilotChannel = defineChannel<PilotEvent, void, { userId: string }>({
  name: "pilot",
  path: () => "/api/pilot/events",
  topic: ({ userId }) => String(userId),
});
