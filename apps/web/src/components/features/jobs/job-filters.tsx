"use client";

import type { ReactElement, SubmitEvent } from "react";
import { Box, Button, Card, Chip, Stack, TextField } from "@mui/material";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Filters navigate to a real `/jobs?q=…` URL rather than holding client state, so results stay
 * shareable and crawlable. `page` resets on every change, or narrowing a filter strands you on a
 * page that no longer exists.
 */
export function JobFilters(): ReactElement {
  const router = useRouter();
  const params = useSearchParams();
  const remote = params.get("remote") === "true";

  const navigate = (next: URLSearchParams): void => {
    next.delete("page");
    const query = next.toString();
    router.push((query ? `/jobs?${query}` : "/jobs") as Route);
  };

  const onSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams(params);
    const q = String(form.get("q") ?? "").trim();
    const location = String(form.get("location") ?? "").trim();

    for (const [key, value] of [
      ["q", q],
      ["location", location],
    ] as const) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    navigate(next);
  };

  const toggleRemote = (): void => {
    const next = new URLSearchParams(params);
    if (remote) {
      next.delete("remote");
    } else {
      next.set("remote", "true");
    }
    navigate(next);
  };

  const dirty = [...params.keys()].some((key) => key !== "page");

  return (
    <Card sx={{ p: 2 }}>
      <Box component="form" onSubmit={onSubmit}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ alignItems: "center" }}>
          <TextField
            name="q"
            size="small"
            placeholder="Title or company"
            defaultValue={params.get("q") ?? ""}
            sx={{ flex: 1, width: "100%" }}
          />
          <TextField
            name="location"
            size="small"
            placeholder="Location"
            defaultValue={params.get("location") ?? ""}
            sx={{ flex: 1, width: "100%" }}
          />
          <Chip
            label="Remote"
            onClick={toggleRemote}
            color={remote ? "success" : "default"}
            variant={remote ? "filled" : "outlined"}
          />
          <Button type="submit" variant="contained" size="small">
            Search
          </Button>
          {dirty && (
            <Button size="small" variant="text" onClick={() => router.push("/jobs")}>
              Clear
            </Button>
          )}
        </Stack>
      </Box>
    </Card>
  );
}
