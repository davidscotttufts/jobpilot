import { adminUserQuerySchema, updateUserRoleSchema } from "@jobpilot/contracts/admin";
import { idParam } from "@jobpilot/contracts/shared";
import { Elysia } from "elysia";
import { container } from "@/common/di";
import { requireRole, requireRoleOn } from "@/common/middleware";
import { adminStatsSchema, adminUserPageSchema, adminUserSchema } from "./admin.schema";
import { AdminService } from "./admin.service";

const svc = container.resolve(AdminService);

/** Stats and user/role management only. Feature-specific admin routes live in their own module. */
export const adminController = new Elysia({
  prefix: "/admin",
  detail: { tags: ["Admin"] },
})
  // One guard for the whole module: every route below - and every route added later - is admin-only.
  .use(requireRole("ADMIN"))
  .get("/stats", () => svc.stats(), {
    response: adminStatsSchema,
    detail: {
      summary: "Platform stats",
      description:
        "Returns platform-wide counters: users, content volumes, application status breakdown, top boards, and a 30-day signup series.",
    },
  })
  .get("/users", ({ user, query }) => svc.listUsers(user, query), {
    query: adminUserQuerySchema,
    response: adminUserPageSchema,
    detail: {
      summary: "List users",
      description:
        "Returns a page of users filtered by email search and role, each with their application count, last activity, and whether the caller may change their role.",
    },
  })
  .patch("/users/:id/role", ({ user, params, body }) => svc.setRole(user, params.id, body.role), {
    params: idParam,
    body: updateUserRoleSchema,
    beforeHandle: requireRoleOn("SUPER_ADMIN"),
    response: adminUserSchema,
    detail: {
      summary: "Change a user's role",
      description:
        "Super admin only. Grants or revokes ADMIN and returns the updated user. SUPER_ADMIN cannot be assigned, revoked, or self-applied.",
    },
  });
