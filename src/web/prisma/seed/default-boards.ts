import { db } from "@/lib/db";

interface BoardSeed {
  name: string;
  domain: string;
  searchUrl: string | null;
  type: "search" | "ats";
  sortOrder: number;
}

const DEFAULT_BOARDS: BoardSeed[] = [
  {
    name: "LinkedIn",
    domain: "linkedin.com",
    searchUrl: "https://www.linkedin.com/jobs/search/",
    type: "search",
    sortOrder: 10,
  },
  {
    name: "Indeed",
    domain: "indeed.com",
    searchUrl: "https://www.indeed.com/jobs",
    type: "search",
    sortOrder: 20,
  },
  {
    name: "Glassdoor",
    domain: "glassdoor.com",
    searchUrl: "https://www.glassdoor.com/Job/",
    type: "search",
    sortOrder: 30,
  },
  {
    name: "Hiring Cafe",
    domain: "hiring.cafe",
    searchUrl: "https://hiring.cafe/jobs",
    type: "search",
    sortOrder: 40,
  },
  { name: "Greenhouse", domain: "greenhouse.io", searchUrl: null, type: "ats", sortOrder: 50 },
  { name: "Lever", domain: "lever.co", searchUrl: null, type: "ats", sortOrder: 60 },
  { name: "Workday", domain: "workday.com", searchUrl: null, type: "ats", sortOrder: 70 },
];

async function main() {
  const profiles = await db.profile.findMany({ select: { id: true } });
  if (profiles.length === 0) {
    console.log(
      "No profiles found. Skipping job board seed (boards seed per profile after onboarding).",
    );
    return;
  }

  for (const profile of profiles) {
    for (const board of DEFAULT_BOARDS) {
      await db.jobBoard.upsert({
        where: { profileId_domain: { profileId: profile.id, domain: board.domain } },
        create: { ...board, enabled: true, profileId: profile.id },
        update: {},
      });
    }
  }
  const count = await db.jobBoard.count();
  console.log(`Seeded job boards for ${profiles.length} profile(s). Total: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
