const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAllSubmissionsDisplay() {
  console.log('🧪 Testing display of all student submissions and answers...\n');

  try {
    // 1. Cari student dengan multiple submissions
    const studentWithSubmissions = await prisma.user.findFirst({
      where: {
        role: 'STUDENT',
        submissions: {
          some: {
            assistanceLevel: null
          }
        }
      },
      include: {
        submissions: {
          where: {
            assistanceLevel: null
          },
          include: {
            quiz: true,
            answers: {
              include: {
                question: true
              }
            }
          },
          orderBy: {
            attemptNumber: 'asc'
          }
        }
      }
    });

    if (!studentWithSubmissions || studentWithSubmissions.submissions.length === 0) {
      console.log('❌ No student with submissions found. Creating test data...');
      
      // Create test data
      const student = await prisma.user.findFirst({
        where: { role: 'STUDENT' }
      });
      
      const quiz = await prisma.quiz.findFirst({
        include: { questions: true }
      });
      
      if (!student || !quiz || quiz.questions.length === 0) {
        console.log('❌ Missing test data (student/quiz/questions)');
        return;
      }

      // Create 3 submissions with different scenarios
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`Creating submission attempt ${attempt}...`);
        
        const submission = await prisma.quizSubmission.create({
          data: {
            studentId: student.id,
            quizId: quiz.id,
            attemptNumber: attempt,
            status: attempt === 3 ? 'PASSED' : 'FAILED',
            score: attempt === 3 ? 80 : attempt === 2 ? 60 : 40,
            assistanceLevel: null
          }
        });

        // Create answers for each question
        for (const [index, question] of quiz.questions.entries()) {
          const isCorrect = attempt === 3 || (attempt === 2 && index === 0);
          
          await prisma.submissionAnswer.create({
            data: {
              submissionId: submission.id,
              questionId: question.id,
              answerText: `Answer for attempt ${attempt}, question ${index + 1}`,
              isCorrect: isCorrect,
              score: null, // Not graded by teacher yet
              feedback: null // No feedback yet
            }
          });
        }
      }
      
      // Re-fetch the data
      const updatedStudent = await prisma.user.findUnique({
        where: { id: student.id },
        include: {
          submissions: {
            where: {
              quizId: quiz.id,
              assistanceLevel: null
            },
            include: {
              quiz: true,
              answers: {
                include: {
                  question: true
                }
              }
            },
            orderBy: {
              attemptNumber: 'asc'
            }
          }
        }
      });
      
      console.log('✅ Test data created successfully\n');
      studentWithSubmissions = updatedStudent;
    }

    // 2. Display all submissions and their answers
    console.log('📊 Student Submissions Summary:');
    console.log(`Student: ${studentWithSubmissions.name}`);
    console.log(`Total Submissions: ${studentWithSubmissions.submissions.length}\n`);

    // Group submissions by quiz
    const submissionsByQuiz = {};
    studentWithSubmissions.submissions.forEach(sub => {
      if (!submissionsByQuiz[sub.quizId]) {
        submissionsByQuiz[sub.quizId] = {
          quizTitle: sub.quiz.title,
          submissions: []
        };
      }
      submissionsByQuiz[sub.quizId].submissions.push(sub);
    });

    // Display each quiz and its submissions
    for (const [quizId, data] of Object.entries(submissionsByQuiz)) {
      console.log(`\n📝 Quiz: ${data.quizTitle}`);
      console.log(`Quiz ID: ${quizId}`);
      console.log(`Total Attempts: ${data.submissions.length}`);
      console.log('─'.repeat(80));

      data.submissions.forEach(submission => {
        console.log(`\n🎯 Percobaan ke-${submission.attemptNumber}`);
        console.log(`   Submission ID: ${submission.id}`);
        console.log(`   Status: ${submission.status} ${
          submission.status === 'PASSED' ? '✅' : 
          submission.status === 'FAILED' ? '❌' : '⏳'
        }`);
        console.log(`   Score: ${submission.score || 0}%`);
        console.log(`   Created: ${new Date(submission.createdAt).toLocaleString('id-ID')}`);
        console.log(`   Total Answers: ${submission.answers.length}`);
        
        console.log('\n   📋 Jawaban Detail:');
        submission.answers.forEach((answer, idx) => {
          console.log(`\n   ${idx + 1}. ${answer.question.text}`);
          console.log(`      Student Answer: "${answer.answerText}"`);
          console.log(`      Expected Answer: "${answer.question.expectedAnswer || 'Not set'}"`);
          console.log(`      Auto-corrected: ${
            answer.isCorrect === true ? '✅ Benar' : 
            answer.isCorrect === false ? '❌ Salah' : 
            '⏳ Belum dikoreksi'
          }`);
          console.log(`      Teacher Score: ${answer.score !== null ? answer.score + '/100' : 'Belum dinilai'}`);
          console.log(`      Teacher Feedback: ${answer.feedback || 'Belum ada feedback'}`);
        });
      });

      // Generate test URL
      console.log(`\n🔗 Teacher Assessment URL:`);
      console.log(`   http://localhost:3000/teacher/quizzes/${quizId}/students/${studentWithSubmissions.id}/submissions`);
    }

    // 3. Summary statistics
    console.log('\n\n📈 Overall Statistics:');
    const allSubmissions = studentWithSubmissions.submissions;
    const totalAnswers = allSubmissions.reduce((sum, sub) => sum + sub.answers.length, 0);
    const gradedAnswers = allSubmissions.reduce((sum, sub) => 
      sum + sub.answers.filter(a => a.score !== null).length, 0
    );
    const answersWithFeedback = allSubmissions.reduce((sum, sub) => 
      sum + sub.answers.filter(a => a.feedback !== null).length, 0
    );

    console.log(`   Total Submissions: ${allSubmissions.length}`);
    console.log(`   Total Answers: ${totalAnswers}`);
    console.log(`   Graded Answers: ${gradedAnswers} (${Math.round(gradedAnswers/totalAnswers*100)}%)`);
    console.log(`   Answers with Feedback: ${answersWithFeedback} (${Math.round(answersWithFeedback/totalAnswers*100)}%)`);
    console.log(`   Passed Attempts: ${allSubmissions.filter(s => s.status === 'PASSED').length}`);
    console.log(`   Failed Attempts: ${allSubmissions.filter(s => s.status === 'FAILED').length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAllSubmissionsDisplay(); 