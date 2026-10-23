CREATE TABLE "ActiveLogin" ("userId" TEXT NOT NULL PRIMARY KEY, "tokenHash" TEXT NOT NULL, "expiresAt" DATETIME NOT NULL, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "ActiveLogin_tokenHash_key" ON "ActiveLogin"("tokenHash");
CREATE INDEX "ActiveLogin_expiresAt_idx" ON "ActiveLogin"("expiresAt");
