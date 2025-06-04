async function testApiEndpoint() {
  console.log('🔍 Testing Teacher Quiz Submissions API...\n');
  
  const studentId = 'cmbdo3fr7000pog148rbebp6k';
  const quizId = 'cmas2h35k0006ogtx87895ex3';
  
  const url = `http://localhost:3000/api/teacher/quiz-submissions?quizId=${quizId}&studentId=${studentId}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('API Response Status:', response.status);
    console.log('Success:', data.success);
    
    if (data.success) {
      console.log('Student Name:', data.data.studentName);
      console.log('Total Submissions:', data.data.submissions.length);
      console.log('\nSubmissions Detail:');
      console.log('─'.repeat(50));
      
      data.data.submissions.forEach((sub, i) => {
        console.log(`\nAttempt ${sub.attemptNumber}:`);
        console.log(`  ID: ${sub.id}`);
        console.log(`  Status: ${sub.status}`);
        console.log(`  Created: ${sub.createdAt}`);
        console.log(`  Answers: ${sub.answers.length}`);
        
        sub.answers.forEach((ans, j) => {
            console.log(`    ${j + 1}. ${ans.question.question}`);
            console.log(`       Answer: "${ans.answerText}"`);
            console.log(`       Is Correct: ${ans.isCorrect}`);
            console.log(`       Score: ${ans.score}`);
            console.log(`       Feedback: ${ans.feedback || 'None'}`);
        });
      });
    } else {
      console.log('Error:', data.message);
    }
  } catch (error) {
    console.error('Error calling API:', error.message);
  }
}

// Wait a bit for server to start
setTimeout(testApiEndpoint, 3000); 