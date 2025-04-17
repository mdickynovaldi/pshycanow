-- CreateEnum
CREATE TYPE "AssistanceRequirement" AS ENUM ('NONE', 'ASSISTANCE_LEVEL1', 'ASSISTANCE_LEVEL2', 'ASSISTANCE_LEVEL3');

-- CreateTable
CREATE TABLE "AssistanceLevel1Submission" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "assistanceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "AssistanceLevel1Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistanceAnswerYesNo" (
    "id" TEXT NOT NULL,
    "answer" BOOLEAN NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "AssistanceAnswerYesNo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistanceLevel2Submission" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "assistanceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "AssistanceLevel2Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistanceAnswerEssay" (
    "id" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "isCorrect" BOOLEAN,
    "feedback" TEXT,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "AssistanceAnswerEssay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistanceLevel3Completion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assistanceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "AssistanceLevel3Completion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentQuizProgress" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currentAttempt" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptPassed" BOOLEAN,
    "maxAttempts" INTEGER NOT NULL DEFAULT 4,
    "assistanceRequired" "AssistanceRequirement" NOT NULL DEFAULT 'NONE',
    "level1Completed" BOOLEAN NOT NULL DEFAULT false,
    "level2Completed" BOOLEAN NOT NULL DEFAULT false,
    "level3Completed" BOOLEAN NOT NULL DEFAULT false,
    "quizId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "StudentQuizProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssistanceLevel1Submission_assistanceId_studentId_idx" ON "AssistanceLevel1Submission"("assistanceId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssistanceAnswerYesNo_submissionId_questionId_key" ON "AssistanceAnswerYesNo"("submissionId", "questionId");

-- CreateIndex
CREATE INDEX "AssistanceLevel2Submission_assistanceId_studentId_idx" ON "AssistanceLevel2Submission"("assistanceId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssistanceAnswerEssay_submissionId_questionId_key" ON "AssistanceAnswerEssay"("submissionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssistanceLevel3Completion_assistanceId_studentId_key" ON "AssistanceLevel3Completion"("assistanceId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentQuizProgress_quizId_studentId_key" ON "StudentQuizProgress"("quizId", "studentId");

-- AddForeignKey
ALTER TABLE "AssistanceLevel1Submission" ADD CONSTRAINT "AssistanceLevel1Submission_assistanceId_fkey" FOREIGN KEY ("assistanceId") REFERENCES "QuizAssistanceLevel1"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceLevel1Submission" ADD CONSTRAINT "AssistanceLevel1Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceAnswerYesNo" ADD CONSTRAINT "AssistanceAnswerYesNo_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AssistanceLevel1Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceAnswerYesNo" ADD CONSTRAINT "AssistanceAnswerYesNo_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssistanceQuestionYesNo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceLevel2Submission" ADD CONSTRAINT "AssistanceLevel2Submission_assistanceId_fkey" FOREIGN KEY ("assistanceId") REFERENCES "QuizAssistanceLevel2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceLevel2Submission" ADD CONSTRAINT "AssistanceLevel2Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceAnswerEssay" ADD CONSTRAINT "AssistanceAnswerEssay_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AssistanceLevel2Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceAnswerEssay" ADD CONSTRAINT "AssistanceAnswerEssay_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssistanceQuestionEssay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceLevel3Completion" ADD CONSTRAINT "AssistanceLevel3Completion_assistanceId_fkey" FOREIGN KEY ("assistanceId") REFERENCES "QuizAssistanceLevel3"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceLevel3Completion" ADD CONSTRAINT "AssistanceLevel3Completion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentQuizProgress" ADD CONSTRAINT "StudentQuizProgress_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentQuizProgress" ADD CONSTRAINT "StudentQuizProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
