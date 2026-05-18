"use client";

import type { ReactElement } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import { FormTextField, type AnyReactForm } from "@/components/ui/form/tanstack";
import type { AddQueueEntry } from "@/lib/schemas/queue";

interface AddUrlsDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: AddQueueEntry) => void;
  submitting?: boolean;
}

interface FormValues {
  urlsText: string;
  note: string;
}

const EMPTY: FormValues = { urlsText: "", note: "" };

function parseUrls(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const token of raw.split(/[\s,]+/)) {
    const t = token.trim();
    if (!t || seen.has(t)) {
      continue;
    }
    seen.add(t);
    out.push(t);
  }
  return out;
}

const urlsTextSchema = z.string().refine(
  (raw) => {
    const urls = parseUrls(raw);
    if (urls.length === 0) {
      return false;
    }
    return urls.every((u) => z.url().safeParse(u).success);
  },
  { message: "Enter at least one valid URL, one per line" },
);

const formSchema = z.object({
  urlsText: urlsTextSchema,
  note: z.string(),
});

export function AddUrlsDialog(props: AddUrlsDialogProps): ReactElement {
  const { open, onClose, onSubmit, submitting } = props;

  const form = useForm({
    defaultValues: EMPTY,
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => {
      const urls = parseUrls(value.urlsText);
      const note = value.note.trim();
      onSubmit({ urls, note: note ? note : null });
    },
  });
  const formApi = form as unknown as AnyReactForm;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <DialogTitle>Add URLs to queue</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <form.Field name="urlsText">
              {(field) => {
                const errMsg = field.state.meta.errors[0]?.message;
                return (
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="URLs (one per line)"
                    placeholder={
                      "https://www.linkedin.com/jobs/view/...\nhttps://boards.greenhouse.io/..."
                    }
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    error={field.state.meta.errors.length > 0}
                    helperText={
                      errMsg ?? "Paste one URL per line. Whitespace and commas are accepted."
                    }
                  />
                );
              }}
            </form.Field>
            <FormTextField form={formApi} name="note" label="Note (optional)" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
