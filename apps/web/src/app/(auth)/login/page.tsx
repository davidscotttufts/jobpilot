import type { ReactElement } from "react";
import type { Metadata } from "next";
import { AuthCard, LoginForm } from "@/components/features/auth";
import { resolveOauthReason } from "@/components/features/auth/oauth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your JobPilot dashboard to run and track job-application campaigns.",
  alternates: { canonical: "/login" },
};

interface LoginPageProps {
  searchParams: Promise<{ oauth?: string; reason?: string }>;
}

export default async function LoginPage(props: LoginPageProps): Promise<ReactElement> {
  const { oauth, reason } = await props.searchParams;
  const oauthError =
    oauth === "error" ? (resolveOauthReason(reason) ?? "Sign-in failed.") : undefined;
  return (
    <AuthCard title="Sign in" subtitle="Welcome back. Sign in to continue.">
      <LoginForm oauthError={oauthError} />
    </AuthCard>
  );
}
