import type { ReactElement } from "react";
import { Card, CardContent, Container, Grid, Stack, Typography } from "@mui/material";
import { fontFamilies } from "@/theme";

const FACTS = [
  {
    title: "Your subscription",
    body: "The agent runs on your Claude or Codex plan. JobPilot ships no model keys and adds no per-job fees.",
  },
  {
    title: "Your machine",
    body: "The terminal and browser run locally. Watch every action in the agent dock; stop it whenever you like.",
  },
  {
    title: "Encrypted credentials",
    body: "Board logins and captcha keys are encrypted with a key only your account holds. Deleting your account destroys it.",
  },
  {
    title: "Your own Gmail client",
    body: "Email runs through your personal Google OAuth client. No shared app sits between JobPilot and your mail.",
  },
];

export function PrivacyGrid(): ReactElement {
  return (
    <Container maxWidth="lg" sx={{ paddingBlock: { xs: 6, md: 9 } }}>
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontFamily: fontFamilies.mono,
            fontSize: "0.75rem",
            letterSpacing: "0.18em",
            color: "text.secondary",
          }}
        >
          TRUST
        </Typography>
        <Typography variant="h2">Your keys stay yours.</Typography>
      </Stack>
      <Grid container spacing={2}>
        {FACTS.map((fact) => (
          <Grid key={fact.title} size={{ xs: 12, sm: 6 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="h3" sx={{ fontSize: "1.05rem" }}>
                    {fact.title}
                  </Typography>
                  <Typography variant="body2Muted">{fact.body}</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
