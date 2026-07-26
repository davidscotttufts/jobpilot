import type {
  ResumeData,
  resumeVariantCreateSchema,
  resumeVariantPatchSchema,
} from "@jobpilot/contracts/resume";
import { resumeChannel } from "@jobpilot/contracts/sse";
import { singleton } from "tsyringe";
import type { z } from "zod/v4";
import { ErrorCodes, findOwned, HttpError, notFound } from "@/common/errors";
import { renderResumePdf } from "@/common/pdf";
import { publish } from "@/common/sse";
import {
  deleteGeneratedVariantFiles,
  ensureCachedPdf,
  ensureGeneratedDir,
  generatedVariantPath,
  slugifyForDownload,
} from "@/common/storage";
import { type Prisma, PrismaClient } from "@/generated/prisma/client";
import { backfillResumeIds } from "../backfill-ids";
import { streamFile } from "../resume.stream";
import { findResume } from "../resume.utils";
import { type VariantRewriteAudit, validateRewrites } from "../rewrite";
import { applyStructure, type StructureAudit, type StructureInput } from "../structure";
import { tailorBase } from "../tailor";
import { notProtectedVariant } from "./prunable";
import type { pruneVariantsQuerySchema } from "./variant.schema";

type ResumeVariantCreateInput = z.infer<typeof resumeVariantCreateSchema>;
type ResumeVariantPatch = z.infer<typeof resumeVariantPatchSchema>;
type PruneVariantsQuery = z.infer<typeof pruneVariantsQuerySchema>;

export interface TailorVariantBody {
  label: string;
  jobUrl?: string | null;
  applicationId?: string | null;
  mode?: "conservative" | "aggressive";
  summary?: string;
  headline?: string;
  emphasizedTech?: string[];
  jobKeywords?: string[];
  diffNotes?: string | null;
  maxBulletsPerEntry?: number;
  rewordTopN?: number;
  structure?: StructureInput;
  bulletRewrites?: { entryIndex: number; bullets: { original: string; tailored: string }[] }[];
}

interface TailoredVariantResult {
  id: string;
  pdfUrl: string;
  rewordedBullets: number;
  flags: string[];
}

@singleton()
export class ResumeVariantService {
  constructor(private readonly prisma: PrismaClient) {}

  private findVariant(userId: string, id: string) {
    return findOwned(
      (where) =>
        this.prisma.resumeVariant.findFirst({
          where,
          include: { resume: { select: { label: true } } },
        }),
      { id, resume: { userId } },
      "Variant",
    );
  }

  async listVariants(userId: string, resumeId: string) {
    await findOwned(
      (where) => this.prisma.resume.findFirst({ where, select: { id: true } }),
      { id: resumeId, userId },
      "Resume",
    );

    const variants = await this.prisma.resumeVariant.findMany({
      where: { resumeId },
      orderBy: { updatedAt: "desc" },
    });

    return variants.map((v) => ({
      id: v.id,
      resumeId: v.resumeId,
      label: v.label,
      jobUrl: v.jobUrl,
      applicationId: v.applicationId,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }));
  }

  async createVariant(
    userId: string,
    resumeId: string,
    body: ResumeVariantCreateInput,
  ): Promise<{ id: string }> {
    await findOwned(
      (where) => this.prisma.resume.findFirst({ where, select: { id: true } }),
      { id: resumeId, userId },
      "Resume",
    );

    if (body.applicationId) {
      const app = await this.prisma.application.findUnique({
        where: { id: body.applicationId },
        select: { id: true },
      });
      if (!app) {
        throw notFound("Application not found");
      }
    }

    const variant = await this.prisma.resumeVariant.create({
      data: {
        resumeId,
        label: body.label,
        jobUrl: body.jobUrl ?? null,
        applicationId: body.applicationId ?? null,
        content: JSON.stringify(body.content),
        diffNotes: body.diffNotes ?? null,
      },
    });

    publish(
      resumeChannel,
      { resumeId },
      { type: "variant.created", resumeId, variantId: variant.id },
    );

    return { id: variant.id };
  }

  async getVariant(userId: string, id: string) {
    const variant = await this.findVariant(userId, id);

    return {
      id: variant.id,
      resumeId: variant.resumeId,
      resumeLabel: variant.resume.label,
      label: variant.label,
      jobUrl: variant.jobUrl,
      applicationId: variant.applicationId,
      content: JSON.parse(variant.content) as ResumeData,
      diffNotes: variant.diffNotes,
      rewrites: variant.rewrites ? (JSON.parse(variant.rewrites) as VariantRewriteAudit) : null,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
    };
  }

  async updateVariant(
    userId: string,
    id: string,
    body: ResumeVariantPatch,
  ): Promise<{ id: string }> {
    await this.findVariant(userId, id);

    const updated = await this.prisma.resumeVariant.update({
      where: { id },
      data: {
        label: body.label ?? undefined,
        jobUrl: body.jobUrl === undefined ? undefined : body.jobUrl,
        applicationId: body.applicationId === undefined ? undefined : body.applicationId,
        content: body.content ? JSON.stringify(body.content) : undefined,
        diffNotes: body.diffNotes === undefined ? undefined : body.diffNotes,
      },
    });
    return { id: updated.id };
  }

  async removeVariant(userId: string, id: string): Promise<{ deleted: string }> {
    const variant = await this.findVariant(userId, id);
    await this.prisma.resumeVariant.delete({ where: { id } });
    // Otherwise the cache keeps a file no request can reach, until the TTL sweep collects it.
    await deleteGeneratedVariantFiles(id);
    publish(
      resumeChannel,
      { resumeId: variant.resumeId },
      { type: "variant.deleted", resumeId: variant.resumeId, variantIds: [id] },
    );
    return { deleted: id };
  }

  /**
   * Writes a variant's content onto its base and drops the variant - what the dashboard's Apply
   * does to a suggested rewrite. One transaction: as two browser calls, a dropped connection left
   * the base rewritten with the suggestion still on offer.
   */
  async applyVariant(userId: string, id: string): Promise<{ id: string; version: number }> {
    const variant = await this.findVariant(userId, id);
    const { resumeId } = variant;

    const [updated] = await this.prisma.$transaction([
      this.prisma.resume.update({
        where: { id: resumeId },
        // Content copied as stored: it went through `resumeDataSchema` when the variant was created.
        data: { content: variant.content, version: { increment: 1 } },
      }),
      this.prisma.resumeVariant.delete({ where: { id } }),
    ]);

    // Otherwise the cache keeps a file no request can reach, until the TTL sweep collects it.
    await deleteGeneratedVariantFiles(id);

    publish(
      resumeChannel,
      { resumeId },
      { type: "content.updated", resumeId, version: updated.version },
    );
    publish(resumeChannel, { resumeId }, { type: "variant.deleted", resumeId, variantIds: [id] });

    return { id: updated.id, version: updated.version };
  }

  /**
   * Bulk prune for a base's accumulated variants. Never touches one linked to an application (the
   * record of what was sent) or a reserved label.
   */
  async pruneVariants(
    userId: string,
    resumeId: string,
    query: PruneVariantsQuery,
  ): Promise<{ deleted: number }> {
    await findOwned(
      (where) => this.prisma.resume.findFirst({ where, select: { id: true } }),
      { id: resumeId, userId },
      "Resume",
    );

    const where: Prisma.ResumeVariantWhereInput = {
      resumeId,
      ...notProtectedVariant,
      ...(query.unlinkedOnly !== false && { applicationId: null }),
      ...(query.before && { createdAt: { lt: query.before } }),
    };

    // `keep` is applied by id rather than in the delete: "newest N survive" needs an ordered read.
    const candidates = await this.prisma.resumeVariant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: { id: true },
      ...(query.keep ? { skip: query.keep } : {}),
    });

    if (candidates.length === 0) {
      return { deleted: 0 };
    }

    const ids = candidates.map((variant) => variant.id);
    const result = await this.prisma.resumeVariant.deleteMany({ where: { id: { in: ids } } });
    await deleteGeneratedVariantFiles(...ids);

    publish(resumeChannel, { resumeId }, { type: "variant.deleted", resumeId, variantIds: ids });

    return { deleted: result.count };
  }

  async renderVariantPdf(userId: string, variantId: string): Promise<Response> {
    const variant = await findOwned(
      (where) => this.prisma.resumeVariant.findFirst({ where }),
      { id: variantId, resume: { userId } },
      "Variant",
    );

    await ensureGeneratedDir();
    const cachePath = generatedVariantPath(variant.id, variant.updatedAt.getTime());
    await ensureCachedPdf(cachePath, () =>
      renderResumePdf(JSON.parse(variant.content) as ResumeData),
    );

    return streamFile(cachePath, "application/pdf", `${slugifyForDownload(variant.label)}.pdf`);
  }

  /**
   * Create a tailored resume variant from model-authored hints. The model
   * never writes structured ResumeData - just a tailored `summary` and a
   * small `emphasizedTech`/`jobKeywords` array. The server applies a
   * deterministic ranking against the base content.
   */
  async createTailoredVariant(
    userId: string,
    resumeId: string,
    body: TailorVariantBody,
  ): Promise<TailoredVariantResult> {
    const base = await findResume(this.prisma, userId, resumeId);

    if (!base.content) {
      throw new HttpError(
        ErrorCodes.UNPROCESSABLE,
        "Base resume has no structured content. Run extract-resume first.",
        422,
      );
    }

    if (body.applicationId) {
      const app = await this.prisma.application.findUnique({
        where: { id: body.applicationId },
        select: { id: true },
      });
      if (!app) {
        throw notFound("Application not found");
      }
    }

    const { content: parsedBase } = backfillResumeIds(JSON.parse(base.content) as ResumeData);
    const aggressive = body.mode === "aggressive";

    // First, so rewrites and ranking see the entries the plan produced. All-or-nothing: a
    // partially-applied restructure is a resume nobody asked for.
    let baseContent = parsedBase;
    let structureAudit: StructureAudit | null = null;
    if (aggressive && body.structure) {
      const restructured = applyStructure(parsedBase, body.structure);
      if (!restructured.ok) {
        throw new HttpError(
          ErrorCodes.UNPROCESSABLE,
          "Structure validation failed",
          422,
          restructured.violations,
        );
      }
      baseContent = restructured.content;
      structureAudit = restructured.audit;
    }

    // Aggressive widens the window only; the numbers guard in validateRewrites is unchanged.
    const rewordTopN = aggressive ? (baseContent.experience?.length ?? 0) : (body.rewordTopN ?? 2);
    const rewrites = body.bulletRewrites ?? [];
    const validation = validateRewrites(baseContent, rewrites, rewordTopN);

    if (!validation.ok) {
      throw new HttpError(
        ErrorCodes.UNPROCESSABLE,
        "Rewrite validation failed",
        422,
        validation.violations,
      );
    }

    const tailored = tailorBase(baseContent, {
      summary: body.summary,
      headline: aggressive ? body.headline : undefined,
      emphasizedTech: body.emphasizedTech,
      jobKeywords: body.jobKeywords,
      maxBulletsPerEntry: body.maxBulletsPerEntry,
      bulletRewrites: validation.map,
      rewordTopN,
    });

    const rewordedBullets = validation.audit.reduce((n, e) => n + e.bullets.length, 0);
    const flags = [
      ...validation.audit.flatMap((e) => e.bullets.flatMap((b) => b.flags)),
      ...(structureAudit?.flags ?? []),
    ];
    const audit =
      rewordedBullets > 0 || structureAudit
        ? { experience: validation.audit, ...(structureAudit && { structure: structureAudit }) }
        : null;

    const variant = await this.prisma.resumeVariant.create({
      data: {
        resumeId,
        label: body.label,
        jobUrl: body.jobUrl ?? null,
        applicationId: body.applicationId ?? null,
        content: JSON.stringify(tailored),
        diffNotes: body.diffNotes ?? null,
        rewrites: audit ? JSON.stringify(audit) : null,
      },
    });

    publish(
      resumeChannel,
      { resumeId },
      { type: "variant.created", resumeId, variantId: variant.id },
    );

    return {
      id: variant.id,
      pdfUrl: `/api/resumes/variants/${variant.id}/pdf`,
      rewordedBullets,
      flags,
    };
  }
}
