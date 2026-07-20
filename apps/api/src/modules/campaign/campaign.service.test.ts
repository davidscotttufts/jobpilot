import type { CampaignStatus, PrismaClient } from "@/generated/prisma/client";
import { CampaignService } from "./campaign.service";
import { emptyJobSummary } from "./campaign.summary";
import { describe, expect, it } from "bun:test";

const row = {
  campaignId: "c1",
  userId: "u1",
  query: "typescript",
  source: "search" as const,
  status: "in_progress" as CampaignStatus,
  startedAt: new Date(),
  updatedAt: new Date(),
  completedAt: null,
  config: {},
};

function makeService(current = row) {
  const updates: Record<string, unknown>[] = [];
  const wheres: Record<string, unknown>[] = [];
  const db = {
    campaign: {
      findMany: async () => [current],
      count: async () => 1,
      findFirst: async () => current,
      updateMany: async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        wheres.push(where);
        // Mirror the DB: a guarded column that doesn't match the row updates nothing.
        const guard = where.updatedAt;
        if (guard instanceof Date && guard.getTime() !== current.updatedAt.getTime()) {
          return { count: 0 };
        }
        updates.push(data);
        return { count: 1 };
      },
      update: async ({ data }: { data: Record<string, unknown> }) => ({ ...current, ...data }),
      findUniqueOrThrow: async () => ({ ...current, ...updates.at(-1) }),
    },
    job: { groupBy: async () => [] },
    networkingMessage: { groupBy: async () => [], findMany: async () => [] },
  };
  return { service: new CampaignService(db as unknown as PrismaClient), updates, wheres };
}

describe("CampaignService", () => {
  it("returns a paginated DTO with a derived summary", async () => {
    const { service } = makeService();
    const result = await service.list("u1", { page: 1, limit: 25 });
    expect(result.pagination).toMatchObject({ page: 1, limit: 25, total: 1, totalPages: 1 });
    expect(result.items[0]?.summary).toEqual(emptyJobSummary());
  });

  it("applies an allowed status command with actor attribution", async () => {
    const { service, updates } = makeService();
    const result = await service.commandStatus("u1", "c1", {
      status: "paused",
      actor: "agent",
      reason: "verification required",
    });
    expect(updates).toEqual([
      {
        status: "paused",
        statusActor: "agent",
        statusReason: "verification required",
        completedAt: null,
      },
    ]);
    expect(result.status).toBe("paused");
  });

  it("rejects a transition away from a terminal status", async () => {
    const { service } = makeService({ ...row, status: "completed" });
    await expect(
      service.commandStatus("u1", "c1", { status: "paused", actor: "user" }),
    ).rejects.toThrow();
  });

  it("keeps source-specific config invariants on full replacement", async () => {
    const { service } = makeService();
    await expect(service.updateConfig("u1", "c1", { config: {} })).rejects.toThrow(
      "config.resumeId is required",
    );
  });

  it("scopes a config write to the owner and the expected version", async () => {
    const { service, wheres } = makeService();
    await service.updateConfig("u1", "c1", {
      config: { resumeId: "b0f1c2d3-4e5a-4b6c-8d7e-9f0a1b2c3d4e" },
      expectedUpdatedAt: row.updatedAt.toISOString(),
    });
    expect(wheres.at(-1)).toEqual({
      campaignId: "c1",
      userId: "u1",
      updatedAt: row.updatedAt,
    });
  });

  it("rejects a config write whose expected version is stale", async () => {
    const { service } = makeService();
    await expect(
      service.updateConfig("u1", "c1", {
        config: { resumeId: "b0f1c2d3-4e5a-4b6c-8d7e-9f0a1b2c3d4e" },
        expectedUpdatedAt: new Date(row.updatedAt.getTime() - 1000).toISOString(),
      }),
    ).rejects.toThrow("Campaign changed since it was fetched");
  });

  it("still scopes a config write to the owner when no version is expected", async () => {
    const { service, wheres } = makeService();
    await service.updateConfig("u1", "c1", {
      config: { resumeId: "b0f1c2d3-4e5a-4b6c-8d7e-9f0a1b2c3d4e" },
    });
    expect(wheres.at(-1)).toEqual({ campaignId: "c1", userId: "u1" });
  });
});
