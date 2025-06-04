const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSubmissionAnswers() {
  try {
    console.log('🔍 Checking submission answers in detail...\n');
    
    // Get all submissions with their answers
    const submissions = await prisma.quizSubmission.findMany({
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                text: true,
                expectedAnswer: true
              }
            }
          }
        },
        quiz: {
          select: {
            id: true,
            title: true
          }
        },
        student: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${submissions.length} submissions total\n`);

    submissions.forEach((submission, index) => {
      console.log(`📝 Submission ${index + 1}:`);
      console.log(`   ID: ${submission.id}`);
      console.log(`   Student: ${submission.student.name} (${submission.student.id})`);
      console.log(`   Quiz: ${submission.quiz.title} (${submission.quiz.id})`);
      console.log(`   Attempt: ${submission.attemptNumber}`);
      console.log(`   Status: ${submission.status}`);
      console.log(`   Score: ${submission.score}%`);
      console.log(`   Created: ${submission.createdAt}`);
      console.log(`   Total Answers: ${submission.answers.length}`);
      
      if (submission.answers.length > 0) {
        console.log(`   📋 Answers:`);
        submission.answers.forEach((answer, answerIndex) => {
          console.log(`      ${answerIndex + 1}. Question: ${answer.question.text.substring(0, 50)}...`);
          console.log(`         Expected: "${answer.question.expectedAnswer || 'N/A'}"`);
          console.log(`         Student Answer: "${answer.answerText}"`);
          console.log(`         Is Correct: ${answer.isCorrect}`);
          console.log(`         Question ID: ${answer.questionId}`);
          console.log(`         Answer ID: ${answer.id}`);
          console.log('');
        });
      } else {
        console.log(`   ❌ No answers found for this submission!`);
      }
      console.log('═'.repeat(80));
      console.log('');
    });

    // Check for constraint violations or duplicate answers
    console.log('🔍 Checking for potential issues...\n');
    
    const duplicateCheck = await prisma.$queryRaw`
      SELECT "submissionId", "questionId", COUNT(*) as count
      FROM "SubmissionAnswer"
      GROUP BY "submissionId", "questionId"
      HAVING COUNT(*) > 1
    `;
    
    if (duplicateCheck.length > 0) {
      console.log('⚠️  Found duplicate answers for same question in same submission:');
      duplicateCheck.forEach(duplicate => {
        console.log(`   Submission: ${duplicate.submissionId}, Question: ${duplicate.questionId}, Count: ${duplicate.count}`);
      });
    } else {
      console.log('✅ No duplicate answers found (unique constraint is working)');
    }

    console.log('\n✅ Check completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubmissionAnswers();
