/*
  Warnings:

  - You are about to drop the column `assistanceRequired` on the `StudentQuizProgress` table. All the data in the column will be lost.
  - You are about to drop the column `finalStatus` on the `StudentQuizProgress` table. All the data in the column will be lost.
  - You are about to drop the column `maxAttempts` on the `StudentQuizProgress` table. All the data in the column will be lost.
  - The `manuallyAssignedLevel` column on the `StudentQuizProgress` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[studentId,quizId]` on the table `StudentQuizProgress` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "StudentQuizProgress_quizId_studentId_key";

-- AlterTable
ALTER TABLE "StudentQuizProgress" DROP COLUMN "assistanceRequired",
DROP COLUMN "finalStatus",
DROP COLUMN "maxAttempts",
ADD COLUMN     "failedAttempts" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "manuallyAssignedLevel",
ADD COLUMN     "manuallyAssignedLevel" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StudentQuizProgress_studentId_quizId_key" ON "StudentQuizProgress"("studentId", "quizId");
