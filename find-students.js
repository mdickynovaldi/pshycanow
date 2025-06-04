const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findStudents() {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { 
        id: true, 
        name: true, 
        email: true,
        _count: {
          select: {
            submissions: true
          }
        }
      }
    });
    
    console.log('All Students in Database:');
    console.log('─'.repeat(50));
    students.forEach(s => {
      console.log(`${s.name} (${s.id})`);
      console.log(`  Email: ${s.email}`);
      console.log(`  Submissions: ${s._count.submissions}`);
      console.log('');
    });
    
    // Check the correct student
    const student = await prisma.user.findFirst({
      where: {
        role: 'STUDENT',
        submissions: {
          some: {}
        }
      },
      include: {
        submissions: {
          include: {
            quiz: true,
            answers: true
          }
        }
      }
    });
    
    if (student) {
      console.log('\nStudent with submissions:');
      console.log(`Name: ${student.name}`);
      console.log(`ID: ${student.id}`);
      console.log(`Total submissions: ${student.submissions.length}`);
      
      student.submissions.forEach(sub => {
        console.log(`\n- ${sub.quiz.title} - Attempt ${sub.attemptNumber}`);
        console.log(`  Answers: ${sub.answers.length}`);
        console.log(`  Status: ${sub.status}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findStudents(); 