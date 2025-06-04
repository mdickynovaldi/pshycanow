const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function reEvaluateExistingSubmissions() {
  console.log('🔄 RE-EVALUASI KOREKSI OTOMATIS UNTUK SUBMISSION YANG ADA\n');
  console.log('========================================================\n');

  try {
    // 1. Ambil semua submission yang perlu di-re-evaluasi
    const submissions = await prisma.quizSubmission.findMany({
      where: {
        assistanceLevel: null // Hanya kuis utama
      },
      include: {
        answers: {
          include: {
            question: true
          }
        },
        student: {
          select: { name: true }
        },
        quiz: {
          select: { title: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Ambil 10 submission terbaru untuk testing
    });

    console.log(`🔍 Ditemukan ${submissions.length} submission untuk di-evaluasi\n`);

    let updatedSubmissions = 0;
    let updatedAnswers = 0;

    // 2. Proses setiap submission
    for (const submission of submissions) {
      console.log(`📝 Processing Submission: ${submission.id}`);
      console.log(`   Quiz: ${submission.quiz?.title}`);
      console.log(`   Student: ${submission.student?.name}`);
      console.log(`   Status: ${submission.status}`);
      console.log(`   Answers: ${submission.answers.length}`);

      let submissionChanged = false;
      let correctCount = 0;
      const totalQuestions = submission.answers.length;

      // 3. Re-evaluasi setiap jawaban
      for (const answer of submission.answers) {
        const question = answer.question;
        let newIsCorrect = null;

        // Lakukan koreksi otomatis jika ada expectedAnswer
        if (question && question.expectedAnswer && question.expectedAnswer.trim() !== "") {
          newIsCorrect = question.expectedAnswer.trim().toLowerCase() === answer.answerText.trim().toLowerCase();
          
          if (newIsCorrect) {
            correctCount++;
          }

          // Update jika berbeda dari nilai sebelumnya
          if (answer.isCorrect !== newIsCorrect) {
            console.log(`   📝 Answer ${question.id}:`);
            console.log(`      Question: "${question.text}"`);
            console.log(`      Student Answer: "${answer.answerText}"`);
            console.log(`      Expected: "${question.expectedAnswer}"`);
            console.log(`      Old isCorrect: ${answer.isCorrect}`);
            console.log(`      New isCorrect: ${newIsCorrect}`);

            try {
              await prisma.submissionAnswer.update({
                where: { id: answer.id },
                data: { isCorrect: newIsCorrect }
              });

              console.log(`      ✅ Updated successfully`);
              updatedAnswers++;
              submissionChanged = true;
            } catch (error) {
              console.error(`      ❌ Error updating answer: ${error}`);
            }
          }
        } else {
          console.log(`   ⚠️  Question "${question?.text}" tidak memiliki expectedAnswer`);
        }
      }

      // 4. Update submission score dan status jika perlu
      if (submissionChanged) {
        const newScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
        const allCorrect = correctCount === totalQuestions;
        
        // Update submission jika masih PENDING (belum dinilai guru)
        if (submission.status === 'PENDING') {
          try {
            await prisma.quizSubmission.update({
              where: { id: submission.id },
              data: {
                score: newScore,
                correctAnswers: correctCount,
                totalQuestions: totalQuestions
                // Note: Tidak mengubah status karena guru belum menilai
              }
            });

            console.log(`   📊 Updated submission stats: Score=${newScore}%, Correct=${correctCount}/${totalQuestions}`);
            updatedSubmissions++;
          } catch (error) {
            console.error(`   ❌ Error updating submission: ${error}`);
          }
        }
      }

      console.log('');
    }

    // 5. Summary
    console.log('📊 HASIL RE-EVALUASI:');
    console.log('====================');
    console.log(`✅ ${updatedSubmissions} submission diperbarui`);
    console.log(`✅ ${updatedAnswers} jawaban dikoreksi ulang`);
    console.log('');

    // 6. Test dengan submission terbaru
    console.log('🧪 TEST HASIL PERBAIKAN:');
    console.log('========================');
    
    const latestSubmission = await prisma.quizSubmission.findFirst({
      include: {
        answers: {
          include: {
            question: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (latestSubmission) {
      console.log('Hasil koreksi otomatis submission terbaru:');
      latestSubmission.answers.forEach((answer, index) => {
        const hasExpected = answer.question?.expectedAnswer && answer.question.expectedAnswer.trim() !== "";
        console.log(`   ${index + 1}. "${answer.question?.text}"`);
        console.log(`      Expected: "${answer.question?.expectedAnswer || 'TIDAK ADA'}"`);
        console.log(`      Student: "${answer.answerText}"`);
        console.log(`      isCorrect: ${answer.isCorrect !== null ? (answer.isCorrect ? 'TRUE' : 'FALSE') : 'NULL'}`);
        console.log(`      Auto-correctable: ${hasExpected ? '✅ Ya' : '❌ Tidak'}`);
        console.log('');
      });
    }

    // 7. Panduan untuk submission baru
    console.log('💡 UNTUK SUBMISSION BARU:');
    console.log('=========================');
    console.log('Submission yang dibuat SETELAH perbaikan expectedAnswer');
    console.log('akan otomatis terkoreksi dengan benar saat siswa submit.');
    console.log('');
    console.log('Untuk menguji:');
    console.log('1. Suruh siswa mengerjakan kuis lagi');
    console.log('2. Cek apakah koreksi otomatis berfungsi untuk semua soal');
    console.log('3. Guru akan melihat hasil koreksi otomatis di halaman penilaian');

  } catch (error) {
    console.error('❌ Error during re-evaluation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan re-evaluasi
reEvaluateExistingSubmissions().catch(console.error); 