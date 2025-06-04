const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSubmissionAnswers() {
  console.log('🔍 Checking submission answers problem...\n');
  
  try {
    // Check specific student submissions
    const studentId = 'cmb7r4j3k000aoglo9c4wzd2g'; // Aldi
    const quizId = 'cmas2h35k0006ogtx87895ex3'; // Test Biology
    
    const submissions = await prisma.quizSubmission.findMany({
      where: {
        studentId: studentId,
        quizId: quizId,
        assistanceLevel: null
      },
      include: {
        answers: true
      },
      orderBy: {
        attemptNumber: 'asc'
      }
    });
    
    console.log(`Total submissions for Aldi: ${submissions.length}`);
    console.log('─'.repeat(50));
    
    submissions.forEach((sub, i) => {
      console.log(`\nAttempt ${sub.attemptNumber}:`);
      console.log(`  ID: ${sub.id}`);
      console.log(`  Status: ${sub.status}`);
      console.log(`  Score: ${sub.score}%`);
      console.log(`  Created: ${sub.createdAt}`);
      console.log(`  Number of answers: ${sub.answers.length} ${sub.answers.length === 0 ? '❌ NO ANSWERS!' : '✅'}`);
      
      if (sub.answers.length > 0) {
        console.log('  First answer ID: ' + sub.answers[0].id);
      }
    });
    
    // Check if there are orphaned answers
    console.log('\n\n🔍 Checking for potential data issues...');
    
    const allAnswers = await prisma.submissionAnswer.findMany({
      where: {
        submission: {
          studentId: studentId,
          quizId: quizId,
          assistanceLevel: null
        }
      },
      include: {
        submission: {
          select: {
            attemptNumber: true
          }
        }
      }
    });
    
    console.log(`\nTotal answers across all attempts: ${allAnswers.length}`);
    
    // Group answers by attempt
    const answersByAttempt = {};
    allAnswers.forEach(ans => {
      const attempt = ans.submission.attemptNumber;
      if (!answersByAttempt[attempt]) {
        answersByAttempt[attempt] = 0;
      }
      answersByAttempt[attempt]++;
    });
    
    console.log('\nAnswers per attempt:');
    Object.entries(answersByAttempt).forEach(([attempt, count]) => {
      console.log(`  Attempt ${attempt}: ${count} answers`);
    });
    
    // Check for submissions without answers but with data in submittedAnswers JSON field
    console.log('\n\n🔍 Checking submittedAnswers JSON field...');
    
    const submissionsWithJson = await prisma.quizSubmission.findMany({
      where: {
        studentId: studentId,
        quizId: quizId,
        assistanceLevel: null,
        submittedAnswers: { not: null }
      },
      select: {
        attemptNumber: true,
        submittedAnswers: true
      }
    });
    
    console.log(`\nSubmissions with submittedAnswers JSON: ${submissionsWithJson.length}`);
    submissionsWithJson.forEach(sub => {
      console.log(`  Attempt ${sub.attemptNumber}: ${JSON.stringify(sub.submittedAnswers)}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubmissionAnswers(); 