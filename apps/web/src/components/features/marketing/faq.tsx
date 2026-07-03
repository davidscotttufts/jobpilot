"use client";

import type { ReactElement } from "react";
import { ExpandMore } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Container,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import NextLink from "next/link";

const ITEMS = [
  {
    q: "Do I need an API key?",
    a: "No. The agent runs on your existing Claude Code or Codex subscription. JobPilot ships no model keys and adds no usage fees.",
  },
  {
    q: "Where does the agent run?",
    a: "On your machine. The dashboard is hosted, but the terminal, the AI session, and the browser all run locally - you can watch every action.",
  },
  {
    q: "Which job boards are supported?",
    a: "Twelve out of the box, from LinkedIn and Indeed to HN Who's Hiring and Upwork. You can manage the list from the boards page.",
  },
  {
    q: "Can it read and send email?",
    a: "Yes, through your own Google OAuth client - no shared app touches your mail. Reading powers the inbox and verification codes; sending powers outreach.",
  },
  {
    q: "What about captchas?",
    a: "The agent solves checkbox and text captchas itself. For image challenges it uses your 2Captcha or CapSolver key if you add one; otherwise it skips the job and says why.",
  },
  {
    q: "Is it open source?",
    a: "Yes, MIT-licensed. The dashboard, API, terminal host, and plugin are all in one repository on GitHub.",
  },
];

export function Faq(): ReactElement {
  return (
    <Container maxWidth="md" sx={{ paddingBlock: { xs: 6, md: 9 } }}>
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Typography variant="h2">Questions, answered.</Typography>
        <Typography variant="body2Muted">
          More in the{" "}
          <Link component={NextLink} href="/docs/faq">
            full FAQ
          </Link>
          .
        </Typography>
      </Stack>
      <Stack spacing={1}>
        {ITEMS.map((item) => (
          <Accordion
            key={item.q}
            disableGutters
            elevation={0}
            sx={(theme) => ({
              border: `1px solid ${theme.palette.line.border}`,
              borderRadius: `${theme.radii.md}px`,
              backgroundColor: theme.palette.surfaces.card,
              "&::before": { display: "none" },
            })}
          >
            <AccordionSummary expandIcon={<ExpandMore fontSize="sm" />}>
              <Typography sx={{ fontWeight: 600, fontSize: "0.875rem" }}>{item.q}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Typography variant="body2Muted">{item.a}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Container>
  );
}
