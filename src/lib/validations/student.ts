import { z } from "zod";

// Skema untuk membuat siswa baru
export const createStudentSchema = z.object({
  name: z.string({ required_error: "Nama siswa wajib diisi" })
    .min(3, { message: "Nama siswa minimal 3 karakter" }),
  email: z.string({ required_error: "Email wajib diisi" })
    .email({ message: "Format email tidak valid" }),
  password: z.string({ required_error: "Password wajib diisi" })
    .min(6, { message: "Password minimal 6 karakter" }),
});

// Skema untuk memperbarui siswa
export const updateStudentSchema = z.object({
  name: z.string({ required_error: "Nama siswa wajib diisi" })
    .min(3, { message: "Nama siswa minimal 3 karakter" }),
  email: z.string({ required_error: "Email wajib diisi" })
    .email({ message: "Format email tidak valid" }),
  password: z.string()
    .min(6, { message: "Password minimal 6 karakter" })
    .optional(),
});

// Tipe untuk input pembuatan siswa
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

// Tipe untuk input pembaruan siswa
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>; 