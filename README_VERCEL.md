# 🚀 Quick Deploy ke Vercel

## Langkah Cepat (5 Menit)

### 1. Persiapan
```bash
# Clone/Download project
git clone <repo-url>
cd mangaku

# Install dependencies
npm install
```

### 2. Push ke Git (jika belum)
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo>
git push -u origin main
```

### 3. Deploy ke Vercel
1. Buka [vercel.com](https://vercel.com/new)
2. Login dengan GitHub
3. Import repository MangaKu
4. **Klik "Deploy"** - Done! ✅

## URL Setelah Deploy

- **Website**: `https://your-project.vercel.app`
- **API**: `https://your-project.vercel.app/api/manga?source=mangadex`

## Konfigurasi Sudah Siap

✅ `vercel.json` - Routing & functions config
✅ `api/*.js` - Serverless API endpoints
✅ `.vercelignore` - Ignore unnecessary files
✅ `utils/vercelCache.js` - Cache helper

## Optional: Vercel KV (Redis Cache)

Untuk performa maksimal:

1. Vercel Dashboard → Storage → Create KV
2. Connect ke project
3. `npm install @vercel/kv`
4. Done! Cache otomatis aktif

## Troubleshooting

**Timeout Error?**
- Enable Vercel KV untuk caching
- Atau upgrade ke Vercel Pro (timeout 300s vs 10s)

**Module not found?**
```bash
npm install
git add .
git commit -m "Update dependencies"
git push
```

## Dokumentasi Lengkap

Lihat [DEPLOYMENT_VERCEL.md](./DEPLOYMENT_VERCEL.md) untuk panduan detail.

---

**That's it! Website sudah live dalam 5 menit! 🎉**
