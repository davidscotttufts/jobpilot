"use client";

import { type ReactElement, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchField } from "@/components/ui/form";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePaginationParams } from "@/hooks/use-pagination";

const DEBOUNCE_MS = 200;

interface AdminSearchFieldProps {
  placeholder: string;
}

/** The debounced draft lands in `?q=`, which re-runs the page's server fetch. */
export function AdminSearchField(props: AdminSearchFieldProps): ReactElement {
  const { placeholder } = props;
  const applied = useSearchParams().get("q") ?? "";
  // The admin tables are RSC pages, so the param has to be written as a real navigation.
  const { setFilters } = usePaginationParams({ navigate: true });

  const [draft, setDraft] = useState(applied);
  const search = useDebouncedValue(draft, DEBOUNCE_MS);

  useEffect(() => {
    if (search !== applied) {
      setFilters({ q: search });
    }
  }, [search, applied, setFilters]);

  return <SearchField value={draft} placeholder={placeholder} onChange={setDraft} />;
}
