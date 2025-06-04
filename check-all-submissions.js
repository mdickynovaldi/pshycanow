const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllSubmissions() {
  console.log('🔍 Checking ALL submissions in database...\n');
  
  try {
    // Get all submissions
    const allSubmissions = await prisma.quizSubmission.findMany({
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        quiz: {
          select: {
            id: true,
            title: true
          }
        },
        answers: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Last 10 submissions
    });
    
    console.log(`Total submissions found: ${allSubmissions.length}`);
    console.log('═'.repeat(80));
    
    allSubmissions.forEach((sub, i) => {
      console.log(`\n${i + 1}. Submission:`);
      console.log(`   ID: ${sub.id}`);
      console.log(`   Student: ${sub.student.name} (${sub.student.id})`);
      console.log(`   Quiz: ${sub.quiz.title} (${sub.quiz.id})`);
      console.log(`   Attempt: ${sub.attemptNumber}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Score: ${sub.score}%`);
      console.log(`   Assistance Level: ${sub.assistanceLevel || 'Main Quiz'}`);
      console.log(`   Created: ${sub.createdAt}`);
      console.log(`   Number of answers: ${sub.answers.length} ${sub.answers.length === 0 ? '❌ NO ANSWERS!' : '✅'}`);
      console.log(`   Has submittedAnswers JSON: ${sub.submittedAnswers ? 'YES' : 'NO'}`);
      
      if (sub.answers.length === 0 && sub.submittedAnswers) {
        console.log(`   ⚠️  WARNING: Has JSON data but no answer records!`);
        console.log(`   JSON data: ${JSON.stringify(sub.submittedAnswers).substring(0, 100)}...`);
      }
    });
    
    // Check for main quiz submissions without answers
    console.log('\n\n🔍 Checking main quiz submissions without answers...');
    
    const submissionsWithoutAnswers = await prisma.quizSubmission.findMany({
      where: {
        assistanceLevel: null,
        answers: {
          none: {}
        }
      },
      include: {
        student: {
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
    
    console.log(`\nFound ${submissionsWithoutAnswers.length} main quiz submissions without answers:`);
    
    submissionsWithoutAnswers.forEach(sub => {
      console.log(`\n- ${sub.student.name} - ${sub.quiz.title} - Attempt ${sub.attemptNumber}`);
      console.log(`  ID: ${sub.id}`);
      console.log(`  Status: ${sub.status}`);
      console.log(`  Has JSON: ${sub.submittedAnswers ? 'YES' : 'NO'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllSubmissions(); 