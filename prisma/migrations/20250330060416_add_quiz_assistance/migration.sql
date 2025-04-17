-- CreateTable
CREATE TABLE "QuizAssistanceLevel1" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "quizId" TEXT NOT NULL,

    CONSTRAINT "QuizAssistanceLevel1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistanceQuestionYesNo" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "answer" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assistanceQuizId" TEXT NOT NULL,

    CONSTRAINT "AssistanceQuestionYesNo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAssistanceLevel2" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "quizId" TEXT NOT NULL,

    CONSTRAINT "QuizAssistanceLevel2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistanceQuestionEssay" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "hint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assistanceQuizId" TEXT NOT NULL,

    CONSTRAINT "AssistanceQuestionEssay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAssistanceLevel3" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "pdfUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "quizId" TEXT NOT NULL,

    CONSTRAINT "QuizAssistanceLevel3_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuizAssistanceLevel1_quizId_key" ON "QuizAssistanceLevel1"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAssistanceLevel2_quizId_key" ON "QuizAssistanceLevel2"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAssistanceLevel3_quizId_key" ON "QuizAssistanceLevel3"("quizId");

-- AddForeignKey
ALTER TABLE "QuizAssistanceLevel1" ADD CONSTRAINT "QuizAssistanceLevel1_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceQuestionYesNo" ADD CONSTRAINT "AssistanceQuestionYesNo_assistanceQuizId_fkey" FOREIGN KEY ("assistanceQuizId") REFERENCES "QuizAssistanceLevel1"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAssistanceLevel2" ADD CONSTRAINT "QuizAssistanceLevel2_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistanceQuestionEssay" ADD CONSTRAINT "AssistanceQuestionEssay_assistanceQuizId_fkey" FOREIGN KEY ("assistanceQuizId") REFERENCES "QuizAssistanceLevel2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAssistanceLevel3" ADD CONSTRAINT "QuizAssistanceLevel3_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
