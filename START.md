# 🚀 Quick Start - MangaKu Website

## Cara Cepat Menjalankan

### 1. Install Dependencies
```bash
npm install
```

### 2. Jalankan Server
```bash
npm start
```

### 3. Buka Browser
```
http://localhost:3000
```

## ✨ Website Sudah Siap!

Website akan otomatis:
- ✅ Mengambil data manga REAL dari MangaDex API
- ✅ Auto-update setiap kali halaman di-refresh
- ✅ Caching untuk performa lebih cepat
- ✅ Rate limiting untuk protect server

## 📚 Sumber Data

### Primary Source (Bekerja 100%):
- **MangaDex** - Menggunakan API resmi, paling reliable dan stabil
  - Manga list ✅
  - Search ✅
  - Detail ✅
  - Chapters ✅
  - Pages/Images ✅

### Secondary Sources (Experimental):
- **Komiku** - Web scraping (mungkin perlu penyesuaian)
- **WestManga** - Web scraping (mungkin perlu penyesuaian)
- **BacaManga** - Web scraping (mungkin perlu penyesuaian)

**Note**: Website scraping bisa berubah kapan saja tergantung struktur HTML website target. MangaDex API adalah yang paling stabil.

## 🎯 Fitur yang Sudah Berfungsi

### Homepage
- Tampilkan manga terbaru dari MangaDex
- Filter by source (default: MangaDex)
- Search manga (real-time)
- Pagination

### Detail Page
- Info lengkap manga (title, cover, author, genres, description)
- List chapter lengkap
- Related manga

### Reader Page
- Baca chapter dengan gambar real
- Multiple reading modes (vertical, horizontal, single page)
- Navigation prev/next chapter
- Adjustable image width

## 🔧 Konfigurasi

### Ganti Default Source
Edit `script.js` baris 5:
```javascript
let currentSource = 'mangadex'; // atau: komiku, westmanga, maid, bacamanga
```

### Adjust Cache TTL
Edit `utils/cache.js`:
```javascript
const mangaListCache = new Cache(600000);    // 10 minutes
const mangaDetailCache = new Cache(1800000); // 30 minutes
```

### Adjust Rate Limits
Edit `utils/rateLimiter.js`:
```javascript
const mangadexLimiter = new RateLimiter(5, 1000); // 5 req/sec
```

## 📖 Cara Menggunakan

1. **Homepage** - Browse manga terbaru
2. **Click manga** - Lihat detail & chapter list
3. **Click chapter** - Mulai baca
4. **Navigation** - Gunakan tombol prev/next atau keyboard arrows

## 🐛 Troubleshooting

### Manga tidak muncul?
- Cek koneksi internet
- Pastikan MangaDex.org tidak down
- Coba refresh page
- Check console browser (F12) untuk error

### Images tidak load?
- Tunggu beberapa saat (lazy loading)
- Check network tab di browser
- Mungkin rate limited, tunggu sebentar

### Source lain tidak work?
- Website scraping bisa berubah structure HTML nya
- Gunakan MangaDex sebagai primary source
- Atau update scraper sesuai HTML structure terbaru

## 💡 Tips

- **MangaDex** adalah sumber paling reliable
- **Search** berfungsi baik di MangaDex
- **Cache** akan expired otomatis
- **Rate limiting** mencegah IP banned

## 📝 Development

### Test Scrapers
```bash
node test-scrapers.js
```

### Clear Cache
```bash
POST http://localhost:3000/api/cache/clear
```

### Check Health
```bash
GET http://localhost:3000/api/health
```

---

**Selamat Membaca Manga! 📚✨**
