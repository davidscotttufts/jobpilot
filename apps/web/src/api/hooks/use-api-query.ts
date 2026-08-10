"use client";

import { type UseQueryOptions, type UseQueryResult, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiErrorMessage, type EdenResult } from "@/api/error";
import { useToast } from "@/providers/notification-provider";

type ApiQueryKey = readonly unknown[];

/** A per-endpoint (queryKey, queryFn) pair; built by the factories in `@/api/queries`. */
export interface ApiQueryDef<TData> {
  queryKey: ApiQueryKey;
  queryFn: () => Promise<EdenResult<TData>>;
}

type UseApiQueryOptions<TData, TSelected = TData> = Omit<
  UseQueryOptions<TData, Error, TSelected, ApiQueryKey>,
  "queryKey" | "queryFn"
> & {
  /**
   * Override the toast shown when the query fails. Omit it and the error's own message is used -
   * every one of the 63 call sites omitted it, and the old opt-in meant a failed fetch rendered
   * as a permanently empty surface with nothing said. Pass `null` where the caller genuinely
   * handles the failure itself (an inline error state, or a probe whose failure is expected).
   */
  errorMessage?: string | ((error: Error) => string) | null;
};

export type ApiQueryResult<TData> = Omit<UseQueryResult<TData, Error>, "data" | "error"> & {
  data: TData | undefined;
  error: Error | null;
};

export function useApiQuery<TData, TSelected = TData>(
  def: ApiQueryDef<TData>,
  options?: UseApiQueryOptions<NoInfer<TData>, TSelected>,
): ApiQueryResult<TSelected> {
  const { queryKey, queryFn } = def;
  const { errorMessage, ...queryOptions } = options ?? {};
  const toast = useToast();

  const result = useQuery<TData, Error, TSelected, ApiQueryKey>({
    queryKey,
    queryFn: async (): Promise<TData> => {
      const { data, error } = await queryFn();
      if (error) {
        throw new Error(apiErrorMessage(error));
      }
      return data as TData;
    },
    ...queryOptions,
  });

  useEffect(() => {
    if (!result.error || errorMessage === null) {
      return;
    }
    // queryFn already normalized the API error into a readable message, so it is a usable default.
    const msg =
      typeof errorMessage === "function"
        ? errorMessage(result.error)
        : (errorMessage ?? result.error.message);
    toast.error(msg);
  }, [result.error, errorMessage, toast]);

  return result as ApiQueryResult<TSelected>;
}
