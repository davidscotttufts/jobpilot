-- Login emails are matched case-sensitively by the unique index; the API now
-- normalizes to lowercase at every boundary, so bring existing rows in line.
-- Fails loudly on a (unlikely) case-only duplicate pair, which needs manual merging.
UPDATE "users" SET "email" = LOWER("email") WHERE "email" <> LOWER("email");
