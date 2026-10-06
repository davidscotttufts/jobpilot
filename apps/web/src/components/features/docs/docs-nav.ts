import type { Route } from "next";

export interface DocsNavEntry {
  title: string;
  href: Route;
  description: string;
}

/** Ordered docs pages - drives the sidebar, the index cards, and the sitemap. */
export const DOCS_NAV: DocsNavEntry[] = [
  {
    title: "Getting started",
    href: "/docs/getting-started",
    description: "Install the plugin, create your account, and run your first campaign.",
  },
  {
    title: "The Pilot",
    href: "/docs/pilot",
    description: "Let JobPilot run your search on its own, within limits you set.",
  },
  {
    title: "Campaigns & skills",
    href: "/docs/campaigns-and-skills",
    description: "The four campaign modes, what each button does, and application statuses.",
  },
  {
    title: "Email setup",
    href: "/docs/email-setup",
    description: "Connect Gmail so JobPilot can track replies and send emails.",
  },
  {
    title: "Credentials",
    href: "/docs/credentials",
    description: "Job board logins, captcha keys, and how JobPilot keeps them safe.",
  },
  {
    title: "FAQ",
    href: "/docs/faq",
    description: "Answers about models, the Pilot, job boards, and your data.",
  },
];

/** Every docs destination in nav order - the desktop rail and the mobile navigator render the same list. */
export const DOCS_LINKS: { href: Route; label: string }[] = [
  { href: "/docs", label: "Overview" },
  ...DOCS_NAV.map((entry) => ({ href: entry.href, label: entry.title })),
];
