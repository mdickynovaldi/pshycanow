const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugKoreksiOtomatis() {
  console.log('🔍 DEBUG KOREKSI OTOMATIS - SOAL NOMOR 3 KE ATAS\n');
  console.log('=================================================\n');

  try {
    // 1. Ambil quiz dan questions
    const quiz = await prisma.quiz.findFirst({
      include: {
        questions: {
          orderBy: {
            createdAt: 'asc' // Urutkan berdasarkan waktu dibuat
          }
        }
      }
    });

    if (!quiz) {
      console.log('❌ Tidak ada quiz ditemukan');
      return;
    }

    console.log(`📝 Quiz: ${quiz.title}`);
    console.log(`❓ Total Questions: ${quiz.questions.length}\n`);

    // 2. Detail setiap pertanyaan
    console.log('📋 DETAIL SEMUA PERTANYAAN:');
    console.log('==========================');
    quiz.questions.forEach((question, index) => {
      console.log(`${index + 1}. Question ID: ${question.id}`);
      console.log(`   Text: ${question.text}`);
      console.log(`   Expected Answer: "${question.expectedAnswer || 'TIDAK ADA'}"`);
      console.log(`   Created: ${question.createdAt.toLocaleString()}`);
      console.log('');
    });

    // 3. Ambil submission terbaru dengan answers
    const latestSubmission = await prisma.quizSubmission.findFirst({
      include: {
        answers: {
          include: {
            question: true
          }
        },
        student: {
          select: { name: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!latestSubmission) {
      console.log('⚠️  Tidak ada submission ditemukan untuk dianalisis');
      return;
    }

    console.log('📊 ANALISIS SUBMISSION TERBARU:');
    console.log('==============================');
    console.log(`Submission ID: ${latestSubmission.id}`);
    console.log(`Student: ${latestSubmission.student?.name || 'Unknown'}`);
    console.log(`Status: ${latestSubmission.status}`);
    console.log(`Attempt: ${latestSubmission.attemptNumber}`);
    console.log(`Created: ${latestSubmission.createdAt.toLocaleString()}`);
    console.log(`Total Answers: ${latestSubmission.answers.length}\n`);

    // 4. Analisis per jawaban dengan fokus pada masalah koreksi
    console.log('🔍 DETAIL KOREKSI PER JAWABAN:');
    console.log('==============================');
    
    latestSubmission.answers.forEach((answer, index) => {
      const questionNumber = index + 1;
      const question = answer.question;
      
      console.log(`${questionNumber}. SOAL NOMOR ${questionNumber}:`);
      console.log(`   Question ID: ${answer.questionId}`);
      console.log(`   Question Text: ${question?.text || 'TIDAK DITEMUKAN'}`);
      console.log(`   Expected Answer: "${question?.expectedAnswer || 'TIDAK ADA'}"`);
      console.log(`   Student Answer: "${answer.answerText}"`);
      console.log(`   isCorrect: ${answer.isCorrect !== null ? (answer.isCorrect ? 'TRUE' : 'FALSE') : 'NULL'}`);
      console.log(`   Score: ${answer.score || 'Belum dinilai'}`);
      
      // Simulasi koreksi otomatis manual
      let shouldBeCorrect = null;
      if (question?.expectedAnswer && question.expectedAnswer.trim() !== "") {
        shouldBeCorrect = question.expectedAnswer.trim().toLowerCase() === answer.answerText.trim().toLowerCase();
      }
      
      console.log(`   Manual Check: ${shouldBeCorrect !== null ? (shouldBeCorrect ? 'SHOULD BE TRUE' : 'SHOULD BE FALSE') : 'CANNOT CHECK'}`);
      
      // Identifikasi masalah
      if (questionNumber >= 3) {
        if (answer.isCorrect === null && question?.expectedAnswer) {
          console.log(`   ❌ MASALAH: Soal ${questionNumber} tidak terkoreksi otomatis meskipun ada expectedAnswer`);
        } else if (answer.isCorrect !== shouldBeCorrect && shouldBeCorrect !== null) {
          console.log(`   ❌ MASALAH: Koreksi otomatis salah untuk soal ${questionNumber}`);
        } else if (answer.isCorrect !== null) {
          console.log(`   ✅ OK: Soal ${questionNumber} terkoreksi dengan benar`);
        }
      }
      
      console.log('');
    });

    // 5. Analisis khusus soal nomor 3 ke atas
    const problematicAnswers = latestSubmission.answers.filter((answer, index) => {
      const questionNumber = index + 1;
      return questionNumber >= 3 && (answer.isCorrect === null && answer.question?.expectedAnswer);
    });

    if (problematicAnswers.length > 0) {
      console.log('🚨 SOAL BERMASALAH (NOMOR 3 KE ATAS):');
      console.log('===================================');
      problematicAnswers.forEach((answer, index) => {
        const questionNumber = latestSubmission.answers.findIndex(a => a.id === answer.id) + 1;
        console.log(`${index + 1}. Soal nomor ${questionNumber}`);
        console.log(`   ID: ${answer.id}`);
        console.log(`   Question ID: ${answer.questionId}`);
        console.log(`   Expected Answer: "${answer.question?.expectedAnswer}"`);
        console.log(`   Student Answer: "${answer.answerText}"`);
        console.log(`   isCorrect: ${answer.isCorrect}`);
        console.log('');
      });
    } else {
      console.log('✅ Tidak ada masalah koreksi otomatis ditemukan pada soal nomor 3 ke atas');
    }

    // 6. Cek konsistensi antara questions dan answers
    console.log('🔍 ANALISIS KONSISTENSI:');
    console.log('=======================');
    
    const questionIds = quiz.questions.map(q => q.id);
    const answerQuestionIds = latestSubmission.answers.map(a => a.questionId);
    
    console.log(`Question IDs dari Quiz: [${questionIds.join(', ')}]`);
    console.log(`Question IDs dari Answers: [${answerQuestionIds.join(', ')}]`);
    
    const missingQuestions = questionIds.filter(id => !answerQuestionIds.includes(id));
    const extraAnswers = answerQuestionIds.filter(id => !questionIds.includes(id));
    
    if (missingQuestions.length > 0) {
      console.log(`❌ Pertanyaan tidak dijawab: ${missingQuestions.join(', ')}`);
    }
    
    if (extraAnswers.length > 0) {
      console.log(`❌ Jawaban untuk pertanyaan yang tidak ada: ${extraAnswers.join(', ')}`);
    }
    
    if (missingQuestions.length === 0 && extraAnswers.length === 0) {
      console.log('✅ Konsistensi antara questions dan answers OK');
    }

    // 7. Cek urutan pertanyaan
    console.log('\n🔍 ANALISIS URUTAN:');
    console.log('==================');
    
    const isOrderCorrect = answerQuestionIds.every((questionId, index) => {
      return questionId === questionIds[index];
    });
    
    console.log(`Urutan questions sama dengan urutan answers: ${isOrderCorrect ? '✅ Ya' : '❌ Tidak'}`);
    
    if (!isOrderCorrect) {
      console.log('❌ KEMUNGKINAN MASALAH: Urutan pertanyaan tidak konsisten');
      console.log('   Ini bisa menyebabkan masalah koreksi otomatis');
    }

    // 8. Rekomendasi
    console.log('\n💡 REKOMENDASI:');
    console.log('===============');
    
    if (problematicAnswers.length > 0) {
      console.log('1. Ada masalah koreksi otomatis pada soal nomor 3 ke atas');
      console.log('2. Periksa logic koreksi otomatis di API submission');
      console.log('3. Pastikan loop for jawaban tidak ada break yang tidak diinginkan');
      console.log('4. Cek apakah ada masalah dengan ID matching');
    } else {
      console.log('1. Koreksi otomatis berfungsi dengan baik');
      console.log('2. Masalah mungkin di tampilan frontend');
      console.log('3. Cek halaman guru untuk memastikan data ditampilkan dengan benar');
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan debug
debugKoreksiOtomatis().catch(console.error); 