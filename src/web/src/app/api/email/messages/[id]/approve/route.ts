import { approveSchema } from "@/lib/contracts/email";
import { idParam } from "@/lib/contracts/shared";
import { api } from "@/server/api/route";
import { approveEmailReply } from "@/server/email/approve";

export const POST = api.route(
  { params: idParam, body: approveSchema },
  ({ params: { id }, body, profileId }) => approveEmailReply({ messageId: id, profileId, body }),
);
