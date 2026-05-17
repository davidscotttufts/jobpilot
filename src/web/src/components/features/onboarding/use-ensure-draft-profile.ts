"use client";

import { useEffect, useRef, useState } from "react";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

interface ProfileListItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
}

function isEmptyDraft(p: ProfileListItem): boolean {
  return !p.firstName?.trim() && !p.lastName?.trim() && !p.email?.trim();
}

/**
 * Ensures an empty draft profile exists and is marked active. Reuses an
 * existing empty draft if one is found, otherwise creates a new one.
 */
export function useEnsureDraftProfile(): { ready: boolean } {
  const [ready, setReady] = useState(false);
  const ranRef = useRef(false);

  const createProfile = useApiMutation<{ id: number }, void>(() =>
    apiClient.post<{ id: number }>("/api/profiles", {}),
  );

  const setActive = useApiMutation<{ profileId: number }, number>(
    (profileId) => apiClient.post("/api/profiles/active", { profileId }),
    { invalidate: [queryKeys.profiles.all] },
  );

  useEffect(() => {
    if (ranRef.current) {
      return;
    }
    ranRef.current = true;

    const bootstrap = async (): Promise<void> => {
      const list = await apiClient.get<ProfileListItem[]>("/api/profiles");
      const reusable = list.data?.find(isEmptyDraft);
      const profileId = reusable ? reusable.id : (await createProfile.mutateAsync()).id;

      if (!reusable || !reusable.isActive) {
        await setActive.mutateAsync(profileId);
      }
      setReady(true);
    };

    void bootstrap();
  }, []);

  return { ready };
}
