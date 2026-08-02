"use client";

import type { ReactElement, ReactNode } from "react";
import { ExpandMore } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Typography,
} from "@mui/material";
import type { EditorSection } from "./sections";

interface SectionBlockProps {
  section: EditorSection;
  /** What is already in the section, shown while it is collapsed. */
  summary: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}

/**
 * One collapsible resume section. The `data-section-id` stays on the outer box so the sticky rail
 * still finds a collapsed section to scroll to.
 */
export function SectionBlock(props: SectionBlockProps): ReactElement {
  const { section, summary, open, onToggle, children } = props;
  const Icon = section.icon;

  return (
    <Box data-section-id={section.id}>
      <Accordion
        disableGutters
        elevation={0}
        variant="panel"
        expanded={open}
        onChange={(_, next) => onToggle(next)}
        sx={{ "&::before": { display: "none" } }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flex: 1, minWidth: 0 }}>
            <Icon fontSize="small" sx={{ color: "text.secondary" }} />
            <Typography variant="body1Strong">{section.label}</Typography>
            <Typography variant="captionMuted" sx={{ ml: "auto", pr: 1 }}>
              {summary}
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <Typography variant="captionMuted">{section.description}</Typography>
            {children}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
