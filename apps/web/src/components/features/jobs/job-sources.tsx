import type { ReactElement } from "react";
import { OpenInNew } from "@mui/icons-material";
import { Stack, Typography } from "@mui/material";
import type { JobListingDto } from "@/api/types";
import { ExternalLink } from "@/components/ui/display";
import { formatRelativeTime, plural } from "@/utils/format";

type JobSource = JobListingDto["sources"][number];

interface BoardGroup {
  board: string;
  /** Most recently seen first, as the API orders them. */
  sources: JobSource[];
}

/** One group per board, in the order each board was last seen; the API sends newest first. */
function groupByBoard(sources: JobSource[]): BoardGroup[] {
  const groups = new Map<string, BoardGroup>();
  for (const source of sources) {
    const board = source.board ?? "Other boards";
    const group = groups.get(board);
    if (group) {
      group.sources.push(source);
    } else {
      groups.set(board, { board, sources: [source] });
    }
  }
  return [...groups.values()];
}

interface JobSourcesProps {
  sources: JobSource[];
}

/** "LinkedIn · posted 6 times · last seen 55m ago", with each repost as a readable link. */
export function JobSources(props: JobSourcesProps): ReactElement {
  const { sources } = props;

  return (
    <Stack component="ul" spacing={2} sx={{ listStyle: "none", m: 0, p: 0 }}>
      {groupByBoard(sources).map((group) => {
        const latest = group.sources[0];
        const count = group.sources.length;
        const summary = [
          count > 1 && `posted ${plural(count, "time")}`,
          `last seen ${formatRelativeTime(latest.lastSeenAt)} ago`,
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <Stack component="li" key={group.board} spacing={0.75}>
            <Stack
              direction="row"
              sx={{ flexWrap: "wrap", columnGap: 1, rowGap: 0.25, alignItems: "baseline" }}
            >
              <Typography variant="body1Strong">{group.board}</Typography>
              <Typography variant="captionMuted">{summary}</Typography>
            </Stack>
            <Stack direction="row" sx={{ flexWrap: "wrap", columnGap: 2, rowGap: 0.5 }}>
              {group.sources.map((source) => (
                <Typography key={source.url} variant="body2Muted" component="span">
                  <ExternalLink href={source.url}>
                    {count > 1
                      ? `Seen ${formatRelativeTime(source.lastSeenAt)} ago`
                      : `View on ${group.board}`}{" "}
                    <OpenInNew fontSize="xs" sx={{ verticalAlign: "middle" }} />
                  </ExternalLink>
                </Typography>
              ))}
            </Stack>
          </Stack>
        );
      })}
    </Stack>
  );
}
