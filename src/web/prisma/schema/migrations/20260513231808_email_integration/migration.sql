-- CreateTable
CREATE TABLE "EmailAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "provider" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" DATETIME,
    "scope" TEXT,
    "historyId" TEXT,
    "lastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" INTEGER NOT NULL,
    "providerId" TEXT NOT NULL,
    "threadId" TEXT,
    "subject" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "fromDomain" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "rawBody" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedAt" DATETIME,
    "classification" TEXT,
    "confidence" REAL,
    "reasoning" TEXT,
    "matchedAppId" INTEGER,
    "matchScore" REAL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "appliedStage" TEXT,
    "verificationCode" TEXT,
    "verificationLink" TEXT,
    "verificationDomain" TEXT,
    CONSTRAINT "EmailMessage_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EmailAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailMessage_matchedAppId_fkey" FOREIGN KEY ("matchedAppId") REFERENCES "Application" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_providerId_key" ON "EmailMessage"("providerId");

-- CreateIndex
CREATE INDEX "EmailMessage_reviewStatus_receivedAt_idx" ON "EmailMessage"("reviewStatus", "receivedAt");

-- CreateIndex
CREATE INDEX "EmailMessage_matchedAppId_idx" ON "EmailMessage"("matchedAppId");

-- CreateIndex
CREATE INDEX "EmailMessage_fromDomain_receivedAt_idx" ON "EmailMessage"("fromDomain", "receivedAt");

-- CreateIndex
CREATE INDEX "EmailMessage_verificationDomain_receivedAt_idx" ON "EmailMessage"("verificationDomain", "receivedAt");
