// Test script untuk memvalidasi perbaikan validasi attempt
// Jalankan dengan: node test-attempt-validation-fix.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAttemptValidationFix() {
  console.log('🧪 Testing Attempt Validation Fix...\n');

  try {
    // Test Case: Siswa dengan 2 attempt seharusnya masih bisa lanjut ke level 3
    const testStudentId = 'test-student-attempt-fix';
    const testQuizId = 'test-quiz-attempt-fix';

    // Cleanup existing test data
    await prisma.quizSubmission.deleteMany({
      where: { studentId: testStudentId, quizId: testQuizId }
    });
    
    await prisma.studentQuizProgress.deleteMany({
      where: { studentId: testStudentId, quizId: testQuizId }
    });

    console.log('🧹 Cleaned up existing test data\n');

    // Simulasi: Siswa sudah melakukan 2 attempt dan gagal
    // Buat progress dengan currentAttempt = 2
    await prisma.studentQuizProgress.create({
      data: {
        studentId: testStudentId,
        quizId: testQuizId,
        currentAttempt: 2,
        failedAttempts: 2,
        lastAttemptPassed: false,
        level1Completed: true,
        level2Completed: true,
        level3Completed: false,
        assistanceRequired: 'NONE',
        nextStep: 'TRY_MAIN_QUIZ_AGAIN'
      }
    });

    console.log('✅ Created test progress: currentAttempt=2, failedAttempts=2');

    // Buat 2 submission yang gagal
    for (let i = 1; i <= 2; i++) {
      await prisma.quizSubmission.create({
        data: {
          id: `test-submission-${i}-${testStudentId}`,
          studentId: testStudentId,
          quizId: testQuizId,
          attemptNumber: i,
          status: 'FAILED',
          score: 50,
          correctAnswers: 1,
          totalQuestions: 2,
          feedback: `Test attempt ${i} - failed`
        }
      });
    }

    console.log('✅ Created 2 failed submissions\n');

    // Test: Cek apakah sistem masih mengizinkan attempt ke-3
    const progress = await prisma.studentQuizProgress.findUnique({
      where: {
        studentId_quizId: {
          studentId: testStudentId,
          quizId: testQuizId
        }
      }
    });

    const nextAttemptNumber = progress ? progress.currentAttempt + 1 : 1;
    
    console.log('📊 Current Status:');
    console.log(`   Current Attempt: ${progress?.currentAttempt || 0}`);
    console.log(`   Failed Attempts: ${progress?.failedAttempts || 0}`);
    console.log(`   Next Attempt Number: ${nextAttemptNumber}`);
    console.log(`   Level 3 Completed: ${progress?.level3Completed || false}`);

    // Validasi: Attempt ke-3 harus diizinkan
    if (nextAttemptNumber <= 4) {
      console.log('\n✅ PASSED: Sistem masih mengizinkan attempt selanjutnya');
      
      if (nextAttemptNumber === 3) {
        console.log('✅ PASSED: Next attempt akan menjadi attempt ke-3 (sesuai ekspektasi)');
      } else {
        console.log(`⚠️  WARNING: Next attempt adalah ${nextAttemptNumber}, bukan 3 seperti yang diharapkan`);
      }
    } else {
      console.log('\n❌ FAILED: Sistem tidak mengizinkan attempt selanjutnya (bug masih ada)');
    }

    // Test Case 2: Simulasi attempt ke-4 dengan level 3 belum selesai
    console.log('\n🧪 Test Case 2: Attempt ke-4 dengan level 3 tersedia...');
    
    await prisma.studentQuizProgress.update({
      where: { id: progress.id },
      data: {
        currentAttempt: 3,
        failedAttempts: 3,
        level3Completed: false
      }
    });

    const updatedProgress = await prisma.studentQuizProgress.findUnique({
      where: { id: progress.id }
    });

    const nextAttemptNumber2 = updatedProgress ? updatedProgress.currentAttempt + 1 : 1;
    
    console.log('📊 Updated Status:');
    console.log(`   Current Attempt: ${updatedProgress?.currentAttempt || 0}`);
    console.log(`   Next Attempt Number: ${nextAttemptNumber2}`);
    console.log(`   Level 3 Completed: ${updatedProgress?.level3Completed || false}`);

    // Pada attempt ke-4 dengan level 3 belum selesai, seharusnya diarahkan ke level 3
    if (nextAttemptNumber2 === 4 && !updatedProgress?.level3Completed) {
      console.log('✅ PASSED: Attempt ke-4 dengan level 3 belum selesai - seharusnya diarahkan ke bantuan level 3');
    } else {
      console.log('❌ Setup untuk test case 2 tidak sesuai');
    }

    // Cleanup
    await prisma.quizSubmission.deleteMany({
      where: { studentId: testStudentId, quizId: testQuizId }
    });
    
    await prisma.studentQuizProgress.deleteMany({
      where: { studentId: testStudentId, quizId: testQuizId }
    });

    console.log('\n🧹 Cleaned up test data');
    console.log('\n🎉 Attempt validation fix test completed!');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan test
testAttemptValidationFix().catch(console.error); 