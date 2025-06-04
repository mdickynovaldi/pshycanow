const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('🔍 Checking database data...\n');

    // Check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    
    console.log('👥 Users in database:');
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    // Check quiz submissions
    const submissions = await prisma.quizSubmission.findMany({
      select: {
        id: true,
        quizId: true,
        studentId: true,
        attemptNumber: true,
        status: true,
        score: true,
        assistanceLevel: true,
        createdAt: true
      },
      take: 10
    });

    console.log('\n📝 Recent quiz submissions:');
    submissions.forEach(sub => {
      console.log(`  - Quiz: ${sub.quizId}, Student: ${sub.studentId}, Attempt: ${sub.attemptNumber}, Status: ${sub.status}, assistanceLevel: ${sub.assistanceLevel}`);
    });

    // Check quizzes
    const quizzes = await prisma.quiz.findMany({
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            submissions: true
          }
        }
      }
    });

    console.log('\n🎯 Quizzes:');
    quizzes.forEach(quiz => {
      console.log(`  - ${quiz.title} (${quiz.id}) - ${quiz._count.submissions} submissions`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
