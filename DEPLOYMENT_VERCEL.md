# 🚀 Panduan Deploy MangaKu ke Vercel

Panduan lengkap untuk deploy website MangaKu ke Vercel dengan konfigurasi optimal.

## 📋 Prerequisites

1. **Akun Vercel** - Daftar di [vercel.com](https://vercel.com) (gratis)
2. **Git Repository** - Push code ke GitHub/GitLab/Bitbucket
3. **Node.js** - Minimal versi 18.x

## 🔧 Persiapan Sebelum Deploy

### 1. Install Dependencies

```bash
npm install
```

### 2. Cek File yang Sudah Disiapkan

✅ `vercel.json` - Konfigurasi Vercel
✅ `.vercelignore` - File yang tidak perlu di-upload
✅ `api/*.js` - Serverless functions untuk API
✅ `utils/vercelCache.js` - Cache helper (optional KV support)

### 3. Update Package.json (Opsional)

Tambahkan script untuk Vercel:

```json
{
  "scripts": {
    "start": "node api-server.js",
    "vercel-build": "echo 'Build complete'"
  }
}
```

## 🌐 Cara Deploy ke Vercel

### Metode 1: Deploy via Web Dashboard (Recommended)

1. **Login ke Vercel**
   - Buka [vercel.com/dashboard](https://vercel.com/dashboard)
   - Login dengan GitHub/GitLab/Bitbucket

2. **Import Project**
   - Klik "Add New" → "Project"
   - Pilih repository MangaKu
   - Vercel akan otomatis detect konfigurasi

3. **Configure Project**
   - **Framework Preset**: Other
   - **Root Directory**: ./
   - **Build Command**: (kosongkan atau `npm run vercel-build`)
   - **Output Directory**: (kosongkan)

4. **Environment Variables** (Opsional)
   - Tambahkan jika ada API keys:
     ```
     NODE_ENV=production
     ```

5. **Deploy!**
   - Klik "Deploy"
   - Tunggu 2-5 menit
   - Website akan live di `https://your-project.vercel.app`

### Metode 2: Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy ke production
vercel --prod
```

## 📁 Struktur File untuk Vercel

```
/
├── api/                    # Serverless Functions
│   ├── manga.js           # GET /api/manga
│   ├── detail.js          # GET /api/detail?id=xxx
│   ├── chapters.js        # GET /api/chapters?id=xxx
│   ├── pages.js           # GET /api/pages?id=xxx
│   └── search.js          # GET /api/search?q=xxx
├── scrapers/              # Manga scrapers
├── utils/                 # Utilities
│   └── vercelCache.js    # Cache helper
├── *.html                 # Static HTML files
├── *.js                   # Static JavaScript
├── *.css                  # Static CSS
├── vercel.json           # Vercel config
└── .vercelignore         # Ignore files
```

## 🔀 API Routes di Vercel

Setelah deploy, API endpoints akan tersedia di:

### 1. Get Manga List
```
GET https://your-project.vercel.app/api/manga?source=mangadex&page=1
```

**Query Parameters:**
- `source`: mangadex | komiku | maid | bacamanga | kiryuu | jikan
- `page`: nomor halaman (default: 1)

### 2. Get Manga Detail
```
GET https://your-project.vercel.app/api/manga/[manga-id]/detail?source=mangadex
```

### 3. Get Chapters
```
GET https://your-project.vercel.app/api/manga/[manga-id]/chapters?source=mangadex
```

### 4. Get Chapter Pages
```
GET https://your-project.vercel.app/api/chapter/[chapter-id]/pages?source=mangadex
```

### 5. Search Manga
```
GET https://your-project.vercel.app/api/search?q=naruto&source=mangadex
```

## ⚙️ Konfigurasi Lanjutan

### 1. Custom Domain

1. Buka project di Vercel Dashboard
2. Settings → Domains
3. Tambahkan domain (contoh: `mangaku.com`)
4. Update DNS records sesuai instruksi Vercel

### 2. Environment Variables

Jika butuh API keys atau secrets:

1. Settings → Environment Variables
2. Tambahkan variabel:
   ```
   SCRAPER_API_KEY=xxx
   PROXY_API_KEY=yyy
   ```

### 3. Enable Vercel KV (Caching) - OPTIONAL

Untuk performa lebih baik dengan Redis cache:

1. **Buka Vercel Dashboard** → Storage
2. **Klik "Create Database"** → KV
3. **Pilih region** (pilih yang dekat dengan user)
4. **Connect ke project**
5. **Install package**:
   ```bash
   npm install @vercel/kv
   ```
6. **Vercel akan auto-inject environment variables**
7. **Cache sudah aktif otomatis!**

### 4. Analytics & Monitoring

Vercel otomatis provide:
- ✅ Web Analytics (gratis)
- ✅ Speed Insights
- ✅ Function Logs
- ✅ Error Tracking

Bisa diakses di Dashboard → Analytics

## 🚨 Troubleshooting

### Error: "Function Timeout"

**Penyebab**: Scraping terlalu lama (>60 detik)

**Solusi**:
1. Enable Vercel KV untuk caching
2. Upgrade ke Vercel Pro (timeout 300 detik)
3. Optimize scraper code

### Error: "Module not found"

**Penyebab**: Dependencies tidak ter-install

**Solusi**:
```bash
# Pastikan semua dependencies ada di package.json
npm install
vercel --prod
```

### Error: "429 Too Many Requests"

**Penyebab**: Rate limit dari source website

**Solusi**:
1. Enable caching untuk reduce requests
2. Gunakan multiple sources
3. Add retry logic dengan exponential backoff

## 📊 Limits Vercel Free Plan

| Feature | Free | Pro |
|---------|------|-----|
| **Bandwidth** | 100GB/bulan | 1TB/bulan |
| **Function Duration** | 10 detik | 300 detik |
| **Function Memory** | 1024MB | 3008MB |
| **Builds** | 100 jam/bulan | Unlimited |
| **KV Storage** | 256MB | 512MB |

**Rekomendasi**:
- Free plan cukup untuk 10k-50k visitors/bulan
- Upgrade ke Pro jika scraping sering timeout

## 🎯 Optimasi Performa

### 1. Caching Strategy

```javascript
// Manga list: 5 menit
Cache-Control: s-maxage=300

// Manga detail: 1 jam
Cache-Control: s-maxage=3600

// Chapter pages: 1 hari
Cache-Control: s-maxage=86400
```

### 2. Image Optimization

Vercel otomatis optimize images dengan:
- WebP conversion
- Lazy loading
- Responsive sizing

### 3. Edge Caching

Vercel cache responses di edge network worldwide untuk latency rendah.

## 🔄 Update & Rollback

### Auto Deploy
Setiap push ke branch `main` akan auto-deploy ke production.

### Manual Rollback
1. Buka Vercel Dashboard → Deployments
2. Pilih deployment yang stable
3. Klik "Promote to Production"

## 📞 Support

Jika ada masalah:
1. Check [Vercel Logs](https://vercel.com/docs/observability/logs)
2. Baca [Vercel Docs](https://vercel.com/docs)
3. Ask di [Vercel Community](https://vercel.com/community)

## ✅ Checklist Deploy

- [ ] Install dependencies: `npm install`
- [ ] Test local: `node api-server.js`
- [ ] Commit & push ke Git
- [ ] Import project di Vercel
- [ ] Deploy & test
- [ ] (Optional) Setup custom domain
- [ ] (Optional) Enable Vercel KV
- [ ] Monitor analytics

---

**Selamat! Website MangaKu kamu sudah live! 🎉**

URL: `https://your-project.vercel.app`
