import { z } from "zod/v4";

const HOSTNAME = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/**
 * The catalog key, as a bare host: a pasted `https://www.LinkedIn.com/jobs/` becomes
 * `linkedin.com`, so one board never gets a second row spelled as a URL.
 */
export const boardDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform(
    (value) =>
      value
        .replace(/^[a-z]+:\/\//, "")
        .replace(/^www\./, "")
        .split(/[/?#]/)[0],
  )
  .pipe(z.string().regex(HOSTNAME, "Enter a domain like linkedin.com"));

/**
 * Links a catalog board to the user by domain. An unknown domain is added to the catalog
 * unlisted, named by `name` (or the domain itself). Logins are board credentials.
 */
export const jobBoardSchema = z.object({
  domain: boardDomainSchema,
  name: z.string().trim().optional(),
  searchUrl: z.string().trim().optional(),
});

/** A board inside another resource's response, e.g. the board a job was found on. */
export const boardRefSchema = z.object({ id: z.uuid(), domain: z.string(), name: z.string() });

/** A global catalog row. */
export const adminBoardSchema = z.object({
  name: z.string().min(1),
  domain: boardDomainSchema,
  searchUrl: z.string().optional().nullable(),
  listed: z.boolean(),
  isDefault: z.boolean(),
  sortOrder: z.number().int(),
});

export const adminBoardPatchSchema = adminBoardSchema.partial();

export type JobBoardInput = z.infer<typeof jobBoardSchema>;
export type AdminBoardInput = z.infer<typeof adminBoardSchema>;
export type AdminBoardPatch = z.infer<typeof adminBoardPatchSchema>;
