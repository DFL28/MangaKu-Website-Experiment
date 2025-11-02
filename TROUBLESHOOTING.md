# 🔧 Troubleshooting - Website Loading Terus

## ❓ Kenapa Loading Terus?

Ada beberapa kemungkinan:

### 1. ✅ Server Belum Running

**Cek:**
```bash
curl http://localhost:3000/api/health
```

**Jika error** "Connection refused":
```bash
npm start
```

### 2. ✅ Browser Cache Issue

**Solusi:**
- Tekan `Ctrl + Shift + R` (hard refresh)
- Atau buka Developer Tools (F12) → Application → Clear Storage → Clear site data

### 3. ✅ JavaScript Error di Console

**Cek:**
- Buka browser
- Tekan `F12` untuk buka Developer Tools
- Pilih tab **Console**
- Lihat apakah ada error merah

**Common errors:**

**Error: "CORS"**
- Server sudah enable CORS, seharusnya tidak ada issue
- Restart server: `npm start`

**Error: "Failed to fetch"**
- Server mati atau crash
- Check: `npm start`

**Error: "Unexpected token"**
- API return HTML instead of JSON
- Cek URL: `http://localhost:3000/api/manga?source=mangadex`

### 4. ✅ Port 3000 Sudah Digunakan

**Cek siapa yang pakai port 3000:**
```bash
netstat -ano | findstr :3000
```

**Kill process:**
```bash
taskkill /F /PID [PID_NUMBER]
```

**Atau ganti port di `api-server.js`:**
```javascript
const PORT = process.env.PORT || 3001; // Ganti ke 3001
```

### 5. ✅ API Return Empty Data

**Test API langsung:**
```bash
curl http://localhost:3000/api/manga?source=mangadex&limit=3
```

**Jika return `{"success":true,"data":[]}`:**
- MangaDex mungkin down atau rate limited
- Tunggu beberapa menit
- Atau clear cache:
```bash
curl -X POST http://localhost:3000/api/cache/clear
```

## 🧪 Testing Page

Saya sudah buat test page untuk debug:

**Buka:** `http://localhost:3000/test.html`

Page ini akan:
- Test API health
- Test manga list
- Test search
- Tampilkan error jika ada

## 🔍 Debug Mode

Saya sudah tambah console.log di `script.js`. Buka browser console (F12) dan lihat:

```
🔄 Loading manga list...
Source: mangadex
Page: 1
📡 Fetching: http://localhost:3000/api/manga?source=mangadex&genre=all&sort=latest&page=1
📥 Response status: 200
📦 Result: {success: true, data: Array(20)}
✅ Loaded 20 manga
✔️ Loading finished
```

**Jika tidak ada log:**
- JavaScript tidak jalan
- Cek di Network tab (F12) apakah `script.js` di-load
- Hard refresh: `Ctrl + Shift + R`

## ✅ Step by Step Debug

### Step 1: Check Server
```bash
# Terminal 1: Start server
cd "c:\Danish\Apa kek"
npm start

# Terminal 2: Test API
curl http://localhost:3000/api/health
```

**Expected:**
```json
{"success":true,"status":"healthy","timestamp":"..."}
```

### Step 2: Check Browser

1. Buka: `http://localhost:3000`
2. Tekan `F12`
3. Pilih tab **Console**
4. Lihat logs:
   - ✅ Should see: "🔄 Loading manga list..."
   - ❌ If nothing: JavaScript tidak jalan

5. Pilih tab **Network**
6. Refresh page (`Ctrl + R`)
7. Cari request ke `/api/manga`
8. Click → lihat Response
   - ✅ Should see: JSON dengan manga data
   - ❌ If error: Lihat error message

### Step 3: Test dengan Test Page

1. Buka: `http://localhost:3000/test.html`
2. Click "Test Manga List"
3. Lihat hasil:
   - ✅ Should see: Manga cards dengan cover & title
   - ❌ If error: Lihat error message di page

## 🚑 Quick Fixes

### Fix 1: Full Restart

```bash
# Stop all Node processes
taskkill /F /IM node.exe

# Clear cache & restart
cd "c:\Danish\Apa kek"
npm start
```

### Fix 2: Browser Hard Reset

1. Tekan `F12`
2. Right-click pada refresh button
3. Pilih "Empty Cache and Hard Reload"

### Fix 3: Check File Integrity

```bash
# Make sure all files exist
dir index.html
dir script.js
dir api-server.js
dir scrapers\mangadex.js
```

### Fix 4: Reinstall Dependencies

```bash
rm -rf node_modules
npm install
npm start
```

## 📞 Still Not Working?

### Collect Info:

1. **Server logs:**
   - Check terminal yang run `npm start`
   - Ada error merah?

2. **Browser console:**
   - F12 → Console tab
   - Ada error merah?

3. **Network tab:**
   - F12 → Network tab
   - Status API request (200? 404? 500?)

4. **Test API:**
   ```bash
   curl -v http://localhost:3000/api/manga?source=mangadex&limit=1
   ```

5. **Check port:**
   ```bash
   netstat -ano | findstr :3000
   ```

### Common Solutions:

**Problem:** "Loading..." tidak hilang
- **Solution:** Check browser console untuk error

**Problem:** Manga cards tidak muncul
- **Solution:** Test API dulu dengan curl atau test.html

**Problem:** Images tidak load
- **Solution:** Check Network tab, mungkin CORS atau rate limited

**Problem:** Server error
- **Solution:** Lihat terminal logs, restart server

## ✅ Verify Everything Works

```bash
# Test 1: Health
curl http://localhost:3000/api/health
# Expected: {"success":true,...}

# Test 2: Manga List
curl http://localhost:3000/api/manga?source=mangadex&limit=2
# Expected: {"success":true,"data":[...]}

# Test 3: Search
curl http://localhost:3000/api/search?q=naruto&source=mangadex
# Expected: {"success":true,"data":[...]}
```

Semua return `success:true`? **Website should work!**

## 💡 Pro Tips

1. **Always check browser console first** (F12)
2. **Use test.html for quick debugging**
3. **Test API with curl before blaming frontend**
4. **Clear cache if behavior is weird**
5. **Restart server if you change backend code**

---

**Happy Debugging! 🐛🔨**
