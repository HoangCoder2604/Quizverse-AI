CREATE TABLE "TopicMastery" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "answered" INTEGER NOT NULL DEFAULT 0,
  "correct" INTEGER NOT NULL DEFAULT 0,
  "strength" REAL NOT NULL DEFAULT 0,
  "streak" INTEGER NOT NULL DEFAULT 0,
  "nextReview" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "TopicMastery_ownerId_topic_key" ON "TopicMastery"("ownerId", "topic");
CREATE INDEX "TopicMastery_ownerId_nextReview_idx" ON "TopicMastery"("ownerId", "nextReview");
CREATE TABLE "ReviewCard" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "options" TEXT NOT NULL,
  "correctIndex" INTEGER NOT NULL,
  "explanation" TEXT NOT NULL,
  "intervalDays" INTEGER NOT NULL DEFAULT 1,
  "repetitions" INTEGER NOT NULL DEFAULT 0,
  "nextReview" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ReviewCard_ownerId_id_key" ON "ReviewCard"("ownerId", "id");
CREATE INDEX "ReviewCard_ownerId_nextReview_idx" ON "ReviewCard"("ownerId", "nextReview");
CREATE TABLE "LearningSubmission" (
  "attemptId" TEXT NOT NULL PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "LearningSubmission_ownerId_createdAt_idx" ON "LearningSubmission"("ownerId", "createdAt");
