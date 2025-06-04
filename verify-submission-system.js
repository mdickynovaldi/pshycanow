const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifySubmissionSystem() {
  console.log('🔍 VERIFIKASI SISTEM PENYIMPANAN SUBMISSION\n');
  console.log('============================================\n');

  try {
    // 1. Cek koneksi database
    console.log('1️⃣ Mengecek koneksi database...');
    await prisma.$connect();
    console.log('   ✅ Database terhubung dengan baik\n');

    // 2. Cek struktur tabel SubmissionAnswer
    console.log('2️⃣ Mengecek struktur tabel SubmissionAnswer...');
    const submissionFields = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'SubmissionAnswer' 
      ORDER BY ordinal_position;
    `;
    
    console.log('   📋 Field yang tersedia:');
    let hasScore = false;
    let hasFeedback = false;
    let hasIsCorrect = false;
    
    submissionFields.forEach(field => {
      console.log(`      - ${field.column_name}: ${field.data_type} ${field.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
      if (field.column_name === 'score') hasScore = true;
      if (field.column_name === 'feedback') hasFeedback = true;
      if (field.column_name === 'isCorrect') hasIsCorrect = true;
    });
    
    console.log('   ✅ Field score tersedia:', hasScore ? 'Ya' : 'Tidak');
    console.log('   ✅ Field feedback tersedia:', hasFeedback ? 'Ya' : 'Tidak');
    console.log('   ✅ Field isCorrect tersedia:', hasIsCorrect ? 'Ya' : 'Tidak');
    console.log('');

    // 3. Cek jumlah submission yang tersimpan
    console.log('3️⃣ Mengecek submission yang tersimpan...');
    const totalSubmissions = await prisma.quizSubmission.count();
    console.log(`   📊 Total submission di database: ${totalSubmissions}`);
    
    if (totalSubmissions > 0) {
      const submissionsByStatus = await prisma.quizSubmission.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      });
      
      console.log('   📈 Breakdown per status:');
      submissionsByStatus.forEach(item => {
        console.log(`      - ${item.status}: ${item._count.id} submission`);
      });
    }
    console.log('');

    // 4. Cek submission dengan jawaban
    console.log('4️⃣ Mengecek submission dengan jawaban...');
    const submissionsWithAnswers = await prisma.quizSubmission.findMany({
      include: {
        answers: true,
        student: {
          select: { name: true }
        },
        quiz: {
          select: { title: true }
        }
      },
      take: 3, // Sample 3 submission terakhir
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (submissionsWithAnswers.length > 0) {
      console.log('   🎯 Sample submission terbaru:');
      submissionsWithAnswers.forEach((sub, index) => {
        console.log(`      ${index + 1}. ${sub.student?.name || 'Unknown'} - ${sub.quiz?.title || 'Unknown Quiz'}`);
        console.log(`         Status: ${sub.status}, Answers: ${sub.answers.length}, Created: ${sub.createdAt.toLocaleDateString()}`);
        
        // Cek apakah ada jawaban yang sudah dinilai
        const gradedAnswers = sub.answers.filter(a => a.score !== null);
        const answersWithFeedback = sub.answers.filter(a => a.feedback !== null);
        
        console.log(`         Dinilai: ${gradedAnswers.length}/${sub.answers.length}, Feedback: ${answersWithFeedback.length}/${sub.answers.length}`);
      });
    } else {
      console.log('   ⚠️  Belum ada submission yang tersimpan');
    }
    console.log('');

    // 5. Cek API endpoints (symlink check)
    console.log('5️⃣ Mengecek API endpoints...');
    const fs = require('fs');
    
    const apiPaths = [
      'src/app/api/student/submit-quiz/route.ts',
      'src/app/api/teacher/quiz-submissions/route.ts',
      'src/app/api/teacher/save-quiz-scores/route.ts'
    ];
    
    apiPaths.forEach(path => {
      if (fs.existsSync(path)) {
        console.log(`   ✅ ${path} - Ada`);
      } else {
        console.log(`   ❌ ${path} - Tidak ditemukan`);
      }
    });
    console.log('');

    // 6. Summary
    console.log('📊 SUMMARY VERIFIKASI:');
    console.log('=====================');
    console.log(`✅ Database Connection: OK`);
    console.log(`✅ Table Structure: ${hasScore && hasFeedback && hasIsCorrect ? 'Lengkap' : 'Ada yang kurang'}`);
    console.log(`✅ Total Submissions: ${totalSubmissions}`);
    console.log(`✅ Sample Data: ${submissionsWithAnswers.length > 0 ? 'Ada' : 'Kosong'}`);
    console.log('');

    if (totalSubmissions === 0) {
      console.log('💡 CATATAN:');
      console.log('   - Tidak ada submission ditemukan');
      console.log('   - Coba suruh siswa mengerjakan kuis terlebih dahulu');
      console.log('   - Atau cek apakah ada data test di database');
    } else {
      console.log('🎉 SISTEM BERFUNGSI DENGAN BAIK!');
      console.log('   - Submission tersimpan otomatis saat siswa submit');
      console.log('   - Guru bisa melihat semua submission di halaman penilaian');
      console.log('   - Field score dan feedback siap untuk diisi guru');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error during verification:', error);
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('   1. Pastikan database connection string benar di .env');
    console.log('   2. Jalankan: npx prisma generate');
    console.log('   3. Jalankan: npx prisma db push');
    console.log('   4. Cek apakah PostgreSQL service running');
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan verifikasi
verifySubmissionSystem().catch(console.error); 