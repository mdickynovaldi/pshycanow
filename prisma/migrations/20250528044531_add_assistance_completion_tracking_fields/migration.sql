/*
  Warnings:

  - The `finalStatus` column on the `StudentQuizProgress` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `assistanceRequired` on table `StudentQuizProgress` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "AssistanceLevel1Submission" ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AssistanceLevel2Submission" ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AssistanceLevel3Completion" ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readingTime" INTEGER;

-- AlterTable
ALTER TABLE "StudentQuizProgress" ADD COLUMN     "canTakeMainQuiz" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "level1Accessible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "level1CompletedAt" TIMESTAMP(3),
ADD COLUMN     "level2Accessible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "level2CompletedAt" TIMESTAMP(3),
ADD COLUMN     "level3Accessible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "level3CompletedAt" TIMESTAMP(3),
ADD COLUMN     "mustRetakeMainQuiz" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "assistanceRequired" SET NOT NULL,
DROP COLUMN "finalStatus",
ADD COLUMN     "finalStatus" "SubmissionStatus";
