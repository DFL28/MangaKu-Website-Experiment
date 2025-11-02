# Setup dan Instalasi MangaKu

## Prasyarat

Pastikan Anda sudah menginstall:
- **Node.js** (versi 14 atau lebih baru) - [Download](https://nodejs.org/)
- **npm** (biasanya sudah include dengan Node.js)

## Langkah Instalasi

### 1. Install Dependencies

Buka terminal/command prompt di folder project, lalu jalankan:

```bash
npm install
```

Dependencies yang akan diinstall:
- `express` - Web server framework
- `axios` - HTTP client untuk scraping
- `cheerio` - HTML parser untuk web scraping
- `cors` - Enable CORS untuk API

### 2. Jalankan Server

```bash
npm start
```

Atau untuk development mode dengan auto-reload:

```bash
npm run dev
```

### 3. Akses Website

Buka browser dan akses:
```
http://localhost:3000
```

## Struktur Project

```
mangaku-website/
├── scrapers/           # Scraper modules untuk setiap sumber
│   ├── mangadex.js    # MangaDex API scraper
│   ├── komiku.js      # Komiku web scraper
│   ├── westmanga.js   # WestManga web scraper
│   └── bacamanga.js   # BacaManga web scraper
├── utils/             # Utility modules
│   ├── cache.js       # In-memory caching system
│   └── rateLimiter.js # Rate limiting untuk scraping
├── index.html         # Halaman utama
├── detail.html        # Halaman detail manga
├── reader.html        # Halaman reader
├── styles.css         # CSS utama
├── detail-styles.css  # CSS detail page
├── reader-styles.css  # CSS reader page
├── script.js          # JavaScript utama
├── detail-script.js   # JavaScript detail page
├── reader-script.js   # JavaScript reader page
├── api-server.js      # Backend API server
└── package.json       # Dependencies
```

## Fitur Real Scraping

### Sumber yang Didukung

1. **MangaDex** (https://mangadex.org)
   - Menggunakan API resmi MangaDex
   - Paling reliable dan stabil
   - Rate limit: 5 requests/second
   - Mendukung: List, Detail, Chapters, Pages, Search

2. **Komiku** (https://komiku.id)
   - Web scraping dengan Cheerio
   - Manga Indonesia subtitle
   - Rate limit: 10 requests/minute
   - Mendukung: List, Detail, Chapters, Pages, Search

3. **WestManga** (https://westmanga.me)
   - Web scraping dengan Cheerio
   - Manga populer
   - Rate limit: 10 requests/minute
   - Mendukung: List, Detail, Chapters, Pages, Search

4. **BacaManga** (https://bacamanga.co)
   - Web scraping dengan Cheerio
   - Manga terlengkap
   - Rate limit: 10 requests/minute
   - Mendukung: List, Detail, Chapters, Pages, Search

## API Endpoints

### Get Manga List
```
GET /api/manga?source=mangadex&page=1
```

Parameters:
- `source` - mangadex | komiku | westmanga | maid | bacamanga | all
- `page` - Page number (default: 1)
- `genre` - Genre filter (default: all)
- `sort` - latest | popular | rating (default: latest)

### Get Manga Detail
```
GET /api/manga/:id?source=mangadex
```

Parameters:
- `id` - Manga ID
- `source` - Source name (default: mangadex)

### Get Chapters
```
GET /api/manga/:id/chapters?source=mangadex
```

### Get Chapter Pages
```
GET /api/manga/:mangaId/chapter/:chapterId?source=mangadex
```

### Search Manga
```
GET /api/search?q=naruto&source=all
```

### Get Popular Manga
```
GET /api/popular?source=mangadex&limit=20
```

### Cache Stats
```
GET /api/cache/stats
```

### Clear Cache
```
POST /api/cache/clear
```

### Health Check
```
GET /api/health
```

## Konfigurasi

### Rate Limiting

Edit `utils/rateLimiter.js` untuk mengatur rate limit:

```javascript
const mangadexLimiter = new RateLimiter(5, 1000);    // 5 req/sec
const komikuLimiter = new RateLimiter(10, 60000);    // 10 req/min
const westmangaLimiter = new RateLimiter(10, 60000); // 10 req/min
const bacamangaLimiter = new RateLimiter(10, 60000); // 10 req/min
```

### Caching

Edit `utils/cache.js` untuk mengatur cache TTL:

```javascript
const mangaListCache = new Cache(600000);    // 10 minutes
const mangaDetailCache = new Cache(1800000); // 30 minutes
const chapterListCache = new Cache(600000);  // 10 minutes
const chapterPagesCache = new Cache(3600000);// 1 hour
const searchCache = new Cache(300000);       // 5 minutes
```

## Troubleshooting

### Error: Cannot find module 'express'
```bash
npm install
```

### Port 3000 sudah digunakan
Edit `api-server.js` atau set environment variable:
```bash
PORT=8080 npm start
```

### Scraping gagal / timeout
- Cek koneksi internet
- Pastikan sumber masih aktif
- Coba clear cache: `POST /api/cache/clear`
- Cek rate limit tidak exceeded

### CORS Error
Sudah ditangani oleh middleware CORS di server.

## Performance Tips

1. **Gunakan Cache**
   - Cache sudah diaktifkan secara default
   - Mengurangi request ke sumber

2. **Rate Limiting**
   - Jangan terlalu agresif scraping
   - Respect rate limits yang sudah diset

3. **Lazy Loading**
   - Gambar menggunakan lazy loading
   - Pagination untuk mengurangi load

4. **CDN untuk Production**
   - Gunakan CDN untuk aset static
   - Implementasi service worker

## Production Deployment

### Heroku

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create manga-app-name`
4. Deploy: `git push heroku main`

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel`

### Railway

1. Connect GitHub repository
2. Deploy automatically

### Environment Variables

```env
PORT=3000
NODE_ENV=production
```

## Legal Notice

⚠️ **PENTING**:
- Website ini untuk tujuan edukasi
- Respect hak cipta dari sumber manga
- Tidak untuk komersial
- Gunakan rate limiting yang wajar
- Pertimbangkan menggunakan API resmi jika tersedia

## Support & Kontribusi

Jika menemukan bug atau ingin berkontribusi:
1. Fork repository
2. Buat branch baru
3. Commit perubahan
4. Push ke branch
5. Buat Pull Request

## License

MIT License - Untuk tujuan edukasi

---

**Happy Reading! 📚✨**
