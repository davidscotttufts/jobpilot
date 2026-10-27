import type { BoardRef, JobBoardService } from "./job-board.service";

/** Resolves any board string to a ref whose id is `board-<input>`, without a catalog. */
export function makeBoards(): JobBoardService {
  const ref = (input: string): BoardRef => ({ id: `board-${input}`, domain: input, name: input });
  return {
    find: async (input: string) => ref(input),
    resolve: async (input: string) => ref(input),
    resolveId: async (input: string | null) => (input === null ? null : ref(input).id),
    topBoards: async () => [],
  } as unknown as JobBoardService;
}
