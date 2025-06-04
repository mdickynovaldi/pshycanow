// Test script to verify the last submission ID relationship
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testLastSubmissionRelation() {
  try {
    console.log('🔍 Testing lastSubmissionId in StudentQuizProgress...');
    
    // Query the database to get a sample StudentQuizProgress with lastSubmissionId
    const progressWithLastSubmission = await prisma.studentQuizProgress.findFirst({
      where: {
        lastSubmissionId: {
          not: null
        }
      },
      include: {
        lastSubmission: true,
        student: {
          select: { name: true }
        },
        quiz: {
          select: { title: true }
        }
      }
    });

    if (!progressWithLastSubmission) {
      console.log('❌ No StudentQuizProgress found with a non-null lastSubmissionId');
      
      // Get all progress records
      const allProgress = await prisma.studentQuizProgress.findMany({
        take: 5
      });
      
      console.log(`Total progress records (sample of 5): ${allProgress.length}`);
      allProgress.forEach((p, i) => {
        console.log(`  ${i+1}. ID: ${p.id}, lastSubmissionId: ${p.lastSubmissionId || 'null'}`);
      });
      
      return;
    }
    
    console.log('✅ Found StudentQuizProgress record with lastSubmissionId:');
    console.log(`  Progress ID: ${progressWithLastSubmission.id}`);
    console.log(`  Student: ${progressWithLastSubmission.student.name}`);
    console.log(`  Quiz: ${progressWithLastSubmission.quiz.title}`);
    console.log(`  Last Submission ID: ${progressWithLastSubmission.lastSubmissionId}`);
    
    if (progressWithLastSubmission.lastSubmission) {
      console.log('\n✅ Successfully loaded the related lastSubmission:');
      console.log(`  Submission ID: ${progressWithLastSubmission.lastSubmission.id}`);
      console.log(`  Attempt Number: ${progressWithLastSubmission.lastSubmission.attemptNumber}`);
      console.log(`  Status: ${progressWithLastSubmission.lastSubmission.status}`);
      console.log(`  Score: ${progressWithLastSubmission.lastSubmission.score}%`);
      console.log(`  Created At: ${progressWithLastSubmission.lastSubmission.createdAt}`);
    } else {
      console.log('\n❌ Failed to load the related lastSubmission - relationship may be broken');
    }
    
    // Get all submissions for this student and quiz
    const allSubmissions = await prisma.quizSubmission.findMany({
      where: {
        studentId: progressWithLastSubmission.studentId,
        quizId: progressWithLastSubmission.quizId,
        assistanceLevel: null,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`\n📊 Found ${allSubmissions.length} total submissions for this student and quiz:`);
    allSubmissions.forEach((sub, i) => {
      console.log(`  ${i+1}. ID: ${sub.id}, Attempt: ${sub.attemptNumber}, Status: ${sub.status}, Created: ${sub.createdAt}`);
      
      // Highlight if this is the lastSubmission referenced by progress
      if (sub.id === progressWithLastSubmission.lastSubmissionId) {
        console.log(`     ✓ This is the submission referenced by lastSubmissionId`);
      }
    });
    
    // Check if the lastSubmissionId points to the most recent submission
    const mostRecentSubmission = allSubmissions[0]; // First one due to desc ordering
    const isLastSubmissionMostRecent = progressWithLastSubmission.lastSubmissionId === mostRecentSubmission?.id;
    
    console.log(`\n✅ The lastSubmissionId points to the most recent submission: ${isLastSubmissionMostRecent}`);
    
    if (!isLastSubmissionMostRecent) {
      console.log(`  Expected: ${mostRecentSubmission?.id}`);
      console.log(`  Actual: ${progressWithLastSubmission.lastSubmissionId}`);
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLastSubmissionRelation();
