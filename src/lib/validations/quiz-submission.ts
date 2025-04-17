import * as z from 'zod';

// Validasi untuk jawaban pada submisi kuis
export const submissionAnswerSchema = z.object({
  questionId: z.string(),
  answerText: z.string().min(1, "Jawaban tidak boleh kosong")
});

// Validasi untuk keseluruhan submisi kuis
export const quizSubmissionSchema = z.object({
  quizId: z.string(),
  answers: z.array(submissionAnswerSchema)
    .min(1, "Minimal harus ada 1 jawaban")
});

export type SubmissionAnswerInput = z.infer<typeof submissionAnswerSchema>;
export type QuizSubmissionInput = z.infer<typeof quizSubmissionSchema>;

// Validasi untuk penilaian jawaban oleh guru
export const submissionGradingAnswerSchema = z.object({
  answerId: z.string(),
  isCorrect: z.boolean(),
  feedback: z.string().optional()
});

// Validasi untuk keseluruhan penilaian submisi oleh guru
export const submissionGradingSchema = z.object({
  submissionId: z.string(),
  answers: z.array(submissionGradingAnswerSchema),
  feedback: z.string().optional()
});

export type SubmissionGradingAnswerInput = z.infer<typeof submissionGradingAnswerSchema>;
export type SubmissionGradingInput = z.infer<typeof submissionGradingSchema>; 