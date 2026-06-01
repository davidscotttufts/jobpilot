"use client";

import type { ReactElement } from "react";
import { Button, Chip, Link } from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridRowSelectionModel,
  type GridRowsProp,
} from "@mui/x-data-grid";
import type { CampaignJobStatus } from "@/lib/contracts/campaign";
import type { CampaignJobDto } from "@/types/api";

/** Statuses that can still be applied to from the campaigns detail page. */
export function isApplicable(status: CampaignJobStatus): boolean {
  return status === "pending" || status === "approved";
}

/** Statuses eligible for selection + bulk re-apply on a stopped campaign. */
export function isReapplicable(status: CampaignJobStatus): boolean {
  return status !== "applied" && status !== "applying";
}

const STATUS_COLOR: Record<
  CampaignJobStatus,
  "default" | "info" | "primary" | "success" | "error" | "warning"
> = {
  pending: "default",
  approved: "info",
  applying: "primary",
  applied: "success",
  failed: "error",
  skipped: "warning",
};

interface CampaignJobsTableProps {
  rows: ReadonlyArray<CampaignJobDto>;
  loading?: boolean;
  /** When provided, applicable rows get an "Apply" action that calls this. */
  onApplyJob?: (job: CampaignJobDto) => void;
  /** Enables checkbox selection (reapplicable rows only). */
  checkboxSelection?: boolean;
  rowSelectionModel?: GridRowSelectionModel;
  onRowSelectionModelChange?: (model: GridRowSelectionModel) => void;
}

export function CampaignJobsTable(props: CampaignJobsTableProps): ReactElement {
  const {
    rows,
    loading,
    onApplyJob,
    checkboxSelection,
    rowSelectionModel,
    onRowSelectionModelChange,
  } = props;
  const columns: GridColDef<CampaignJobDto>[] = [
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

  // Our DTOs are interfaces without an index signature, so they don't satisfy
  // DataGrid's GridValidRowModel constraint. Author columns against CampaignJobDto
  // for type safety, then widen rows/columns at the grid boundary.
  return (
    <DataGrid
      rows={rows as GridRowsProp}
      columns={columns as GridColDef[]}
      loading={loading}
      getRowId={(row) => (row as CampaignJobDto).id}
      checkboxSelection={checkboxSelection}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionModelChange={onRowSelectionModelChange}
      isRowSelectable={(p) => isReapplicable((p.row as CampaignJobDto).status)}
      keepNonExistentRowsSelected
    />
  );
}
