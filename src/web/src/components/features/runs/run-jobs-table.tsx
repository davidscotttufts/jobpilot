"use client";

import type { ReactElement } from "react";
import { Button, Chip, Link } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { DataTable } from "@/components/ui/data/data-table";
import type { RunJobStatus } from "@/lib/schemas/run";
import type { RunJobDto } from "@/types/api";

/** Statuses that can still be applied to from the runs detail page. */
export function isApplicable(status: RunJobStatus): boolean {
  return status === "pending" || status === "approved";
}

const STATUS_COLOR: Record<
  RunJobStatus,
  "default" | "info" | "primary" | "success" | "error" | "warning"
> = {
  pending: "default",
  approved: "info",
  applying: "primary",
  applied: "success",
  failed: "error",
  skipped: "warning",
};

interface RunJobsTableProps {
  rows: ReadonlyArray<RunJobDto>;
  loading?: boolean;
  /** When provided, applicable rows get an "Apply" action that calls this. */
  onApplyJob?: (job: RunJobDto) => void;
}

export function RunJobsTable(props: RunJobsTableProps): ReactElement {
  const { rows, loading, onApplyJob } = props;
  const columns: GridColDef<RunJobDto>[] = [
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (p) => (
        <Chip
          size="small"
          label={p.row.status}
          color={STATUS_COLOR[p.row.status]}
          variant="outlined"
        />
      ),
      sortable: false,
    },
    {
      field: "title",
      headerName: "Title",
      flex: 1.4,
      minWidth: 200,
      renderCell: (p) => (
        <Link href={p.row.url} target="_blank" rel="noopener noreferrer" color="inherit">
          {p.row.title}
        </Link>
      ),
    },
    { field: "company", headerName: "Company", flex: 1, minWidth: 160 },
    { field: "board", headerName: "Board", width: 130 },
    {
      field: "matchScore",
      headerName: "Score",
      width: 80,
      align: "right",
      headerAlign: "right",
      valueGetter: (_v, row) => row.matchScore ?? "",
    },
    {
      field: "failReason",
      headerName: "Fail reason",
      flex: 1,
      minWidth: 160,
      valueGetter: (_v, row) => row.failReason ?? row.skipReason ?? "",
    },
  ];

  if (onApplyJob) {
    columns.push({
      field: "actions",
      headerName: "",
      width: 96,
      sortable: false,
      filterable: false,
      align: "right",
      headerAlign: "right",
      renderCell: (p) =>
        isApplicable(p.row.status) ? (
          <Button size="small" variant="outlined" onClick={() => onApplyJob(p.row)}>
            Apply
          </Button>
        ) : null,
    });
  }

  return (
    <DataTable<RunJobDto>
      rows={rows}
      columns={columns}
      loading={loading}
      getRowId={(row) => row.id}
    />
  );
}
