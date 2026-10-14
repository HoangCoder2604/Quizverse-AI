-- Shared atomic rate-limit counters for Firebase session endpoints.
CREATE TABLE "AuthRateLimit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "hits" INTEGER NOT NULL,
  "expiresAt" INTEGER NOT NULL
);
CREATE INDEX "AuthRateLimit_expiresAt_idx" ON "AuthRateLimit"("expiresAt");
