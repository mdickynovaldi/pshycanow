const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMultiSubmissionFeature() {
  try {
    console.log('Testing Multi-Submission Grading Feature...\n');
    
    // Find a student with quiz submissions
    const studentsWithSubmissions = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        quizSubmissions: {
          some: {}
        }
      },
      include: {
        quizSubmissions: {
          include: {
            quiz: {
              select: {
                id: true,
                title: true
              }
            }
          },
          orderBy: {
            attemptNumber: 'desc'
          }
        }
      }
    });
    
    if (studentsWithSubmissions.length === 0) {
      console.log('No students with quiz submissions found.');
      return;
    }
    
    const student = studentsWithSubmissions[0];
    console.log(`Student: ${student.name} (${student.email})`);
    console.log(`Total Quiz Submissions: ${student.quizSubmissions.length}\n`);
    
    // Group submissions by quiz
    const submissionsByQuiz = {};
    student.quizSubmissions.forEach(sub => {
      const quizId = sub.quiz.id;
      if (!submissionsByQuiz[quizId]) {
        submissionsByQuiz[quizId] = {
          quiz: sub.quiz,
          submissions: []
        };
      }
      submissionsByQuiz[quizId].submissions.push(sub);
    });
    
    // Display submissions for each quiz
    for (const [quizId, data] of Object.entries(submissionsByQuiz)) {
      console.log(`Quiz: ${data.quiz.title}`);
      console.log(`Number of attempts: ${data.submissions.length}`);
      
      data.submissions.forEach(sub => {
        console.log(`  - Attempt ${sub.attemptNumber}: ${sub.isCompleted ? 'Completed' : 'Pending'} (${new Date(sub.submittedAt).toLocaleDateString()})`);
      });
      
      // Test the API endpoint for this quiz and student
      const testUrl = `http://localhost:3000/teacher/quizzes/${quizId}/students/${student.id}/submissions`;
      console.log(`  Test URL: ${testUrl}\n`);
    }
    
    // Test our new score field
    const submissionAnswers = await prisma.submissionAnswer.findMany({
      where: {
        submission: {
          userId: student.id
        }
      },
      include: {
        submission: {
          include: {
            quiz: {
              select: {
                title: true
              }
            }
          }
        }
      },
      take: 5
    });
    
    console.log('Sample Submission Answers with Score Field:');
    submissionAnswers.forEach(answer => {
      console.log(`  - Quiz: ${answer.submission.quiz.title}, Score: ${answer.score || 'Not graded'}, Correct: ${answer.isCorrect}`);
    });
    
  } catch (error) {
    console.error('Error testing feature:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testMultiSubmissionFeature();
