import {
  AssignmentTurnedIn,
  BusinessCenter,
  Dashboard,
  Person,
  Storage,
  WorkHistory,
  type SvgIconComponent,
} from "@mui/icons-material";

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
      { label: "Dashboard", href: "/", icon: Dashboard },
      { label: "Applications", href: "/applications", icon: AssignmentTurnedIn },
      { label: "Runs", href: "/runs", icon: WorkHistory },
    ],
  },
  {
    label: "Configure",
    items: [
      { label: "Boards", href: "/boards", icon: BusinessCenter },
      { label: "Profile", href: "/profile", icon: Person },
      { label: "Resumes", href: "/resumes", icon: Storage },
    ],
  },
];

export const APP_TITLE = "JobPilot";
export const SIDEBAR_WIDTH = 240;
