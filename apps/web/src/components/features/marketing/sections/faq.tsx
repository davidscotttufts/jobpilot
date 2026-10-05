import type { ReactElement } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { Section } from "../section";
import { SectionHeading } from "../section-heading";
import { FAQ_ITEMS } from "./faq-items";

export function Faq(): ReactElement {
  return (
    <Section maxWidth="md">
      <SectionHeading
        title="Common questions"
        lead={
          <>
            See the <Link href="/docs/faq">full FAQ</Link> for more.
          </>
        }
      />
      <Stack spacing={1} sx={{ mt: 4 }}>
        {FAQ_ITEMS.map((item) => (
          <Accordion key={item.q}>
            <AccordionSummary>
              <Typography variant="h5" component="h3">
                {item.q}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Typography variant="body1Muted">{item.a}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Section>
  );
}
