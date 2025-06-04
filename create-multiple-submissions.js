const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMultipleSubmissions() {
  console.log('🧪 Creating multiple submissions for testing...\n');

  try {
    // 1. Find a student and quiz
    const student = await prisma.user.findFirst({
      where: { role: 'STUDENT' }
    });
    
    const quiz = await prisma.quiz.findFirst({
      include: { 
        questions: {
          select: {
            id: true,
            text: true,
            expectedAnswer: true
          }
        }
      }
    });
    
    if (!student || !quiz || quiz.questions.length === 0) {
      console.log('❌ Missing test data (student/quiz/questions)');
      return;
    }

    console.log(`📌 Using Student: ${student.name} (${student.id})`);
    console.log(`📌 Using Quiz: ${quiz.title} (${quiz.id})`);
    console.log(`📌 Total Questions: ${quiz.questions.length}\n`);

    // 2. Check existing submissions
    const existingSubmissions = await prisma.quizSubmission.count({
      where: {
        studentId: student.id,
        quizId: quiz.id,
        assistanceLevel: null
      }
    });

    console.log(`Current submissions: ${existingSubmissions}\n`);

    // 3. Create 3 new submissions with different scenarios
    const newSubmissions = [];
    
    for (let i = 0; i < 3; i++) {
      const attemptNumber = existingSubmissions + i + 1;
      console.log(`Creating submission attempt ${attemptNumber}...`);
      
      // Different scenarios for each attempt
      const scenarios = [
        { status: 'FAILED', score: 30, desc: 'Poor performance - most answers wrong' },
        { status: 'FAILED', score: 60, desc: 'Better performance - some answers correct' },
        { status: 'PASSED', score: 85, desc: 'Good performance - most answers correct' }
      ];
      
      const scenario = scenarios[i];
      
      const submission = await prisma.quizSubmission.create({
        data: {
          studentId: student.id,
          quizId: quiz.id,
          attemptNumber: attemptNumber,
          status: scenario.status,
          score: scenario.score,
          assistanceLevel: null,
          feedback: `Percobaan ke-${attemptNumber}: ${scenario.desc}`
        }
      });
      
      newSubmissions.push(submission);
      console.log(`✅ Created submission ${submission.id} - ${scenario.desc}`);

      // Create answers for each question
      for (const [qIndex, question] of quiz.questions.entries()) {
        // Determine if answer is correct based on scenario
        let isCorrect = false;
        let answerText = '';
        
        if (i === 0) { // First attempt - mostly wrong
          isCorrect = qIndex === 0 && Boolean(question.expectedAnswer); // Only first answer correct if has expected
          answerText = isCorrect && question.expectedAnswer ? question.expectedAnswer : `Wrong answer ${qIndex + 1}`;
        } else if (i === 1) { // Second attempt - half correct
          isCorrect = qIndex < Math.floor(quiz.questions.length / 2) && Boolean(question.expectedAnswer);
          answerText = isCorrect && question.expectedAnswer ? question.expectedAnswer : `Partially wrong ${qIndex + 1}`;
        } else { // Third attempt - mostly correct
          isCorrect = Boolean(question.expectedAnswer);
          answerText = question.expectedAnswer || `Good attempt ${qIndex + 1}`;
        }
        
        await prisma.submissionAnswer.create({
          data: {
            submissionId: submission.id,
            questionId: question.id,
            answerText: answerText,
            isCorrect: isCorrect,
            score: null, // Teacher hasn't graded yet
            feedback: null // No teacher feedback yet
          }
        });
      }
      
      console.log(`   Added ${quiz.questions.length} answers\n`);
    }

    // 4. Display summary
    console.log('📊 Summary of created submissions:');
    
    const allSubmissions = await prisma.quizSubmission.findMany({
      where: {
        studentId: student.id,
        quizId: quiz.id,
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
        attemptNumber: 'asc'
      }
    });
    
    console.log(`Total submissions for this student-quiz pair: ${allSubmissions.length}\n`);
    
    allSubmissions.forEach(sub => {
      const correctAnswers = sub.answers.filter(a => a.isCorrect === true).length;
      const wrongAnswers = sub.answers.filter(a => a.isCorrect === false).length;
      const ungradedAnswers = sub.answers.filter(a => a.isCorrect === null).length;
      
      console.log(`📝 Attempt ${sub.attemptNumber}:`);
      console.log(`   Status: ${sub.status} ${sub.status === 'PASSED' ? '✅' : '❌'}`);
      console.log(`   Score: ${sub.score}%`);
      console.log(`   Answers: ${sub.answers.length} total`);
      console.log(`   - Correct: ${correctAnswers}`);
      console.log(`   - Wrong: ${wrongAnswers}`);
      console.log(`   - Not auto-corrected: ${ungradedAnswers}`);
      console.log(`   Teacher graded: ${sub.answers.filter(a => a.score !== null).length}`);
      console.log(`   Has feedback: ${sub.answers.filter(a => a.feedback !== null).length}\n`);
    });
    
    console.log('🔗 Test URLs:');
    console.log(`Teacher Assessment: http://localhost:3000/teacher/quizzes/${quiz.id}/students/${student.id}/submissions`);
    console.log(`Student History: http://localhost:3000/student/quizzes/${quiz.id}/history`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMultipleSubmissions(); 