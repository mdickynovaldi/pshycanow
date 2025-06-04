# Skema Boolean Tracking untuk Bantuan Kuis

## Overview

Skema ini dirancang untuk mendeteksi apakah user telah mengerjakan bantuan kuis atau belum, dan menentukan kapan user dapat mengerjakan kuis utama. Implementasi ini menggunakan field boolean di database dan API endpoint yang sesuai.

## Perubahan Database Schema

### 1. Model `StudentQuizProgress`

```prisma
model StudentQuizProgress {
  // ... existing fields ...
  
  // Boolean flags untuk mendeteksi penyelesaian bantuan
  level1Completed   Boolean   @default(false)  // Mendeteksi apakah bantuan level 1 telah diselesaikan
  level2Completed   Boolean   @default(false)  // Mendeteksi apakah bantuan level 2 telah diselesaikan
  level3Completed   Boolean   @default(false)  // Mendeteksi apakah bantuan level 3 telah diselesaikan
  
  // Boolean flags untuk mendeteksi akses bantuan
  level1Accessible  Boolean   @default(false)  // Mendeteksi apakah bantuan level 1 dapat diakses
  level2Accessible  Boolean   @default(false)  // Mendeteksi apakah bantuan level 2 dapat diakses
  level3Accessible  Boolean   @default(false)  // Mendeteksi apakah bantuan level 3 dapat diakses
  
  // Boolean flags untuk mendeteksi pengerjaan kuis utama setelah bantuan
  mustRetakeMainQuiz Boolean  @default(false)  // Mendeteksi apakah user wajib mengerjakan kuis utama lagi
  canTakeMainQuiz   Boolean   @default(true)   // Mendeteksi apakah user dapat mengerjakan kuis utama
  
  // Timestamps untuk tracking kapan bantuan diselesaikan
  level1CompletedAt DateTime? // Timestamp kapan bantuan level 1 diselesaikan
  level2CompletedAt DateTime? // Timestamp kapan bantuan level 2 diselesaikan
  level3CompletedAt DateTime? // Timestamp kapan bantuan level 3 diselesaikan
  
  // ... other fields ...
}
```

### 2. Model `AssistanceLevel1Submission`

```prisma
model AssistanceLevel1Submission {
  // ... existing fields ...
  isCompleted   Boolean   @default(false) // Boolean untuk mendeteksi penyelesaian
  // ... other fields ...
}
```

### 3. Model `AssistanceLevel2Submission`

```prisma
model AssistanceLevel2Submission {
  // ... existing fields ...
  isCompleted   Boolean   @default(false) // Boolean untuk mendeteksi penyelesaian
  isApproved    Boolean   @default(false) // Boolean untuk mendeteksi approval dari guru
  // ... other fields ...
}
```

### 4. Model `AssistanceLevel3Completion`

```prisma
model AssistanceLevel3Completion {
  // ... existing fields ...
  isCompleted   Boolean   @default(false) // Boolean untuk mendeteksi penyelesaian
  readingTime   Int?      // Waktu baca dalam detik (opsional)
  // ... other fields ...
}
```

## API Endpoints

### 1. GET `/api/assistance/status?quizId={quizId}`

Mengambil status bantuan untuk quiz tertentu.

**Response:**
```json
{
  "assistanceStatus": {
    "level1Completed": true,
    "level2Completed": false,
    "level3Completed": false,
    "level1Accessible": true,
    "level2Accessible": true,
    "level3Accessible": false,
    "mustRetakeMainQuiz": true,
    "canTakeMainQuiz": true,
    "nextStep": "TRY_MAIN_QUIZ_AGAIN"
  },
  "success": true
}
```

### 2. POST `/api/assistance/{level}/complete`

Menandai bantuan level tertentu sebagai selesai.

**Request Body:**
```json
{
  "quizId": "quiz-id",
  "submissionId": "submission-id", // untuk level 1 & 2
  "assistanceId": "assistance-id", // untuk level 3
  "readingTime": 300, // untuk level 3 (opsional)
  "isApproved": true // untuk level 2 (opsional)
}
```

### 3. POST `/api/assistance/reset-main-quiz-flag`

Reset flag `mustRetakeMainQuiz` setelah user mulai kuis utama.

**Request Body:**
```json
{
  "quizId": "quiz-id"
}
```

## Fungsi Library

### 1. `useAssistanceStatus(quizId: string)`

React hook untuk mengelola status bantuan.

```typescript
const {
  assistanceStatus,
  loading,
  error,
  fetchAssistanceStatus,
  markAssistanceCompleted,
  resetMainQuizFlag,
} = useAssistanceStatus(quizId);
```

### 2. Fungsi Utility

```typescript
// Menandai bantuan level 1 selesai
await markAssistanceLevel1Completed(studentId, quizId, submissionId);

// Menandai bantuan level 2 selesai
await markAssistanceLevel2Completed(studentId, quizId, submissionId, isApproved);

// Menandai bantuan level 3 selesai
await markAssistanceLevel3Completed(studentId, quizId, assistanceId, readingTime);

// Mengambil status bantuan
const status = await getAssistanceStatus(studentId, quizId);

// Reset flag wajib mengerjakan kuis utama
await resetMustRetakeMainQuizFlag(studentId, quizId);
```

## Komponen UI

### 1. `MainQuizButton`

Komponen yang menampilkan button kuis utama berdasarkan status bantuan.

```tsx
<MainQuizButton
  quizId={quizId}
  onStartQuiz={handleStartQuiz}
  isStartingQuiz={isStartingQuiz}
  className="mb-6"
/>
```

### 2. `AssistanceStatusIndicator`

Komponen yang menampilkan status bantuan secara visual.

```tsx
<AssistanceStatusIndicator quizId={quizId} />
```

## Logic Flow

### 1. Inisialisasi
- User pertama kali mengakses quiz: `canTakeMainQuiz = true`, semua level `*Completed = false`
- Accessibility level ditentukan berdasarkan `failedAttempts`

### 2. Setelah Gagal Kuis Utama
- `failedAttempts` bertambah
- Level accessibility di-update berdasarkan jumlah failed attempts:
  - 1 kali gagal: `level1Accessible = true`
  - 2 kali gagal: `level2Accessible = true`
  - 3 kali gagal: `level3Accessible = true`

### 3. Setelah Menyelesaikan Bantuan
- Flag `levelXCompleted = true`
- Flag `mustRetakeMainQuiz = true`
- Flag `canTakeMainQuiz = true`
- `nextStep = "TRY_MAIN_QUIZ_AGAIN"`

### 4. Sebelum Memulai Kuis Utama Lagi
- Reset `mustRetakeMainQuiz = false`
- Reset `nextStep = null`

## Implementasi di Frontend

### 1. Halaman Student Quiz

```tsx
import { MainQuizButton } from "@/components/MainQuizButton";
import { useAssistanceStatus } from "@/hooks/useAssistanceStatus";

export default function StudentQuizPage() {
  const { assistanceStatus, markAssistanceCompleted } = useAssistanceStatus(quizId);
  
  const handleStartQuiz = () => {
    // Logic untuk memulai kuis utama
  };

  return (
    <div>
      {/* Komponen button kuis utama */}
      <MainQuizButton
        quizId={quizId}
        onStartQuiz={handleStartQuiz}
        isStartingQuiz={isStartingQuiz}
      />
      
      {/* Bantuan sections dengan logic berdasarkan assistanceStatus */}
    </div>
  );
}
```

### 2. Setelah Menyelesaikan Bantuan

```tsx
// Level 1
const handleCompleteLevel1 = async (submissionId: string) => {
  await markAssistanceCompleted(1, { submissionId });
};

// Level 2  
const handleCompleteLevel2 = async (submissionId: string, isApproved: boolean) => {
  await markAssistanceCompleted(2, { submissionId, isApproved });
};

// Level 3
const handleCompleteLevel3 = async (assistanceId: string, readingTime?: number) => {
  await markAssistanceCompleted(3, { assistanceId, readingTime });
};
```

## Migrasi Database

Jalankan migrasi untuk menerapkan perubahan schema:

```bash
npx prisma migrate dev --name "add_assistance_completion_tracking_fields"
```

## Testing

### 1. Unit Test untuk API
- Test endpoint `/api/assistance/status`
- Test endpoint `/api/assistance/{level}/complete`
- Test endpoint `/api/assistance/reset-main-quiz-flag`

### 2. Integration Test
- Test flow lengkap dari gagal kuis → akses bantuan → selesai bantuan → wajib kuis utama
- Test accessibility logic berdasarkan failed attempts

### 3. UI Test
- Test komponen `MainQuizButton` dengan berbagai status
- Test komponen `AssistanceStatusIndicator`

## Best Practices

1. **Selalu validasi status di backend** sebelum mengizinkan aksi
2. **Gunakan transactions** untuk operasi yang melibatkan multiple tables
3. **Log semua perubahan status** untuk debugging
4. **Implement error handling** yang robust di frontend
5. **Cache status** di frontend untuk mengurangi API calls

## Troubleshooting

### 1. Status Tidak Update
- Periksa apakah `fetchAssistanceStatus()` dipanggil setelah marking completion
- Pastikan API endpoint mengembalikan response yang benar

### 2. Button Tidak Muncul
- Periksa `assistanceStatus.canTakeMainQuiz` dan `assistanceStatus.mustRetakeMainQuiz`
- Pastikan data di database konsisten

### 3. Level Tidak Accessible
- Periksa `failedAttempts` count di database
- Pastikan `updateAssistanceAccessibility()` dipanggil setelah quiz submission
