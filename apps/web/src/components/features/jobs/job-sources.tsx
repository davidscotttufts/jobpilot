import type { ReactElement } from "react";
import { OpenInNew } from "@mui/icons-material";
import { Stack, Typography } from "@mui/material";
import type { JobListingDto } from "@/api/types";
import { ExternalLink } from "@/components/ui/display";
import { formatRelativeTime, plural } from "@/utils/format";

type JobSource = JobListingDto["sources"][number];

interface JobSourcesProps {
  sources: JobSource[];
}

export function JobSources(props: JobSourcesProps): ReactElement {
  const { sources } = props;
  // The API sends sources newest first, so groups and their sources stay in last-seen order.
  const groups = Map.groupBy(sources, (source) => source.board ?? "Other boards");

  return (
    <Stack component="ul" spacing={2} sx={{ listStyle: "none", m: 0, p: 0 }}>
      {[...groups].map(([board, boardSources]) => {
        const latest = boardSources[0];
        const count = boardSources.length;
        const summary = [
          count > 1 && `posted ${plural(count, "time")}`,
          `last seen ${formatRelativeTime(latest.lastSeenAt)} ago`,
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <Stack component="li" key={board} spacing={0.75}>
            <Stack
              direction="row"
              sx={{ flexWrap: "wrap", columnGap: 1, rowGap: 0.25, alignItems: "baseline" }}
            >
              <Typography variant="body1Strong">{board}</Typography>
              <Typography variant="captionMuted">{summary}</Typography>
            </Stack>
            <Stack direction="row" sx={{ flexWrap: "wrap", columnGap: 2, rowGap: 0.5 }}>
              {boardSources.map((source) => (
                <Typography key={source.url} variant="body2Muted" component="span">
                  <ExternalLink href={source.url}>
                    {count > 1
                      ? `Seen ${formatRelativeTime(source.lastSeenAt)} ago`
                      : `View on ${board}`}{" "}
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
