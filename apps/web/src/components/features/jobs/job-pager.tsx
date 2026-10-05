"use client";

import type { ReactNode } from "react";
import type { Pagination as PageMeta } from "@jobpilot/contracts/pagination";
import { Pagination, PaginationItem, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import Link from "next/link";
import { jobsHref } from "./jobs-href";

interface JobPagerProps {
  pagination: PageMeta;
  /** The active filters, without `page`. */
  params: Record<string, string>;
}

/**
 * Real `<a href>` links, not `PaginationFooter`: a crawler can't click a React handler, and a
 * rows-per-page control would multiply the crawlable URLs. Client only for `renderItem`; the
 * links are still in the server-rendered HTML.
 */
export function JobPager(props: JobPagerProps): ReactNode {
  const { pagination, params } = props;
  const { page, totalPages, total } = pagination;
  if (totalPages <= 1) {
    return null;
  }

  const href = (target: number): Route => jobsHref(new URLSearchParams(params), target);

  return (
    <Stack spacing={1.5} sx={{ alignItems: "center", pt: 2 }}>
      <Pagination
        count={totalPages}
        page={page}
        shape="rounded"
        renderItem={(item) =>
          item.page === null ? (
            <PaginationItem {...item} />
          ) : (
            <PaginationItem {...item} component={Link} href={href(item.page)} />
          )
        }
      />
      <Typography variant="captionMuted">
        Page {page} of {totalPages} · {total.toLocaleString()} jobs
      </Typography>
    </Stack>
  );
}
