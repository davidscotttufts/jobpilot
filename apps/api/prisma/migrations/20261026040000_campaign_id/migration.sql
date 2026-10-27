-- Campaign's key is `id` like every other table. Foreign keys follow the renamed column.
ALTER TABLE "campaigns" RENAME COLUMN "campaign_id" TO "id";
