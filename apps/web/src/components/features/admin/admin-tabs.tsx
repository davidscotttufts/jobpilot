import type { ReactElement } from "react";
import { type Tab, TabStrip } from "@/components/ui/navigation";

const TABS: Tab[] = [
  { label: "Overview", href: "/admin/overview" },
  { label: "Users", href: "/admin/users" },
  { label: "Boards", href: "/admin/boards" },
  { label: "Listings", href: "/admin/listings" },
];

export function AdminTabs(): ReactElement {
  return <TabStrip tabs={TABS} ariaLabel="Admin sections" />;
}
