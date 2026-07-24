import type { ReactElement } from "react";
import { AuthCard, ConfirmEmailChangeView } from "@/components/features/auth";

interface ConfirmEmailChangePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ConfirmEmailChangePage(
  props: ConfirmEmailChangePageProps,
): Promise<ReactElement> {
  const { token } = await props.searchParams;
  return (
    <AuthCard title="Confirm your new email">
      <ConfirmEmailChangeView token={token} />
    </AuthCard>
  );
}
