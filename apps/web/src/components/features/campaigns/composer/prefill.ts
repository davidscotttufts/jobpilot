import type { CampaignDto, JobBoardDto, UserAggregateResponse } from "@/api/types";
import type { ComposerFormValues } from "./form-config";

interface PrefillContext {
  boards: JobBoardDto[];
  resumes: UserAggregateResponse["resumes"];
  /** An apply campaign keeps its pasted links as jobs rather than in config, so they come separately. */
  urls: string[];
}

/**
 * Seeds the composer from a campaign being run again.
 *
 * Only the fields that campaign actually stored are copied - a board or resume deleted since then
 * falls back to `base` rather than preselecting something that no longer exists, and each cap is
 * read from the config key its own mode writes to (`buildCampaignConfig` maps them differently per
 * mode, so reading `maxJobs` blindly would hand a networking cap to a search).
 */
export function composerValuesFromCampaign(
  campaign: CampaignDto,
  base: ComposerFormValues,
  context: PrefillContext,
): ComposerFormValues {
  const cfg = campaign.config;
  const net = cfg.networking;
  const source = campaign.source;
  const isNetworking = source === "networking";
  const isApply = source === "apply";

  const boardExists = !!cfg.board && context.boards.some((b) => b.domain === cfg.board);
  const resumeExists = !!cfg.resumeId && context.resumes.some((r) => r.id === cfg.resumeId);
  // Networking runs board-grounded or criteria-only; no board is a real choice there, not a gap.
  const boardFallback = isNetworking ? "" : base.board;

  return {
    ...base,
    mode: source,
    // An apply campaign's query is the label the composer derived for its pasted links.
    query: isApply ? base.query : campaign.query,
    applyLabel: isApply ? campaign.query : base.applyLabel,
    urlsText: context.urls.join("\n"),
    board: boardExists && cfg.board ? cfg.board : boardFallback,
    resumeId: resumeExists && cfg.resumeId ? cfg.resumeId : base.resumeId,
    minScore: cfg.minScore ?? base.minScore,
    // Networking reuses the maxApps control for its own `config.maxJobs` discovery cap.
    maxApps: isNetworking ? (cfg.maxJobs ?? null) : (cfg.maxApplications ?? base.maxApps),
    // An absent maxJobs on a search meant unlimited - carry that through rather than re-capping.
    maxJobs: source === "search" ? (cfg.maxJobs ?? null) : base.maxJobs,
    channels: net?.channels ?? base.channels,
    linkedinTier: net?.linkedinTier ?? base.linkedinTier,
    autonomy: net?.autonomy ?? base.autonomy,
    dailyCap: net?.dailyCap ?? base.dailyCap,
  };
}
