#!/usr/bin/env node

/**
 * Script untuk menguji fungsi getStudentSubmissionHistory secara langsung
 */

// Simulasi environment
process.env.NODE_ENV = 'development';

async function testGetStudentSubmissionHistory() {
  try {
    // Import the action
    const { getStudentSubmissionHistory } = await import('./src/lib/actions/quiz-submission-actions.ts');
    
    console.log('🧪 Testing getStudentSubmissionHistory function...\n');

    // Test dengan quiz ID yang ada
    const quizId = "cmb7jmyws000iog0e0qzp52iu"; // Dari hasil test sebelumnya
    
    console.log(`📊 Testing with quizId: ${quizId}`);
    
    const result = await getStudentSubmissionHistory(quizId);
    
    console.log('Result:', result);
    
    if (result.success && result.data) {
      console.log(`✅ Function returned ${result.data.length} submissions`);
      
      // Verifikasi bahwa semua submission memiliki assistanceLevel: null
      const allAreMainQuiz = result.data.every(submission => submission.assistanceLevel === null);
      console.log(`✅ All submissions are main quiz (assistanceLevel: null): ${allAreMainQuiz}`);
      
      if (result.data.length > 0) {
        console.log('\n📋 Sample submissions:');
        result.data.slice(0, 3).forEach((submission, index) => {
          console.log(`  ${index + 1}. ID: ${submission.id}, Attempt: ${submission.attemptNumber}, Status: ${submission.status}, assistanceLevel: ${submission.assistanceLevel}`);
        });
      }
    } else {
      console.log('❌ Function failed:', result.message);
    }

    console.log('\n✅ getStudentSubmissionHistory test completed!');

  } catch (error) {
    console.error('❌ Error testing getStudentSubmissionHistory:', error);
  }
}

// Run the test
testGetStudentSubmissionHistory().catch(console.error);
