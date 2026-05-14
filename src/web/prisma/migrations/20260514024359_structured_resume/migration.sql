/*
  Warnings:

  - You are about to drop the column `defaultResumeId` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `filename` on the `Resume` table. All the data in the column will be lost.
  - You are about to drop the column `mimeType` on the `Resume` table. All the data in the column will be lost.
  - You are about to drop the column `sizeBytes` on the `Resume` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Resume` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ResumeVariant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "resumeId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "jobUrl" TEXT,
    "applicationId" INTEGER,
    "data" TEXT NOT NULL,
    "diffNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResumeVariant_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResumeVariant_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "linkedin" TEXT,
    "github" TEXT,
    "street" TEXT,
    "aptUnit" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT,
    "usAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "requiresSponsorship" BOOLEAN NOT NULL DEFAULT false,
    "visaStatus" TEXT,
    "optExtension" TEXT,
    "willingToRelocate" BOOLEAN NOT NULL DEFAULT false,
    "preferredLocations" TEXT NOT NULL DEFAULT '[]',
    "eeoGender" TEXT,
    "eeoRace" TEXT,
    "eeoEthnicity" TEXT,
    "eeoHispanicOrLatino" TEXT,
    "eeoVeteranStatus" TEXT,
    "eeoDisabilityStatus" TEXT,
    "primaryResumeId" INTEGER,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_primaryResumeId_fkey" FOREIGN KEY ("primaryResumeId") REFERENCES "Resume" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Profile" ("aptUnit", "city", "country", "eeoDisabilityStatus", "eeoEthnicity", "eeoGender", "eeoHispanicOrLatino", "eeoRace", "eeoVeteranStatus", "email", "firstName", "github", "id", "lastName", "linkedin", "optExtension", "phone", "preferredLocations", "requiresSponsorship", "state", "street", "updatedAt", "usAuthorized", "visaStatus", "website", "willingToRelocate", "zipCode") SELECT "aptUnit", "city", "country", "eeoDisabilityStatus", "eeoEthnicity", "eeoGender", "eeoHispanicOrLatino", "eeoRace", "eeoVeteranStatus", "email", "firstName", "github", "id", "lastName", "linkedin", "optExtension", "phone", "preferredLocations", "requiresSponsorship", "state", "street", "updatedAt", "usAuthorized", "visaStatus", "website", "willingToRelocate", "zipCode" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_primaryResumeId_key" ON "Profile"("primaryResumeId");
CREATE TABLE "new_Resume" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "sourceFilename" TEXT,
    "sourceMimeType" TEXT,
    "sourceSizeBytes" INTEGER,
    "data" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Resume_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Resume" ("createdAt", "id", "label", "profileId") SELECT "createdAt", "id", "label", "profileId" FROM "Resume";
DROP TABLE "Resume";
ALTER TABLE "new_Resume" RENAME TO "Resume";
CREATE INDEX "Resume_profileId_idx" ON "Resume"("profileId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ResumeVariant_resumeId_idx" ON "ResumeVariant"("resumeId");

-- CreateIndex
CREATE INDEX "ResumeVariant_applicationId_idx" ON "ResumeVariant"("applicationId");
