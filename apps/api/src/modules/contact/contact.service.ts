import {
  contactDiscoverySourceSchema,
  contactEmailSourceSchema,
  contactLinkedinConnectionSchema,
} from "@jobpilot/contracts/networking";
import { type PaginationQuery, pageSlice, paginate } from "@jobpilot/contracts/pagination";
import { singleton } from "tsyringe";
import type { z } from "zod/v4";
import { PrismaClient } from "@/generated/prisma/client";

type ContactLinkedinConnection = z.infer<typeof contactLinkedinConnectionSchema>;
type ContactEmailSource = z.infer<typeof contactEmailSourceSchema>;
type ContactDiscoverySource = z.infer<typeof contactDiscoverySourceSchema>;

@singleton()
export class ContactService {
  constructor(private readonly prisma: PrismaClient) {}

  /** One page of the profile's contacts (newest first) for the networking page. */
  async list(userId: string, query: PaginationQuery) {
    const where = { userId };
    const [rows, total] = await Promise.all([
      this.prisma.contact.findMany({ where, orderBy: { createdAt: "desc" }, ...pageSlice(query) }),
      this.prisma.contact.count({ where }),
    ]);
    return paginate(
      rows.map((row) => ({
        ...row,
        linkedinConnection: row.linkedinConnection as ContactLinkedinConnection,
        emailSource: row.emailSource as ContactEmailSource | null,
        discoverySource: row.discoverySource as ContactDiscoverySource | null,
      })),
      query,
      total,
    );
  }
}
