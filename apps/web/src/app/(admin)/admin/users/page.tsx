import type { ReactElement } from "react";
import { Stack } from "@mui/material";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/api/client";
import { getFetchOptions } from "@/api/server";
import { AdminSearchField, AdminUsersTable } from "@/components/features/admin";
import { PaginationControls } from "@/components/ui/data";
import { SectionCard } from "@/components/ui/layout";
import { type PaginationSearchParams, paginationQuery } from "@/utils/search-params";

export const metadata: Metadata = { title: "Users" };

interface AdminUsersPageProps {
  searchParams: Promise<PaginationSearchParams & { q?: string }>;
}

/** `?q=` / `?page=` drive the server fetch; only the search box, pager, and role menu are client. */
export default async function AdminUsersPage(props: AdminUsersPageProps): Promise<ReactElement> {
  const search = await props.searchParams;

  const { data } = await api.admin.users.get({
    query: { ...paginationQuery(search), search: search.q || undefined },
    ...(await getFetchOptions()),
  });

  if (!data) {
    notFound();
  }

  return (
    <SectionCard>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
        <AdminSearchField placeholder="Search by email" />
      </Stack>

      <AdminUsersTable users={data.items} />

      <PaginationControls pagination={data.pagination} />
    </SectionCard>
  );
}
