import { credentialPatchSchema, credentialSchema } from "@jobpilot/contracts/credential";
import { idParam } from "@jobpilot/contracts/shared";
import { Elysia } from "elysia";
import { container } from "@/common/di/container";
import { authGuard } from "@/common/middleware";
import { deletedResponseSchema } from "@/types/response";
import {
  credentialListSchema,
  credentialRecordSchema,
  domainResolveQuery,
  resolvedCredentialSchema,
} from "./credential.schema";
import { CredentialService } from "./credential.service";

const svc = container.get(CredentialService);

export const credentialController = new Elysia({
  prefix: "/credentials",
  detail: { tags: ["Credentials"] },
})
  .use(authGuard)
  .get("/", ({ user }) => svc.list(user.id), {
    response: credentialListSchema,
    detail: {
      summary: "List credentials",
      description:
        "Returns the user's credentials - board logins, the default login and captcha-service keys - without secrets: `hasPassword` and `hasApiKey` say whether each is set.",
    },
  })
  .post("/", ({ user, body }) => svc.create(user.id, body), {
    body: credentialSchema,
    response: credentialRecordSchema,
    detail: {
      summary: "Create credential",
      description:
        "Creates a board login (`board` is the board's domain), the default login, or a captcha-service key, and returns the record without secrets. A second credential for the same board, provider, or default returns 409.",
    },
  })
  .get("/resolve", ({ user, query }) => svc.resolveCredential(user.id, query.domain), {
    query: domainResolveQuery,
    response: resolvedCredentialSchema,
    detail: {
      summary: "Resolve login for domain",
      description:
        "Resolves the effective login for a board domain: the board's own credential, else the default. Returns the email/password with the credential id (the target for a password update) and the `kind` that matched, or null when no complete pair is found.",
    },
  })
  .patch("/:id", ({ user, params, body }) => svc.update(user.id, params.id, body), {
    params: idParam,
    body: credentialPatchSchema,
    response: credentialRecordSchema,
    detail: {
      summary: "Update credential",
      description:
        "Updates the specified credential owned by the user and returns the record without secrets. A field that does not belong to the credential's kind returns 422.",
    },
  })
  .delete("/:id", ({ user, params }) => svc.remove(user.id, params.id), {
    params: idParam,
    response: deletedResponseSchema,
    detail: {
      summary: "Delete credential",
      description: "Deletes the specified credential owned by the user and returns the deleted id.",
    },
  });
