"use client";

import type { ReactElement, ReactNode } from "react";
import {
  Alert,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

interface OutcomeRow {
  key: string;
  applications: number;
  advanced: number;
  rejected: number;
  silent: number;
  advanceRate: number | null;
  replyRate: number | null;
}

interface OutcomeBreakdownProps {
  title: string;
  eyebrow: string;
  rows: OutcomeRow[];
  /** While nothing has advanced, every rate here is a rejection rate. */
  rejectionsOnly: boolean;
  emptyMessage: string;
}

function rate(value: number | null): ReactNode {
  // A percentage over a handful of applications reads as signal, so the API withholds it and so
  // does this: the count is still shown, which is the honest thing to look at.
  if (value === null) {
    return (
      <Typography variant="captionMuted" component="span">
        too few
      </Typography>
    );
  }
  return `${Math.round(value * 100)}%`;
}

export function OutcomeBreakdown(props: OutcomeBreakdownProps): ReactElement {
  const { title, eyebrow, rows, rejectionsOnly, emptyMessage } = props;

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="overlineMuted">{eyebrow}</Typography>
        <Typography variant="h5" sx={{ mt: 0.5, mb: 2 }}>
          {title}
        </Typography>

        {rows.length === 0 && <Typography variant="captionMuted">{emptyMessage}</Typography>}

        {rows.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Slice</TableCell>
                <TableCell align="right">Sent</TableCell>
                <TableCell align="right">Advanced</TableCell>
                <TableCell align="right">Rejected</TableCell>
                <TableCell align="right">Waiting</TableCell>
                <TableCell align="right">{rejectionsOnly ? "Rejected %" : "Advanced %"}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>{row.key}</TableCell>
                  <TableCell align="right">{row.applications}</TableCell>
                  <TableCell align="right">{row.advanced}</TableCell>
                  <TableCell align="right">{row.rejected}</TableCell>
                  <TableCell align="right">{row.silent}</TableCell>
                  <TableCell align="right">
                    {rate(rejectionsOnly ? row.replyRate : row.advanceRate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/** The banner that keeps the tables above from being read backwards. */
export function OutcomeCaveat(props: { silent: number; total: number }): ReactElement {
  const { silent, total } = props;
  return (
    <Alert severity="info" icon={false}>
      <Stack spacing={0.5}>
        <Typography variant="body2Strong">
          No application has advanced past &ldquo;applied&rdquo; yet.
        </Typography>
        <Typography variant="body2Muted">
          Every percentage below is therefore a <strong>rejection</strong> rate, not a conversion
          rate - a slice that looks &ldquo;better&rdquo; here has simply been rejected less often,
          which for {silent} of {total} still-unanswered applications mostly means nobody has
          replied either way. Treat it as a picture of what came back, not of what works.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap" }}>
          <Chip size="small" label={`${silent} waiting`} />
          <Chip size="small" label={`${total - silent} answered`} />
        </Stack>
      </Stack>
    </Alert>
  );
}
