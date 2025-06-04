const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestSubmissions() {
  console.log('🧪 Creating test submissions...\n');

  try {
    const studentId = 'cmbdmhftu0000og14w68cd7si'; // Aldi
    const quizId = 'cmas2h35k0006ogtx87895ex3'; // Test Biology
    
    // Get quiz questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true }
    });
    
    if (!quiz) {
      console.log('Quiz not found!');
      return;
    }
    
    console.log(`Quiz: ${quiz.title}`);
    console.log(`Questions: ${quiz.questions.length}`);
    
    // Create 2 more submissions (attempt 1 and 2)
    for (let attempt = 1; attempt <= 2; attempt++) {
      console.log(`\nCreating submission attempt ${attempt}...`);
      
      // Create submission
      const submission = await prisma.quizSubmission.create({
        data: {
          studentId: studentId,
          quizId: quizId,
          attemptNumber: attempt,
          status: 'FAILED',
          score: attempt === 1 ? 33 : 66,
          assistanceLevel: null,
          feedback: `Test submission for attempt ${attempt}`
        }
      });
      
      console.log(`Created submission: ${submission.id}`);
      
      // Create answers for each question
      for (const [index, question] of quiz.questions.entries()) {
        const isCorrect = attempt === 2 && index < 2; // In attempt 2, first 2 answers are correct
        
        const answer = await prisma.submissionAnswer.create({
          data: {
            submissionId: submission.id,
            questionId: question.id,
            answerText: isCorrect && question.expectedAnswer ? question.expectedAnswer : `Wrong answer ${index + 1}`,
            isCorrect: isCorrect,
            score: null,
            feedback: null
          }
        });
        
        console.log(`  Created answer for question ${index + 1}: ${isCorrect ? '✅' : '❌'}`);
      }
    }
    
    // Display all submissions
    console.log('\n\n📊 All submissions for this student:');
    console.log('─'.repeat(50));
    
    const allSubmissions = await prisma.quizSubmission.findMany({
      where: {
        studentId: studentId,
        quizId: quizId,
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
    
    allSubmissions.forEach(sub => {
      console.log(`\nAttempt ${sub.attemptNumber}:`);
      console.log(`  Status: ${sub.status}`);
      console.log(`  Score: ${sub.score}%`);
      console.log(`  Answers: ${sub.answers.length}`);
      
      sub.answers.forEach((ans, i) => {
        console.log(`    ${i + 1}. ${ans.question.text}`);
        console.log(`       Answer: "${ans.answerText}"`);
        console.log(`       Correct: ${ans.isCorrect ? '✅' : '❌'}`);
        console.log(`       Score: ${ans.score || 'Not graded'}`);
        console.log(`       Feedback: ${ans.feedback || 'No feedback'}`);
      });
    });
    
    console.log('\n\n🔗 Teacher URL:');
    console.log(`http://localhost:3000/teacher/quizzes/${quizId}/students/${studentId}/submissions`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSubmissions(); 