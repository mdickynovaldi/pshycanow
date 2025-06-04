const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFrontendDisplayIssue() {
  console.log('🔍 Testing frontend display issue...\n');

  try {
    // 1. Get a submission with answers
    const submission = await prisma.quizSubmission.findFirst({
      include: {
        answers: {
          include: {
            question: true
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

    if (!submission) {
      console.log('❌ No submissions found');
      return;
    }

    console.log('📊 Testing submission data structure:');
    console.log(`   Submission ID: ${submission.id}`);
    console.log(`   Student: ${submission.student.name} (${submission.student.id})`);
    console.log(`   Quiz: ${submission.quiz.title} (${submission.quiz.id})`);
    console.log(`   Status: ${submission.status}`);
    console.log(`   Score: ${submission.score}`);
    console.log(`   Created: ${submission.createdAt}`);
    console.log(`   Answers Count: ${submission.answers.length}\n`);

    // 2. Test what the student APIs return
    console.log('🔍 Testing API endpoint responses...\n');

    // Test /api/student/last-quiz-submission
    console.log('📡 Testing /api/student/last-quiz-submission equivalent:');
    const lastSubmission = await prisma.quizSubmission.findFirst({
      where: {
        quizId: submission.quizId,
        studentId: submission.studentId
      },
      include: {
        answers: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (lastSubmission) {
      console.log(`   ✅ Found submission: ${lastSubmission.id}`);
      console.log(`   ✅ Answers included: ${lastSubmission.answers.length}`);
      console.log('   📋 Answer details:');
      lastSubmission.answers.forEach((answer, index) => {
        console.log(`      ${index + 1}. ID: ${answer.id}, Question: ${answer.questionId}, Correct: ${answer.isCorrect}`);
      });
    }

    console.log('\n📡 Testing /api/student/quiz-submissions equivalent:');
    const allSubmissions = await prisma.quizSubmission.findMany({
      where: {
        quizId: submission.quizId,
        studentId: submission.studentId,
        assistanceLevel: null
      },
      include: {
        answers: {
          include: {
            question: true
          }
        }
      },
      orderBy: {
        attemptNumber: "desc"
      }
    });

    console.log(`   ✅ Found ${allSubmissions.length} submissions`);
    allSubmissions.forEach((sub, index) => {
      console.log(`   ${index + 1}. Submission ${sub.id}: ${sub.answers.length} answers`);
    });

    // 3. Test the submission detail function equivalent
    console.log('\n📡 Testing getStudentSubmissionDetail equivalent:');
    const submissionDetail = await prisma.quizSubmission.findUnique({
      where: {
        id: submission.id
      },
      include: {
        quiz: true,
        answers: {
          include: {
            question: true
          }
        }
      }
    });

    if (submissionDetail) {
      console.log(`   ✅ Submission detail loaded: ${submissionDetail.id}`);
      console.log(`   ✅ Quiz included: ${submissionDetail.quiz?.title}`);
      console.log(`   ✅ Answers included: ${submissionDetail.answers.length}`);
      
      console.log('\n   📋 Individual answer details:');
      submissionDetail.answers.forEach((answer, index) => {
        console.log(`      ${index + 1}. Question: ${answer.question?.text || 'No question text'}`);
        console.log(`         Answer: ${answer.answerText || 'No answer text'}`);
        console.log(`         Correct: ${answer.isCorrect}`);
        console.log(`         Question ID: ${answer.questionId}`);
        console.log('');
      });
    }

    // 4. Generate test URLs for manual testing
    console.log('🔗 Test URLs for manual verification:');
    console.log(`   Quiz page: http://localhost:3000/student/quizzes/${submission.quizId}`);
    console.log(`   Quiz history: http://localhost:3000/student/quizzes/${submission.quizId}/history`);
    console.log(`   Submission detail: http://localhost:3000/student/quizzes/${submission.quizId}/submissions/${submission.id}`);
    console.log(`   API last submission: http://localhost:3000/api/student/last-quiz-submission?quizId=${submission.quizId}`);
    console.log(`   API all submissions: http://localhost:3000/api/student/quiz-submissions?quizId=${submission.quizId}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFrontendDisplayIssue();
