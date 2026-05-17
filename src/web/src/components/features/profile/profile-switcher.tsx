"use client";

import { useState, type MouseEvent, type ReactElement } from "react";
import { Add, Check } from "@mui/icons-material";
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

interface ProfileListItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
}

function initials(p: ProfileListItem): string {
  const first = p.firstName?.[0] ?? "";
  const last = p.lastName?.[0] ?? "";
  const both = `${first}${last}`.trim();
  if (both) {
    return both.toUpperCase();
  }
  return p.email?.[0]?.toUpperCase() ?? "?";
}

function displayName(p: ProfileListItem): string {
  const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  return name || p.email || "Untitled profile";
}

export function ProfileSwitcher(): ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);

  const profilesQuery = useApiQuery<ProfileListItem[]>(queryKeys.profiles.list(), () =>
    apiClient.get<ProfileListItem[]>("/api/profiles"),
  );

  const switchTo = useApiMutation<{ profileId: number }, number>(
    (profileId) => apiClient.post("/api/profiles/active", { profileId }),
    {
      invalidate: [queryKeys.profiles.all],
      onSuccess: () => {
        queryClient.invalidateQueries();
        router.refresh();
        setAnchor(null);
      },
    },
  );

  const profiles = profilesQuery.data ?? [];

  if (profiles.length === 0) {
    return <></>;
  }

  const active = profiles.find((p) => p.isActive) ?? profiles[0]!;

  const handleOpen = (e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget);
  const handleClose = () => setAnchor(null);

  const handleSelect = (id: number) => {
    if (id === active.id) {
      setAnchor(null);
      return;
    }
    switchTo.mutate(id);
  };

  const handleCreate = () => {
    setAnchor(null);
    router.push("/onboarding?new=1");
  };

  return (
    <Box sx={{ pb: 1 }}>
      <Tooltip title={displayName(active)} placement="right">
        <IconButton
          aria-label={`Active profile: ${displayName(active)}. Click to switch.`}
          aria-haspopup="menu"
          aria-controls={open ? "profile-switcher-menu" : undefined}
          aria-expanded={open}
          onClick={handleOpen}
          sx={(theme) => ({
            p: 0,
            borderRadius: theme.radii.sm,
            "&:focus-visible": { boxShadow: theme.shadows_custom.focus },
          })}
        >
          <Avatar
            sx={(theme) => ({
              width: 36,
              height: 36,
              fontSize: 14,
              fontWeight: 600,
              bgcolor: theme.palette.accent.primary,
              color: theme.palette.text.primary,
              border: `1px solid ${theme.palette.line.borderHi}`,
            })}
          >
            {initials(active)}
          </Avatar>
        </IconButton>
      </Tooltip>
      <Menu
        id="profile-switcher-menu"
        anchorEl={anchor}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          list: { "aria-label": "Switch profile", dense: true },
          paper: { sx: { minWidth: 260 } },
        }}
      >
        {profiles.map((p) => {
          const isCurrent = p.id === active.id;
          return (
            <MenuItem
              key={p.id}
              onClick={() => handleSelect(p.id)}
              aria-current={isCurrent ? "true" : undefined}
              selected={isCurrent}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {isCurrent && <Check fontSize="small" />}
              </ListItemIcon>
              <ListItemText
                primary={displayName(p)}
                secondary={p.email || undefined}
                slotProps={{
                  primary: { variant: "body2" },
                  secondary: { variant: "caption" },
                }}
              />
            </MenuItem>
          );
        })}
        <Divider />
        <MenuItem onClick={handleCreate}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Add fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Create new profile" />
        </MenuItem>
      </Menu>
    </Box>
  );
}
