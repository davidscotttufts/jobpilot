"use client";

import { type ReactElement, useEffect, useState } from "react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchField } from "@/components/ui/form";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const DEBOUNCE_MS = 200;

interface AdminSearchFieldProps {
  placeholder: string;
}

/** The debounced draft lands in `?q=`, which re-runs the page's server fetch. */
export function AdminSearchField(props: AdminSearchFieldProps): ReactElement {
  const { placeholder } = props;
  const router = useRouter();
  const params = useSearchParams();
  const applied = params.get("q") ?? "";

  const [draft, setDraft] = useState(applied);
  const search = useDebouncedValue(draft, DEBOUNCE_MS);

  useEffect(() => {
    if (search === applied) {
      return;
    }
    const next = new URLSearchParams(params.toString());
    if (search) {
      next.set("q", search);
    } else {
      next.delete("q");
    }
    // A new query invalidates the current offset.
    next.delete("page");
    router.replace(`?${next.toString()}` as Route, { scroll: false });
  }, [search, applied, params, router]);

  return <SearchField value={draft} placeholder={placeholder} onChange={setDraft} />;
}
