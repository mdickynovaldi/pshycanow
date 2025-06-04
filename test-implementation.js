// Test script to verify our implementation works
const quizId = 'cmas2h35k0006ogtx87895ex3';
const studentId = 'cmb7q94a10000oglopuk8bfcf';
const submissionId = 'QUIZ_1748423739290_d1d0o16t_271384';

console.log('Test URLs to verify our implementation:');
console.log('');
console.log('1. Main quiz results page (with our new button):');
console.log(`   http://localhost:3000/student/quizzes/${quizId}`);
console.log('');
console.log('2. Individual answers page (where button should navigate):');
console.log(`   http://localhost:3000/student/quizzes/${quizId}/submissions/${submissionId}`);
console.log('');
console.log('3. Login first as student:');
console.log('   http://localhost:3000/login');
console.log('   Email: aldi@gmail.com');
console.log('   Password: [check database or use default]');
console.log('');
console.log('Test Steps:');
console.log('1. Login as student Aldi');
console.log('2. Navigate to the quiz results page');
console.log('3. Look for "Lihat Jawaban Saya" button');
console.log('4. Click the button and verify it shows individual answers');
