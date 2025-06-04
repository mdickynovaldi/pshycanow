const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function quickTest() {
  try {
    console.log('🧪 Quick database test...\n');

    // Test connection
    const count = await prisma.user.count();
    console.log(`👤 Total users: ${count}`);

    const quizCount = await prisma.quiz.count();
    console.log(`🎯 Total quizzes: ${quizCount}`);

    const submissionCount = await prisma.quizSubmission.count();
    console.log(`📝 Total quiz submissions: ${submissionCount}`);

    // Get sample data
    if (submissionCount > 0) {
      const sampleSubmissions = await prisma.quizSubmission.findMany({
        take: 5,
        include: {
          quiz: { select: { title: true } },
          student: { select: { name: true } }
        }
      });

      console.log('\n📋 Sample submissions:');
      sampleSubmissions.forEach((sub, idx) => {
        console.log(`  ${idx + 1}. ${sub.student.name} - ${sub.quiz.title} - Attempt ${sub.attemptNumber} - assistanceLevel: ${sub.assistanceLevel}`);
      });
    }

    console.log('\n✅ Test completed');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickTest();
