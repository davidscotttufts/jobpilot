"use client";

import { useState, type ReactElement } from "react";
import { Button, LinearProgress, Stack } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { EmptyState } from "@/components/ui/data/empty-state";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useEventSource } from "@/lib/sse/use-event-source";
import type { EmailAccountStatus, EmailMessageDto } from "@/types/api";
import { InboxTable } from "./inbox-table";
import { InboxToolbar } from "./inbox-toolbar";
import { MessageReviewDialog } from "./message-review-dialog";

export type InboxFilter = "pending" | "auto" | "approved" | "denied" | "all";

function buildQuery(filter: InboxFilter): string {
  if (filter === "all") return "";
  return `?reviewStatus=${filter}`;
}

export function InboxContent(): ReactElement {
  const [filter, setFilter] = useState<InboxFilter>("pending");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const account = useApiQuery<EmailAccountStatus>(queryKeys.email.account(), () =>
    apiClient.get<EmailAccountStatus>("/api/email/account"),
  );

  const connected = account.data?.connected === true;

  const filters = { filter };
  const messages = useApiQuery<EmailMessageDto[]>(
    queryKeys.email.messages(filters as Record<string, unknown>),
    () => apiClient.get<EmailMessageDto[]>(`/api/email/messages${buildQuery(filter)}`),
    { enabled: connected },
  );

  useEventSource<unknown>(connected ? "/api/email/events" : undefined, {
    onMessage: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.email.all });
    },
  });

  if (account.isLoading) {
    return <LinearProgress />;
  }

  if (!connected) {
    return (
      <EmptyState
        title="No mailbox connected"
        description="JobPilot reads new mail to track recruiter replies and auto-fill verification codes. Connect Gmail to get started."
        action={
          <Button component={Link} href="/profile?tab=email" variant="contained">
            Connect Gmail
          </Button>
        }
      />
    );
  }

  return (
    <Stack spacing={2}>
      <InboxToolbar filter={filter} onFilterChange={setFilter} />
      {messages.isLoading ? (
        <LinearProgress />
      ) : (
        <InboxTable
          rows={messages.data ?? []}
          loading={messages.isFetching}
          onRowClick={(row) => setSelectedId(row.id)}
        />
      )}
      <MessageReviewDialog
        messageId={selectedId}
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
      />
    </Stack>
  );
}
