// Only the wizard's Personal step edits profile fields now; the rest live in
// Settings, so issues on them (shouldn't happen - they're optional) get no step.
const FIELD_TO_STEP: Record<string, number> = {
  firstName: 1,
  lastName: 1,
  email: 1,
  phone: 1,
  website: 1,
  linkedin: 1,
  github: 1,
};

export interface ValidationIssue {
  field: string;
  path: string;
  message: string;
  stepIndex: number | null;
}

export function describeIssues(
  issues: readonly { path: PropertyKey[]; message: string }[],
): ValidationIssue[] {
  return issues.map((issue) => {
    const field = String(issue.path[0] ?? "");
    return {
      field,
      path: issue.path.map(String).join(".") || "form",
      message: issue.message,
      stepIndex: FIELD_TO_STEP[field] ?? null,
    };
  });
}

export function firstStepWithIssue(issues: ValidationIssue[]): number | null {
  for (const issue of issues) {
    if (issue.stepIndex !== null) {
      return issue.stepIndex;
    }
  }
  return null;
}
