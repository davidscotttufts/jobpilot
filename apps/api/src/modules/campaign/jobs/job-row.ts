import type { Prisma } from "@/generated/prisma/client";
import { BOARD_REF_SELECT } from "@/modules/job-board/job-board.service";

/** A campaign job as every response and SSE event carries it: with its board, not a bare id. */
export const JOB_INCLUDE = { board: { select: BOARD_REF_SELECT } } satisfies Prisma.JobInclude;

export type JobRow = Prisma.JobGetPayload<{ include: typeof JOB_INCLUDE }>;
