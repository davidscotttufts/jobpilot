"use client";

import type { ReactElement } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import { FormTextField, type AnyReactForm } from "@/components/ui/form/tanstack";
import { useAgent } from "@/providers/agent-provider";

export type AutopilotDialogMode = "autopilot" | "search";

interface AutopilotDialogProps {
  open: boolean;
  mode: AutopilotDialogMode;
  onClose: () => void;
}

interface FormValues {
  query: string;
  minScore?: number;
  maxApps?: number;
}

const EMPTY: FormValues = { query: "", minScore: undefined, maxApps: undefined };

const formSchema = z.object({
  query: z.string().trim().min(2, "Enter a search query"),
  minScore: z.number().int().min(0).max(100).optional(),
  maxApps: z.number().int().min(1).max(50).optional(),
});

function composeAutopilotArg(values: FormValues): string {
  const parts = [values.query.trim()];
  if (typeof values.minScore === "number") {
    parts.push(`--min-score ${values.minScore}`);
  }
  if (typeof values.maxApps === "number") {
    parts.push(`--max-apps ${values.maxApps}`);
  }
  return parts.join(" ");
}

export function AutopilotDialog(props: AutopilotDialogProps): ReactElement {
  const { open, mode, onClose } = props;
  const agent = useAgent();
  const isSearch = mode === "search";

  const form = useForm({
    defaultValues: EMPTY,
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => {
      if (isSearch) {
        await agent.injectSkill("search", value.query.trim());
      } else {
        await agent.injectSkill("autopilot", composeAutopilotArg(value));
      }
      form.reset();
      onClose();
    },
  });
  const formApi = form as unknown as AnyReactForm;

  return (
    <Dialog
      open={open}
      onClose={() => {
        form.reset();
        onClose();
      }}
      maxWidth="sm"
      fullWidth
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <DialogTitle>{isSearch ? "Search jobs" : "Run autopilot"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <DialogContentText>
              {isSearch
                ? "The agent searches enabled boards and presents ranked matches — no apply step."
                : "The agent searches enabled boards, scores fit, and batch-applies after one approval."}
            </DialogContentText>
            <FormTextField
              form={formApi}
              name="query"
              label="Query"
              placeholder="Senior React TypeScript remote"
              autoFocus
            />
            {!isSearch && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <FormTextField
                  form={formApi}
                  name="minScore"
                  label="Min match score"
                  type="number"
                  helperText="0–100. Empty uses profile default."
                  slotProps={{ htmlInput: { min: 0, max: 100, step: 5 } }}
                />
                <FormTextField
                  form={formApi}
                  name="maxApps"
                  label="Max applications"
                  type="number"
                  helperText="Empty uses profile default."
                  slotProps={{ htmlInput: { min: 1, max: 50, step: 1 } }}
                />
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              form.reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" variant="contained">
            {isSearch ? "Run /search" : "Run /autopilot"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
