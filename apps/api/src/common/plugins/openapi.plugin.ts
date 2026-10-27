import { openapi } from "@elysiajs/openapi";
import { z } from "zod";

// JSON Schema has no Date type: without the override, every schema holding a `z.date()` throws
// and the plugin documents it as `{}`. Dates go over the wire as ISO strings.
function toJsonSchema(schema: z.ZodType) {
  return z.toJSONSchema(schema, {
    unrepresentable: "any",
    override: (ctx) => {
      if (ctx.zodSchema._zod.def.type === "date") {
        ctx.jsonSchema.type = "string";
        ctx.jsonSchema.format = "date-time";
      }
    },
  });
}

export const openapiPlugin = openapi({
  path: "/swagger",
  // Routes validate with Zod (Standard Schema), which the plugin can only document through a mapper.
  mapJsonSchema: { zod: toJsonSchema },
  documentation: {
    info: { title: "JobPilot API", version: "2.0.0" },
  },
});
