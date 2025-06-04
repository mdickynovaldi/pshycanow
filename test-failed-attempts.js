// Test script to verify failedAttempts increment functionality
// Run this with: node test-failed-attempts.js

const testFailedAttempts = async () => {
  console.log('Testing failed attempts increment...');
  
  // Simulate a quiz submission with incorrect answers
  const testData = {
    quizId: 1, // Replace with actual quiz ID
    studentId: 1, // Replace with actual student ID
    answers: [
      { questionId: 1, answer: "wrong answer" },
      { questionId: 2, answer: "another wrong answer" }
    ]
  };

  try {
    const response = await fetch('http://localhost:3000/api/student/submit-quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('Response:', result);
    
    if (result.success) {
      console.log('✅ Quiz submission successful');
      console.log('Passed:', result.passed);
      console.log('Score:', result.score);
      
      if (!result.passed) {
        console.log('✅ Quiz failed as expected - failedAttempts should be incremented');
      } else {
        console.log('⚠️  Quiz passed unexpectedly');
      }
    } else {
      console.log('❌ Quiz submission failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error testing failed attempts:', error);
  }
};

// Note: This is a basic test script. 
// For actual testing, you'll need:
// 1. A running development server (npm run dev)
// 2. Valid quiz and student IDs from your database
// 3. Proper authentication if required

console.log('To test the failed attempts functionality:');
console.log('1. Start your dev server: npm run dev');
console.log('2. Update the quizId and studentId with valid values');
console.log('3. Run: node test-failed-attempts.js');
console.log('4. Check the database to verify failedAttempts was incremented');
