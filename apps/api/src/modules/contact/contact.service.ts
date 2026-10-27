import { type PaginationQuery, pageSlice, paginate } from "@jobpilot/contracts/pagination";
import { inject, injectable } from "@needle-di/core";
import { PrismaClient } from "@/generated/prisma/client";

@injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaClient = inject(PrismaClient)) {}

  /** One page of the user's contacts (newest first) for the networking page. */
  async list(userId: string, query: PaginationQuery) {
    const where = { userId };
    const [rows, total] = await Promise.all([
      this.prisma.contact.findMany({ where, orderBy: { createdAt: "desc" }, ...pageSlice(query) }),
      this.prisma.contact.count({ where }),
    ]);
    return paginate(rows, query, total);
  }
}
