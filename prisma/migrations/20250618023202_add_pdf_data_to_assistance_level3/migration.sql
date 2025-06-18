-- AlterTable
ALTER TABLE "QuizAssistanceLevel3" ADD COLUMN     "pdfData" BYTEA,
ADD COLUMN     "pdfMimeType" TEXT,
ALTER COLUMN "pdfUrl" DROP NOT NULL;
