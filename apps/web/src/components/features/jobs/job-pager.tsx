import type { ReactNode } from "react";
import { Stack, Typography } from "@mui/material";
import type { Route } from "next";
import { LinkButton } from "@/components/ui/buttons";
import { jobsHref } from "./jobs-href";

interface JobPagerProps {
  page: number;
  totalPages: number;
  total: number;
  /** The current query, minus `page` - preserved so paging keeps the active filters. */
  params: Record<string, string>;
}

/** Real `<a href>` paging, not a client pager - a crawler cannot click a React handler. */
export function JobPager(props: JobPagerProps): ReactNode {
  const { page, totalPages, total, params } = props;
  if (totalPages <= 1) {
    return null;
  }

  const href = (target: number): Route => jobsHref(new URLSearchParams(params), target);

  return (
    <Stack
      direction="row"
      sx={{
        flexWrap: "wrap",
        gap: 1,
        alignItems: "center",
        justifyContent: "space-between",
        pt: 2,
      }}
    >
      <LinkButton href={href(page - 1)} disabled={page <= 1} size="small" variant="outlined">
        Previous
      </LinkButton>
      <Typography variant="captionMuted">
        Page {page} of {totalPages} · {total} jobs
      </Typography>
      <LinkButton
        href={href(page + 1)}
        disabled={page >= totalPages}
        size="small"
        variant="outlined"
      >
        Next
      </LinkButton>
    </Stack>
  );
}
