-- AlterTable
ALTER TABLE "StudentQuizProgress" ADD COLUMN     "finalStatus" TEXT,
ADD COLUMN     "manuallyAssignedLevel" "AssistanceRequirement",
ADD COLUMN     "overrideSystemFlow" BOOLEAN NOT NULL DEFAULT false;
