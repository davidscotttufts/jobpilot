interface IdentityFields {
  firstName: string;
  lastName: string;
}

/** True when both names are blank on the /me object - i.e. the user hasn't onboarded yet. */
export function isOnboardingIncomplete(user: IdentityFields): boolean {
  return user.firstName.trim() === "" && user.lastName.trim() === "";
}
