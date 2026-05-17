import { getActiveProfileId } from "@/lib/active-profile";
import { err, ErrorCodes, ok } from "@/lib/api/response";
import { db } from "@/lib/db";
import { jobBoardSchema } from "@/lib/schemas/job-board";

export async function GET() {
  const profileId = await getActiveProfileId();
  const boards = await db.jobBoard.findMany({
    where: { profileId },
    orderBy: { sortOrder: "asc" },
  });
  return ok(boards);
}

export async function POST(req: Request) {
  const profileId = await getActiveProfileId();
  const body = await req.json();
  const parsed = jobBoardSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid board payload", 422, parsed.error.issues);
  }

  try {
    const board = await db.jobBoard.create({ data: { ...parsed.data, profileId } });
    return ok(board, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return err(ErrorCodes.CONFLICT, "Board with this domain already exists", 409);
    }
    throw e;
  }
}
