import * as z from 'zod';

// Level 1 - Yes/No Questions
const questionYesNoSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(1, "Pertanyaan tidak boleh kosong"),
  correctAnswer: z.boolean(),
  explanation: z.string().nullable().optional(),
});

export const quizAssistanceLevel1Schema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Judul tidak boleh kosong"),
  description: z.string().nullable().optional(),
  quizId: z.string(),
  questions: z.array(questionYesNoSchema)
    .min(1, "Minimal 1 pertanyaan diperlukan"),
});

export type QuizAssistanceLevel1Input = z.infer<typeof quizAssistanceLevel1Schema>;

// Level 2 - Essay Questions
const questionEssaySchema = z.object({
  id: z.string().optional(),
  question: z.string().min(1, "Pertanyaan tidak boleh kosong"),
  hint: z.string().nullable().optional(),
  correctAnswer: z.string().min(1, "Jawaban tidak boleh kosong"),
});

export const quizAssistanceLevel2Schema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Judul tidak boleh kosong"),
  description: z.string().nullable().optional(),
  quizId: z.string(),
  questions: z.array(questionEssaySchema)
    .min(1, "Minimal 1 pertanyaan diperlukan"),
});

export type QuizAssistanceLevel2Input = z.infer<typeof quizAssistanceLevel2Schema>;

// Level 3 - PDF Reference
export const quizAssistanceLevel3Schema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Judul tidak boleh kosong"),
  description: z.string().nullable().optional(),
  quizId: z.string(),
  pdfUrl: z.string().optional(),
});

export type QuizAssistanceLevel3Input = z.infer<typeof quizAssistanceLevel3Schema>;

// Skema untuk pertanyaan bantuan level 1 (Ya/Tidak)
export const assistanceQuestionYesNoSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(1, "Pertanyaan tidak boleh kosong"),
  correctAnswer: z.boolean(),
  explanation: z.string().optional().nullable()
});

// Skema untuk kuis bantuan level 1
export const assistanceLevel1Schema = z.object({
  quizId: z.string(),
  title: z.string().min(1, "Judul tidak boleh kosong"),
  description: z.string().optional().nullable(),
  questions: z.array(assistanceQuestionYesNoSchema)
    .min(1, "Minimal harus ada 1 pertanyaan")
});

// Skema untuk pertanyaan bantuan level 2 (Essay)
export const assistanceQuestionEssaySchema = z.object({
  id: z.string().optional(),
  question: z.string().min(1, "Pertanyaan tidak boleh kosong"),
  hint: z.string().optional().nullable(),
  correctAnswer: z.string().min(1, "Jawaban yang benar harus diisi")
});

// Skema untuk kuis bantuan level 2
export const assistanceLevel2Schema = z.object({
  quizId: z.string(),
  title: z.string().min(1, "Judul tidak boleh kosong"),
  description: z.string().optional().nullable(),
  questions: z.array(assistanceQuestionEssaySchema)
    .min(1, "Minimal harus ada 1 pertanyaan")
});

// Skema untuk bantuan level 3 (PDF)
export const assistanceLevel3Schema = z.object({
  quizId: z.string(),
  title: z.string().min(1, "Judul tidak boleh kosong"),
  description: z.string().optional().nullable(),
  pdfUrl: z.string().optional()
});

// Skema untuk jawaban bantuan level 1
export const assistanceAnswerYesNoSchema = z.object({
  questionId: z.string(),
  answer: z.boolean()
});

// Skema untuk submisi bantuan level 1
export const assistanceLevel1SubmissionSchema = z.object({
  quizId: z.string(),
  answers: z.array(assistanceAnswerYesNoSchema)
    .min(1, "Minimal harus ada 1 jawaban")
});

// Skema untuk jawaban bantuan level 2
export const assistanceAnswerEssaySchema = z.object({
  questionId: z.string(),
  answerText: z.string().min(1, "Jawaban tidak boleh kosong")
});

// Skema untuk submisi bantuan level 2
export const assistanceLevel2SubmissionSchema = z.object({
  quizId: z.string(),
  answers: z.array(assistanceAnswerEssaySchema)
    .min(1, "Minimal harus ada 1 jawaban")
});

// Skema untuk penilaian jawaban bantuan level 2 oleh guru
export const assistanceGradingAnswerSchema = z.object({
  answerId: z.string(),
  isCorrect: z.boolean(),
  feedback: z.string().optional()
});

// Skema untuk keseluruhan penilaian submisi bantuan level 2 oleh guru
export const assistanceGradingSchema = z.object({
  submissionId: z.string(),
  answers: z.array(assistanceGradingAnswerSchema),
  feedback: z.string().optional()
});

// Skema untuk menandai bantuan level 3 telah dibaca
export const assistanceLevel3CompletionSchema = z.object({
  assistanceId: z.string()
});

// Skema untuk kemajuan kuis siswa
export const studentQuizProgressSchema = z.object({
  quizId: z.string(),
  studentId: z.string(),
  currentAttempt: z.number().int().min(0),
  lastAttemptPassed: z.boolean().nullable().optional(),
  maxAttempts: z.number().int().min(1),
  assistanceRequired: z.enum(["NONE", "ASSISTANCE_LEVEL1", "ASSISTANCE_LEVEL2", "ASSISTANCE_LEVEL3"]),
  level1Completed: z.boolean(),
  level2Completed: z.boolean(),
  level3Completed: z.boolean()
});

// Types inferred dari skema
export type AssistanceQuestionYesNoInput = z.infer<typeof assistanceQuestionYesNoSchema>;
export type AssistanceLevel1Input = z.infer<typeof assistanceLevel1Schema>;
export type AssistanceQuestionEssayInput = z.infer<typeof assistanceQuestionEssaySchema>;
export type AssistanceLevel2Input = z.infer<typeof assistanceLevel2Schema>;
export type AssistanceLevel3Input = z.infer<typeof assistanceLevel3Schema>;
export type AssistanceAnswerYesNoInput = z.infer<typeof assistanceAnswerYesNoSchema>;
export type AssistanceLevel1SubmissionInput = z.infer<typeof assistanceLevel1SubmissionSchema>;
export type AssistanceAnswerEssayInput = z.infer<typeof assistanceAnswerEssaySchema>;
export type AssistanceLevel2SubmissionInput = z.infer<typeof assistanceLevel2SubmissionSchema>;
export type AssistanceGradingAnswerInput = z.infer<typeof assistanceGradingAnswerSchema>;
export type AssistanceGradingInput = z.infer<typeof assistanceGradingSchema>;
export type AssistanceLevel3CompletionInput = z.infer<typeof assistanceLevel3CompletionSchema>;
export type StudentQuizProgressInput = z.infer<typeof studentQuizProgressSchema>; 