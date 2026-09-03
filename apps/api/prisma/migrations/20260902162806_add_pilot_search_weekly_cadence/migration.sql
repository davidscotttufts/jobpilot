-- CreateEnum
CREATE TYPE "PilotSearchCadence" AS ENUM ('adaptive', 'weekly');

-- AlterTable
ALTER TABLE "pilot_searches" ADD COLUMN     "cadence" "PilotSearchCadence" NOT NULL DEFAULT 'adaptive',
ADD COLUMN     "cadence_days" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "cadence_hour" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "cadence_time_zone" TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN     "max_applications" INTEGER,
ADD COLUMN     "min_score" INTEGER;
