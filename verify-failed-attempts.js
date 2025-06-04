#!/usr/bin/env node

/**
 * Test script to verify that failedAttempts is properly incremented
 * when a student submits incorrect quiz answers.
 * 
 * Usage:
 * 1. Make sure your dev server is running (npm run dev)
 * 2. Update the TEST_CONFIG with valid IDs from your database
 * 3. Run: node verify-failed-attempts.js
 */

const TEST_CONFIG = {
  // Update these values with actual IDs from your database
  STUDENT_ID: 1,
  QUIZ_ID: 1,
  SERVER_URL: 'http://localhost:3001' // Adjust port if different
};

const testFailedAttemptsIncrement = async () => {
  console.log('🧪 Testing Failed Attempts Increment Functionality');
  console.log('='.repeat(50));
  
  console.log(`📊 Test Configuration:`);
  console.log(`   Student ID: ${TEST_CONFIG.STUDENT_ID}`);
  console.log(`   Quiz ID: ${TEST_CONFIG.QUIZ_ID}`);
  console.log(`   Server URL: ${TEST_CONFIG.SERVER_URL}`);
  console.log('');

  // Test data with intentionally wrong answers
  const testSubmission = {
    quizId: TEST_CONFIG.QUIZ_ID,
    answers: [
      { questionId: 1, selectedAnswer: "wrong_answer_1" },
      { questionId: 2, selectedAnswer: "wrong_answer_2" },
      { questionId: 3, selectedAnswer: "wrong_answer_3" }
    ]
  };

  try {
    console.log('📤 Submitting quiz with incorrect answers...');
    
    const response = await fetch(`${TEST_CONFIG.SERVER_URL}/api/student/submit-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: You may need to add authentication headers here
        // 'Authorization': 'Bearer your-token',
        // 'Cookie': 'your-session-cookie'
      },
      body: JSON.stringify(testSubmission)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log('📥 Server Response:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Message: ${result.message || 'No message'}`);
    
    if (result.data) {
      console.log(`   Score: ${result.data.score || 'N/A'}`);
      console.log(`   Passed: ${result.data.passed}`);
      console.log(`   Next Action: ${result.data.nextAction || 'None'}`);
    }
    
    console.log('');
    
    if (result.success) {
      if (result.data && result.data.passed === false) {
        console.log('✅ TEST PASSED: Quiz submission failed as expected');
        console.log('✅ The failedAttempts field should now be incremented in the database');
        console.log('');
        console.log('📋 Next Steps:');
        console.log('   1. Check your database to verify failedAttempts was incremented');
        console.log('   2. You can use the provided SQL queries in check-failed-attempts.sql');
        console.log('   3. Or check via Prisma Studio: npx prisma studio');
      } else {
        console.log('⚠️  UNEXPECTED: Quiz passed with wrong answers');
        console.log('   This might indicate an issue with the quiz questions or answer validation');
      }
    } else {
      console.log('❌ TEST FAILED: Quiz submission was not successful');
      console.log(`   Error: ${result.error || result.message}`);
    }

  } catch (error) {
    console.log('❌ TEST ERROR: Failed to submit quiz');
    console.log(`   Error: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('   💡 Make sure your development server is running on the correct port');
    }
  }
  
  console.log('');
  console.log('📝 Database Verification:');
  console.log('   Run this query to check the failedAttempts value:');
  console.log(`   SELECT * FROM "StudentQuizProgress" WHERE "studentId" = ${TEST_CONFIG.STUDENT_ID} AND "quizId" = ${TEST_CONFIG.QUIZ_ID};`);
};

// Instructions for manual testing
const printManualTestingInstructions = () => {
  console.log('🔧 Manual Testing Instructions:');
  console.log('='.repeat(50));
  console.log('If you prefer to test manually:');
  console.log('1. Start your development server: npm run dev');
  console.log('2. Login as a student in your application');
  console.log('3. Navigate to a quiz and submit incorrect answers');
  console.log('4. Check the database to see if failedAttempts was incremented');
  console.log('');
  console.log('🔍 Database Check Commands:');
  console.log('   • Prisma Studio: npx prisma studio');
  console.log('   • Direct SQL: Use the queries in check-failed-attempts.sql');
  console.log('');
};

// Main execution
if (require.main === module) {
  console.log('');
  
  if (process.argv.includes('--manual')) {
    printManualTestingInstructions();
  } else {
    testFailedAttemptsIncrement().catch(console.error);
  }
}

module.exports = { testFailedAttemptsIncrement };
