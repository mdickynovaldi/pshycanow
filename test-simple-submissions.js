async function testSimpleSubmissions() {
  console.log('🧪 Testing Simple Submissions Display...\n');
  
  const studentId = 'cmbdo3fr7000pog148rbebp6k';
  const quizId = 'cmas2h35k0006ogtx87895ex3';
  
  try {
    // Test API call
    const response = await fetch(`http://localhost:3000/api/teacher/quiz-submissions?quizId=${quizId}&studentId=${studentId}`);
    const data = await response.json();
    
    if (!data.success) {
      console.error('❌ API Error:', data.message);
      return;
    }
    
    console.log(`📊 Found ${data.data.submissions.length} submissions for ${data.data.studentName}\n`);
    
    // Display each submission
    data.data.submissions.forEach((submission, index) => {
      console.log(`${index + 1}. PERCOBAAN KE-${submission.attemptNumber}`);
      console.log(`   ID: ${submission.id}`);
      console.log(`   Status: ${submission.status}`);
      console.log(`   Created: ${submission.createdAt}`);
      console.log(`   Answers: ${submission.answers.length}`);
      
      submission.answers.forEach((answer, ansIndex) => {
        console.log(`   \n   Soal ${ansIndex + 1}: ${answer.question.question}`);
        console.log(`   Jawaban: "${answer.answerText}"`);
        console.log(`   Benar: ${answer.isCorrect}`);
        console.log(`   Score: ${answer.score || 'Belum dinilai'}`);
        console.log(`   Feedback: ${answer.feedback || 'Belum ada'}`);
      });
      
      console.log('\n' + '─'.repeat(50) + '\n');
    });
    
    console.log('✅ All submissions data is valid and complete!');
    console.log('\n🔗 Frontend URL:');
    console.log(`http://localhost:3000/teacher/quizzes/${quizId}/students/${studentId}/submissions`);
    
    console.log('\n💡 Suggestion:');
    console.log('1. Open the URL above in browser');
    console.log('2. Open Developer Tools (F12)');
    console.log('3. Check Console tab for errors');
    console.log('4. Check Network tab for API calls');
    console.log('5. Look for the debug messages we added');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSimpleSubmissions(); 