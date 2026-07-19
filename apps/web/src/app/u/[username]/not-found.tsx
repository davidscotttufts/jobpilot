import type { ReactElement } from "react";
import { LinkButton } from "@/components/ui/buttons";
import { EmptyState } from "@/components/ui/data";

/** Unknown or unpublished username - a private portfolio 404s the same way, so stay vague. */
export default function PortfolioNotFound(): ReactElement {
  return (
    <EmptyState
      title="Portfolio not found"
      description="This portfolio doesn't exist or isn't public. Explore who is trending instead."
      action={
        <LinkButton href="/leaderboard" variant="contained">
          View leaderboard
        </LinkButton>
      }
    />
  );
}
