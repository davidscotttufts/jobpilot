import type { Data } from "@jobpilot/api-client";
import type { api } from "@/api/client";

/** A saved answer to a reusable pilot question, inferred from `GET /api/pilot/answers`. */
export type SavedAnswerDto = Data<typeof api.pilot.answers.get>[number];
