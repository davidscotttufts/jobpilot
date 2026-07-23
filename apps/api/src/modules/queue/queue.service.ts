import type { AddQueueEntry, PatchQueueEntry, QueueStatus } from "@jobpilot/contracts/queue";
import { workspaceChannel } from "@jobpilot/contracts/sse";
import { singleton } from "tsyringe";
import { findOwned } from "@/common/errors";
import { publish } from "@/common/sse";
import { type Prisma, PrismaClient, type QueueEntry } from "@/generated/prisma/client";

type QueueEntryRow = Omit<QueueEntry, "status"> & {
  status: QueueStatus;
};

function serializeQueueEntry(row: QueueEntry): QueueEntryRow {
  return {
    ...row,
    status: row.status as QueueStatus,
  };
}

@singleton()
export class QueueService {
  constructor(private readonly prisma: PrismaClient) {}

  private findEntry(id: string, userId: string) {
    return findOwned(
      (where) => this.prisma.queueEntry.findFirst({ where, select: { id: true } }),
      { id, userId },
      "Queue entry",
    );
  }

  /** Unpaginated, like `/pending`: the queue is a short work list the agent drains, not a table. */
  async list(userId: string, status?: string): Promise<QueueEntryRow[]> {
    const where: Prisma.QueueEntryWhereInput = { userId };
    if (status) {
      where.status = status;
    }
    const rows = await this.prisma.queueEntry.findMany({ where, orderBy: { createdAt: "asc" } });
    return rows.map(serializeQueueEntry);
  }

  /** Every pending entry - the agent's work drain, so it never filters or truncates. */
  async listPending(userId: string): Promise<QueueEntryRow[]> {
    const rows = await this.prisma.queueEntry.findMany({
      where: { userId, status: "pending" },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(serializeQueueEntry);
  }

  async add(userId: string, input: AddQueueEntry) {
    const created = await this.prisma.$transaction(
      input.urls.map((u) =>
        this.prisma.queueEntry.upsert({
          where: { userId_url: { userId, url: u } },
          create: { userId, url: u, note: input.note ?? null, status: "pending" },
          update: { note: input.note ?? null, status: "pending" },
        }),
      ),
    );
    publish(workspaceChannel, { userId }, { type: "queue.updated" });
    return { inserted: created.length, items: created.map(serializeQueueEntry) };
  }

  async patch(userId: string, id: string, input: PatchQueueEntry): Promise<QueueEntryRow> {
    await this.findEntry(id, userId);
    const updated = await this.prisma.queueEntry.update({
      where: { id },
      data: {
        status: input.status,
        consumedAt: input.status === "consumed" ? new Date() : null,
      },
    });
    return serializeQueueEntry(updated);
  }

  async remove(userId: string, id: string) {
    await this.findEntry(id, userId);
    await this.prisma.queueEntry.delete({ where: { id } });
    return { deleted: id };
  }
}
