import { z } from "zod";

// Skema untuk membuat kelas baru
export const createClassSchema = z.object({
  name: z.string({ required_error: "Nama kelas wajib diisi" })
    .min(3, { message: "Nama kelas minimal 3 karakter" }),
  description: z.string().optional(),
});

// Skema untuk memperbarui kelas
export const updateClassSchema = z.object({
  name: z.string({ required_error: "Nama kelas wajib diisi" })
    .min(3, { message: "Nama kelas minimal 3 karakter" }),
  description: z.string().optional(),
});

// Skema untuk mendaftarkan siswa ke kelas
export const enrollStudentsSchema = z.object({
  classId: z.string({ required_error: "ID kelas diperlukan" }),
  studentIds: z.array(z.string())
    .min(1, { message: "Pilih minimal 1 siswa" }),
});

// Skema untuk menghapus siswa dari kelas
export const removeStudentSchema = z.object({
  classId: z.string({ required_error: "ID kelas diperlukan" }),
  studentId: z.string({ required_error: "ID siswa diperlukan" }),
});

// Tipe untuk input pembuatan kelas
export type CreateClassInput = z.infer<typeof createClassSchema>;

// Tipe untuk input pembaruan kelas
export type UpdateClassInput = z.infer<typeof updateClassSchema>;

// Tipe untuk input pendaftaran siswa
export type EnrollStudentsInput = z.infer<typeof enrollStudentsSchema>;

// Tipe untuk input penghapusan siswa
export type RemoveStudentInput = z.infer<typeof removeStudentSchema>; 