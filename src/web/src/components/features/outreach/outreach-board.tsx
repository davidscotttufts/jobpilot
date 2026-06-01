"use client";

import { useState, type ReactElement } from "react";
import { Alert, Button, Chip, Grid, Link, Stack } from "@mui/material";
import { DataGrid, type GridColDef, type GridRowsProp } from "@mui/x-data-grid";
import { StatCard } from "@/components/ui/display";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { OutreachMessageStatus } from "@/lib/schemas/outreach";
import { useAgent } from "@/providers/agent-provider";
import type {
  EmailAccountStatus,
  OutreachConfigDto,
  OutreachMessageDto,
  RunSummaryDto,
} from "@/types/api";
import { OutreachMessageDialog } from "./outreach-message-dialog";

const STATUS_COLOR: Record<
  OutreachMessageStatus,
  "default" | "info" | "primary" | "success" | "error" | "warning"
> = {
  draft: "default",
  approved: "info",
  sent: "primary",
  replied: "success",
  bounced: "warning",
  failed: "error",
  skipped: "default",
};

interface OutreachBoardProps {
  runId: string;
  summary: RunSummaryDto;
  config?: OutreachConfigDto;
}

export function OutreachBoard(props: OutreachBoardProps): ReactElement {
  const { runId, summary, config } = props;
  const agent = useAgent();
  const [openId, setOpenId] = useState<number | null>(null);

  const messagesQuery = useApiQuery<OutreachMessageDto[]>(queryKeys.runs.outreach(runId), () =>
    apiClient.get<OutreachMessageDto[]>(`/api/runs/${encodeURIComponent(runId)}/outreach`),
  );
  const accountQuery = useApiQuery<EmailAccountStatus>(queryKeys.email.account(), () =>
    apiClient.get<EmailAccountStatus>("/api/email/account"),
  );

  const invalidate = [queryKeys.runs.outreach(runId), queryKeys.runs.detail(runId)];

  const skip = useApiMutation<unknown, number>(
    (id) =>
      apiClient.post(`/api/runs/${encodeURIComponent(runId)}/outreach/${id}/result`, {
        outcome: "skipped",
      }),
    { invalidate, successMessage: "Skipped" },
  );

  const messages = messagesQuery.data ?? [];
  const canSend = accountQuery.data?.canSend ?? false;
  const openMessage = messages.find((m) => m.id === openId) ?? null;

  const columns: GridColDef<OutreachMessageDto>[] = [
    {
      field: "status",
      headerName: "Status",
      width: 110,
      sortable: false,
      renderCell: (p) => (
        <Chip
          size="small"
          label={p.row.status}
          color={STATUS_COLOR[p.row.status]}
          variant="outlined"
        />
      ),
    },
    {
      field: "name",
      headerName: "Contact",
      flex: 1.2,
      minWidth: 180,
      valueGetter: (_v, row) => row.contact.name,
      renderCell: (p) =>
        p.row.contact.linkedinUrl ? (
          <Link
            href={p.row.contact.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            color="inherit"
          >
            {p.row.contact.name}
          </Link>
        ) : (
          p.row.contact.name
        ),
    },
    {
      field: "company",
      headerName: "Company",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => row.contact.company ?? "",
    },
    {
      field: "channel",
      headerName: "Channel",
      width: 130,
      valueGetter: (_v, row) =>
        row.channel === "linkedin" ? `LinkedIn${row.linkedinKind ? ` · ${row.linkedinKind}` : ""}` : "Email",
    },
    {
      field: "subject",
      headerName: "Subject / preview",
      flex: 1.4,
      minWidth: 200,
      valueGetter: (_v, row) => row.subject ?? row.body.slice(0, 80),
    },
    {
      field: "actions",
      headerName: "",
      width: 96,
      sortable: false,
      filterable: false,
      align: "right",
      headerAlign: "right",
      renderCell: (p) => (
        <Button size="small" variant="outlined" onClick={() => setOpenId(p.row.id)}>
          Open
        </Button>
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatCard label="Discovered" value={summary.discovered} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatCard label="Drafted" value={summary.drafted} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatCard label="Sent" value={summary.sent} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatCard label="Replied" value={summary.replied} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatCard label="Bounced" value={summary.bounced} />
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
        {config?.channels.map((c) => (
          <Chip key={c} size="small" label={c} variant="outlined" />
        ))}
        {config?.autonomy && <Chip size="small" label={`autonomy: ${config.autonomy}`} />}
        {config?.scope && <Chip size="small" label={`scope: ${config.scope}`} />}
        <Button
          size="small"
          variant="contained"
          onClick={() => agent.injectSkill("outreach", `--run ${runId}`)}
          sx={{ ml: "auto" }}
        >
          Continue with agent
        </Button>
      </Stack>

      {config?.channels.includes("email") && !canSend && (
        <Alert severity="warning">
          Your mailbox can&apos;t send yet — reconnect Gmail in Settings to enable email sends.
        </Alert>
      )}

      <DataGrid
        rows={messages as GridRowsProp}
        columns={columns as GridColDef[]}
        loading={messagesQuery.isLoading}
        getRowId={(row) => (row as OutreachMessageDto).id}
        autoHeight
      />

      {openMessage && (
        <OutreachMessageDialog
          runId={runId}
          message={openMessage}
          canSend={canSend}
          invalidate={invalidate}
          onClose={() => setOpenId(null)}
          onSkip={() => {
            skip.mutate(openMessage.id);
            setOpenId(null);
          }}
        />
      )}
    </Stack>
  );
}
