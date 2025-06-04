# Failed Attempts Fix - Summary and Testing Guide

## Problem
The `failedAttempts` field in the `StudentQuizProgress` table was not being incremented when students submitted quiz answers that were not all correct, even though the logic appeared correct in the codebase.

## Root Cause
The application has two submission routes:
- `submitQuizAnswers` server action (had correct logic but wasn't being used)
- `/api/student/submit-quiz` API route (missing failedAttempts increment logic)

The frontend was using the API route, which was missing the increment logic.

## Fix Applied
Added `failedAttempts` increment logic to three database update statements in `/src/app/api/student/submit-quiz/route.ts`:

1. **Level 2 assistance redirect** (line ~201):
   ```sql
   "failedAttempts" = "failedAttempts" + 1,
   ```

2. **Level 3 assistance redirect** (line ~221):
   ```sql
   "failedAttempts" = "failedAttempts" + 1,
   ```

3. **Normal progress update** (line ~256):
   ```sql
   "failedAttempts" = CASE WHEN ${passed} THEN "failedAttempts" ELSE "failedAttempts" + 1 END,
   ```

## Files Modified
- `/src/app/api/student/submit-quiz/route.ts` - Added failedAttempts increment logic

## Testing the Fix

### Option 1: Automated Test Script
```bash
# Update the STUDENT_ID and QUIZ_ID in verify-failed-attempts.js first
node verify-failed-attempts.js
```

### Option 2: Manual Testing
1. Start the development server: `npm run dev`
2. Login as a student
3. Take a quiz and submit incorrect answers
4. Check the database to verify `failedAttempts` was incremented

### Database Verification
Use these SQL queries to check the results:

```sql
-- Check failedAttempts for specific student/quiz
SELECT 
  studentId,
  quizId,
  failedAttempts,
  totalAttempts,
  passed,
  updatedAt
FROM "StudentQuizProgress" 
WHERE studentId = [YOUR_STUDENT_ID] AND quizId = [YOUR_QUIZ_ID];

-- Check recent quiz submissions
SELECT 
  studentId,
  quizId,
  failedAttempts,
  totalAttempts,
  passed,
  updatedAt
FROM "StudentQuizProgress" 
WHERE updatedAt >= NOW() - INTERVAL '1 hour'
ORDER BY updatedAt DESC;
```

Or use Prisma Studio:
```bash
npx prisma studio
```

## Expected Behavior
- When a student submits a quiz with incorrect answers: `failedAttempts` increments by 1
- When a student submits a quiz with all correct answers: `failedAttempts` remains unchanged
- The increment happens for all assistance levels (normal, level 2, level 3)

## Next Steps
Consider consolidating the duplicate submission logic between the server action and API route to prevent future inconsistencies.

## Testing Files Created
- `verify-failed-attempts.js` - Automated test script
- `check-failed-attempts.sql` - Database verification queries
- `test-failed-attempts.js` - Basic test script
