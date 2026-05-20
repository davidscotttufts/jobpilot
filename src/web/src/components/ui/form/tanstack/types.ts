import type { ReactFormExtendedApi } from "@tanstack/react-form";

// Erased TanStack Form type — its 12 generics can't be expressed at shared call sites.
// prettier-ignore
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyReactForm = ReactFormExtendedApi<any,any,any,any,any,any,any,any,any,any,any,any>;
