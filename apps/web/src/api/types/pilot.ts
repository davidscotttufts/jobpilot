import type { Data } from "@jobpilot/api-client";
import type { api } from "@/api/client";

export type SavedAnswerDto = Data<typeof api.pilot.answers.get>[number];
