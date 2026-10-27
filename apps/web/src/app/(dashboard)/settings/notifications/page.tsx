import type { ReactElement } from "react";
import type { Metadata } from "next";
import { WebPushSettings } from "@/components/features/settings/sections";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationSettingsPage(): ReactElement {
  return <WebPushSettings />;
}
