-- Token usage the host measures per cycle, attached to the run that cycle started
ALTER TABLE "pilot_runs" ADD COLUMN "model" TEXT,
ADD COLUMN "input_tokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "output_tokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "cache_read_tokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "cache_write_tokens" INTEGER NOT NULL DEFAULT 0;
