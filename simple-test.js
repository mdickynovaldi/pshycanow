const { PrismaClient } = require('@prisma/client');

async function simpleTest() {
  const prisma = new PrismaClient();
  
  try {
    const userCount = await prisma.user.count();
    console.log('Total users:', userCount);
    
    const quizCount = await prisma.quiz.count();
    console.log('Total quizzes:', quizCount);
    
    const submissionCount = await prisma.quizSubmission.count();
    console.log('Total quiz submissions:', submissionCount);
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

simpleTest();
