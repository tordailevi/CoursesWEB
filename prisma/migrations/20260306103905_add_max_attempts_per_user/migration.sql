-- AlterTable
ALTER TABLE "Course" ADD COLUMN "maxAttemptsPerUser" INTEGER;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CourseProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "completedQuestionJson" TEXT NOT NULL,
    "answersJson" TEXT NOT NULL DEFAULT '{}',
    "score" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "CourseProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseProgress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CourseProgress" ("answersJson", "completedQuestionJson", "courseId", "id", "score", "updatedAt", "userId") SELECT "answersJson", "completedQuestionJson", "courseId", "id", "score", "updatedAt", "userId" FROM "CourseProgress";
DROP TABLE "CourseProgress";
ALTER TABLE "new_CourseProgress" RENAME TO "CourseProgress";
CREATE INDEX "CourseProgress_userId_courseId_idx" ON "CourseProgress"("userId", "courseId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
