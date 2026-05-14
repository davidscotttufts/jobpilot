import type { ReactElement } from "react";
import { Container, Stack } from "@mui/material";
import { InboxContent } from "@/components/features/inbox/inbox-content";
import { PageHeader } from "@/components/ui/layout/page-header";

export default function InboxPage(): ReactElement {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <PageHeader
          eyebrow="Email"
          title="Inbox"
          description="Replies, rejections, and offers from the boards you applied to. Approve to update the matching application's stage."
        />
        <InboxContent />
      </Stack>
    </Container>
  );
}
