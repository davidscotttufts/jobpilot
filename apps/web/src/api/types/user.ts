import type { Data } from "@jobpilot/api-client";
import type { api } from "@/api/client";

/** The current-user aggregate, inferred from `GET /api/user`. */
export type UserAggregateResponse = Data<typeof api.user.get>;
export type UserDetailDto = NonNullable<UserAggregateResponse["user"]>;
export type AutoApplySettingsDto = NonNullable<UserAggregateResponse["autoApply"]>;
export type ReferenceDto = UserDetailDto["references"][number];
