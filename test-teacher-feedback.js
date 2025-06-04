const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTeacherFeedback() {
  console.log('🧪 Testing teacher feedback on auto-corrected answers...\n');

  try {
    // 1. Cari submission yang sudah dikoreksi otomatis
    const submission = await prisma.quizSubmission.findFirst({
      where: {
        status: { in: ['PASSED', 'FAILED'] },
        assistanceLevel: null
      },
      include: {
        student: true,
        quiz: true,
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

    if (!submission) {
      console.log('❌ Tidak ada submission yang ditemukan');
      return;
    }

    console.log('📋 Submission Details:');
    console.log(`   Student: ${submission.student.name}`);
    console.log(`   Quiz: ${submission.quiz.title}`);
    console.log(`   Status: ${submission.status}`);
    console.log(`   Score: ${submission.score}%`);
    console.log(`   Attempt: ${submission.attemptNumber}`);
    console.log('\n📝 Answers with Auto-correction:');

    submission.answers.forEach((answer, index) => {
      console.log(`\n   ${index + 1}. Question: ${answer.question.text}`);
      console.log(`      Expected Answer: ${answer.question.expectedAnswer || 'Not set'}`);
      console.log(`      Student Answer: ${answer.answerText}`);
      console.log(`      Auto-corrected: ${answer.isCorrect ? '✅ Correct' : '❌ Incorrect'}`);
      console.log(`      Current Score: ${answer.score ?? 'Not graded'}`);
      console.log(`      Current Feedback: ${answer.feedback || 'No feedback yet'}`);
    });

    // 2. Simulasi guru memberikan feedback
    console.log('\n\n🎯 Simulating teacher giving feedback...');

    const feedbackData = submission.answers.map((answer, index) => ({
      answerId: answer.id,
      score: answer.isCorrect ? 100 : 30, // Guru memberi partial credit untuk jawaban salah
      feedback: answer.isCorrect 
        ? `Bagus sekali! Jawaban Anda tepat.`
        : `Jawaban Anda kurang tepat. Yang benar adalah "${answer.question.expectedAnswer}". Silakan pelajari kembali materi ini.`
    }));

    // 3. Update dengan feedback guru
    for (const data of feedbackData) {
      await prisma.submissionAnswer.update({
        where: { id: data.answerId },
        data: {
          score: data.score,
          feedback: data.feedback
          // isCorrect tidak diubah, tetap dari koreksi otomatis
        }
      });
    }

    // 4. Update submission status berdasarkan nilai guru
    const totalScore = feedbackData.reduce((sum, item) => sum + item.score, 0);
    const avgScore = Math.round(totalScore / feedbackData.length);
    const newStatus = avgScore >= 70 ? 'PASSED' : 'FAILED';

    await prisma.quizSubmission.update({
      where: { id: submission.id },
      data: {
        status: newStatus,
        score: avgScore
      }
    });

    // 5. Verifikasi hasil
    console.log('\n✅ Feedback berhasil disimpan!');
    
    const updatedSubmission = await prisma.quizSubmission.findUnique({
      where: { id: submission.id },
      include: {
        answers: {
          include: {
            question: true
          }
        }
      }
    });

    console.log('\n📊 Updated Submission:');
    console.log(`   New Status: ${updatedSubmission.status}`);
    console.log(`   New Score: ${updatedSubmission.score}%`);
    
    console.log('\n📝 Updated Answers:');
    updatedSubmission.answers.forEach((answer, index) => {
      console.log(`\n   ${index + 1}. ${answer.question.text.substring(0, 50)}...`);
      console.log(`      Auto-correction: ${answer.isCorrect ? '✅' : '❌'}`);
      console.log(`      Teacher Score: ${answer.score}/100`);
      console.log(`      Teacher Feedback: ${answer.feedback}`);
    });

    // 6. Test URLs
    console.log('\n\n🔗 Test URLs:');
    console.log(`   Teacher View: http://localhost:3000/teacher/quizzes/${submission.quizId}/students/${submission.studentId}/submissions`);
    console.log(`   API Endpoint: http://localhost:3000/api/teacher/quiz-submissions?quizId=${submission.quizId}&studentId=${submission.studentId}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTeacherFeedback(); 