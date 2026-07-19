import type { AdminBoardInput, AdminBoardPatch } from "@jobpilot/contracts/job-board";
import { singleton } from "tsyringe";
import { type Prisma, PrismaClient } from "@/generated/prisma/client";

/** How many profiles have linked the board - the only thing the catalog view adds to the row. */
const WITH_ADOPTION = { _count: { select: { userBoards: true } } } as const;

type BoardRow = Prisma.JobBoardGetPayload<{ include: typeof WITH_ADOPTION }>;

/**
 * CRUD on the global board catalog. No existence pre-checks - the error middleware already maps
 * Prisma P2002 -> 409 and P2025 -> 404.
 */
@singleton()
export class AdminBoardService {
  constructor(private readonly prisma: PrismaClient) {}

  private project(row: BoardRow) {
    const { _count, ...board } = row;
    return { ...board, adoption: _count.userBoards };
  }

  async list() {
    const rows = await this.prisma.jobBoard.findMany({
      include: WITH_ADOPTION,
      orderBy: [{ listed: "desc" }, { sortOrder: "asc" }],
    });
    return rows.map((row) => this.project(row));
  }

  async create(input: AdminBoardInput) {
    return this.project(await this.prisma.jobBoard.create({ data: input, include: WITH_ADOPTION }));
  }

  async update(id: string, input: AdminBoardPatch) {
    return this.project(
      await this.prisma.jobBoard.update({ where: { id }, data: input, include: WITH_ADOPTION }),
    );
  }

  /** Cascades to every profile's link row - the board disappears from those users' boards. */
  async remove(id: string) {
    await this.prisma.jobBoard.delete({ where: { id } });
    return { deleted: id };
  }
}
