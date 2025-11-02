# 🔄 ProxyScrape Integration Guide

Panduan lengkap menggunakan ProxyScrape untuk auto-fetch proxies.

---

## 📋 Tentang ProxyScrape

ProxyScrape adalah layanan yang menyediakan proxy list gratis dan premium dengan auto-update.

**Keuntungan:**
- ✅ Auto-fetch proxies (tidak perlu manual)
- ✅ Update otomatis setiap 1 jam
- ✅ Free plan tersedia
- ✅ Support HTTP, SOCKS4, SOCKS5
- ✅ Filter by country, timeout, anonymity

**API Key Anda:** `bskdaiszemftvbo3f3ol`

---

## 🚀 Setup

### 1. API Key sudah configured

File `.env.example` dan `.env.production` sudah include API key Anda:

```env
PROXYSCRAPE_API_KEY=bskdaiszemftvbo3f3ol
```

### 2. Auto-fetch sudah aktif

Saat server start, otomatis akan:
1. Fetch proxies dari ProxyScrape
2. Add ke proxy manager
3. Update setiap 1 jam

---

## 📊 Cara Kerja

### Auto-Fetch Flow:

```
Server Start
    ↓
Initialize ProxyScrape Client
    ↓
Fetch Proxies (preset: fast)
    ↓
Add to Proxy Manager
    ↓
Repeat every 1 hour
```

### Preset yang Tersedia:

1. **fast** (default) - Fast proxies untuk scraping ringan
   ```javascript
   {
       protocol: 'http',
       timeout: 5000,
       anonymity: 'elite'
   }
   ```

2. **stable** - Stable proxies untuk scraping berat
   ```javascript
   {
       protocol: 'http',
       timeout: 10000,
       anonymity: 'all'
   }
   ```

3. **socks** - SOCKS5 untuk bypass blocks
   ```javascript
   {
       protocol: 'socks5',
       timeout: 10000,
       anonymity: 'elite'
   }
   ```

4. **ssl** - SSL/HTTPS proxies
   ```javascript
   {
       protocol: 'http',
       timeout: 10000,
       ssl: 'yes',
       anonymity: 'elite'
   }
   ```

5. **us** - US proxies only
   ```javascript
   {
       protocol: 'http',
       timeout: 10000,
       country: 'US',
       anonymity: 'elite'
   }
   ```

6. **mixed** - Semua jenis
   ```javascript
   {
       protocol: 'all',
       timeout: 10000,
       anonymity: 'all'
   }
   ```

---

## 🎯 Cara Ganti Preset

### Edit di api-server.js:

```javascript
// Line ~807
const presets = require('./utils/proxyScrapeClient').ProxyScrapeClient.getPresets();

// Ganti 'fast' dengan preset lain:
proxyScrapeClient.startAutoFetch(presets.stable, 3600000); // stable
proxyScrapeClient.startAutoFetch(presets.socks, 3600000);  // socks5
proxyScrapeClient.startAutoFetch(presets.us, 3600000);     // US only
```

### Atau Custom Options:

```javascript
proxyScrapeClient.startAutoFetch({
    protocol: 'http',     // http, socks4, socks5, all
    timeout: 8000,        // 1000-10000 ms
    country: 'US',        // all, US, GB, JP, etc
    ssl: 'yes',           // yes, no, all
    anonymity: 'elite'    // elite, anonymous, transparent, all
}, 3600000); // Update every 1 hour
```

---

## 🔧 Ganti Interval Update

Default: 1 jam (3600000 ms)

### Ganti ke 30 menit:

```javascript
proxyScrapeClient.startAutoFetch(presets.fast, 1800000); // 30 min
```

### Ganti ke 2 jam:

```javascript
proxyScrapeClient.startAutoFetch(presets.fast, 7200000); // 2 hours
```

### Ganti ke 6 jam (hemat quota):

```javascript
proxyScrapeClient.startAutoFetch(presets.fast, 21600000); // 6 hours
```

---

## 📡 Manual Fetch

### Via Code:

```javascript
const { initProxyScrape } = require('./utils/proxyScrapeClient');

// Init client
const client = initProxyScrape();

// Fetch once
await client.updateProxyManager({ protocol: 'http', timeout: 5000 });

// Get account info
const info = await client.getAccountInfo();
console.log(info);
```

### Via API Endpoint (buat endpoint baru):

Tambahkan di api-server.js:

```javascript
// Manual fetch proxies from ProxyScrape
app.post('/api/proxy/fetch-proxyscrape', async (req, res) => {
    try {
        const { initProxyScrape } = require('./utils/proxyScrapeClient');
        const client = initProxyScrape();

        if (!client) {
            return res.status(400).json({
                success: false,
                message: 'ProxyScrape not configured'
            });
        }

        const result = await client.updateProxyManager(req.body.options || {});

        res.json({
            success: result,
            message: result ? 'Proxies fetched successfully' : 'Failed to fetch proxies'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
```

Then call:

```bash
curl -X POST http://localhost:3000/api/proxy/fetch-proxyscrape
```

---

## 📊 Monitor Proxies

### Check Stats:

```bash
curl http://localhost:3000/api/proxy/stats
```

Response:

```json
{
  "success": true,
  "data": {
    "total": 150,
    "active": 145,
    "failed": 5,
    "proxies": [
      {
        "proxy": "http://1.2.3.4:8080",
        "success": 25,
        "failed": 0,
        "successRate": "100.00%",
        "avgResponseTime": "1234ms",
        "isFailed": false
      }
    ]
  }
}
```

---

## 🎓 ProxyScrape Free vs Premium

### Free Plan (Anda pakai ini):
- ✅ Unlimited requests
- ✅ Updated every 15 minutes
- ✅ HTTP & SOCKS proxies
- ⚠️ Shared proxies (banyak user pakai)
- ⚠️ Success rate ~30-50%
- ⚠️ Speed varies

### Premium Plan ($9.95/month):
- ✅ Dedicated proxies
- ✅ Higher success rate (>80%)
- ✅ Faster speed
- ✅ Priority support
- ✅ More filter options

Upgrade: https://proxyscrape.com/premium-proxies

---

## 🔒 Best Practices

### 1. Combine Free + Paid Proxies

```env
# .env
# Manual paid proxies (high quality)
PROXIES=http://user:pass@premium-proxy1.com:8080,http://user:pass@premium-proxy2.com:8080

# ProxyScrape free (backup)
PROXYSCRAPE_API_KEY=bskdaiszemftvbo3f3ol
```

### 2. Monitor Success Rate

```bash
# Check stats regularly
curl http://localhost:3000/api/proxy/stats

# Reset failed proxies
curl -X POST http://localhost:3000/api/proxy/reset
```

### 3. Adjust Timeout

Proxies terlalu lambat? Turunkan timeout:

```javascript
proxyScrapeClient.startAutoFetch({
    protocol: 'http',
    timeout: 3000,  // 3 detik (lebih ketat)
    anonymity: 'elite'
}, 3600000);
```

### 4. Use Multiple Presets

Start multiple auto-fetch dengan preset berbeda:

```javascript
// Fast HTTP untuk scraping ringan
proxyScrapeClient1.startAutoFetch(presets.fast, 3600000);

// SOCKS5 untuk bypass blocks
proxyScrapeClient2.startAutoFetch(presets.socks, 7200000);
```

---

## 🐛 Troubleshooting

### Problem: "No proxies fetched"

**Solusi:**
1. Check API key valid: https://proxyscrape.com/dashboard
2. Check internet connection
3. Check firewall tidak block ProxyScrape

### Problem: "All proxies failed"

**Solusi:**
1. Free proxies memang sering down
2. Ganti preset ke 'stable' atau 'mixed'
3. Perpanjang timeout
4. Consider upgrade ke premium

### Problem: "Too many requests"

**Solusi:**
1. Perpanjang fetch interval (6 jam+)
2. Check quota di dashboard
3. Pakai cache lebih lama

---

## 📈 Optimization Tips

### For Low Traffic:
```javascript
// Fetch setiap 6 jam
proxyScrapeClient.startAutoFetch(presets.fast, 21600000);
```

### For Medium Traffic:
```javascript
// Fetch setiap 2 jam
proxyScrapeClient.startAutoFetch(presets.stable, 7200000);
```

### For High Traffic:
```javascript
// Fetch setiap 1 jam + upgrade ke premium
proxyScrapeClient.startAutoFetch(presets.fast, 3600000);
```

---

## 🔗 Useful Links

- ProxyScrape Dashboard: https://proxyscrape.com/dashboard
- API Documentation: https://docs.proxyscrape.com/
- Premium Plans: https://proxyscrape.com/premium-proxies
- Free Proxy List: https://proxyscrape.com/free-proxy-list
- Status Page: https://status.proxyscrape.com/

---

## 📝 Summary

✅ **ProxyScrape sudah terintegrasi**
✅ **Auto-fetch setiap 1 jam**
✅ **API key sudah configured**
✅ **Preset: fast (HTTP, timeout 5s, elite)**

**Tinggal:**
1. Start server: `node api-server.js`
2. Check stats: `curl http://localhost:3000/api/proxy/stats`
3. Monitor dan adjust preset/interval jika perlu

**Your API Key:** `bskdaiszemftvbo3f3ol`

🎉 **Proxy rotation with auto-fetch ready!**
