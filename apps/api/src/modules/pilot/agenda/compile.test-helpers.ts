// Shared entry point for the compile.* suites: drives AgendaService.refresh with the fake Prisma
// from db.test-helpers - no database. Loading the service transitively loads `@/env`, satisfied by
// the local .env / ci.yml dummy env.

import { makeAgendaDeps, type Over } from "./db.test-helpers";
import { AgendaService } from "./service";

export const service = (over: Over = {}) => {
  const { prisma, campaignJobs, pilot, push } = makeAgendaDeps(over);
  return new AgendaService(prisma, campaignJobs, pilot, push);
};
