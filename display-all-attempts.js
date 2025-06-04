const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function displayAllAttempts() {
  console.log('📊 DISPLAYING ALL STUDENT ATTEMPTS AND ANSWERS\n');
  console.log('═'.repeat(80));

  try {
    // Find the student and quiz we've been testing
    const studentId = 'cmbdmhftu0000og14w68cd7si'; // Aldi (ID yang benar)
    const quizId = 'cmas2h35k0006ogtx87895ex3'; // Test Biology
    
    const student = await prisma.user.findUnique({
      where: { id: studentId }
    });
    
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId }
    });
    
    console.log(`👤 STUDENT: ${student.name}`);
    console.log(`📝 QUIZ: ${quiz.title}`);
    console.log(`🔗 Teacher URL: http://localhost:3000/teacher/quizzes/${quizId}/students/${studentId}/submissions\n`);
    
    // Get all submissions for this student-quiz pair
    const submissions = await prisma.quizSubmission.findMany({
      where: {
        studentId: studentId,
        quizId: quizId,
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
        attemptNumber: 'asc'
      }
    });
    
    console.log(`📈 TOTAL ATTEMPTS: ${submissions.length}`);
    console.log(`✅ Passed: ${submissions.filter(s => s.status === 'PASSED').length}`);
    console.log(`❌ Failed: ${submissions.filter(s => s.status === 'FAILED').length}`);
    console.log(`⏳ Pending: ${submissions.filter(s => s.status === 'PENDING').length}`);
    console.log('\n' + '═'.repeat(80) + '\n');
    
    // Display each submission in detail
    submissions.forEach((submission, index) => {
      console.log(`🎯 PERCOBAAN KE-${submission.attemptNumber}`);
      console.log('─'.repeat(60));
      console.log(`📅 Waktu: ${new Date(submission.createdAt).toLocaleString('id-ID')}`);
      console.log(`📊 Status: ${submission.status} ${
        submission.status === 'PASSED' ? '✅ LULUS' : 
        submission.status === 'FAILED' ? '❌ TIDAK LULUS' : 
        '⏳ MENUNGGU'
      }`);
      console.log(`💯 Score: ${submission.score || 0}%`);
      console.log(`💬 Feedback Umum: ${submission.feedback || 'Belum ada feedback'}\n`);
      
      console.log(`📝 JAWABAN (${submission.answers.length} soal):`);
      console.log('─'.repeat(60));
      
      submission.answers.forEach((answer, ansIndex) => {
        console.log(`\n${ansIndex + 1}. PERTANYAAN: ${answer.question.text}`);
        console.log(`   Expected Answer: "${answer.question.expectedAnswer || 'Tidak ada'}"`);
        console.log(`   \n   📝 Jawaban Siswa:`);
        console.log(`   "${answer.answerText}"`);
        
        // Auto-correction status
        console.log(`   \n   🤖 Koreksi Otomatis: ${
          answer.isCorrect === true ? '✅ BENAR' : 
          answer.isCorrect === false ? '❌ SALAH' : 
          '⏳ Belum dikoreksi otomatis'
        }`);
        
        // Teacher grading
        console.log(`   \n   👩‍🏫 Penilaian Guru:`);
        console.log(`   - Nilai: ${answer.score !== null ? `${answer.score}/100` : 'Belum dinilai'}`);
        console.log(`   - Feedback: ${answer.feedback || 'Belum ada feedback dari guru'}`);
        
        // Visual separator
        if (ansIndex < submission.answers.length - 1) {
          console.log('\n   ' + '·'.repeat(40));
        }
      });
      
      console.log('\n\n' + '═'.repeat(80) + '\n');
    });
    
    // Summary statistics
    console.log('📊 RINGKASAN KESELURUHAN:');
    console.log('─'.repeat(60));
    
    const totalAnswers = submissions.reduce((sum, sub) => sum + sub.answers.length, 0);
    const gradedByTeacher = submissions.reduce((sum, sub) => 
      sum + sub.answers.filter(a => a.score !== null).length, 0
    );
    const hasTeacherFeedback = submissions.reduce((sum, sub) => 
      sum + sub.answers.filter(a => a.feedback !== null).length, 0
    );
    const autoCorrectCorrect = submissions.reduce((sum, sub) => 
      sum + sub.answers.filter(a => a.isCorrect === true).length, 0
    );
    const autoCorrectWrong = submissions.reduce((sum, sub) => 
      sum + sub.answers.filter(a => a.isCorrect === false).length, 0
    );
    
    console.log(`Total Jawaban: ${totalAnswers}`);
    console.log(`Sudah dinilai guru: ${gradedByTeacher} (${Math.round(gradedByTeacher/totalAnswers*100)}%)`);
    console.log(`Sudah diberi feedback: ${hasTeacherFeedback} (${Math.round(hasTeacherFeedback/totalAnswers*100)}%)`);
    console.log(`Koreksi otomatis - Benar: ${autoCorrectCorrect}`);
    console.log(`Koreksi otomatis - Salah: ${autoCorrectWrong}`);
    console.log(`Belum dikoreksi otomatis: ${totalAnswers - autoCorrectCorrect - autoCorrectWrong}`);
    
    console.log('\n🎓 KESIMPULAN:');
    console.log('─'.repeat(60));
    console.log('Guru dapat memberikan feedback untuk SEMUA jawaban dari SEMUA percobaan,');
    console.log('baik yang LULUS maupun TIDAK LULUS. Sistem mendukung:');
    console.log('• Melihat hasil koreksi otomatis');
    console.log('• Memberikan nilai manual (0-100)');
    console.log('• Memberikan feedback personal untuk setiap jawaban');
    console.log('• Mengubah status kelulusan berdasarkan nilai yang diberikan');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

displayAllAttempts(); 