import type { AuthUser } from "@/common/auth";
import type { OAuthProvider, User } from "@/generated/prisma/client";
import { wireProvider } from "./oauth-providers";

/** The principal carried on a request (authGuard derive, access-token subject). */
export function principal(user: User): AuthUser {
  return { id: user.id, role: user.role, email: user.email };
}

/** The public-safe view of a user returned to clients. */
export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

/**
 * The signed-in user's own merged view (`GET /me`): account fields plus the
 * applicant profile columns. `contactEmail` is the applicant address; `email`
 * stays the login address. Secrets (passwordHash, wrappedDek) are never included.
 */
export function meUser(user: User & { oauthAccounts: { provider: OAuthProvider }[] }) {
  return {
    ...publicUser(user),
    // Existence only - the hash itself never leaves the service layer.
    hasPassword: user.passwordHash !== null,
    providers: user.oauthAccounts.map((a) => wireProvider(a.provider)),
    username: user.username,
    availability: user.availability,
    firstName: user.firstName,
    lastName: user.lastName,
    contactEmail: user.contactEmail,
    phone: user.phone,
    website: user.website,
    linkedin: user.linkedin,
    github: user.github,
    street: user.street,
    aptUnit: user.aptUnit,
    city: user.city,
    state: user.state,
    zipCode: user.zipCode,
    country: user.country,
    usAuthorized: user.usAuthorized,
    requiresSponsorship: user.requiresSponsorship,
    visaStatus: user.visaStatus,
    optExtension: user.optExtension,
    willingToRelocate: user.willingToRelocate,
    preferredLocations: user.preferredLocations,
    eeoGender: user.eeoGender,
    eeoRace: user.eeoRace,
    eeoEthnicity: user.eeoEthnicity,
    eeoHispanicOrLatino: user.eeoHispanicOrLatino,
    eeoVeteranStatus: user.eeoVeteranStatus,
    eeoDisabilityStatus: user.eeoDisabilityStatus,
    primaryResumeId: user.primaryResumeId,
    updatedAt: user.updatedAt,
  };
}
