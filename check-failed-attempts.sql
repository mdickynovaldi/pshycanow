-- Database queries to check failedAttempts values
-- Run these in your database client (e.g., Prisma Studio, pgAdmin, etc.)

-- 1. Check current failedAttempts for all students
SELECT 
  sp.id,
  sp.studentId,
  sp.quizId,
  sp.failedAttempts,
  sp.totalAttempts,
  sp.score,
  sp.passed,
  sp.updatedAt
FROM "StudentQuizProgress" sp
ORDER BY sp.updatedAt DESC;

-- 2. Check failedAttempts for a specific student and quiz
-- Replace 1 and 1 with actual studentId and quizId
SELECT 
  sp.*
FROM "StudentQuizProgress" sp
WHERE sp.studentId = 1 AND sp.quizId = 1;

-- 3. Reset failedAttempts for testing (if needed)
-- Replace 1 and 1 with actual studentId and quizId
-- UPDATE "StudentQuizProgress" 
-- SET "failedAttempts" = 0
-- WHERE "studentId" = 1 AND "quizId" = 1;

-- 4. Check if there are any recent quiz submissions
SELECT 
  sp.studentId,
  sp.quizId,
  sp.failedAttempts,
  sp.totalAttempts,
  sp.passed,
  sp.updatedAt
FROM "StudentQuizProgress" sp
WHERE sp.updatedAt >= NOW() - INTERVAL '1 hour'
ORDER BY sp.updatedAt DESC;
