# Perbaikan Validasi Menggunakan Failed Attempts

## Konsep Utama

Sistem telah diperbaiki untuk menggunakan `failedAttempts` sebagai basis validasi utama, menggantikan logika yang sebelumnya menggunakan `currentAttempt` atau `attemptNumber`.

## Logika Baru Failed Attempts

### 1. Definisi Field

- **`currentAttempt`**: Digunakan untuk tracking nomor percobaan (display purpose)
- **`failedAttempts`**: Digunakan untuk validasi batas maksimal kegagalan (business logic)

### 2. Aturan Validasi

- `failedAttempts` akan di-increment **HANYA** jika siswa mengerjakan kuis utama dan tidak lulus (tidak benar semua)
- Maksimal **4 failed attempts** → setelah itu siswa tidak dapat mengerjakan kuis lagi
- Jika `failedAttempts >= 4`, sistem akan menolak submit kuis

### 3. Alur Level Bantuan Berdasarkan Failed Attempts

```
failedAttempts = 1 → ASSISTANCE_LEVEL1 (jika tersedia)
failedAttempts = 2 → ASSISTANCE_LEVEL2 (jika tersedia)  
failedAttempts = 3 → ASSISTANCE_LEVEL3 (jika tersedia)
failedAttempts = 4 → FINAL_FAILED atau ASSISTANCE_LEVEL3 (jika belum selesai)
failedAttempts >= 4 → TIDAK BISA SUBMIT LAGI
```

## Files yang Diperbaiki

### 1. `src/lib/actions/quiz-submission-actions.ts`

**Perubahan Utama:**
- Validasi awal menggunakan `currentFailedAttempts >= 4`
- Logika level bantuan menggunakan `nextFailedAttempts = currentFailedAttempts + 1`
- Pesan error: "Anda telah mencapai batas maksimum 4 kali kegagalan"

**Before:**
```typescript
if (attemptNumber > 4) {
  return { success: false, message: "Maksimum 4 percobaan" };
}
```

**After:**
```typescript
const currentFailedAttempts = currentProgress?.failedAttempts || 0;
if (currentFailedAttempts >= 4) {
  return { success: false, message: "Maksimum 4 kali kegagalan" };
}
```

### 2. `src/app/api/quiz/direct-submit/route.ts`

**Perubahan Utama:**
- Tambah validasi `currentFailedAttempts >= 4` sebelum update
- Gunakan `nextFailedAttempts` untuk menentukan level bantuan
- Konsistensi pesan error dengan format yang sama

**Key Changes:**
```typescript
// VALIDASI UTAMA: Cek failedAttempts sebelum melakukan update
const currentFailedAttempts = progress.failedAttempts || 0;
const nextFailedAttempts = allCorrect ? currentFailedAttempts : currentFailedAttempts + 1;

if (currentFailedAttempts >= 4) {
  return NextResponse.json({
    success: false,
    message: "Maksimum 4 kali kegagalan"
  }, { status: 403 });
}
```

### 3. `src/app/api/student/submit-quiz/route.ts`

**Perubahan Utama:**
- Tambah query `failedAttempts` dari database
- Validasi awal `currentFailedAttempts >= 4`
- Logika alur menggunakan `nextFailedAttempts`

**Key Changes:**
```sql
SELECT "currentAttempt", "level1Completed", "level2Completed", "level3Completed", "failedAttempts" 
FROM "StudentQuizProgress"
```

## Validation Flow

### 1. Before Submit
```
1. Query current progress
2. Check currentFailedAttempts >= 4
3. If true: REJECT with error message
4. If false: PROCEED with submission
```

### 2. After Submission
```
1. Evaluate answers (allCorrect?)
2. Calculate nextFailedAttempts = allCorrect ? current : current + 1
3. Determine assistance level based on nextFailedAttempts
4. Update progress with new failedAttempts value
```

### 3. UI Integration
```
- getStudentQuizStatus() returns failedAttempts
- canTakeQuiz = (failedAttempts < 4) && other_conditions
- attemptsRemaining = 4 - failedAttempts
```

## Testing Scenarios

### Test Case 1: Normal Flow
```
1. failedAttempts = 0 → Submit → fail → failedAttempts = 1 → Level 1
2. failedAttempts = 1 → Submit → fail → failedAttempts = 2 → Level 2  
3. failedAttempts = 2 → Submit → fail → failedAttempts = 3 → Level 3
4. failedAttempts = 3 → Submit → fail → failedAttempts = 4 → FINAL_FAILED
```

### Test Case 2: Max Attempts Reached
```
1. Student has failedAttempts = 4
2. Try to submit → REJECTED with "Maksimum 4 kali kegagalan"
3. Cannot submit anymore
```

### Test Case 3: Pass After Assistance
```
1. failedAttempts = 2, complete Level 2 assistance
2. Submit again → pass → Still failedAttempts = 2 (not incremented on pass)
3. finalStatus = PASSED
```

## Benefits

1. **Clearer Business Logic**: Failed attempts truly represent actual failures
2. **Consistent Validation**: All APIs use same validation logic  
3. **Better UX**: Clear messaging about remaining attempts
4. **Easier Debugging**: Failed attempts directly correlate to student struggles

## Migration Notes

- Existing `currentAttempt` values remain unchanged (for display)
- `failedAttempts` will be calculated/updated going forward
- No data migration needed - system handles null/0 values gracefully 