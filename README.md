# MangaKu - Website Baca Manga Indonesia

Website modern untuk membaca manga subtitle Indonesia dengan fitur mirror dari berbagai sumber populer seperti MangaDex, Komiku, WestManga, dan BacaManga.

## Fitur Utama

### ✨ Fitur Website
- **Dark Mode** dengan tema biru yang nyaman di mata
- **Responsif** - Optimal di desktop, tablet, dan mobile
- **Simple & Efisien** - UI/UX yang clean dan mudah digunakan
- **Fast Loading** - Optimasi performa maksimal

### 📚 Fitur Manga
- Daftar manga terlengkap dari berbagai sumber
- Filter berdasarkan genre, sumber, dan popularitas
- Search manga dengan autocomplete
- Detail manga lengkap (rating, status, author, dll)
- Daftar chapter lengkap dan terurut
- Bookmark manga favorit

### 📖 Fitur Reader
- **Multiple Reading Modes:**
  - Vertical Scroll (default)
  - Horizontal Scroll
  - Single Page
- **Pengaturan Kustomisasi:**
  - Lebar gambar dapat disesuaikan
  - Kualitas gambar (Low, Medium, High)
  - Auto scroll untuk membaca santai
- **Navigasi Mudah:**
  - Tombol prev/next chapter
  - Dropdown selector chapter
  - Keyboard shortcuts
- **Komentar Chapter** untuk diskusi dengan pembaca lain

### 🔍 Fitur Lainnya
- Pagination untuk browsing manga
- Related manga suggestions
- Share manga ke social media
- Responsive di semua device

## Teknologi yang Digunakan

### Frontend
- HTML5
- CSS3 (Custom Properties, Flexbox, Grid)
- Vanilla JavaScript (ES6+)
- Font Awesome Icons

### Backend
- Node.js
- Express.js
- Axios (HTTP client)
- Cheerio (Web scraping)
- CORS

## Instalasi

### Prasyarat
- Node.js (v14 atau lebih baru)
- npm atau yarn

### Langkah Instalasi

1. **Clone atau Download Repository**
   ```bash
   cd mangaku-website
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Jalankan Server**
   ```bash
   npm start
   ```

4. **Akses Website**
   Buka browser dan akses:
   ```
   http://localhost:3000
   ```

### Development Mode

Untuk development dengan auto-reload:
```bash
npm run dev
```

## Struktur File

```
mangaku-website/
├── index.html              # Halaman utama
├── detail.html             # Halaman detail manga
├── reader.html             # Halaman reader
├── styles.css              # CSS utama
├── detail-styles.css       # CSS halaman detail
├── reader-styles.css       # CSS halaman reader
├── script.js               # JavaScript utama
├── detail-script.js        # JavaScript detail
├── reader-script.js        # JavaScript reader
├── api-server.js           # Backend API server
├── package.json            # Dependencies
└── README.md              # Dokumentasi
```

## API Endpoints

### Get Manga List
```
GET /api/manga?source=all&genre=all&sort=latest&page=1
```

### Get Manga Detail
```
GET /api/manga/:id?source=mangadex
```

### Get Chapter List
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

## Kustomisasi

### Mengubah Warna Tema

Edit file `styles.css` pada bagian CSS Variables:

```css
:root {
    --primary-color: #2196F3;      /* Warna utama */
    --primary-dark: #1976D2;       /* Warna utama gelap */
    --bg-primary: #0a0e27;         /* Background utama */
    --bg-secondary: #141930;       /* Background secondary */
    /* ... */
}
```

### Menambah Sumber Manga

Edit file `api-server.js` dan tambahkan scraping logic untuk sumber baru:

```javascript
async function scrapeMangaList(source, genre, sort, page) {
    if (source === 'sumber-baru') {
        // Implementasi scraping untuk sumber baru
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        // Extract data...
    }
}
```

## Implementasi Scraping Real

Saat ini API menggunakan dummy data. Untuk implementasi scraping real:

1. **MangaDex** - Gunakan API resmi MangaDex
   - Dokumentasi: https://api.mangadex.org/docs/
   - Perlu API key

2. **Komiku, WestManga, BacaManga** - Gunakan web scraping
   - Gunakan Cheerio untuk parsing HTML
   - Respect robots.txt
   - Implementasikan rate limiting
   - Gunakan proxy jika diperlukan

### Contoh Implementasi Scraping:

```javascript
async function scrapeMangaList(source, genre, sort, page) {
    const url = `${getSourceUrl(source)}/manga?page=${page}`;

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0...'
            }
        });

        const $ = cheerio.load(response.data);
        const mangaList = [];

        $('.manga-item').each((i, el) => {
            mangaList.push({
                id: $(el).attr('data-id'),
                title: $(el).find('.title').text(),
                cover: $(el).find('img').attr('src'),
                // ... extract more data
            });
        });

        return mangaList;
    } catch (error) {
        console.error('Scraping error:', error);
        return [];
    }
}
```

## Catatan Penting

### Legal & Ethical
- ⚠️ **Disclaimer**: Website ini hanya untuk tujuan edukasi
- Respect hak cipta dan terms of service dari sumber manga
- Implementasikan rate limiting untuk tidak membebani server sumber
- Pertimbangkan untuk menggunakan API resmi jika tersedia

### Performance
- Implementasikan caching untuk mengurangi request ke sumber
- Gunakan CDN untuk aset static
- Optimasi gambar dengan lazy loading
- Implementasikan service worker untuk offline support

### Security
- Sanitasi input user untuk mencegah XSS
- Implementasikan CORS dengan benar
- Jangan expose API keys di frontend
- Gunakan HTTPS di production

## Roadmap

- [ ] Implementasi scraping real dari semua sumber
- [ ] Sistem user account dan authentication
- [ ] History pembacaan
- [ ] Bookmark dan favorite manga
- [ ] Notifikasi chapter baru
- [ ] Dark/Light theme toggle
- [ ] Multi-language support
- [ ] Progressive Web App (PWA)
- [ ] Comment system dengan database
- [ ] Admin panel untuk manage content

## Kontribusi

Kontribusi sangat diterima! Silakan:
1. Fork repository
2. Buat branch fitur baru
3. Commit perubahan
4. Push ke branch
5. Buat Pull Request

## Lisensi

MIT License - Silakan gunakan untuk tujuan edukasi.

## Support

Jika ada pertanyaan atau issues, silakan buat issue di repository ini.

---

**Selamat Membaca Manga! 📚✨**
