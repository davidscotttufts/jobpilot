import { z } from "zod/v4";
import { assignableRoleSchema, roleSchema } from "./role";

export const adminUserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
  role: roleSchema.optional(),
});

export const updateUserRoleSchema = z.object({ role: assignableRoleSchema });

/** A global board row. Credentials live on the per-profile link, never here. */
export const adminBoardSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  searchUrl: z.string().optional().nullable(),
  listed: z.boolean(),
  isDefault: z.boolean(),
  sortOrder: z.number().int(),
});

export const adminBoardPatchSchema = adminBoardSchema.partial();

export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type AdminBoardInput = z.infer<typeof adminBoardSchema>;
export type AdminBoardPatch = z.infer<typeof adminBoardPatchSchema>;
