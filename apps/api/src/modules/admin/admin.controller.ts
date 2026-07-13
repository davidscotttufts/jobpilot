import {
  adminBoardPatchSchema,
  adminBoardSchema,
  adminUserQuerySchema,
  updateUserRoleSchema,
} from "@jobpilot/contracts/admin";
import { idParam } from "@jobpilot/contracts/shared";
import { Elysia } from "elysia";
import { container } from "@/common/di";
import { requireRole, requireRoleOn } from "@/common/middleware";
import { deletedResponseSchema } from "@/types/response";
import {
  adminBoardListSchema,
  adminBoardRecordSchema,
  adminStatsSchema,
  adminUserPageSchema,
  adminUserSchema,
} from "./admin.schema";
import { AdminService } from "./admin.service";
import { AdminBoardService } from "./admin-board.service";

const svc = container.resolve(AdminService);
const boards = container.resolve(AdminBoardService);

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
  })
  .get("/boards", () => boards.list(), {
    response: adminBoardListSchema,
    detail: {
      summary: "List catalog boards",
      description:
        "Returns every board in the global catalog, listed ones first, each with the number of profiles that linked it.",
    },
  })
  .post("/boards", ({ body }) => boards.create(body), {
    body: adminBoardSchema,
    response: adminBoardRecordSchema,
    detail: {
      summary: "Create catalog board",
      description:
        "Adds a board to the global catalog and returns the created record. The domain must be unique.",
    },
  })
  .patch("/boards/:id", ({ params, body }) => boards.update(params.id, body), {
    params: idParam,
    body: adminBoardPatchSchema,
    response: adminBoardRecordSchema,
    detail: {
      summary: "Update catalog board",
      description:
        "Applies a partial update to a catalog board identified by id and returns the updated record.",
    },
  })
  .delete("/boards/:id", ({ params }) => boards.remove(params.id), {
    params: idParam,
    response: deletedResponseSchema,
    detail: {
      summary: "Delete catalog board",
      description:
        "Removes a board from the global catalog. This also unlinks it from every profile that had adopted it.",
    },
  });
