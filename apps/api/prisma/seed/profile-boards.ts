import { db } from "@/common/database";

/** New profiles link these at signup; this pushes a newly-defaulted board onto existing ones. */
export async function seedProfileBoards(): Promise<void> {
  const boards = await db.jobBoard.findMany({
    where: { isDefault: true },
    select: { id: true, sortOrder: true },
  });
  if (boards.length === 0) {
    console.log("⚠️  No default boards - run the job-boards seeder first.");
    return;
  }

  const profiles = await db.profile.findMany({ select: { id: true } });
  // One createMany over the whole cross-product, not one per profile.
  const { count: linked } = await db.profileJobBoard.createMany({
    data: profiles.flatMap((profile) =>
      boards.map((board) => ({
        profileId: profile.id,
        jobBoardId: board.id,
        sortOrder: board.sortOrder,
      })),
    ),
    skipDuplicates: true,
  });
  console.log(`✅ Linked ${linked} board(s) across ${profiles.length} profile(s).`);
}
