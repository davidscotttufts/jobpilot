import type {
  ScreeningAnswer,
  UpworkProposalOutcome,
  UpworkProposalStatus,
} from "@/api/contracts/upwork";

export interface UpworkProposalDto {
  id: number;
  jobTitle: string;
  clientName: string | null;
  jobUrl: string | null;
  jobDescription: string | null;
  proposalText: string;
  screeningAnswers: ScreeningAnswer[];
  status: UpworkProposalStatus;
  outcome: UpworkProposalOutcome | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}

export interface CreateUpworkProposalRequest {
  jobTitle: string;
  clientName?: string | null;
  jobUrl?: string | null;
  jobDescription?: string | null;
  proposalText?: string;
  screeningAnswers?: ScreeningAnswer[];
  status?: UpworkProposalStatus;
  notes?: string | null;
}

export interface UpdateUpworkProposalRequest {
  jobTitle?: string;
  clientName?: string | null;
  jobUrl?: string | null;
  jobDescription?: string | null;
  proposalText?: string;
  screeningAnswers?: ScreeningAnswer[];
  status?: UpworkProposalStatus;
  outcome?: UpworkProposalOutcome | null;
  notes?: string | null;
  submittedAt?: string | null;
}
