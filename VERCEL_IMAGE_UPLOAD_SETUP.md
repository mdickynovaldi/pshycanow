# Setup Upload Gambar di Vercel dengan Blob Storage

## Masalah
Saat deployment di Vercel, upload gambar menggunakan sistem file lokal tidak berfungsi karena file sistem di Vercel bersifat read-only.

## Solusi
Menggunakan Vercel Blob Storage untuk menyimpan gambar secara permanen.

## Langkah-langkah Setup

### 1. Verifikasi Dependencies
Pastikan `@vercel/blob` sudah terinstall (sudah ada di package.json):
```json
"@vercel/blob": "^1.1.1"
```

### 2. Konfigurasi Environment Variables
Tambahkan environment variable berikut di dashboard Vercel:

1. **BLOB_READ_WRITE_TOKEN**
   - Buka [Vercel Dashboard](https://vercel.com/dashboard)
   - Pilih project Anda
   - Go to Settings → Environment Variables
   - Tambahkan variable:
     - Name: `BLOB_READ_WRITE_TOKEN`
     - Value: (akan auto-generate saat Anda enable Blob Storage)

### 3. Enable Blob Storage di Vercel
1. Buka project di Vercel Dashboard
2. Go to Storage tab
3. Klik "Create" → "Blob"
4. Ikuti wizard setup
5. Token akan otomatis ter-generate dan tersedia di environment variables

### 4. Update Kode (Sudah Selesai)
File `src/app/api/upload/route.ts` sudah diupdate untuk menggunakan Vercel Blob Storage.

### 5. Deploy dan Test
1. Commit perubahan ke repository
2. Vercel akan otomatis deploy
3. Test upload gambar di form quiz

## Fitur yang Sudah Dikonfigurasi

### Upload Gambar Quiz
- **Endpoint**: `/api/upload`
- **Method**: POST
- **Format**: multipart/form-data
- **File Types**: JPEG, PNG, GIF
- **Max Size**: 5MB
- **Storage**: Vercel Blob Storage
- **Access**: Public (dapat diakses langsung via URL)

### Validasi
- ✅ Autentikasi (hanya teacher yang bisa upload)
- ✅ Validasi tipe file
- ✅ Validasi ukuran file
- ✅ Nama file unik (UUID)
- ✅ Folder terorganisir (`quiz-images/`)

## Environment Variables Required

```env
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
```

## Testing
Setelah setup selesai, Anda dapat test upload gambar dengan:
1. Login sebagai teacher
2. Buat/edit quiz
3. Tambah pertanyaan
4. Upload gambar ke pertanyaan
5. Verifikasi gambar tersimpan dan dapat ditampilkan

## Troubleshooting

### Error: "Missing BLOB_READ_WRITE_TOKEN"
- Pastikan environment variable sudah diset di Vercel Dashboard
- Redeploy aplikasi setelah menambah environment variable

### Error: "Failed to upload"
- Check console log di Vercel Functions untuk detail error
- Pastikan file size tidak melebihi 5MB
- Pastikan format file adalah JPEG/PNG/GIF

### Gambar tidak muncul
- Verifikasi URL yang dikembalikan dari API
- Pastikan blob access setting adalah 'public'
- Check network tab di browser untuk error loading image 