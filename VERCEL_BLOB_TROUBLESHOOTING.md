# Troubleshooting Vercel Blob Storage Upload

## ❌ Masalah: Gambar tidak tersimpan di Vercel

Berdasarkan analisis, ada beberapa kemungkinan masalah:

### 1. Environment Variable BLOB_READ_WRITE_TOKEN Salah Format

**❌ Format yang SALAH:**
```env
BLOB_READ_WRITE_TOKEN="https://tqzrfaqllbcjyyvo.public.blob.vercel-storage.com"
```

**✅ Format yang BENAR:**
```env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxxxxxxxxx"
```

### 2. Cara Mendapatkan Token yang Benar

#### Langkah 1: Enable Blob Storage di Vercel Dashboard
1. Buka [Vercel Dashboard](https://vercel.com/dashboard)
2. Pilih project Anda (`pshycanow`)
3. Klik tab **"Storage"**
4. Klik **"Create"** → **"Blob"**
5. Ikuti wizard setup

#### Langkah 2: Dapatkan Token
Setelah Blob Storage dibuat, token akan otomatis tersedia di:
- **Settings** → **Environment Variables**
- Cari `BLOB_READ_WRITE_TOKEN`
- Token akan berbentuk: `vercel_blob_rw_xxxxxxxxxxxxxxxxx`

#### Langkah 3: Set Environment Variable
1. Masih di Vercel Dashboard
2. Go to **Settings** → **Environment Variables**
3. Pastikan `BLOB_READ_WRITE_TOKEN` ada dan valuenya benar
4. Jika belum ada, tambahkan manual:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: `vercel_blob_rw_xxxxxxxxxxxxxxxxx` (token yang didapat dari step 2)
   - **Environments**: Production, Preview, Development

### 3. Redeploy Aplikasi
Setelah mengatur environment variable:
1. Commit dan push perubahan kode ke repository
2. Atau trigger manual deployment di Vercel Dashboard
3. Tunggu deployment selesai

### 4. Test Upload
Setelah deployment:
1. Login sebagai teacher
2. Buat/edit quiz
3. Tambah pertanyaan
4. Coba upload gambar
5. Check apakah berhasil

## 🔍 Debug Steps

### Test di Local (Opsional)
Jika ingin test di local, buat file `.env.local`:
```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxxx
```

Kemudian jalankan:
```bash
node test-blob-upload.js
```

### Check Logs di Vercel
1. Buka Vercel Dashboard
2. Go to **Functions** tab
3. Check logs untuk API `/api/upload`
4. Lihat error message yang muncul

### Common Error Messages

#### Error: "Missing BLOB_READ_WRITE_TOKEN"
**Solusi**: Environment variable tidak diset atau salah nama
- Pastikan nama variable tepat: `BLOB_READ_WRITE_TOKEN`
- Pastikan sudah di-set di semua environments (Production, Preview, Development)

#### Error: "Invalid token"
**Solusi**: Token format salah
- Pastikan token dimulai dengan `vercel_blob_rw_`
- Jangan gunakan URL storage sebagai token

#### Error: "Forbidden" or "Unauthorized"
**Solusi**: Blob Storage belum diaktifkan atau token expired
- Enable Blob Storage di Vercel Dashboard
- Generate token baru jika perlu

## 🚀 Verification Checklist

Sebelum test upload, pastikan:

### ✅ Vercel Dashboard
- [ ] Blob Storage sudah dibuat
- [ ] `BLOB_READ_WRITE_TOKEN` ada di Environment Variables
- [ ] Token format benar (`vercel_blob_rw_...`)
- [ ] Environment Variables di-set untuk Production dan Preview

### ✅ Deployment
- [ ] Kode terbaru sudah di-commit dan push
- [ ] Deployment berhasil tanpa error
- [ ] Function logs tidak menunjukkan error

### ✅ Test Upload
- [ ] Login sebagai teacher berhasil
- [ ] Form quiz dapat diakses
- [ ] Upload gambar tidak menampilkan error
- [ ] Gambar muncul di preview setelah upload

## 📞 Support

Jika masih ada masalah:
1. Check Function logs di Vercel Dashboard
2. Test dengan file gambar yang lebih kecil (< 1MB)
3. Coba browser yang berbeda
4. Clear browser cache

---

**Next Steps:**
1. Fix environment variable `BLOB_READ_WRITE_TOKEN`
2. Redeploy aplikasi
3. Test upload di production 