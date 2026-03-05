-- DropIndex
DROP INDEX "CourseProgress_userId_courseId_key";

-- CreateIndex
CREATE INDEX "CourseProgress_userId_courseId_idx" ON "CourseProgress"("userId", "courseId");
