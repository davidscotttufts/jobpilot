"use client";

import type { ReactNode } from "react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { PaginationFooter } from "@/components/ui/data";

interface AdminPaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}

/** Page selector for a server-rendered admin table: writes `?page=`, the server does the paging. */
export function AdminPagination(props: AdminPaginationProps): ReactNode {
  const { page, pageCount, pageSize, total } = props;
  const router = useRouter();
  const params = useSearchParams();

  const goTo = (next: number): void => {
    const query = new URLSearchParams(params.toString());
    if (next <= 1) {
      query.delete("page");
    } else {
      query.set("page", String(next));
    }
    router.replace(`?${query.toString()}` as Route, { scroll: false });
  };

  return (
    <PaginationFooter
      page={page}
      pageCount={pageCount}
      pageSize={pageSize}
      total={total}
      onChange={goTo}
    />
  );
}
