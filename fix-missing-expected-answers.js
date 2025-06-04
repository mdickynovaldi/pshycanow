const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixMissingExpectedAnswers() {
  console.log('🛠️ PERBAIKAN: MENAMBAHKAN EXPECTED ANSWERS YANG HILANG\n');
  console.log('=====================================================\n');

  try {
    // 1. Cari semua pertanyaan yang tidak memiliki expectedAnswer
    const questionsWithoutAnswer = await prisma.question.findMany({
      where: {
        OR: [
          { expectedAnswer: null },
          { expectedAnswer: "" },
          { expectedAnswer: { equals: null } }
        ]
      },
      include: {
        quiz: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    console.log(`🔍 Ditemukan ${questionsWithoutAnswer.length} pertanyaan tanpa expectedAnswer:\n`);

    if (questionsWithoutAnswer.length === 0) {
      console.log('✅ Semua pertanyaan sudah memiliki expectedAnswer');
      return;
    }

    // 2. Tampilkan pertanyaan yang bermasalah
    questionsWithoutAnswer.forEach((question, index) => {
      console.log(`${index + 1}. Quiz: ${question.quiz?.title}`);
      console.log(`   Question ID: ${question.id}`);
      console.log(`   Text: "${question.text}"`);
      console.log(`   Expected Answer: ${question.expectedAnswer || 'TIDAK ADA'}`);
      console.log('');
    });

    // 3. Berikan contoh expectedAnswer berdasarkan teks pertanyaan
    const suggestedAnswers = questionsWithoutAnswer.map(question => {
      let suggestedAnswer = '';
      
      // Auto-detect berdasarkan pola umum
      const text = question.text.toLowerCase();
      
      if (text.includes('3+3') || text.includes('3 + 3')) {
        suggestedAnswer = '6';
      } else if (text.includes('1+1') || text.includes('1 + 1')) {
        suggestedAnswer = '2';
      } else if (text.includes('2+2') || text.includes('2 + 2')) {
        suggestedAnswer = '4';
      } else if (text.includes('mitosis')) {
        suggestedAnswer = 'pembelahan sel';
      } else if (text.includes('fotosintesis')) {
        suggestedAnswer = 'proses pembentukan makanan pada tumbuhan';
      } else {
        suggestedAnswer = 'PERLU_DIISI_MANUAL';
      }
      
      return {
        ...question,
        suggestedAnswer
      };
    });

    // 4. Tampilkan saran perbaikan
    console.log('💡 SARAN PERBAIKAN:');
    console.log('==================');
    suggestedAnswers.forEach((item, index) => {
      console.log(`${index + 1}. Question: "${item.text}"`);
      console.log(`   Suggested Answer: "${item.suggestedAnswer}"`);
      console.log('');
    });

    // 5. Lakukan perbaikan otomatis untuk yang bisa dideteksi
    console.log('🔧 MELAKUKAN PERBAIKAN OTOMATIS:');
    console.log('===============================');
    
    let fixedCount = 0;
    
    for (const item of suggestedAnswers) {
      if (item.suggestedAnswer !== 'PERLU_DIISI_MANUAL') {
        try {
          await prisma.question.update({
            where: { id: item.id },
            data: { expectedAnswer: item.suggestedAnswer }
          });
          
          console.log(`✅ Fixed: "${item.text}" → "${item.suggestedAnswer}"`);
          fixedCount++;
        } catch (error) {
          console.error(`❌ Error fixing question ${item.id}:`, error);
        }
      } else {
        console.log(`⚠️  Manual: "${item.text}" → Perlu diisi manual`);
      }
    }

    console.log(`\n📊 HASIL: ${fixedCount} pertanyaan diperbaiki otomatis\n`);

    // 6. Verifikasi hasil perbaikan
    console.log('🔍 VERIFIKASI SETELAH PERBAIKAN:');
    console.log('===============================');
    
    const remainingIssues = await prisma.question.findMany({
      where: {
        OR: [
          { expectedAnswer: null },
          { expectedAnswer: "" },
          { expectedAnswer: "PERLU_DIISI_MANUAL" }
        ]
      }
    });

    if (remainingIssues.length === 0) {
      console.log('🎉 SUKSES! Semua pertanyaan sekarang memiliki expectedAnswer');
      console.log('   Koreksi otomatis akan berfungsi untuk semua soal');
    } else {
      console.log(`⚠️  Masih ada ${remainingIssues.length} pertanyaan yang perlu expectedAnswer manual:`);
      remainingIssues.forEach((question, index) => {
        console.log(`   ${index + 1}. "${question.text}"`);
      });
    }

    // 7. Test koreksi otomatis dengan data baru
    console.log('\n🧪 TEST KOREKSI OTOMATIS:');
    console.log('========================');
    
    const allQuestions = await prisma.question.findMany({
      where: {
        quiz: {
          title: 'Test Biology' // atau quiz yang sedang ditest
        }
      }
    });

    console.log('Simulasi koreksi otomatis:');
    allQuestions.forEach((question, index) => {
      const hasValidAnswer = question.expectedAnswer && question.expectedAnswer.trim() !== "";
      console.log(`   ${index + 1}. "${question.text}"`);
      console.log(`      Expected: "${question.expectedAnswer || 'TIDAK ADA'}"`);
      console.log(`      Can auto-correct: ${hasValidAnswer ? '✅ Ya' : '❌ Tidak'}`);
    });

  } catch (error) {
    console.error('❌ Error during fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan perbaikan
fixMissingExpectedAnswers().catch(console.error); 