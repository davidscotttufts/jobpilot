import type { ReactElement } from "react";
import { Box, Container, Stack, Typography } from "@mui/material";
import { fontFamilies } from "@/theme";

const BOARDS = [
  "LinkedIn",
  "Indeed",
  "Glassdoor",
  "Wellfound",
  "Y Combinator",
  "Hiring Cafe",
  "Welcome to the Jungle",
  "HN Who's Hiring",
  "We Work Remotely",
  "Remote OK",
  "4 Day Week",
  "Upwork",
];

/** The 12 seeded boards, set as mono tokens - the agent's territory, machine voice. */
export function BoardStrip(): ReactElement {
  return (
    <Box sx={{ borderBlock: 1, borderColor: "line.divider", backgroundColor: "surfaces.card" }}>
      <Container maxWidth="lg" sx={{ paddingBlock: 3.5 }}>
        <Stack spacing={2} sx={{ alignItems: "center" }}>
          <Typography variant="overlineMuted">
            Works where the jobs are ·{" "}
            <Box component="span" sx={{ color: "accent.primary" }}>
              {BOARDS.length} boards
            </Box>
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              rowGap: 1,
              "& > span + span::before": {
                content: '"·"',
                marginInline: 1.5,
                color: "text.disabled",
              },
            }}
          >
            {BOARDS.map((board) => (
              <Typography
                key={board}
                component="span"
                sx={{
                  fontFamily: fontFamilies.mono,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                  whiteSpace: "nowrap",
                }}
              >
                {board}
              </Typography>
            ))}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
