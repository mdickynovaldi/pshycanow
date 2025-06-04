-- AlterTable
ALTER TABLE "StudentQuizProgress" ADD COLUMN "lastSubmissionId" TEXT;

-- AddForeignKey
ALTER TABLE "StudentQuizProgress" ADD CONSTRAINT "StudentQuizProgress_lastSubmissionId_fkey" FOREIGN KEY ("lastSubmissionId") REFERENCES "QuizSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
