/** Prisma's known-request-error codes, as strings so callers need not import the error class. */
export const PRISMA_ERRORS = {
  /** Unique constraint violated. */
  UNIQUE_VIOLATION: "P2002",
  /** Update/delete targeted a row that does not exist. */
  NOT_FOUND: "P2025",
} as const;

export function prismaCode(error: unknown): string | null {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return null;
}

export function isPrismaError(error: unknown, code: string): boolean {
  return prismaCode(error) === code;
}
