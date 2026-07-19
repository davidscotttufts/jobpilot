import { db } from "@/common/database";

/** New users link these at signup; this pushes a newly-defaulted board onto existing ones. */
export async function seedUserBoards(): Promise<void> {
  const boards = await db.jobBoard.findMany({
    where: { isDefault: true },
    select: { id: true, sortOrder: true },
  });
  if (boards.length === 0) {
    console.log("⚠️  No default boards - run the job-boards seeder first.");
    return;
  }

  const users = await db.user.findMany({ select: { id: true } });
  // One createMany over the whole cross-product, not one per user.
  const { count: linked } = await db.userJobBoard.createMany({
    data: users.flatMap((user) =>
      boards.map((board) => ({
        userId: user.id,
        jobBoardId: board.id,
        sortOrder: board.sortOrder,
      })),
    ),
    skipDuplicates: true,
  });
  console.log(`✅ Linked ${linked} board(s) across ${users.length} user(s).`);
}
