import {
  BugReport,
  BusinessCenter,
  Dashboard,
  Description,
  Forum,
  Handshake,
  Inbox,
  Insights,
  Lightbulb,
  Settings,
  Storage,
  type SvgIconComponent,
} from "@mui/icons-material";
import { BUG_REPORT_URL, FEATURE_REQUEST_URL } from "@/lib/constants";

export interface NavItem {
  label: string;
  href: string;
  icon: SvgIconComponent;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    items: [
      { label: "Workspace", href: "/workspace", icon: Dashboard },
      { label: "Analytics", href: "/analytics", icon: Insights },
      { label: "Upwork", href: "/upwork", icon: Handshake },
      { label: "Outreach", href: "/outreach", icon: Forum },
      { label: "Inbox", href: "/inbox", icon: Inbox },
      { label: "Resumes", href: "/resumes", icon: Storage },
      { label: "Cover Letters", href: "/cover-letters", icon: Description },
      { label: "Boards", href: "/boards", icon: BusinessCenter },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

/** External GitHub issue links - rendered as plain anchors, never through navGroups/next-link. */
export const feedbackLinks: NavItem[] = [
  { label: "Report a Bug", href: BUG_REPORT_URL, icon: BugReport },
  { label: "Feature Request", href: FEATURE_REQUEST_URL, icon: Lightbulb },
];

export const APP_TITLE = "JobPilot";
export const RAIL_WIDTH = 56;
export const DOCK_COLLAPSED = 56;
export const DOCK_EXPANDED = 380;
export const DOCK_MIN_EXPANDED = 320;
export const DOCK_MAX_EXPANDED = 640;
export const MOBILE_NAV_HEIGHT = 56;

/** Active-route test shared by the desktop rail and the mobile bottom nav. */
export function isNavItemActive(pathname: string, href: string): boolean {
  const target = href.split("?")[0];
  return target === "/" ? pathname === "/" : pathname.startsWith(target);
}
