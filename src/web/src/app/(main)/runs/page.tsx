import type { ReactElement } from "react";
import { Add } from "@mui/icons-material";
import { Button, Container } from "@mui/material";
import type { Route } from "next";
import Link from "next/link";
import { RunsList } from "@/components/features/runs/runs-list";
import { PageHeader } from "@/components/ui/layout";

export default function RunsPage(): ReactElement {
  return (
    <Container maxWidth="lg" sx={{ gap: 2 }}>
      <PageHeader
        eyebrow="History"
        title="Runs"
        description="Search and autopilot runs, newest first."
        actions={
          <Button
            variant="contained"
            startIcon={<Add fontSize="md" />}
            component={Link}
            href={"/runs/new" as Route}
          >
            New run
          </Button>
        }
      />
      <RunsList />
    </Container>
  );
}
