-- CreateEnum
CREATE TYPE "CampaignActor" AS ENUM ('user', 'agent', 'pilot');

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "created_by" "CampaignActor" NOT NULL DEFAULT 'user',
ADD COLUMN     "status_actor" "CampaignActor",
ADD COLUMN     "status_reason" TEXT;
