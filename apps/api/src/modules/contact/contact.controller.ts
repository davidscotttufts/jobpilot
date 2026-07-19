import { Elysia } from "elysia";
import { container } from "@/common/di";
import { authGuard } from "@/common/middleware";
import { contactListSchema } from "./contact.schema";
import { ContactService } from "./contact.service";

const contactService = container.resolve(ContactService);

export const contactController = new Elysia({
  prefix: "/contacts",
  detail: { tags: ["Contacts"] },
})
  .use(authGuard)
  .get("/", ({ user }) => contactService.list(user.id), {
    response: contactListSchema,
    detail: {
      summary: "List networking contacts",
      description: "Returns the active profile's networking contacts, ordered newest first.",
    },
  });
