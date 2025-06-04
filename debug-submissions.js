const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugSubmissions() {
  try {
    console.log('🔍 Debugging submission history...\n');

    // Ambil semua quiz submissions
    const allSubmissions = await prisma.quizSubmission.findMany({
      include: {
        quiz: {
          select: {
            title: true
          }
        },
        student: {
          select: {
            name: true,
            email: true
          }
        },
        answers: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Total submissions found: ${allSubmissions.length}\n`);

    // Group by quiz
    const submissionsByQuiz = allSubmissions.reduce((acc, submission) => {
      const quizId = submission.quizId;
      if (!acc[quizId]) {
        acc[quizId] = {
          quizTitle: submission.quiz.title,
          submissions: []
        };
      }
      acc[quizId].submissions.push(submission);
      return acc;
    }, {});

    // Analyze each quiz
    for (const [quizId, quizData] of Object.entries(submissionsByQuiz)) {
      console.log(`\n🎯 Quiz: "${quizData.quizTitle}" (ID: ${quizId})`);
      
      const mainQuizSubmissions = quizData.submissions.filter(s => s.assistanceLevel === null);
      const assistanceSubmissions = quizData.submissions.filter(s => s.assistanceLevel !== null);
      
      console.log(`  Total submissions: ${quizData.submissions.length}`);
      console.log(`  Main quiz submissions: ${mainQuizSubmissions.length}`);
      console.log(`  Assistance submissions: ${assistanceSubmissions.length}`);

      if (mainQuizSubmissions.length > 0) {
        console.log('\n  📋 Main quiz submissions:');
        mainQuizSubmissions.forEach((submission, index) => {
          console.log(`    ${index + 1}. Student: ${submission.student.name}`);
          console.log(`       Attempt: ${submission.attemptNumber}`);
          console.log(`       Status: ${submission.status}`);
          console.log(`       Score: ${submission.score}%`);
          console.log(`       Created: ${submission.createdAt}`);
          console.log(`       assistanceLevel: ${submission.assistanceLevel}`);
          console.log(`       Answers count: ${submission.answers.length}`);
          console.log('');
        });
      }

      // Test getStudentSubmissionHistory untuk setiap student
      if (mainQuizSubmissions.length > 0) {
        const uniqueStudents = [...new Set(mainQuizSubmissions.map(s => s.studentId))];
        
        for (const studentId of uniqueStudents) {
          const studentSubmissions = await prisma.quizSubmission.findMany({
            where: {
              quizId: quizId,
              studentId: studentId,
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
              attemptNumber: 'desc'
            }
          });

          console.log(`  🔍 Student ${studentId} history query results: ${studentSubmissions.length} submissions`);
          
          if (studentSubmissions.length > 0) {
            studentSubmissions.forEach((sub, idx) => {
              console.log(`    ${idx + 1}. Attempt ${sub.attemptNumber}, Status: ${sub.status}, Score: ${sub.score}%`);
            });
          }
        }
      }
    }

    console.log('\n✅ Debug completed!');

  } catch (error) {
    console.error('❌ Error debugging submissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSubmissions();
