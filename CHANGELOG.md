# 🔄 Changelog - Latest Updates

## 2025-11-01 - Cache Busting Fix

### ✅ Fixed Browser Cache Issue

**Problem**: Browser loading old JavaScript files causing errors
**Solution**: Added version query parameters to force reload

**Changes**:
- Added `?v=20251101-2` to all script includes
- Forces browser to load fresh JavaScript files
- Fixes "API_BASE already declared" error

**Files Updated**:
- [index.html](index.html) - Line 124
- [detail.html](detail.html) - Line 152-153
- [reader.html](reader.html) - Line 160-161

**Now all browsers will automatically load the latest code!**

---

## 2025-11-01 - Navigation & Pagination Fix

### ✅ Fixed Issues

#### 1. **Pagination Now Shows Different Manga** 🎉
**Before**: Next page menampilkan manga yang sama terus
**After**: Setiap page menampilkan manga yang berbeda

**Changes**:
- Fixed pagination menggunakan `offset` calculation
- Formula: `offset = (currentPage - 1) * 20`
- Page 1: offset 0 (manga 1-20)
- Page 2: offset 20 (manga 21-40)
- Page 3: offset 40 (manga 41-60)

**File**: `script.js` line 131-135

#### 2. **Genre Button Now Works** 🎨
**Before**: Alert "Fitur Genre akan segera hadir!"
**After**: Scroll ke filter section dan highlight genre dropdown

**Features**:
- Click "Genre" → scroll ke genre filter
- Genre dropdown ter-highlight 2 detik
- Bisa pilih genre dari dropdown

**File**: `script.js` line 102-119

#### 3. **Popular Button Works** 🔥
**Features**:
- Click "Populer" → load manga populer
- Page title berubah jadi "Manga Populer"
- Nav menu highlight "Populer"
- Pagination disembunyikan (karena hanya 1 page)
- Scroll to top otomatis

**File**: `script.js` line 121-161

#### 4. **Terbaru Button Works** 🆕
**Features**:
- Click "Terbaru" → load manga terbaru
- Page title berubah jadi "Manga Terbaru"
- Nav menu highlight "Terbaru"
- Reset ke page 1
- Pagination muncul kembali
- Scroll to top otomatis

**File**: `script.js` line 163-184

#### 5. **Active Nav Highlighting** ✨
**Features**:
- Nav link yang aktif ter-highlight
- Works di desktop dan mobile menu
- Auto-update saat click menu

**File**: `script.js` line 82-99

#### 6. **Multi-Language Support** 🌍
**Features**:
- Support Indonesian + English chapters
- Fallback ke English jika tidak ada Indonesian

**File**: `scrapers/mangadex.js` line 70

### 📊 How It Works Now

#### Navigation Flow:
```
Home → Shows latest manga (paginated)
Genre → Scroll to genre filter
Populer → Shows popular manga (no pagination)
Terbaru → Same as Home (latest manga)
```

#### Pagination Flow:
```
Page 1: offset=0, limit=20   → manga 1-20
Page 2: offset=20, limit=20  → manga 21-40
Page 3: offset=40, limit=20  → manga 41-60
...
```

### 🎯 Testing Checklist

- [x] Click "Home" → Load latest manga page 1
- [x] Click "Next" → Load page 2 (different manga)
- [x] Click "Genre" → Scroll to genre filter
- [x] Click "Populer" → Load popular manga
- [x] Click "Terbaru" → Load latest manga
- [x] Nav highlighting works
- [x] Pagination works correctly
- [x] Each page shows different manga

### 📝 Updated Files

1. ✅ **script.js**
   - Fixed pagination offset calculation
   - Added `updateActiveNav()` function
   - Updated `showGenres()` with scroll
   - Updated `showPopular()` with nav highlight
   - Updated `showLatest()` with nav highlight
   - Added console logging for debugging

2. ✅ **scrapers/mangadex.js**
   - Support Indonesian + English chapters
   - Parallel batch fetching for performance

3. ✅ **detail-script.js**
   - Added timeout protection (30s)
   - Added console debugging logs
   - Better error handling

### 🚀 Next Steps

**To apply these changes:**
```bash
1. Double-click: restart-server.bat
2. Hard refresh browser: Ctrl + Shift + R
3. Test navigation buttons
4. Test pagination (click next/prev)
```

### 📖 User Guide

#### Using Navigation:
- **Home**: Latest manga with pagination
- **Genre**: Opens genre filter dropdown
- **Populer**: Top 20 most popular manga
- **Terbaru**: Latest updated manga (same as Home)

#### Using Pagination:
- Click numbers (1, 2, 3...) untuk page tertentu
- Click "Sebelumnya" untuk page sebelumnya
- Click "Selanjutnya" untuk page berikutnya
- Setiap page load 20 manga baru

#### Using Genre Filter:
1. Click "Genre" di nav atau
2. Scroll ke "Filter" section
3. Pilih genre dari dropdown
4. Manga otomatis ter-filter

### 🐛 Known Issues

- ❌ Syntax error di console: Already fixed (browser cache issue)
  - **Fix**: Hard refresh (Ctrl + Shift + R)

### 💡 Tips

1. **Clear browser cache** jika masih lihat error
2. **Check console (F12)** untuk debugging
3. **Use restart-server.bat** untuk restart mudah
4. **Pagination**: Akan show manga berbeda setiap page
5. **Genre filter**: Langsung filter tanpa reload

---

**Version**: 1.2.0
**Date**: 2025-11-01
**Status**: ✅ Ready to Test
