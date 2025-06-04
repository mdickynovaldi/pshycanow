-- AlterTable
ALTER TABLE "AssistanceLevel1Submission" ADD COLUMN     "allCorrect" BOOLEAN,
ADD COLUMN     "score" INTEGER;

-- AlterTable
ALTER TABLE "AssistanceLevel2Submission" ADD COLUMN     "essayAnswer" TEXT;

-- AlterTable
ALTER TABLE "QuizSubmission" ADD COLUMN     "assistanceLevel" INTEGER,
ADD COLUMN     "submittedAnswers" JSONB;

-- AlterTable
ALTER TABLE "StudentQuizProgress" ADD COLUMN     "assistanceRequired" "AssistanceRequirement" DEFAULT 'NONE',
ADD COLUMN     "finalStatus" TEXT,
ADD COLUMN     "nextStep" TEXT;
