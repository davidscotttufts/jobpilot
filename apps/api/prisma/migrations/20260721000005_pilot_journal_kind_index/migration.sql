-- The journal feed's kind filter and the host's `findFirst({ userId, kind: "cycle" })` liveness probe
-- both post-filter on kind over the (user_id, created_at) index, heap-reading every candidate row.

CREATE INDEX "pilot_journal_entries_user_id_kind_created_at_idx" ON "pilot_journal_entries"("user_id", "kind", "created_at");
