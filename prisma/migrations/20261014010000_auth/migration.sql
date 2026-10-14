CREATE TABLE "User" ("id" TEXT NOT NULL PRIMARY KEY,"email" TEXT NOT NULL,"name" TEXT NOT NULL,"passwordHash" TEXT NOT NULL,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "Session" ("id" TEXT NOT NULL PRIMARY KEY,"userId" TEXT NOT NULL,"tokenHash" TEXT NOT NULL,"expiresAt" DATETIME NOT NULL,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
