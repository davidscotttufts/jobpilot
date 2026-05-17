import { ok } from "@/lib/api/response";

const VERSION = "2.0.0";

export async function GET() {
  return ok({ version: VERSION, time: new Date().toISOString() });
}
