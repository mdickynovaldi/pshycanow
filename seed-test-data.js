const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTestData() {
  try {
    console.log('🌱 Seeding test data...');

    // Create a teacher
    const teacher = await prisma.user.upsert({
      where: { email: 'teacher@test.com' },
      update: {},
      create: {
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'TEACHER'
      }
    });

    // Create a student
    const student = await prisma.user.upsert({
      where: { email: 'student@test.com' },
      update: {},
      create: {
        email: 'student@test.com',
        name: 'Test Student',
        role: 'STUDENT'
      }
    });

    // Create a class
    const testClass = await prisma.class.upsert({
      where: { id: 'test-class-1' },
      update: {},
      create: {
        id: 'test-class-1',
        name: 'Test Class',
        description: 'A test class for quiz grading',
        teacherId: teacher.id
      }
    });

    // Enroll student in class
    await prisma.classEnrollment.upsert({
      where: {
        userId_classId: {
          userId: student.id,
          classId: testClass.id
        }
      },
      update: {},
      create: {
        userId: student.id,
        classId: testClass.id
      }
    });

    // Create a quiz
    const quiz = await prisma.quiz.create({
      data: {
        title: 'Test Quiz - Multiple Submissions',
        description: 'A quiz to test the multi-submission grading feature',
        classId: testClass.id,
        teacherId: teacher.id,
        maxAttempts: 3,
        timeLimit: 60,
        isPublished: true,
        questions: {
          create: [
            {
              question: 'What is 2 + 2?',
              options: ['3', '4', '5', '6'],
              correctAnswer: 1,
              explanation: 'Basic addition: 2 + 2 = 4'
            },
            {
              question: 'What is the capital of France?',
              options: ['London', 'Berlin', 'Paris', 'Madrid'],
              correctAnswer: 2,
              explanation: 'Paris is the capital city of France'
            },
            {
              question: 'Which planet is closest to the Sun?',
              options: ['Venus', 'Mercury', 'Earth', 'Mars'],
              correctAnswer: 1,
              explanation: 'Mercury is the planet closest to the Sun'
            }
          ]
        }
      }
    });

    // Get the quiz questions
    const questions = await prisma.quizQuestion.findMany({
      where: { quizId: quiz.id },
      orderBy: { id: 'asc' }
    });

    // Create multiple quiz submissions for the student (3 attempts)
    const submissions = [];

    // First attempt - Poor performance (1/3 correct)
    const submission1 = await prisma.quizSubmission.create({
      data: {
        userId: student.id,
        quizId: quiz.id,
        submissionType: 'QUIZ',
        attemptNumber: 1,
        status: 'COMPLETED',
        submittedAt: new Date('2025-05-27T10:00:00Z'),
        answers: {
          create: [
            {
              questionId: questions[0].id,
              selectedAnswer: 0, // Wrong: selected '3' instead of '4'
              isCorrect: false,
              score: null // Will be graded by teacher
            },
            {
              questionId: questions[1].id,
              selectedAnswer: 2, // Correct: selected 'Paris'
              isCorrect: true,
              score: null
            },
            {
              questionId: questions[2].id,
              selectedAnswer: 0, // Wrong: selected 'Venus' instead of 'Mercury'
              isCorrect: false,
              score: null
            }
          ]
        }
      }
    });

    // Second attempt - Better performance (2/3 correct)
    const submission2 = await prisma.quizSubmission.create({
      data: {
        userId: student.id,
        quizId: quiz.id,
        submissionType: 'QUIZ',
        attemptNumber: 2,
        status: 'COMPLETED',
        submittedAt: new Date('2025-05-27T14:00:00Z'),
        answers: {
          create: [
            {
              questionId: questions[0].id,
              selectedAnswer: 1, // Correct: selected '4'
              isCorrect: true,
              score: null
            },
            {
              questionId: questions[1].id,
              selectedAnswer: 2, // Correct: selected 'Paris'
              isCorrect: true,
              score: null
            },
            {
              questionId: questions[2].id,
              selectedAnswer: 0, // Wrong: still selected 'Venus' instead of 'Mercury'
              isCorrect: false,
              score: null
            }
          ]
        }
      }
    });

    // Third attempt - Perfect performance (3/3 correct)
    const submission3 = await prisma.quizSubmission.create({
      data: {
        userId: student.id,
        quizId: quiz.id,
        submissionType: 'QUIZ',
        attemptNumber: 3,
        status: 'COMPLETED',
        submittedAt: new Date('2025-05-28T09:00:00Z'),
        answers: {
          create: [
            {
              questionId: questions[0].id,
              selectedAnswer: 1, // Correct: selected '4'
              isCorrect: true,
              score: null
            },
            {
              questionId: questions[1].id,
              selectedAnswer: 2, // Correct: selected 'Paris'
              isCorrect: true,
              score: null
            },
            {
              questionId: questions[2].id,
              selectedAnswer: 1, // Correct: selected 'Mercury'
              isCorrect: true,
              score: null
            }
          ]
        }
      }
    });

    submissions.push(submission1, submission2, submission3);

    console.log('✅ Test data seeded successfully!');
    console.log(`📊 Created:
    - Teacher: ${teacher.email}
    - Student: ${student.email}
    - Class: ${testClass.name}
    - Quiz: ${quiz.title}
    - Quiz Submissions: ${submissions.length} attempts
    `);

    console.log('\n🎯 Test URLs:');
    console.log(`Teacher Quiz View: http://localhost:3002/teacher/quizzes/${quiz.id}`);
    console.log(`Student Submissions: http://localhost:3002/teacher/quizzes/${quiz.id}/students/${student.id}/submissions`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData();
