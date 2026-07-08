"use client";

import { useState, type ReactElement } from "react";
import { MoreHoriz } from "@mui/icons-material";
import {
  BottomNavigation,
  BottomNavigationAction,
  Divider,
  Drawer,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuList,
} from "@mui/material";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutMenuItem } from "@/components/features/auth";
import {
  feedbackLinks,
  isNavItemActive,
  MOBILE_NAV_HEIGHT,
  navGroups,
  type NavItem,
} from "./shell-config";

const MORE_VALUE = "more";
const PRIMARY_HREFS = ["/workspace", "/analytics", "/inbox", "/resumes"];

const allItems = navGroups.flatMap((group) => group.items);
const primaryItems = allItems.filter((item) => PRIMARY_HREFS.includes(item.href));
const moreItems = allItems.filter((item) => !PRIMARY_HREFS.includes(item.href));

/**
 * Bottom tab bar shown below md in place of the desktop rail: four primary
 * destinations plus a "More" sheet listing the rest and the sign-out action.
 */
export function MobileNav(): ReactElement {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const activePrimary = primaryItems.find((item) => isNavItemActive(pathname, item.href));
  const moreActive = moreItems.some((item) => isNavItemActive(pathname, item.href));
  const value = activePrimary?.href ?? (moreActive ? MORE_VALUE : false);

  const renderTab = (item: NavItem): ReactElement => (
    <BottomNavigationAction
      key={item.href}
      component={Link}
      href={item.href as Route}
      value={item.href}
      label={item.label}
      icon={<item.icon fontSize="small" />}
    />
  );

  return (
    <>
      <BottomNavigation
        component="nav"
        showLabels
        value={value}
        sx={(theme) => ({
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: MOBILE_NAV_HEIGHT,
          zIndex: theme.zIndex.appBar,
          borderTop: `1px solid ${theme.palette.line.divider}`,
          backgroundColor: theme.palette.surfaces.base,
        })}
      >
        {primaryItems.map(renderTab)}
        <BottomNavigationAction
          value={MORE_VALUE}
          label="More"
          icon={<MoreHoriz fontSize="small" />}
          onClick={() => setMoreOpen(true)}
        />
      </BottomNavigation>

      <Drawer anchor="bottom" open={moreOpen} onClose={() => setMoreOpen(false)}>
        {/* MenuList (not List): MUI 9 MenuItem throws without a MenuListContext. */}
        <MenuList sx={{ pb: 1 }}>
          {moreItems.map((item) => (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href as Route}
              selected={isNavItemActive(pathname, item.href)}
              onClick={() => setMoreOpen(false)}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <item.icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
          <Divider sx={{ my: 0.5 }} />
          {feedbackLinks.map((link) => (
            <ListItemButton
              key={link.href}
              component="a"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMoreOpen(false)}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <link.icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={link.label} />
            </ListItemButton>
          ))}
          <Divider sx={{ my: 0.5 }} />
          <LogoutMenuItem onClick={() => setMoreOpen(false)} />
        </MenuList>
      </Drawer>
    </>
  );
}
