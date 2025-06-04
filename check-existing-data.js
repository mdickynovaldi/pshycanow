const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('Checking existing data...\n');
    
    // Check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    console.log('Users:', users.length);
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role}`);
    });
    
    // Check quizzes
    const quizzes = await prisma.quiz.findMany({
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            questions: true
          }
        }
      }
    });
    console.log('\nQuizzes:', quizzes.length);
    quizzes.forEach(quiz => {
      console.log(`- ${quiz.title} (${quiz._count.questions} questions)`);
    });
    
    // Check quiz submissions  
    const submissions = await prisma.quizSubmission.findMany({
      select: {
        id: true,
        attemptNumber: true,
        isCompleted: true,
        user: {
          select: {
            name: true
          }
        },
        quiz: {
          select: {
            title: true
          }
        }
      }
    });
    console.log('\nQuiz Submissions:', submissions.length);
    submissions.forEach(sub => {
      console.log(`- ${sub.user.name} - ${sub.quiz.title} (Attempt ${sub.attemptNumber}) - ${sub.isCompleted ? 'Completed' : 'Pending'}`);
    });
    
  } catch (error) {
    console.error('Error checking data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
