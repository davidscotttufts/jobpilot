"use client";

import type { ReactElement } from "react";
import { Box, Card, CardContent, Stack, Typography, useTheme } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import type { OverviewPerDayEntry } from "@/types/api";

const CHART_HEIGHT = 220;

interface ApplicationsTimelineChartProps {
  data: OverviewPerDayEntry[];
}

function formatTick(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ApplicationsTimelineChart(props: ApplicationsTimelineChartProps): ReactElement {
  const { data } = props;
  const theme = useTheme();

  const yData = data.map((d) => d.count);
  const xData = data.map((d) => d.date);
  const total = yData.reduce((a, b) => a + b, 0);
  const yMax = Math.max(...yData, 1);

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="overlineMuted">Applications over time</Typography>
        <Typography variant="h6" sx={{ mt: 0.5, fontSize: "0.9375rem", fontWeight: 500 }}>
          {total} submitted in the last 30 days
        </Typography>

        {total === 0 ? (
          <Stack
            sx={(t) => ({
              mt: 2,
              flex: 1,
              minHeight: CHART_HEIGHT,
              alignItems: "center",
              justifyContent: "center",
              color: t.palette.text.disabled,
            })}
          >
            <Typography variant="captionMuted">No applications submitted yet.</Typography>
          </Stack>
        ) : (
          <Box sx={{ mt: 1, flex: 1 }}>
            <LineChart
              xAxis={[
                {
                  data: xData,
                  scaleType: "point",
                  valueFormatter: formatTick,
                  tickLabelStyle: { fontSize: 10 },
                },
              ]}
              yAxis={[
                {
                  min: 0,
                  max: yMax,
                  tickMinStep: 1,
                  tickLabelStyle: { fontSize: 10 },
                },
              ]}
              series={[
                {
                  data: yData,
                  color: theme.palette.accent.primary,
                  area: true,
                  showMark: false,
                  curve: "monotoneX",
                },
              ]}
              height={CHART_HEIGHT}
              margin={{ left: 28, right: 12, top: 12, bottom: 28 }}
              grid={{ horizontal: true }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
