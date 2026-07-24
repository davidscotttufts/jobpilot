import type { ReactElement } from "react";
import type { Metadata } from "next";
import {
  ChangeEmailCard,
  ChangePasswordCard,
  ConnectedAccountsCard,
} from "@/components/features/security";
import { PageHeader, PageShell } from "@/components/ui/layout";

export const metadata: Metadata = {
  title: "Account security",
  description: "Manage your sign-in email, password, and connected accounts.",
};

interface SecurityPageProps {
  searchParams: Promise<{ oauth?: string; provider?: string; reason?: string }>;
}

export default async function SecurityPage(props: SecurityPageProps): Promise<ReactElement> {
  // OAuth callback result flags; read server-side to skip a Suspense dance.
  const { oauth, provider, reason } = await props.searchParams;
  return (
    <PageShell maxWidth="md">
      <PageHeader
        eyebrow="Account"
        title="Security"
        description="Sign-in email, password, and connected accounts."
      />
      <ChangeEmailCard />
      <ChangePasswordCard />
      <ConnectedAccountsCard oauthResult={oauth} provider={provider} reason={reason} />
    </PageShell>
  );
}
