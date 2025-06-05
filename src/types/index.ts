export interface Student {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  emailVerified?: Date | null;
  enrollments?: Array<{
    class: {
      id: string;
      name: string;
    }
  }>;
  classes?: Array<{
    id: string;
    name: string;
  }>;
}

export interface ClassData {
  id: string;
  name: string;
  description: string | null;
  teacherId: string;
}

export interface ClassWithStudents extends ClassData {
  students: Student[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  classId: string | null;
  createdAt: Date;
  updatedAt: Date;
  questions?: Question[];
  class?: {
    id: string;
    name: string;
  };
  assistanceLevel1?: QuizAssistanceLevel1;
  assistanceLevel2?: QuizAssistanceLevel2;
  assistanceLevel3?: QuizAssistanceLevel3;
}

export interface Question {
  id: string;
  text: string;
  imageUrl: string | null;
  expectedAnswer: string | null;
  quizId: string;
}

// Quiz Assistance Types
export interface QuizAssistanceBase {
  id?: string;
  quizId: string;
  title: string;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QuizAssistanceLevel1 extends QuizAssistanceBase {
  questions: {
    id?: string;
    question: string;
    correctAnswer: boolean;
    explanation?: string | null;
  }[];
}

export interface QuizAssistanceLevel2 extends QuizAssistanceBase {
  questions: {
    id?: string;
    question: string;
    hint?: string | null;
    correctAnswer: string;
  }[];
}

export interface QuizAssistanceLevel3 extends QuizAssistanceBase {
  pdfUrl: string;
}

// Quiz Submission Types
export enum SubmissionStatus {
  PENDING = "PENDING",
  PASSED = "PASSED",
  FAILED = "FAILED"
}

export interface SubmissionAnswer {
  id?: string;
  questionId: string;
  submissionId?: string;
  answerText: string;
  isCorrect?: boolean | null;
  feedback?: string | null;
  question?: Question;
}

export interface QuizSubmission {
  id?: string;
  quizId: string;
  studentId: string;
  attemptNumber: number;
  status: SubmissionStatus;
  feedback?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  answers?: SubmissionAnswer[];
  quiz?: Quiz;
  student?: Student;
}

// New Assistance Submission Types
export interface AssistanceAnswerYesNo {
  id?: string;
  questionId: string;
  submissionId?: string;
  answer: boolean;
  isCorrect: boolean;
  question?: {
    id: string;
    question: string;
    correctAnswer: boolean;
    explanation?: string | null;
  };
}

export interface AssistanceLevel1Submission {
  id?: string;
  assistanceId: string;
  studentId: string;
  status: SubmissionStatus;
  createdAt?: Date;
  updatedAt?: Date;
  answers: AssistanceAnswerYesNo[];
  assistance?: QuizAssistanceLevel1;
}

export interface AssistanceAnswerEssay {
  id?: string;
  questionId: string;
  submissionId?: string;
  answerText: string;
  isCorrect?: boolean | null;
  feedback?: string | null;
  question?: {
    id: string;
    question: string;
    hint?: string | null;
    correctAnswer: string;
  };
}

export interface AssistanceLevel2Submission {
  id?: string;
  assistanceId: string;
  studentId: string;
  status: SubmissionStatus;
  feedback?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  answers: AssistanceAnswerEssay[];
  assistance?: QuizAssistanceLevel2;
}

export interface AssistanceLevel3Completion {
  id?: string;
  assistanceId: string;
  studentId: string;
  createdAt?: Date;
}

// Quiz Progress Types
export enum AssistanceRequirement {
  NONE = "NONE",
  ASSISTANCE_LEVEL1 = "ASSISTANCE_LEVEL1",
  ASSISTANCE_LEVEL2 = "ASSISTANCE_LEVEL2",
  ASSISTANCE_LEVEL3 = "ASSISTANCE_LEVEL3"
}

export interface StudentQuizProgress {
  id?: string;
  quizId: string;
  studentId: string;
  currentAttempt: number;
  lastAttemptPassed?: boolean | null;
  maxAttempts: number;
  assistanceRequired: AssistanceRequirement;
  level1Completed: boolean;
  level2Completed: boolean;
  level3Completed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  quiz?: Quiz;
  student?: Student;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
} 