CREATE TABLE "QuizReport" ("id" TEXT NOT NULL PRIMARY KEY,"quizId" TEXT NOT NULL,"reporterId" TEXT NOT NULL,"reason" TEXT NOT NULL,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "QuizReport_quizId_reporterId_key" ON "QuizReport"("quizId","reporterId");
CREATE INDEX "QuizReport_quizId_createdAt_idx" ON "QuizReport"("quizId","createdAt");
