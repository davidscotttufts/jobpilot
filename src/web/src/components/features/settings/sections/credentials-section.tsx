"use client";

import { useState, type ReactElement } from "react";
import { Add, Delete } from "@mui/icons-material";
import { Box, Button, Card, CardContent, IconButton, Stack, Typography } from "@mui/material";
import { ConfirmDialog } from "@/components/ui/feedback/confirm-dialog";
import { SectionCard } from "@/components/ui/layout/section-card";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { apiClient } from "@/lib/client/api";
import { queryKeys } from "@/lib/client/query-keys";
import type { CredentialInput } from "@/lib/contracts/credential";
import type { CredentialDto } from "@/types/api";
import { CredentialFormDialog } from "./credential-form-dialog";

export function CredentialsSection(): ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CredentialDto | null>(null);

  const credentials = useApiQuery<CredentialDto[]>(queryKeys.credentials.list(), () =>
    apiClient.get<CredentialDto[]>("/api/credentials"),
  );

  const create = useApiMutation<CredentialDto, CredentialInput>(
    (vars) => apiClient.post<CredentialDto>("/api/credentials", vars),
    {
      successMessage: "Credential added",
      invalidate: [queryKeys.credentials.all],
      onSuccess: () => setDialogOpen(false),
    },
  );

  const remove = useApiMutation<{ deleted: number }, number>(
    (id) => apiClient.del<{ deleted: number }>(`/api/credentials/${id}`),
    {
      successMessage: "Credential removed",
      invalidate: [queryKeys.credentials.all],
      onSuccess: () => setPendingDelete(null),
    },
  );

  const rows = credentials.data ?? [];

  return (
    <SectionCard
      title="Login credentials"
      description="Used by skills to log into job boards. Stored locally in plaintext on your machine."
      actions={
        <Button
          size="small"
          startIcon={<Add />}
          variant="contained"
          onClick={() => setDialogOpen(true)}
        >
          Add credential
        </Button>
      }
    >
      {rows.length === 0 ? (
        <Box sx={{ py: 3, textAlign: "center" }}>
          <Typography variant="body2Muted">
            No credentials yet. Add a &ldquo;default&rdquo; credential, or one per board domain
            (e.g. <code>linkedin.com</code>).
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {rows.map((c) => (
            <Card key={c.id}>
              <CardContent>
                <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {c.scope}
                    </Typography>
                    <Typography variant="captionMuted">{c.email}</Typography>
                  </Box>
                  <IconButton onClick={() => setPendingDelete(c)} aria-label="Delete credential">
                    <Delete fontSize="md" />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <CredentialFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={(values) => create.mutate(values)}
        submitting={create.isPending}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete credential?"
        description={
          pendingDelete
            ? `Remove the "${pendingDelete.scope}" credential? Skills using this scope will fall back to the next match.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </SectionCard>
  );
}
