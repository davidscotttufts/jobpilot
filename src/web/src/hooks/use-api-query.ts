"use client";

import {
  useQuery,
  type UndefinedInitialDataOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useEffect } from "react";
import type { ClientResult } from "@/lib/api-client";
import { useToast } from "@/providers/notification-provider";

type QueryFn<T> = () => Promise<ClientResult<T>>;

type ApiQueryKey = readonly unknown[];

interface UseApiQueryOptions<T>
  extends Omit<UndefinedInitialDataOptions<T, Error, T, ApiQueryKey>, "queryKey" | "queryFn"> {
  errorMessage?: string | ((error: Error) => string);
}

export function useApiQuery<T>(
  queryKey: ApiQueryKey,
  queryFn: QueryFn<T>,
  options?: UseApiQueryOptions<T>,
): UseQueryResult<T, Error> {
  const { errorMessage, ...queryOptions } = options ?? {};
  const toast = useToast();

  const result = useQuery<T, Error, T, ApiQueryKey>({
    queryKey,
    queryFn: async (): Promise<T> => {
      const { data, error } = await queryFn();
      if (error) {
        throw new Error(error.message);
      }
      return data as T;
    },
    ...queryOptions,
  });

  useEffect(() => {
    if (result.error && errorMessage !== undefined) {
      const msg = typeof errorMessage === "function" ? errorMessage(result.error) : errorMessage;
      toast.error(msg);
    }
  }, [result.error, errorMessage, toast]);

  return result;
}
