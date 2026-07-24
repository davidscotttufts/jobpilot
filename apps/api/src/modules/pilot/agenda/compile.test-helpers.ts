// Shared entry point for the compile.* suites: drives AgendaService.refresh with the fake Prisma
// from db.test-helpers - no database. Loading the service transitively loads `@/env`, satisfied by
// the local .env / ci.yml dummy env.

import { makeAgendaDeps, type Over } from "./db.test-helpers";
import { AgendaService } from "./service";

/** Builds the service plus the recorder for asserting on writes. */
export const serviceWithRec = (over: Over = {}) => {
  const { prisma, campaignJobs, pilot, push, emailSync, rec } = makeAgendaDeps(over);
  return { svc: new AgendaService(prisma, campaignJobs, pilot, push, emailSync), rec };
};

export const service = (over: Over = {}) => serviceWithRec(over).svc;
