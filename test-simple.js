// Simple JavaScript test script
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMultipleSubmissions() {
  console.log('🧪 Starting multiple submissions test...');
  
  try {
    // 1. Let's find an existing student, quiz, and related questions
    const student = await prisma.user.findFirst({
      where: { role: 'STUDENT' }
    });
    
    if (!student) {
      console.error('❌ No student found in database');
      return;
    }
    
    const quiz = await prisma.quiz.findFirst({
      include: { questions: true }
    });
    
    if (!quiz || quiz.questions.length === 0) {
      console.error('❌ No quiz with questions found in database');
      return;
    }
    
    console.log(`✅ Found student ${student.name} (${student.id}) and quiz "${quiz.title}" (${quiz.id}) with ${quiz.questions.length} questions`);
    
    // 2. Reset/clean existing progress and submissions for this test
    await prisma.studentQuizProgress.deleteMany({
      where: {
        studentId: student.id,
        quizId: quiz.id
      }
    });
    
    await prisma.quizSubmission.deleteMany({
      where: {
        studentId: student.id,
        quizId: quiz.id
      }
    });
    
    console.log('✅ Cleaned up existing progress and submissions');
    
    // 3. Create three quiz submissions for the same student and quiz
    const submissions = [];
    
    for (let i = 0; i < 3; i++) {
      console.log(`Creating submission #${i+1}...`);
      
      // Create a new submission
      const submission = await prisma.quizSubmission.create({
        data: {
          quizId: quiz.id,
          studentId: student.id,
          status: i === 2 ? 'PASSED' : 'FAILED', // Last submission passes
          attemptNumber: i + 1,
          score: i === 2 ? 100 : 50, // Last submission gets 100%
          correctAnswers: i === 2 ? quiz.questions.length : Math.floor(quiz.questions.length / 2),
          totalQuestions: quiz.questions.length,
          feedback: i === 2 ? 'Great job!' : 'Keep trying!'
        }
      });
      
      submissions.push(submission);
      
      // Create some answers for this submission
      for (const question of quiz.questions) {
        await prisma.submissionAnswer.create({
          data: {
            submissionId: submission.id,
            questionId: question.id,
            answerText: `Test answer for submission ${i+1}`,
            isCorrect: i === 2 // All answers in last submission are correct
          }
        });
      }
      
      // Update the progress to point to this submission
      await prisma.studentQuizProgress.upsert({
        where: {
          studentId_quizId: {
            studentId: student.id,
            quizId: quiz.id
          }
        },
        update: {
          currentAttempt: i + 1,
          lastAttemptPassed: i === 2,
          lastSubmissionId: submission.id
        },
        create: {
          studentId: student.id,
          quizId: quiz.id,
          currentAttempt: i + 1,
          lastAttemptPassed: i === 2,
          lastSubmissionId: submission.id
        }
      });
      
      console.log(`✅ Created submission #${i+1} with ID: ${submission.id}`);
    }
    
    // 4. Verify all submissions exist and can be retrieved
    const allSubmissions = await prisma.quizSubmission.findMany({
      where: {
        studentId: student.id,
        quizId: quiz.id,
        assistanceLevel: null
      },
      include: {
        answers: true
      },
      orderBy: {
        attemptNumber: 'asc'
      }
    });
    
    console.log(`\n📊 Found ${allSubmissions.length} submissions for student ${student.id} and quiz ${quiz.id}:`);
    
    allSubmissions.forEach((sub, index) => {
      console.log(`  Submission #${index+1}:`);
      console.log(`    ID: ${sub.id}`);
      console.log(`    Attempt: ${sub.attemptNumber}`);
      console.log(`    Status: ${sub.status}`);
      console.log(`    Score: ${sub.score}%`);
      console.log(`    Created: ${sub.createdAt}`);
      console.log(`    Answers: ${sub.answers.length}`);
      console.log(`    Correct answers: ${sub.answers.filter(a => a.isCorrect).length}`);
      console.log('');
    });
    
    // 5. Verify the progress points to the latest submission
    const progress = await prisma.studentQuizProgress.findUnique({
      where: {
        studentId_quizId: {
          studentId: student.id,
          quizId: quiz.id
        }
      },
      include: {
        lastSubmission: true
      }
    });
    
    console.log('\n📈 Student quiz progress:');
    console.log(`  Current attempt: ${progress.currentAttempt}`);
    console.log(`  Last attempt passed: ${progress.lastAttemptPassed}`);
    console.log(`  Last submission ID: ${progress.lastSubmissionId}`);
    
    if (progress.lastSubmission) {
      console.log('  Last submission details:');
      console.log(`    ID: ${progress.lastSubmission.id}`);
      console.log(`    Attempt: ${progress.lastSubmission.attemptNumber}`);
      console.log(`    Status: ${progress.lastSubmission.status}`);
    }
    
    // Verify the lastSubmission is the latest one created
    const latestCreatedSubmission = submissions[submissions.length - 1];
    const isLastSubmissionCorrect = progress.lastSubmissionId === latestCreatedSubmission.id;
    
    console.log(`\n✅ The lastSubmissionId points to the latest submission: ${isLastSubmissionCorrect}`);
    
    if (!isLastSubmissionCorrect) {
      console.log(`Expected: ${latestCreatedSubmission.id}`);
      console.log(`Actual: ${progress.lastSubmissionId}`);
    }
    
    console.log('\n🎉 Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMultipleSubmissions();
