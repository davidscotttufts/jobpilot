import type { JobBoardInput, JobBoardPatch } from "@jobpilot/contracts/job-board";
import { singleton } from "tsyringe";
import { CryptoService, SECRET_CONTEXTS } from "@/common/crypto";
import { findOwned } from "@/common/errors";
import { type Prisma, PrismaClient } from "@/generated/prisma/client";

/** The link row joined to its global board - everything needed to project the wire shape. */
type LinkWithBoard = Prisma.ProfileJobBoardGetPayload<{ include: { jobBoard: true } }>;

@singleton()
export class JobBoardService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly crypto: CryptoService,
  ) {}

  /** Link + global board flattened to the wire shape. `id` is the link's - the global row is admin-owned. */
  private async project(userId: string, row: LinkWithBoard) {
    return {
      id: row.id,
      jobBoardId: row.jobBoardId,
      name: row.name ?? row.jobBoard.name,
      domain: row.jobBoard.domain,
      searchUrl: row.searchUrl ?? row.jobBoard.searchUrl,
      email: row.email,
      password: await this.crypto.decryptField(userId, SECRET_CONTEXTS.boardPassword, row.password),
      sortOrder: row.sortOrder,
    };
  }

  async list(userId: string, profileId: string) {
    const rows = await this.prisma.profileJobBoard.findMany({
      where: { profileId },
      include: { jobBoard: true },
      orderBy: { sortOrder: "asc" },
    });
    return Promise.all(rows.map((row) => this.project(userId, row)));
  }

  /** Listed boards the profile has not linked yet - the picker in the add-board dialog. */
  catalog(profileId: string) {
    return this.prisma.jobBoard.findMany({
      where: { listed: true, profiles: { none: { profileId } } },
      select: { id: true, name: true, domain: true, searchUrl: true, sortOrder: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  async create(userId: string, profileId: string, input: JobBoardInput) {
    // An unknown domain enters the catalog unlisted: admins see it, other users are not offered it.
    const board = await this.prisma.jobBoard.upsert({
      where: { domain: input.domain },
      create: {
        name: input.name,
        domain: input.domain,
        searchUrl: input.searchUrl,
        sortOrder: input.sortOrder,
      },
      update: {},
    });
    const row = await this.prisma.profileJobBoard.create({
      data: {
        profileId,
        jobBoardId: board.id,
        // User-typed, so stored as overrides. Null (= inherit admin renames) is what seeded links get.
        name: input.name,
        searchUrl: input.searchUrl,
        email: input.email,
        password: await this.crypto.encryptField(
          userId,
          SECRET_CONTEXTS.boardPassword,
          input.password,
        ),
        sortOrder: input.sortOrder,
      },
      include: { jobBoard: true },
    });
    return this.project(userId, row);
  }

  private findLink(profileId: string, id: string) {
    return findOwned(
      (where) => this.prisma.profileJobBoard.findFirst({ where, select: { id: true } }),
      { id, profileId },
      "Board",
    );
  }

  async update(userId: string, profileId: string, id: string, input: JobBoardPatch) {
    await this.findLink(profileId, id);
    const row = await this.prisma.profileJobBoard.update({
      where: { id },
      data: {
        ...input,
        password: await this.crypto.encryptField(
          userId,
          SECRET_CONTEXTS.boardPassword,
          input.password,
        ),
      },
      include: { jobBoard: true },
    });
    return this.project(userId, row);
  }

  /** Unlinks the board from this profile. The global row survives - other users still use it. */
  async remove(profileId: string, id: string) {
    await this.findLink(profileId, id);
    await this.prisma.profileJobBoard.delete({ where: { id } });
    return { deleted: id };
  }
}
