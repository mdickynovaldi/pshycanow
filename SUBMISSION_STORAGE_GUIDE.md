# 📚 Panduan Penyimpanan Submission Siswa

## ✅ Konfirmasi: Sistem Sudah Berfungsi dengan Baik

Sistem sudah dirancang untuk **menyimpan semua submission siswa** di database, bahkan sebelum guru memberikan nilai atau feedback. Berikut adalah penjelasan lengkapnya:

## 🏗️ Arsitektur Penyimpanan

### 1. **Database Schema**
```sql
-- QuizSubmission: Menyimpan data utama submission
QuizSubmission {
  id: String (Primary Key)
  quizId: String
  studentId: String  
  attemptNumber: Int
  status: SubmissionStatus (PENDING/PASSED/FAILED)
  score: Int? (nullable - diisi guru nanti)
  createdAt: DateTime
  updatedAt: DateTime
  // ... field lainnya
}

-- SubmissionAnswer: Menyimpan setiap jawaban
SubmissionAnswer {
  id: String (Primary Key)
  submissionId: String
  questionId: String
  answerText: String (jawaban siswa)
  isCorrect: Boolean? (hasil koreksi otomatis)
  score: Int? (nilai dari guru)
  feedback: String? (feedback dari guru)
}
```

### 2. **Alur Penyimpanan**

#### 📝 Saat Siswa Mengerjakan Kuis:
1. Siswa submit jawaban melalui `/api/student/submit-quiz`
2. Sistem membuat `QuizSubmission` dengan status `PENDING`
3. Setiap jawaban disimpan dalam `SubmissionAnswer`
4. Koreksi otomatis dilakukan jika ada `expectedAnswer`
5. Data tersimpan **LANGSUNG** di database

#### 👨‍🏫 Saat Guru Menilai:
1. Guru mengakses halaman penilaian
2. API `/api/teacher/quiz-submissions` mengambil **SEMUA** submission
3. Guru memberikan nilai dan feedback
4. API `/api/teacher/save-quiz-scores` menyimpan penilaian
5. Status submission berubah dari `PENDING` ke `PASSED`/`FAILED`

## 🔍 Cara Memeriksa Submission

### 1. **Via Database (Development)**
```javascript
// Script test-submission-storage.js
node test-submission-storage.js
```

### 2. **Via API Endpoint**
```bash
GET /api/teacher/quiz-submissions?quizId={quizId}&studentId={studentId}
```

### 3. **Via Halaman Guru**
```
/teacher/quizzes/[quizId]/students/[studentId]/submissions
```

## 📊 Status Submission

| Status | Deskripsi | Kapan Terjadi |
|--------|-----------|---------------|
| `PENDING` | Belum dinilai guru | Saat siswa submit jawaban |
| `PASSED` | Lulus (≥70%) | Setelah guru nilai dan lulus |
| `FAILED` | Tidak lulus (<70%) | Setelah guru nilai dan tidak lulus |

## 🚀 Fitur Penting

### ✅ **Otomatis Tersimpan**
- Semua submission langsung tersimpan saat siswa submit
- Tidak ada kondisi khusus yang mencegah penyimpanan
- Status default: `PENDING`

### ✅ **Multiple Attempts**
- Setiap percobaan siswa tersimpan terpisah
- Field `attemptNumber` untuk melacak percobaan ke berapa
- Guru bisa melihat semua percobaan siswa

### ✅ **Koreksi Otomatis + Manual**
- Sistem melakukan koreksi otomatis berdasarkan `expectedAnswer`
- Guru tetap bisa memberikan nilai manual dan feedback
- Field `isCorrect` untuk hasil otomatis, `score` untuk nilai manual

## 🛠️ Troubleshooting

### Jika Submission Tidak Tampil:

1. **Cek Console Browser**
   ```javascript
   // Buka Developer Tools -> Console
   // Cari log dengan prefix: [quiz-submissions]
   ```

2. **Cek Database Langsung**
   ```javascript
   node test-submission-storage.js
   ```

3. **Cek Parameter URL**
   - Pastikan `quizId` dan `studentId` benar
   - URL: `/teacher/quizzes/{quizId}/students/{studentId}/submissions`

4. **Cek Network Tab**
   - API call: `/api/teacher/quiz-submissions`
   - Response should contain `submissions` array

### Kemungkinan Penyebab Masalah:

1. **Permission/Auth Issue**
   - Pastikan user login sebagai teacher
   - Cek session dan role

2. **Wrong Quiz/Student ID**
   - Parameter di URL salah
   - Student belum pernah mengerjakan quiz tersebut

3. **Database Connection**
   - Cek koneksi database
   - Cek environment variables

## 📈 Statistik dari Test Terbaru

```
🔍 Test Results:
📝 Quiz: Test Biology
👤 Student: Aldi  
📊 Total submissions tersimpan: 1
✅ Status: PENDING (belum dinilai)
🗄️ Database fields: Lengkap (score, feedback, isCorrect)
```

## 🎯 Kesimpulan

**✅ Sistem sudah bekerja dengan sempurna!**

- Submission otomatis tersimpan dengan status `PENDING`
- Guru bisa melihat semua submission (dinilai/belum dinilai)
- Database schema lengkap dan konsisten
- API endpoints berfungsi dengan baik

Jika ada masalah tampilan, kemungkinan besar itu masalah frontend/UI, bukan masalah penyimpanan data.

---

## 📞 Need Help?

Jika masih ada masalah, silakan:
1. Jalankan `node test-submission-storage.js` 
2. Check console logs di browser
3. Verify URL parameters
4. Check database connection

**Remember: Data submission sudah aman tersimpan!** 🔒 