import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Testing database connection...');
    
    const userCount = await prisma.user.count();
    console.log(`Found ${userCount} users`);
    
    const submissionCount = await prisma.quizSubmission.count();
    console.log(`Found ${submissionCount} quiz submissions`);
    
    // Get all submissions with details
    const submissions = await prisma.quizSubmission.findMany({
      include: {
        quiz: { select: { title: true } },
        student: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n📝 All submissions:');
    submissions.forEach((sub, idx) => {
      console.log(`${idx + 1}. ${sub.student.name} - ${sub.quiz.title}`);
      console.log(`   Attempt: ${sub.attemptNumber}, Status: ${sub.status}, assistanceLevel: ${sub.assistanceLevel}`);
      console.log(`   Created: ${sub.createdAt}`);
      console.log('');
    });
    
    // Test the specific query used in getStudentSubmissionHistory
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, name: true }
    });
    
    for (const student of students) {
      console.log(`\n🔍 Testing getStudentSubmissionHistory for ${student.name}:`);
      
      const quizzes = await prisma.quiz.findMany({ select: { id: true, title: true } });
      
      for (const quiz of quizzes) {
        const studentSubmissions = await prisma.quizSubmission.findMany({
          where: {
            quizId: quiz.id,
            studentId: student.id,
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
        
        if (studentSubmissions.length > 0) {
          console.log(`  Quiz "${quiz.title}": ${studentSubmissions.length} main quiz submissions`);
          studentSubmissions.forEach((sub, idx) => {
            console.log(`    ${idx + 1}. Attempt ${sub.attemptNumber}, Status: ${sub.status}, Score: ${sub.score}%`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
