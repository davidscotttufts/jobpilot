"use client";

import { type ReactElement, useState } from "react";
import type {
  PilotJournalEntry,
  PilotJournalKind,
  PilotJournalPage,
} from "@jobpilot/contracts/pilot";
import { Download } from "@mui/icons-material";
import { Box, Button, Chip, Divider, Stack, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { API_BASE_URL } from "@/api/base-url";
import { api } from "@/api/client";
import { useApiQuery } from "@/api/hooks";
import { PILOT_JOURNAL_PAGE_SIZE, pilotQueries } from "@/api/queries";
import { EmptyState, QuerySection } from "@/components/ui/data";
import { SectionCard } from "@/components/ui/layout";
import { useToast } from "@/providers/notification-provider";
import { dedupeById } from "@/utils/array";
import { CycleTimeline } from "./cycle-timeline";
import { JournalRow, KIND_META, KIND_ORDER } from "./journal-row";
import { LiveStatusChip } from "./live-status-chip";
import { useJournalLive } from "./use-journal-live";

/** Same-site cookie rides a top-level anchor download, so no fetch/token handling is needed here. */
const JOURNAL_EXPORT_URL = `${API_BASE_URL}/api/pilot/journal/export`;

/** Drops cycle rows whose cycle also logged actions - they just repeat them; lone (empty/error) cycle rows stay. */
function collapseCoveredCycles(entries: PilotJournalEntry[]): PilotJournalEntry[] {
  const covered = new Set<string>();
  for (const entry of entries) {
    if (entry.kind === "action" && entry.cycleId) {
      covered.add(entry.cycleId);
    }
  }
  return entries.filter((e) => !(e.kind === "cycle" && e.cycleId && covered.has(e.cycleId)));
}

/** Full journal feed. Kind filters run server-side, so paging under a filter stays on one stream. */
export function JournalFeed(): ReactElement {
  const toast = useToast();
  const [selectedKinds, setSelectedKinds] = useState<PilotJournalKind[]>([]);
  const firstPage = useApiQuery(pilotQueries.journal(selectedKinds));
  const { entries: live, status } = useJournalLive();
  // Whole pages, so the cursor to resume from is just the newest one's - no paging flag to keep in sync.
  const [pages, setPages] = useState<PilotJournalPage[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [view, setView] = useState<"flat" | "cycle">("flat");

  const lastPage = pages.at(-1);
  const activeCursor = lastPage ? lastPage.nextCursor : (firstPage.data?.nextCursor ?? null);

  const loadMore = async (): Promise<void> => {
    if (!activeCursor) {
      return;
    }
    setLoadingMore(true);
    try {
      const { data, error } = await api.pilot.journal.get({
        query: {
          cursor: activeCursor,
          limit: PILOT_JOURNAL_PAGE_SIZE,
          ...(selectedKinds.length > 0 ? { kinds: selectedKinds } : {}),
        },
      });
      if (error || !data) {
        toast.error("Couldn't load more journal entries.");
        return;
      }
      setPages((prev) => [...prev, data]);
    } catch {
      toast.error("Couldn't load more journal entries.");
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleKind = (kind: PilotJournalKind): void => {
    setSelectedKinds((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind],
    );
    // Older pages came off the previous filter's stream; its cursors don't carry over.
    setPages([]);
  };

  // The live buffer is unfiltered - it carries every kind streamed since mount.
  const streamed =
    selectedKinds.length === 0 ? live : live.filter((e) => selectedKinds.includes(e.kind));
  const older = pages.flatMap((page) => page.items);
  const entries = dedupeById([...streamed, ...(firstPage.data?.items ?? []), ...older]);
  // Only the flat feed collapses; explicitly selecting the Cycle filter shows everything.
  const visible =
    view === "flat" && !selectedKinds.includes("cycle") ? collapseCoveredCycles(entries) : entries;

  const emptyMessage =
    selectedKinds.length > 0 ? "No entries match the selected filters." : "No journal entries yet.";

  return (
    <SectionCard
      title="Journal"
      actions={
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <LiveStatusChip status={status} />
          <Button
            size="small"
            startIcon={<Download fontSize="sm" />}
            component="a"
            href={JOURNAL_EXPORT_URL}
            download="pilot-journal.ndjson"
          >
            Export
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
          {KIND_ORDER.map((kind) => {
            const selected = selectedKinds.includes(kind);
            return (
              <Chip
                key={kind}
                size="small"
                label={KIND_META[kind].label}
                color={selected ? KIND_META[kind].color : "default"}
                variant={selected ? "filled" : "outlined"}
                onClick={() => toggleKind(kind)}
              />
            );
          })}
        </Stack>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={view}
          onChange={(_e, next) => next && setView(next)}
          aria-label="Journal view"
        >
          <ToggleButton value="flat">Flat feed</ToggleButton>
          <ToggleButton value="cycle">By cycle</ToggleButton>
        </ToggleButtonGroup>
        <QuerySection
          isLoading={firstPage.isLoading}
          isError={firstPage.isError}
          onRetry={() => void firstPage.refetch()}
          errorTitle="Couldn't load the journal."
          isEmpty={visible.length === 0}
          empty={<EmptyState variant="inline" title={emptyMessage} />}
        >
          {view === "cycle" ? (
            <CycleTimeline entries={visible} />
          ) : (
            <Stack spacing={1.5} divider={<Divider />}>
              {visible.map((entry) => (
                <JournalRow key={entry.id} entry={entry} />
              ))}
            </Stack>
          )}
        </QuerySection>
        {activeCursor && (
          <Box>
            <Button variant="text" disabled={loadingMore} onClick={() => loadMore()}>
              Load more
            </Button>
          </Box>
        )}
      </Stack>
    </SectionCard>
  );
}
