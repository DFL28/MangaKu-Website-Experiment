# 📖 Cara Kerja Website MangaKu

## 🎯 Konsep Utama

Website ini **100% MENGGUNAKAN DATA REAL** dari sumber manga. Tidak ada dummy data sama sekali!

## 🔄 Alur Kerja Data

### 1. User Buka Homepage

```
User → Browser
  ↓
script.js memanggil: fetch('/api/manga?source=mangadex')
  ↓
api-server.js menerima request
  ↓
Cek cache - ada? return cached data
  ↓ (jika tidak ada)
Rate limiter - cek apakah boleh request
  ↓
scrapers/mangadex.js → MangaDex API
  ↓
Ambil data REAL manga (title, cover, rating, dll)
  ↓
Simpan ke cache (10 menit)
  ↓
Return ke frontend
  ↓
script.js tampilkan di HTML
```

### 2. User Click Manga → Detail Page

```
User click manga
  ↓
detail.html?id=xxx&source=mangadex
  ↓
detail-script.js fetch 2 API parallel:
  - /api/manga/:id (detail manga)
  - /api/manga/:id/chapters (list chapter)
  ↓
api-server.js → scrapers/mangadex.js
  ↓
Ambil data REAL:
  - Title, cover, author, genres, description
  - List semua chapter
  ↓
Cache & return ke frontend
  ↓
Tampilkan di HTML
```

### 3. User Baca Chapter → Reader Page

```
User click chapter
  ↓
reader.html?manga=xxx&chapter=yyy&source=mangadex
  ↓
reader-script.js fetch:
  - /api/manga/:manga/chapter/:chapter (gambar pages)
  ↓
api-server.js → scrapers/mangadex.js
  ↓
MangaDex API return URL gambar REAL
  ↓
Cache (1 jam)
  ↓
Tampilkan gambar chapter
```

## 🔍 Sumber Data

### MangaDex (PRIMARY - 100% Working)

**Kenapa MangaDex?**
- ✅ Punya API resmi yang stabil
- ✅ Tidak akan berubah structure
- ✅ Rate limit jelas (5 req/sec)
- ✅ Dokumentasi lengkap
- ✅ Gratis

**Data yang Diambil:**
- Manga list dengan pagination
- Manga detail (title, author, genres, description)
- Chapter list
- Chapter pages/images (URL langsung)
- Search function

**Lokasi Code:**
- File: `scrapers/mangadex.js`
- Function utama:
  - `getMangaList()` - List manga
  - `getMangaDetail(id)` - Detail manga
  - `getChapters(id)` - List chapter
  - `getChapterPages(id)` - Gambar chapter
  - `searchManga(query)` - Cari manga

### Komiku, WestManga, BacaManga (SECONDARY - Experimental)

**Kenapa Experimental?**
- ⚠️ Menggunakan web scraping (parse HTML)
- ⚠️ Structure HTML bisa berubah sewaktu-waktu
- ⚠️ Bisa di-block jika terlalu banyak request
- ⚠️ Tidak ada API resmi

**Cara Kerja:**
1. Axios fetch HTML page
2. Cheerio parse HTML
3. Extract data dengan CSS selectors
4. Format & return data

**Jika Tidak Work:**
- Website bisa ganti struktur HTML
- Perlu update CSS selectors di scraper
- Bisa jadi di-block (gunakan proxy/delay)

## 🔧 Sistem Cache

### Mengapa Ada Cache?

**Tanpa Cache:**
- Setiap page load = request ke MangaDex
- Lambat (tunggu response)
- Bisa kena rate limit
- Beban server besar

**Dengan Cache:**
- Request pertama → save ke memory
- Request berikutnya → ambil dari memory (instant!)
- Hanya refresh setelah expire (10 menit, 30 menit, dll)

### Cache TTL (Time To Live)

```javascript
// File: utils/cache.js

mangaListCache     → 10 menit  (data sering berubah)
mangaDetailCache   → 30 menit  (jarang berubah)
chapterListCache   → 10 menit  (sering update)
chapterPagesCache  → 1 jam     (tidak berubah)
searchCache        → 5 menit   (real-time search)
```

### Auto-Update

Cache **otomatis expire** setelah TTL habis:
- User request → cache sudah expire → fetch data baru → update cache
- User request → cache masih valid → return dari cache

**Tidak perlu manual refresh!** Sistem auto-update sendiri.

## ⚡ Rate Limiting

### Mengapa Perlu Rate Limit?

Mencegah:
- IP di-ban oleh sumber manga
- Server overload
- Terlalu banyak request sekaligus

### Rate Limit Setting

```javascript
// File: utils/rateLimiter.js

MangaDex:  5 requests/second   (sesuai limit API mereka)
Komiku:    10 requests/minute  (web scraping, hati-hati)
WestManga: 10 requests/minute
BacaManga: 10 requests/minute
Global:    30 requests/minute  (total semua source)
```

### Cara Kerja

```javascript
Request 1 → OK, process
Request 2 → OK, process
Request 3 → OK, process
...
Request 6 (dalam 1 detik) → WAIT! Rate limit exceeded
  ↓
Tunggu sampai 1 detik selesai
  ↓
Process request 6
```

## 🔄 Auto-Update Manga

### Cara Kerja Auto-Update

**Bukan scheduled job**, tapi **on-demand**:

1. **User request data**
2. **Cek cache:**
   - Cache valid (< TTL) → return cached
   - Cache expired → fetch new data → update cache
3. **User dapat data terbaru**

**Contoh Timeline:**

```
00:00 - User A request → Cache kosong → Fetch dari MangaDex → Save cache
00:05 - User B request → Cache valid → Return cache (fast!)
00:10 - User C request → Cache valid → Return cache (fast!)
00:11 - Cache expired (TTL 10 menit)
00:12 - User D request → Cache expired → Fetch new data → Update cache
```

### Manual Refresh

Jika ingin force refresh:

```bash
# Via API
POST http://localhost:3000/api/cache/clear

# Via Code
mangaListCache.clear()
```

## 🛡️ Error Handling

### Jika Scraper Gagal

```javascript
// api-server.js

try {
    const data = await scraper.getMangaList()
    return data
} catch (error) {
    console.error('Error:', error)
    return [] // Empty array, tidak crash
}
```

Frontend akan tampilkan:
- "Tidak ada manga ditemukan" (jika return [])
- Tombol "Coba Lagi"

### Fallback Strategy

Jika source utama gagal, bisa tambah fallback:

```javascript
let data = await komiku.getMangaList()
if (data.length === 0) {
    // Fallback ke MangaDex
    data = await mangadex.getMangaList()
}
```

## 📊 Monitoring

### Check Health

```bash
GET http://localhost:3000/api/health
```

Response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-10-31T..."
}
```

### Cache Stats

```bash
GET http://localhost:3000/api/cache/stats
```

Response:
```json
{
  "mangaList": { "size": 5, "keys": [...] },
  "mangaDetail": { "size": 10, "keys": [...] },
  ...
}
```

## 🚀 Performance Tips

### 1. Gunakan MangaDex sebagai Primary

MangaDex paling stabil dan cepat.

### 2. Jangan Clear Cache Terlalu Sering

Cache = kecepatan. Biarkan auto-expire.

### 3. Parallel Requests

```javascript
// GOOD - Parallel
const [detail, chapters] = await Promise.all([
    fetchDetail(),
    fetchChapters()
])

// BAD - Sequential
const detail = await fetchDetail()
const chapters = await fetchChapters()
```

### 4. Lazy Loading Images

Images di-load saat terlihat di viewport, bukan semua sekaligus.

## 🔐 Security

### XSS Protection

Semua user input di-escape:

```javascript
function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}
```

### CORS Enabled

Server bisa di-akses dari domain lain (untuk development).

## 📝 Kesimpulan

**Website ini:**
- ✅ 100% data REAL dari sumber
- ✅ Auto-update via cache expiry
- ✅ Fast dengan caching
- ✅ Safe dengan rate limiting
- ✅ No dummy data!

**Primary source: MangaDex (API)**
**Secondary: Web scraping (experimental)**

---

**Happy Coding! 🎉**
