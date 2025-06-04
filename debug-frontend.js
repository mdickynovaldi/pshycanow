const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function debugFrontend() {
  console.log('🔍 Debugging Frontend Issue...\n');
  
  const studentId = 'cmbdo3fr7000pog148rbebp6k';
  const quizId = 'cmas2h35k0006ogtx87895ex3';
  
  // 1. Test API endpoint
  console.log('1. Testing API Endpoint:');
  const apiUrl = `http://localhost:3000/api/teacher/quiz-submissions?quizId=${quizId}&studentId=${studentId}`;
  
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${data.success}`);
    console.log(`   Submissions Count: ${data.data?.submissions?.length || 0}`);
    
    if (data.data?.submissions) {
      console.log('\n   Submissions:');
      data.data.submissions.forEach(sub => {
        console.log(`   - Attempt ${sub.attemptNumber}: ${sub.status} (${sub.answers.length} answers)`);
      });
    }
  } catch (error) {
    console.error('   ❌ API Error:', error.message);
  }
  
  // 2. Check if page HTML contains data
  console.log('\n2. Testing Frontend Page:');
  const pageUrl = `http://localhost:3000/teacher/quizzes/${quizId}/students/${studentId}/submissions`;
  
  try {
    const pageResponse = await fetch(pageUrl);
    const html = await pageResponse.text();
    
    console.log(`   Status: ${pageResponse.status}`);
    console.log(`   Page Length: ${html.length} characters`);
    
    // Check for key elements
    const hasTitle = html.includes('Penilaian Semua Jawaban Kuis Reguler');
    const hasSubmissions = html.includes('Total Percobaan');
    const hasError = html.includes('Gagal memuat');
    const hasLoading = html.includes('Memuat data submission');
    
    console.log(`   Has Title: ${hasTitle}`);
    console.log(`   Has Submissions Section: ${hasSubmissions}`);
    console.log(`   Has Error: ${hasError}`);
    console.log(`   Has Loading: ${hasLoading}`);
    
    // Look for client-side JavaScript
    const hasNextScript = html.includes('_next/static');
    console.log(`   Has Next.js Scripts: ${hasNextScript}`);
    
  } catch (error) {
    console.error('   ❌ Page Error:', error.message);
  }
  
  console.log('\n3. Recommendations:');
  console.log('   • Buka browser dan check Developer Tools (F12)');
  console.log('   • Lihat Network tab untuk API calls');
  console.log('   • Check Console tab untuk JavaScript errors');
  console.log(`   • URL: http://localhost:3000/teacher/quizzes/${quizId}/students/${studentId}/submissions`);
}

debugFrontend(); 