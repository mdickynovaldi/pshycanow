import { z } from "zod";

// Schema untuk pertanyaan kuis
export const questionSchema = z.object({
  id: z.string().optional(), // Opsional untuk pertanyaan baru
  text: z.string({ required_error: "Teks pertanyaan wajib diisi" })
    .min(3, { message: "Teks pertanyaan minimal 3 karakter" }),
  imageUrl: z.string().optional(),
  expectedAnswer: z.string().optional(),
  quizId: z.string().optional(), // Diisi otomatis saat membuat pertanyaan
});

// Schema untuk kuis baru
export const createQuizSchema = z.object({
  title: z.string({ required_error: "Judul kuis wajib diisi" })
    .min(3, { message: "Judul kuis minimal 3 karakter" }),
  description: z.string().optional(),
  classId: z.string().optional(),
  questions: z.array(questionSchema).optional(),
});

// Schema untuk memperbarui kuis
export const updateQuizSchema = createQuizSchema.extend({
  id: z.string({ required_error: "ID kuis diperlukan" }),
});

// Tipe untuk input pembuatan kuis
export type CreateQuizInput = z.infer<typeof createQuizSchema>;

// Tipe untuk input pembaruan kuis
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;

// Tipe untuk input pertanyaan
export type QuestionInput = z.infer<typeof questionSchema>; 