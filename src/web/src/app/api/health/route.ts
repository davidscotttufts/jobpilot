import { api } from "@/server/api/route";

const VERSION = "2.0.0";

export const GET = api.publicRoute({}, () => ({ version: VERSION, time: new Date().toISOString() }));
