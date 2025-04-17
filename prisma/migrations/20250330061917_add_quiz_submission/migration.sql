/*
  Warnings:

  - You are about to drop the column `text` on the `AssistanceQuestionEssay` table. All the data in the column will be lost.
  - You are about to drop the column `answer` on the `AssistanceQuestionYesNo` table. All the data in the column will be lost.
  - You are about to drop the column `text` on the `AssistanceQuestionYesNo` table. All the data in the column will be lost.
  - Added the required column `correctAnswer` to the `AssistanceQuestionEssay` table without a default value. This is not possible if the table is not empty.
  - Added the required column `question` to the `AssistanceQuestionEssay` table without a default value. This is not possible if the table is not empty.
  - Added the required column `correctAnswer` to the `AssistanceQuestionYesNo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `question` to the `AssistanceQuestionYesNo` table without a default value. This is not possible if the table is not empty.
  - Made the column `title` on table `QuizAssistanceLevel1` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `QuizAssistanceLevel2` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `QuizAssistanceLevel3` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- AlterTable
ALTER TABLE "AssistanceQuestionEssay" DROP COLUMN "text",
ADD COLUMN     "correctAnswer" TEXT NOT NULL,
ADD COLUMN     "question" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AssistanceQuestionYesNo" DROP COLUMN "answer",
DROP COLUMN "text",
ADD COLUMN     "correctAnswer" BOOLEAN NOT NULL,
ADD COLUMN     "explanation" TEXT,
ADD COLUMN     "question" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "QuizAssistanceLevel1" ALTER COLUMN "title" SET NOT NULL;

-- AlterTable
ALTER TABLE "QuizAssistanceLevel2" ALTER COLUMN "title" SET NOT NULL;

-- AlterTable
ALTER TABLE "QuizAssistanceLevel3" ALTER COLUMN "title" SET NOT NULL;

-- CreateTable
CREATE TABLE "QuizSubmission" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "quizId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "QuizSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionAnswer" (
    "id" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "isCorrect" BOOLEAN,
    "feedback" TEXT,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "SubmissionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizSubmission_quizId_studentId_idx" ON "QuizSubmission"("quizId", "studentId");

-- CreateIndex
CREATE INDEX "SubmissionAnswer_submissionId_idx" ON "SubmissionAnswer"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionAnswer_submissionId_questionId_key" ON "SubmissionAnswer"("submissionId", "questionId");

-- AddForeignKey
ALTER TABLE "QuizSubmission" ADD CONSTRAINT "QuizSubmission_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSubmission" ADD CONSTRAINT "QuizSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionAnswer" ADD CONSTRAINT "SubmissionAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "QuizSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionAnswer" ADD CONSTRAINT "SubmissionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
