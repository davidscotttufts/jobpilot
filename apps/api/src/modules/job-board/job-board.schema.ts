import { z } from "zod/v4";

// ── Response schemas ──────────────────────────────────────────────────────────

/** A profile's board: the link flattened onto its global row. `id` is the link's, not the board's. */
export const jobBoardRecordSchema = z.object({
  id: z.uuid(),
  jobBoardId: z.uuid(),
  name: z.string(),
  domain: z.string(),
  searchUrl: z.string().nullable(),
  email: z.string().nullable(),
  password: z.string().nullable(),
  sortOrder: z.number().int(),
});

/** All of the active profile's job boards, ordered by sort order. */
export const jobBoardListSchema = z.array(jobBoardRecordSchema);

/** Listed global boards the profile has not linked yet - the add-board picker. */
export const jobBoardCatalogSchema = z.array(
  z.object({
    id: z.uuid(),
    name: z.string(),
    domain: z.string(),
    searchUrl: z.string().nullable(),
    sortOrder: z.number().int(),
  }),
);
