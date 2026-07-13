import type { Prisma } from "@/generated/prisma/client";

/**
 * What a fresh install's catalog holds. Consumed only by `prisma/seed/job-boards.ts` - after that
 * the table is the source of truth. Typed as the Prisma input so a new column breaks the build here.
 */
export const DEFAULT_BOARDS: Prisma.JobBoardCreateManyInput[] = [
  {
    name: "LinkedIn",
    domain: "linkedin.com",
    searchUrl: "https://www.linkedin.com/jobs/search/",
    sortOrder: 1,
  },
  {
    name: "Indeed",
    domain: "indeed.com",
    searchUrl: "https://www.indeed.com/jobs",
    sortOrder: 2,
  },
  {
    name: "Glassdoor",
    domain: "glassdoor.com",
    searchUrl: "https://www.glassdoor.com/Job/",
    sortOrder: 3,
  },
  {
    name: "Hiring Cafe",
    domain: "hiring.cafe",
    searchUrl: "https://hiring.cafe",
    sortOrder: 4,
  },
  {
    name: "Wellfound",
    domain: "wellfound.com",
    searchUrl: "https://wellfound.com/jobs",
    sortOrder: 5,
  },
  {
    name: "Y Combinator",
    domain: "workatastartup.com",
    searchUrl: "https://www.workatastartup.com/companies",
    sortOrder: 6,
  },
  {
    name: "Welcome to the Jungle",
    domain: "welcometothejungle.com",
    searchUrl: "https://www.welcometothejungle.com/en/jobs",
    sortOrder: 7,
  },
  {
    name: "Hacker News Who's Hiring",
    domain: "news.ycombinator.com",
    searchUrl: "https://news.ycombinator.com/submitted?id=whoishiring",
    sortOrder: 8,
  },
  {
    name: "We Work Remotely",
    domain: "weworkremotely.com",
    searchUrl: "https://weworkremotely.com/remote-jobs",
    sortOrder: 9,
  },
  {
    name: "Remote OK",
    domain: "remoteok.com",
    searchUrl: "https://remoteok.com/",
    sortOrder: 10,
  },
  {
    name: "4 Day Week",
    domain: "4dayweek.io",
    searchUrl: "https://4dayweek.io/remote-jobs",
    sortOrder: 11,
  },
  {
    name: "Upwork",
    domain: "upwork.com",
    searchUrl: "https://www.upwork.com/nx/search/jobs/",
    sortOrder: 12,
  },
];
