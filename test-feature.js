const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMultiSubmissionGrading() {
  try {
    console.log('=== Testing Multi-Submission Grading Feature ===\n');
    
    // Get quiz and student data
    const quiz = await prisma.quiz.findFirst({
      include: {
        questions: true
      }
    });
    
    if (!quiz) {
      console.log('No quiz found in database');
      return;
    }
    
    console.log(`Quiz: "${quiz.title}"`);
    console.log(`Questions: ${quiz.questions.length}\n`);
    
    // Get all submissions for this quiz
    const submissions = await prisma.quizSubmission.findMany({
      where: {
        quizId: quiz.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        submissionAnswers: {
          include: {
            question: {
              select: {
                questionText: true
              }
            }
          }
        }
      },
      orderBy: [
        { userId: 'asc' },
        { attemptNumber: 'desc' }
      ]
    });
    
    console.log(`Total submissions: ${submissions.length}\n`);
    
    // Group by student
    const submissionsByStudent = {};
    submissions.forEach(sub => {
      if (!submissionsByStudent[sub.userId]) {
        submissionsByStudent[sub.userId] = {
          user: sub.user,
          submissions: []
        };
      }
      submissionsByStudent[sub.userId].submissions.push(sub);
    });
    
    // Display submissions for each student
    for (const [userId, data] of Object.entries(submissionsByStudent)) {
      console.log(`Student: ${data.user.name} (${data.user.email})`);
      console.log(`Total attempts: ${data.submissions.length}`);
      
      data.submissions.forEach((sub, index) => {
        console.log(`  Attempt ${sub.attemptNumber}:`);
        console.log(`    - ID: ${sub.id}`);
        console.log(`    - Status: ${sub.isCompleted ? 'Completed' : 'In Progress'}`);
        console.log(`    - Submitted: ${sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'Not submitted'}`);
        console.log(`    - Answers: ${sub.submissionAnswers.length}`);
        
        // Check if answers have scores
        const gradedAnswers = sub.submissionAnswers.filter(a => a.score !== null);
        console.log(`    - Graded answers: ${gradedAnswers.length}/${sub.submissionAnswers.length}`);
        
        if (gradedAnswers.length > 0) {
          const avgScore = gradedAnswers.reduce((sum, a) => sum + a.score, 0) / gradedAnswers.length;
          console.log(`    - Average score: ${avgScore.toFixed(1)}%`);
        }
        console.log('');
      });
      
      // Test URL for this student's submissions
      const testUrl = `/teacher/quizzes/${quiz.id}/students/${userId}/submissions`;
      console.log(`  📝 Test URL: http://localhost:3000${testUrl}\n`);
    }
    
    // Test the API endpoint
    console.log('=== Testing API Endpoint ===');
    const firstStudent = Object.values(submissionsByStudent)[0];
    if (firstStudent) {
      const apiUrl = `http://localhost:3000/api/teacher/quiz-submissions?quizId=${quiz.id}&studentId=${firstStudent.user.id}`;
      console.log(`API endpoint: ${apiUrl}`);
      
      // Since we can't make HTTP requests easily, let's simulate what the API should return
      const apiResult = await prisma.quizSubmission.findMany({
        where: {
          quizId: quiz.id,
          userId: firstStudent.user.id,
          // Only main quiz submissions, not assistance
          OR: [
            { type: 'QUIZ' },
            { type: { equals: null } }
          ]
        },
        include: {
          submissionAnswers: {
            include: {
              question: {
                select: {
                  id: true,
                  questionText: true,
                  questionType: true,
                  options: true,
                  correctAnswer: true
                }
              }
            }
          }
        },
        orderBy: {
          attemptNumber: 'desc'
        }
      });
      
      console.log(`✅ API would return ${apiResult.length} submissions`);
      apiResult.forEach(sub => {
        console.log(`   - Attempt ${sub.attemptNumber}: ${sub.submissionAnswers.length} answers`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testMultiSubmissionGrading();
