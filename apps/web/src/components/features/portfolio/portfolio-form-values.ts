import type { Availability } from "@jobpilot/contracts/user";
import type { PortfolioSettingsDto } from "@/api/types";

/** A select cannot hold null, so unset availability round-trips through the empty string. */
export interface PortfolioFormValues {
  username: string;
  availability: Availability | "";
  showResume: boolean;
  showWebsite: boolean;
  showLinkedin: boolean;
  showGithub: boolean;
}

/** Shared by the parent form and every `withForm` card, which must agree on the value shape. */
export const PORTFOLIO_FORM_DEFAULTS: PortfolioFormValues = {
  username: "",
  availability: "",
  showResume: false,
  showWebsite: false,
  showLinkedin: false,
  showGithub: false,
};

export function toPortfolioFormValues(settings: PortfolioSettingsDto): PortfolioFormValues {
  return { ...settings, availability: settings.availability ?? "" };
}
