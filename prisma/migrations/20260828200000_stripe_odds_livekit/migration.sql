-- AlterTable
ALTER TABLE "Game" ADD COLUMN "externalId" TEXT;

-- AlterTable
ALTER TABLE "MembershipTier" ADD COLUMN "stripePriceId" TEXT;
ALTER TABLE "MembershipTier" ADD COLUMN "stripeProductId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "stripeSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "handicapperId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stripeTransferId" TEXT,
    "failureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payout_handicapperId_fkey" FOREIGN KEY ("handicapperId") REFERENCES "HandicapperProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcessedWebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_HandicapperProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "tagline" TEXT,
    "heroImageUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "specialties" TEXT NOT NULL,
    "winCount" INTEGER NOT NULL DEFAULT 0,
    "lossCount" INTEGER NOT NULL DEFAULT 0,
    "pushCount" INTEGER NOT NULL DEFAULT 0,
    "unitsNet" REAL NOT NULL DEFAULT 0,
    "roiPercent" REAL NOT NULL DEFAULT 0,
    "ratingAvg" REAL NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "earningsCents" INTEGER NOT NULL DEFAULT 0,
    "paidOutCents" INTEGER NOT NULL DEFAULT 0,
    "stripeAccountId" TEXT,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HandicapperProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_HandicapperProfile" ("createdAt", "displayName", "earningsCents", "heroImageUrl", "id", "lossCount", "pushCount", "ratingAvg", "ratingCount", "roiPercent", "specialties", "tagline", "unitsNet", "userId", "verified", "winCount") SELECT "createdAt", "displayName", "earningsCents", "heroImageUrl", "id", "lossCount", "pushCount", "ratingAvg", "ratingCount", "roiPercent", "specialties", "tagline", "unitsNet", "userId", "verified", "winCount" FROM "HandicapperProfile";
DROP TABLE "HandicapperProfile";
ALTER TABLE "new_HandicapperProfile" RENAME TO "HandicapperProfile";
CREATE UNIQUE INDEX "HandicapperProfile_userId_key" ON "HandicapperProfile"("userId");
CREATE UNIQUE INDEX "HandicapperProfile_stripeAccountId_key" ON "HandicapperProfile"("stripeAccountId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Payout_stripeTransferId_key" ON "Payout"("stripeTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_externalId_key" ON "Game"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

