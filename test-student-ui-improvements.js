const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testStudentUIImprovements() {
  console.log('🎨 TESTING STUDENT UI IMPROVEMENTS & SUBMISSION STATUS\n');
  console.log('===================================================\n');

  try {
    // 1. Ambil data untuk testing
    const quiz = await prisma.quiz.findFirst({
      include: {
        questions: true,
        class: {
          include: {
            teacher: true
          }
        }
      }
    });

    const student = await prisma.user.findFirst({
      where: { role: 'STUDENT' }
    });

    if (!quiz || !student || quiz.questions.length === 0) {
      console.log('❌ Data test tidak lengkap');
      return;
    }

    console.log(`📝 Testing Quiz: ${quiz.title}`);
    console.log(`👤 Student: ${student.name}`);
    console.log(`👨‍🏫 Teacher: ${quiz.class?.teacher?.name || 'Unknown'}`);
    console.log(`❓ Questions: ${quiz.questions.length}\n`);

    // 2. Clear existing data
    await prisma.submissionAnswer.deleteMany({
      where: {
        submission: {
          studentId: student.id,
          quizId: quiz.id
        }
      }
    });

    await prisma.quizSubmission.deleteMany({
      where: {
        studentId: student.id,
        quizId: quiz.id
      }
    });

    await prisma.studentQuizProgress.deleteMany({
      where: {
        studentId: student.id,
        quizId: quiz.id
      }
    });

    console.log('🧹 Cleared test data\n');

    // 3. Create test scenarios with different UI status
    const scenarios = [
      {
        name: "PASSED - Auto-correct 100%",
        scorePercent: 100,
        expectedStatus: "PASSED",
        statusType: "auto_passed"
      },
      {
        name: "PASSED - Passing Grade 75%", 
        scorePercent: 75,
        expectedStatus: "PASSED", 
        statusType: "grade_passed"
      },
      {
        name: "PENDING - Borderline 70%",
        scorePercent: 70,
        expectedStatus: "PENDING",
        statusType: "borderline_passed"
      },
      {
        name: "PENDING - Below Grade 60%",
        scorePercent: 60,
        expectedStatus: "PENDING",
        statusType: "below_grade"
      }
    ];

    console.log('🎯 CREATING STUDENT UI TEST SCENARIOS:');
    console.log('=====================================');

    for (const [index, scenario] of scenarios.entries()) {
      console.log(`\n📋 ${scenario.name}`);
      
      // Create submission
      const submission = await prisma.quizSubmission.create({
        data: {
          studentId: student.id,
          quizId: quiz.id,
          status: 'PENDING',
          attemptNumber: index + 1,
          assistanceLevel: null
        }
      });

      // Create answers based on scenario
      const totalQuestions = quiz.questions.length;
      const correctCount = Math.ceil((scenario.scorePercent / 100) * totalQuestions);
      
      for (let i = 0; i < totalQuestions; i++) {
        const question = quiz.questions[i];
        const isCorrect = i < correctCount;
        
        const answerText = isCorrect && question.expectedAnswer ? 
          question.expectedAnswer : 'wrong answer';
        
        await prisma.submissionAnswer.create({
          data: {
            submissionId: submission.id,
            questionId: question.id,
            answerText: answerText,
            isCorrect: isCorrect,
            score: null, // No teacher grading yet
            feedback: null
          }
        });
      }

      // Calculate status based on passing grade 70%
      const actuallyPassed = scenario.scorePercent >= 70;
      let finalStatus = 'PENDING';
      
      // Only auto-mark as PASSED if score is clearly above 70%
      if (scenario.statusType === "auto_passed") {
        finalStatus = 'PASSED';
      }

      // Update submission with calculated status
      await prisma.quizSubmission.update({
        where: { id: submission.id },
        data: {
          status: finalStatus,
          score: scenario.scorePercent,
          correctAnswers: correctCount,
          totalQuestions: totalQuestions,
          feedback: actuallyPassed ? 
            `🎉 Lulus! Skor ${scenario.scorePercent}% mencapai passing grade` :
            `📝 Skor ${scenario.scorePercent}% belum mencapai passing grade 70%`
        }
      });

      console.log(`   ✅ Created submission ${submission.id}`);
      console.log(`   📊 Score: ${scenario.scorePercent}%`);
      console.log(`   🎯 Expected UI Status: ${actuallyPassed ? 'LULUS' : 'BELUM LULUS'}`);
      console.log(`   📋 DB Status: ${finalStatus}`);
    }

    // 4. Create student progress
    const latestSubmission = await prisma.quizSubmission.findFirst({
      where: {
        studentId: student.id,
        quizId: quiz.id
      },
      orderBy: { attemptNumber: 'desc' }
    });

    await prisma.studentQuizProgress.create({
      data: {
        studentId: student.id,
        quizId: quiz.id,
        currentAttempt: scenarios.length,
        lastAttemptPassed: false,
        finalStatus: null, // Still can continue
        failedAttempts: scenarios.length - 1, // All but the passed one
        level1Completed: false,
        level2Completed: false,
        level3Completed: false,
        lastSubmissionId: latestSubmission?.id || null
      }
    });

    // 5. Display UI testing results
    console.log('\n🎨 STUDENT UI TEST SUMMARY:');
    console.log('===========================');
    
    const submissions = await prisma.quizSubmission.findMany({
      where: {
        studentId: student.id,
        quizId: quiz.id
      },
      include: {
        answers: {
          include: {
            question: true
          }
        }
      },
      orderBy: { attemptNumber: 'desc' }
    });

    submissions.forEach((sub, index) => {
      const correctAnswers = sub.answers.filter(a => a.isCorrect === true).length;
      const totalQuestions = sub.answers.length;
      const scorePercent = totalQuestions > 0 ? 
        Math.round((correctAnswers / totalQuestions) * 100) : 0;
      
      const actuallyPassed = scorePercent >= 70;

      console.log(`\n${index + 1}. Attempt ${sub.attemptNumber} - DB Status: ${sub.status}`);
      console.log(`   📊 Score: ${scorePercent}% (${correctAnswers}/${totalQuestions})`);
      console.log(`   🎯 UI Should Show: ${actuallyPassed ? '✅ LULUS' : '❌ BELUM LULUS'}`);
      console.log(`   💡 Passing Grade Logic: ${scorePercent >= 70 ? 'PASSED' : 'FAILED'} (≥70%)`);
      
      // UI Badge style guide
      const badgeStyle = actuallyPassed ? 
        "🟢 Green Badge (LULUS)" : 
        "🟡 Orange Badge (BELUM LULUS)";
      console.log(`   🏷️  Expected UI Badge: ${badgeStyle}`);
    });

    console.log('\n🎨 STUDENT UI TESTING GUIDE:');
    console.log('============================');
    console.log('1. 🌐 Visit student quiz page:');
    console.log(`   /student/quizzes/${quiz.id}`);
    console.log('');
    console.log('2. ✅ Expected UI improvements:');
    console.log('   • Modern gradient background and cards');
    console.log('   • Clear status indicators with icons');
    console.log('   • Passing grade 70% prominently displayed');
    console.log('   • Enhanced informational cards with stats');
    console.log('   • Beautiful alert messages with gradients');
    console.log('   • Consistent color scheme (green=pass, orange=pending, red=fail)');
    console.log('');
    console.log('3. 🔍 Key test scenarios:');
    console.log('   • Check if 100% score shows as LULUS');
    console.log('   • Check if 75% score shows as LULUS');  
    console.log('   • Check if 70% score shows as LULUS (borderline)');
    console.log('   • Check if 60% score shows as BELUM LULUS');
    console.log('   • Verify status calculations use 70% threshold');
    console.log('   • Test responsive design on mobile');
    console.log('');
    console.log('4. 🎯 UI Status Logic:');
    console.log('   • Score ≥ 70% = ✅ LULUS (Green)');
    console.log('   • Score < 70% = ❌ BELUM LULUS (Orange/Red)');
    console.log('   • Clear feedback about passing grade');
    console.log('   • Modern cards with proper spacing');

    console.log('\n✅ STUDENT UI TEST DATA READY!');
    console.log('===============================');
    console.log('Data telah disiapkan untuk testing UI improvements di halaman student.');
    console.log('Silakan kunjungi halaman student quiz untuk melihat perubahan UI.');

  } catch (error) {
    console.error('❌ Error during student UI testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test
testStudentUIImprovements().catch(console.error); 