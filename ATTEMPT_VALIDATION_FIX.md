# Perbaikan Validasi Pengecekan Current Attempt

## Masalah yang Ditemukan

Sistem memiliki bug dalam validasi pengecekan current attempt yang menyebabkan:

1. **Duplikasi Increment Attempt**: Ada 2 kali increment attempt yang terjadi secara bersamaan
2. **Deteksi Salah pada Attempt ke-2**: Ketika siswa submit kuis utama pada percobaan ke-2, sistem mendeteksi bahwa sudah ada 4x percobaan
3. **Siswa Dinyatakan Tidak Lulus Prematur**: Siswa dinyatakan tidak lulus padahal masih ada bantuan kuis level 3 yang harus dilewati

## Root Cause Analysis

### 1. Duplikasi Increment dalam `submitQuizAnswers`

**File**: `src/lib/actions/quiz-submission-actions.ts`

**Masalah**:
```typescript
// Line 332: Increment pertama (salah)
attemptNumber = progress.currentAttempt + 1;

// Line 354-355: Increment kedua via fungsi terpisah
await incrementQuizAttempt(quizId, userId);
```

**Dampak**: `currentAttempt` di-increment 2 kali, sehingga pada percobaan ke-2 sebenarnya nilai `currentAttempt` menjadi 4.

### 2. Logic Error pada Validasi Failed Attempts

**Masalah**: Sistem menggunakan `currentAttempt` yang sudah di-increment 2x untuk menentukan level bantuan dan status kelulusan.

**Dampak**: Pada percobaan ke-2, sistem berpikir sudah ada 4 percobaan dan langsung menandai siswa sebagai FAILED.

## Solusi yang Diterapkan

### 1. Perbaikan Duplikasi Increment

**File**: `src/lib/actions/quiz-submission-actions.ts`

**Perubahan**:
```typescript
// SEBELUM: Ada duplikasi increment
attemptNumber = progress.currentAttempt + 1;
await incrementQuizAttempt(quizId, userId);

// SESUDAH: Hitung attempt number SEBELUM increment
const currentProgress = await prisma.studentQuizProgress.findUnique({
  where: { studentId_quizId: { studentId: userId, quizId: quizId } }
});

const attemptNumber = currentProgress ? currentProgress.currentAttempt + 1 : 1;

// Validasi maksimum attempt SEBELUM membuat submission
if (attemptNumber > 4) {
  return { success: false, message: "Anda telah mencapai batas maksimum 4 percobaan" };
}

// Hanya increment SATU KALI
await incrementQuizAttempt(quizId, userId);
```

### 2. Perbaikan Logic Penentuan Level Bantuan

**Perubahan**:
```typescript
// SEBELUM: Menggunakan currentAttempt yang sudah di-increment 2x
const currentAttempt = studentProgress.currentAttempt;
if (currentAttempt === 1) { ... }

// SESUDAH: Menggunakan attemptNumber yang benar
if (attemptNumber === 1) { ... }
else if (attemptNumber === 2) { ... }
else if (attemptNumber === 3) { ... }
else if (attemptNumber >= 4) {
  // HANYA dinyatakan failed jika level 3 tidak tersedia atau sudah selesai
  if (quiz.assistanceLevel3 && !studentProgress.level3Completed) {
    newAssistanceRequired = AssistanceRequirement.ASSISTANCE_LEVEL3;
    newNextStep = "VIEW_ASSISTANCE_LEVEL3";
  } else {
    newFinalStatus = SubmissionStatus.FAILED;
    newNextStep = "QUIZ_FAILED_MAX_ATTEMPTS";
  }
}
```

### 3. Konsistensi pada API Endpoints

**File yang Diperbaiki**:
- `src/app/api/quiz/direct-submit/route.ts`
- `src/app/api/student/submit-quiz/route.ts`

**Perbaikan**: Menerapkan logik yang sama untuk percobaan ke-4:
- Cek apakah bantuan level 3 tersedia dan belum diselesaikan
- Jika ya, arahkan ke bantuan level 3
- Jika tidak, baru tandai sebagai FAILED

## Validasi Perbaikan

### Test Case yang Harus Berhasil:

1. **Percobaan ke-1 gagal**: Diarahkan ke bantuan level 1
2. **Percobaan ke-2 gagal**: Diarahkan ke bantuan level 2
3. **Percobaan ke-3 gagal**: Diarahkan ke bantuan level 3
4. **Percobaan ke-4 gagal**: 
   - Jika level 3 tersedia dan belum selesai: Diarahkan ke bantuan level 3
   - Jika level 3 tidak tersedia atau sudah selesai: Dinyatakan FAILED

### Logging untuk Debugging:

```typescript
console.log(`Current attempt will be: ${attemptNumber}, existing currentAttempt: ${currentProgress?.currentAttempt || 0}`);
console.log(`Current failed attempts: ${currentFailedAttempts}, All correct: ${allCorrect}, Attempt number: ${attemptNumber}`);
```

## Files Modified:

1. `src/lib/actions/quiz-submission-actions.ts` - Main fix
2. `src/app/api/quiz/direct-submit/route.ts` - Consistency fix
3. `src/app/api/student/submit-quiz/route.ts` - Consistency fix

## Impact:

- ✅ Penghitungan attempt number kini akurat
- ✅ Siswa tidak lagi dinyatakan tidak lulus secara prematur
- ✅ Bantuan level 3 dapat diakses dengan benar pada percobaan ke-4
- ✅ Konsistensi logik di semua API endpoints 