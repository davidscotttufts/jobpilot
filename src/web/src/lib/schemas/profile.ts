import { z } from "zod/v4";
import { optionalPhoneSchema } from "./phone";

const optionalUrl = z
  .union([z.literal(""), z.url("Must be a valid URL")])
  .optional()
  .nullable();

const optionalZipCode = z
  .union([
    z.literal(""),
    z
      .string()
      .regex(
        /^[A-Za-z0-9][A-Za-z0-9 -]{1,10}[A-Za-z0-9]$/,
        "Enter a valid ZIP or postal code (e.g. 94103 or SW1A 1AA)",
      ),
  ])
  .optional()
  .nullable();

const optionalLinkedinUrl = z
  .union([
    z.literal(""),
    z
      .url("Must be a valid URL")
      .regex(
        /^https?:\/\/([\w-]+\.)?linkedin\.com\/(in|pub|company)\/[\w\-%.]+\/?.*$/i,
        "Must be a LinkedIn profile URL (e.g. https://linkedin.com/in/your-handle)",
      ),
  ])
  .optional()
  .nullable();

const optionalGithubUrl = z
  .union([
    z.literal(""),
    z
      .url("Must be a valid URL")
      .regex(
        /^https?:\/\/([\w-]+\.)?github\.com\/[\w\-.]+\/?.*$/i,
        "Must be a GitHub profile URL (e.g. https://github.com/your-handle)",
      ),
  ])
  .optional()
  .nullable();

export const profileSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.email(),
  phone: optionalPhoneSchema,
  website: optionalUrl,
  linkedin: optionalLinkedinUrl,
  github: optionalGithubUrl,

  street: z.string().optional().nullable(),
  aptUnit: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: optionalZipCode,
  country: z.string().optional().nullable(),

  usAuthorized: z.boolean(),
  requiresSponsorship: z.boolean(),
  visaStatus: z.string().optional().nullable(),
  optExtension: z.string().optional().nullable(),
  willingToRelocate: z.boolean(),
  preferredLocations: z.array(z.string()),

  eeoGender: z.string().optional().nullable(),
  eeoRace: z.string().optional().nullable(),
  eeoEthnicity: z.string().optional().nullable(),
  eeoHispanicOrLatino: z.string().optional().nullable(),
  eeoVeteranStatus: z.string().optional().nullable(),
  eeoDisabilityStatus: z.string().optional().nullable(),

  primaryResumeId: z.number().int().nullable().optional(),
});

export const autopilotSettingsSchema = z.object({
  minMatchScore: z.number().int().min(0).max(100),
  maxApplicationsPerRun: z.number().int().min(1).max(500).optional().nullable(),
  defaultStartDate: z.string(),
});

export const profileWithAutopilotSchema = profileSchema.extend({
  autopilot: autopilotSettingsSchema.optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type AutopilotSettingsInput = z.infer<typeof autopilotSettingsSchema>;
export type ProfileWithAutopilotInput = z.infer<typeof profileWithAutopilotSchema>;

export const PROFILE_DEFAULT_VALUES: ProfileWithAutopilotInput = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  website: "",
  linkedin: "",
  github: "",
  street: "",
  aptUnit: "",
  city: "",
  state: "",
  zipCode: "",
  country: "United States",
  usAuthorized: true,
  requiresSponsorship: false,
  visaStatus: "",
  optExtension: "",
  willingToRelocate: false,
  preferredLocations: [],
  eeoGender: "Prefer not to disclose",
  eeoRace: "Prefer not to disclose",
  eeoEthnicity: "Prefer not to disclose",
  eeoHispanicOrLatino: "Prefer not to disclose",
  eeoVeteranStatus: "Prefer not to disclose",
  eeoDisabilityStatus: "Prefer not to disclose",
  primaryResumeId: null,
  autopilot: {
    minMatchScore: 70,
    maxApplicationsPerRun: null,
    defaultStartDate: "2 weeks notice",
  },
};
