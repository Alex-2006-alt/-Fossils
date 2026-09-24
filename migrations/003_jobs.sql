ALTER TABLE "Media" ADD COLUMN "purgeStartedAt" DATETIME;
CREATE TABLE "FamilyJob" ("id" TEXT NOT NULL PRIMARY KEY,"familyId" TEXT NOT NULL,"type" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'PENDING',"leaseId" TEXT,"startedAt" DATETIME,"doneAt" DATETIME,"retries" INTEGER NOT NULL DEFAULT 0,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "FamilyJob_familyId_type_key" ON "FamilyJob"("familyId","type");
CREATE INDEX "FamilyJob_status_idx" ON "FamilyJob"("status");
