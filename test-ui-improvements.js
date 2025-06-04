const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUIImprovements() {
  console.log('🎨 TESTING UI IMPROVEMENTS & SUBMISSION STATUS\n');
  console.log('==============================================\n');

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

    // 3. Create test scenarios with different status
    const scenarios = [
      {
        name: "Auto-Correct PASSED (80%)",
        attemptNumber: 1,
        autoCorrectPercentage: 80,
        teacherScore: null,
        expectedStatus: "PASSED"
      },
      {
        name: "Teacher Grade PASSED (75%)",
        attemptNumber: 2,
        autoCorrectPercentage: 60,
        teacherScore: 75,
        expectedStatus: "PASSED"
      },
      {
        name: "Both FAILED (<70%)",
        attemptNumber: 3,
        autoCorrectPercentage: 50,
        teacherScore: 60,
        expectedStatus: "FAILED"
      },
      {
        name: "PENDING (No teacher grade)",
        attemptNumber: 4,
        autoCorrectPercentage: 65,
        teacherScore: null,
        expectedStatus: "PENDING"
      }
    ];

    console.log('🎯 CREATING TEST SCENARIOS:');
    console.log('===========================');

    for (const scenario of scenarios) {
      console.log(`\n📋 ${scenario.name}`);
      
      // Create submission
      const submission = await prisma.quizSubmission.create({
        data: {
          studentId: student.id,
          quizId: quiz.id,
          status: 'PENDING',
          attemptNumber: scenario.attemptNumber,
          assistanceLevel: null
        }
      });

      // Create answers based on scenario
      const totalQuestions = quiz.questions.length;
      const autoCorrectCount = Math.ceil((scenario.autoCorrectPercentage / 100) * totalQuestions);
      
      for (let i = 0; i < totalQuestions; i++) {
        const question = quiz.questions[i];
        const isAutoCorrect = i < autoCorrectCount;
        
        const answerText = isAutoCorrect && question.expectedAnswer ? 
          question.expectedAnswer : 'wrong answer';
        
        await prisma.submissionAnswer.create({
          data: {
            submissionId: submission.id,
            questionId: question.id,
            answerText: answerText,
            isCorrect: isAutoCorrect,
            score: scenario.teacherScore,
            feedback: scenario.teacherScore ? 
              `Teacher feedback for ${scenario.name}` : null
          }
        });
      }

      // Calculate final status
      const autoCorrectPassed = scenario.autoCorrectPercentage >= 70;
      const teacherGradePassed = scenario.teacherScore && scenario.teacherScore >= 70;
      const finalPassed = autoCorrectPassed || teacherGradePassed;
      
      let finalStatus = 'PENDING';
      if (scenario.teacherScore !== null) {
        finalStatus = finalPassed ? 'PASSED' : 'FAILED';
      }

      // Update submission with calculated status
      await prisma.quizSubmission.update({
        where: { id: submission.id },
        data: {
          status: finalStatus,
          score: scenario.teacherScore || Math.round(scenario.autoCorrectPercentage),
          correctAnswers: autoCorrectCount,
          totalQuestions: totalQuestions,
          feedback: finalPassed ? 
            `🎉 LULUS! Auto: ${scenario.autoCorrectPercentage}%${scenario.teacherScore ? `, Teacher: ${scenario.teacherScore}%` : ''}` :
            `❌ Belum lulus. Auto: ${scenario.autoCorrectPercentage}%${scenario.teacherScore ? `, Teacher: ${scenario.teacherScore}%` : ''}`
        }
      });

      console.log(`   ✅ Created submission ${submission.id}`);
      console.log(`   📊 Auto-correct: ${scenario.autoCorrectPercentage}%`);
      console.log(`   👨‍🏫 Teacher score: ${scenario.teacherScore || 'No score'}%`);
      console.log(`   🎯 Final status: ${finalStatus}`);
    }

    // 4. Update student progress
    const latestSubmission = await prisma.quizSubmission.findFirst({
      where: {
        studentId: student.id,
        quizId: quiz.id,
        status: 'PASSED'
      },
      orderBy: { attemptNumber: 'asc' }
    });

    await prisma.studentQuizProgress.create({
      data: {
        studentId: student.id,
        quizId: quiz.id,
        currentAttempt: 4,
        lastAttemptPassed: latestSubmission ? true : false,
        finalStatus: latestSubmission ? 'PASSED' : null,
        failedAttempts: latestSubmission ? 0 : 3,
        level1Completed: false,
        level2Completed: false,
        level3Completed: false,
        lastSubmissionId: latestSubmission?.id || null
      }
    });

    // 5. Display results for UI testing
    console.log('\n📱 UI TEST DATA SUMMARY:');
    console.log('========================');
    
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
      const autoCorrectCount = sub.answers.filter(a => a.isCorrect === true).length;
      const autoCorrectPercentage = sub.answers.length > 0 ? 
        Math.round((autoCorrectCount / sub.answers.length) * 100) : 0;
      
      const hasTeacherScores = sub.answers.some(a => a.score !== null);
      const teacherScores = sub.answers.map(a => a.score || 0);
      const teacherTotalScore = teacherScores.reduce((sum, score) => sum + score, 0);
      const teacherMaxScore = 100 * sub.answers.length;
      const teacherPercentage = teacherMaxScore > 0 ? 
        Math.round((teacherTotalScore / teacherMaxScore) * 100) : 0;

      console.log(`\n${index + 1}. Attempt ${sub.attemptNumber} - Status: ${sub.status}`);
      console.log(`   🤖 Auto-correct: ${autoCorrectPercentage}% (${autoCorrectCount}/${sub.answers.length})`);
      console.log(`   👨‍🏫 Teacher grade: ${hasTeacherScores ? teacherPercentage + '%' : 'Not graded'}`);
      console.log(`   🎯 Final passed: ${sub.status === 'PASSED' ? 'YES' : 'NO'}`);
      
      // UI Badge color guide
      const badgeStyle = sub.status === "PASSED" ? "🟢 Green (LULUS)" :
                         sub.status === "FAILED" ? "🔴 Red (TIDAK LULUS)" :
                         "🟡 Orange (PENDING)";
      console.log(`   🏷️  UI Badge: ${badgeStyle}`);
    });

    console.log('\n🎨 UI TESTING GUIDE:');
    console.log('====================');
    console.log('1. 🌐 Visit teacher grading page:');
    console.log(`   /teacher/quizzes/${quiz.id}/students/${student.id}/submissions`);
    console.log('');
    console.log('2. ✅ Expected UI features:');
    console.log('   • Modern gradient background and cards');
    console.log('   • Clear status badges with icons (🎉 LULUS, ❌ TIDAK LULUS, ⏳ PENDING)');
    console.log('   • Auto-correct vs Teacher grade comparison');
    console.log('   • Passing grade 70% prominently displayed');
    console.log('   • Beautiful submission cards with proper spacing');
    console.log('   • Enhanced summary statistics');
    console.log('');
    console.log('3. 🔍 Test scenarios:');
    console.log('   • Check if auto-correct scores show correctly');
    console.log('   • Verify teacher grading functionality');
    console.log('   • Confirm status updates properly');
    console.log('   • Test responsive design on different screen sizes');

    console.log('\n✅ UI TEST DATA READY!');
    console.log('======================');
    console.log('Data telah disiapkan untuk testing UI improvements.');
    console.log('Silakan kunjungi halaman teacher grading untuk melihat perubahan UI.');

  } catch (error) {
    console.error('❌ Error during UI testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test
testUIImprovements().catch(console.error); 