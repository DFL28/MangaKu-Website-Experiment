# 🔄 Setup Proxy untuk Scraping Manga

Dokumentasi lengkap untuk setup proxy rotation agar bisa ganti-ganti IP saat scraping.

---

## 📋 Daftar Isi

1. [Kenapa Pakai Proxy?](#kenapa-pakai-proxy)
2. [Cara Setup Proxy](#cara-setup-proxy)
3. [Format Proxy](#format-proxy)
4. [Cara Dapat Proxy](#cara-dapat-proxy)
5. [API Management](#api-management)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## 🤔 Kenapa Pakai Proxy?

### Keuntungan Pakai Proxy:
- ✅ **Ganti IP otomatis** - Hindari IP block dari website target
- ✅ **Rate limiting bypass** - Request dari IP berbeda
- ✅ **Geo-restriction bypass** - Akses content dari region berbeda
- ✅ **Scalability** - Bisa scraping lebih banyak data
- ✅ **Reliability** - Jika 1 proxy down, auto pindah ke proxy lain

---

## 🚀 Cara Setup Proxy

### Method 1: Via Environment Variable (Recommended)

1. **Copy file .env.example ke .env:**
   ```bash
   copy .env.example .env
   ```

2. **Edit file .env dan tambahkan proxy:**
   ```env
   PROXIES=http://proxy1.com:8080,http://user:pass@proxy2.com:8080,socks5://proxy3.com:1080
   ```

3. **Restart server:**
   ```bash
   node api-server.js
   ```

### Method 2: Via API (Dynamic)

Tambah proxy secara dinamis tanpa restart server:

```bash
# Tambah proxy
curl -X POST http://localhost:3000/api/proxy/add \
  -H "Content-Type: application/json" \
  -d '{"proxy": "http://proxy.example.com:8080"}'

# Tambah proxy dengan auth
curl -X POST http://localhost:3000/api/proxy/add \
  -H "Content-Type: application/json" \
  -d '{"proxy": "http://username:password@proxy.example.com:8080"}'
```

### Method 3: Edit File Langsung

Edit file `utils/proxyManager.js` di bagian constructor:

```javascript
this.proxies = [
    'http://proxy1.com:8080',
    'http://user:pass@proxy2.com:8080',
    'socks5://proxy3.com:1080',
];
```

---

## 📝 Format Proxy

### HTTP Proxy
```
http://host:port
http://username:password@host:port
```

### HTTPS Proxy
```
https://host:port
https://username:password@host:port
```

### SOCKS5 Proxy
```
socks5://host:port
socks5://username:password@host:port
```

### Contoh Lengkap:
```env
# Tanpa authentication
PROXIES=http://103.152.112.162:80,http://45.76.97.117:8080

# Dengan authentication
PROXIES=http://user123:pass456@proxy.brightdata.com:22225

# Mixed types
PROXIES=http://proxy1.com:8080,socks5://user:pass@proxy2.com:1080,http://proxy3.com:3128
```

---

## 🌐 Cara Dapat Proxy

### Option 1: Proxy Service (Paid - Recommended)

**Untuk Production di Alibaba Cloud:**

1. **Bright Data (Luminati)** - https://brightdata.com
   - Residential proxies (real user IP)
   - 72 juta+ IP pool
   - Harga: mulai $500/bulan
   - Format: `http://user-username:password@proxy-server:port`

2. **Smartproxy** - https://smartproxy.com
   - 40 juta+ residential IPs
   - Harga: mulai $75/bulan (5GB)
   - Format: `http://user:pass@gate.smartproxy.com:7000`

3. **Oxylabs** - https://oxylabs.io
   - 100 juta+ residential IPs
   - Harga: mulai $300/bulan
   - Support 195 countries

4. **IPRoyal** - https://iproyal.com
   - Budget friendly
   - Harga: mulai $1.75/GB
   - Residential & datacenter proxies

### Option 2: Free Proxy (Not Recommended)

⚠️ **WARNING**: Free proxy tidak stabil, lambat, dan tidak aman!

Website free proxy:
- https://www.freeproxy.world/
- https://free-proxy-list.net/
- https://www.proxy-list.download/

### Option 3: Setup Proxy Sendiri

Jika punya multiple server/VPS:

1. **Install Squid Proxy di Server:**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install squid

   # Edit config
   sudo nano /etc/squid/squid.conf

   # Restart
   sudo systemctl restart squid
   ```

2. **Atau pakai 3proxy** (lebih ringan):
   ```bash
   wget https://github.com/z3APA3A/3proxy/releases/download/0.9.4/3proxy-0.9.4.x86_64.deb
   sudo dpkg -i 3proxy-0.9.4.x86_64.deb
   ```

3. **Setup di multiple VPS:**
   - VPS 1: Setup proxy di port 8080
   - VPS 2: Setup proxy di port 8080
   - VPS 3: Setup proxy di port 8080
   - Tambahkan semua ke PROXIES

---

## 🎮 API Management

### 1. Cek Status Proxy

**Endpoint:** `GET /api/proxy/stats`

```bash
curl http://localhost:3000/api/proxy/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 3,
    "active": 2,
    "failed": 1,
    "proxies": [
      {
        "proxy": "http://proxy1.com:8080",
        "success": 45,
        "failed": 2,
        "successRate": "95.74%",
        "avgResponseTime": "1234ms",
        "lastUsed": "2024-11-01T10:30:00.000Z",
        "isFailed": false
      }
    ]
  }
}
```

### 2. Tambah Proxy

**Endpoint:** `POST /api/proxy/add`

```bash
curl -X POST http://localhost:3000/api/proxy/add \
  -H "Content-Type: application/json" \
  -d '{"proxy": "http://newproxy.com:8080"}'
```

### 3. Hapus Proxy

**Endpoint:** `POST /api/proxy/remove`

```bash
curl -X POST http://localhost:3000/api/proxy/remove \
  -H "Content-Type: application/json" \
  -d '{"proxy": "http://oldproxy.com:8080"}'
```

### 4. Reset Failed Proxies

**Endpoint:** `POST /api/proxy/reset`

```bash
curl -X POST http://localhost:3000/api/proxy/reset
```

---

## 🧪 Testing

### 1. Test Proxy Manual

Buat file `test-proxy.js`:

```javascript
const { proxyManager } = require('./utils/proxyManager');

async function testProxy() {
    try {
        // Test fetch dengan proxy
        const response = await proxyManager.fetchWithProxy('https://api.ipify.org?format=json');
        console.log('✅ Proxy working! Your IP:', response.data.ip);

        // Lihat stats
        console.log('\n📊 Proxy Stats:', proxyManager.getStats());
    } catch (error) {
        console.error('❌ Proxy failed:', error.message);
    }
}

testProxy();
```

Run:
```bash
node test-proxy.js
```

### 2. Test via API

```bash
# Test scraping manga (akan pakai proxy otomatis)
curl http://localhost:3000/api/manga?source=mangadex

# Cek stats
curl http://localhost:3000/api/proxy/stats
```

---

## 🔧 Troubleshooting

### Problem 1: "All proxies failed"

**Penyebab:**
- Semua proxy down/tidak valid
- Proxy memerlukan authentication

**Solusi:**
1. Cek proxy masih aktif: `curl --proxy http://proxy:port https://api.ipify.org`
2. Reset failed proxies: `curl -X POST http://localhost:3000/api/proxy/reset`
3. Tambah proxy baru yang valid

### Problem 2: "Proxy timeout"

**Penyebab:**
- Proxy lambat
- Network issue

**Solusi:**
1. Tingkatkan timeout di `proxyManager.js`
2. Ganti ke proxy yang lebih cepat
3. Cek network connectivity

### Problem 3: "407 Proxy Authentication Required"

**Penyebab:**
- Proxy butuh username/password tapi tidak disediakan

**Solusi:**
```bash
# Format yang benar:
http://username:password@proxy.com:8080

# Bukan:
http://proxy.com:8080
```

### Problem 4: "ECONNREFUSED"

**Penyebab:**
- Proxy server mati
- IP/port salah

**Solusi:**
1. Test manual: `telnet proxy.com 8080`
2. Cek typo di URL proxy
3. Pastikan firewall tidak block

---

## 💡 Best Practices

### 1. Gunakan Multiple Proxies
```env
# Minimal 3-5 proxies untuk reliability
PROXIES=proxy1,proxy2,proxy3,proxy4,proxy5
```

### 2. Monitor Stats Regularly
```bash
# Setup cron job untuk monitor
*/15 * * * * curl http://localhost:3000/api/proxy/stats
```

### 3. Auto Restart Failed Proxies
```bash
# Cron job untuk reset setiap 1 jam
0 * * * * curl -X POST http://localhost:3000/api/proxy/reset
```

### 4. Use Different Proxy Types
```env
# Mix residential + datacenter
PROXIES=http://residential.proxy:8080,http://datacenter.proxy:8080
```

### 5. Load Balancing
Proxy manager otomatis load balance dengan 3 strategy:
- **Round Robin** (default) - rotasi berurutan
- **Random** - random selection
- **Least Used** - pilih yang paling jarang dipakai

---

## 🚀 Deployment di Alibaba Cloud

### Step 1: Setup Environment

```bash
# SSH ke Alibaba Cloud
ssh root@your-server-ip

# Install dependencies
cd /var/www/manga-website
npm install
```

### Step 2: Setup Proxies

```bash
# Edit .env
nano .env

# Tambahkan proxies
PROXIES=http://user:pass@proxy1.com:8080,http://user:pass@proxy2.com:8080
```

### Step 3: Setup PM2

```bash
# Install PM2
npm install -g pm2

# Start dengan PM2
pm2 start api-server.js --name manga-api

# Setup auto restart
pm2 startup
pm2 save
```

### Step 4: Monitor

```bash
# Monitor logs
pm2 logs manga-api

# Monitor proxy stats
curl http://localhost:3000/api/proxy/stats
```

---

## 📊 Recommendations untuk Production

### Budget <$100/month:
- **IPRoyal Residential** ($1.75/GB) - beli 50GB = $87.5/bulan
- Setup 3-5 rotating proxies
- Auto reset setiap 1 jam

### Budget $100-$500/month:
- **Smartproxy** ($75/bulan untuk 5GB) + datacenter backup
- 10-20 rotating proxies
- Monitor dengan Grafana

### Budget >$500/month:
- **Bright Data** ($500/bulan unlimited)
- 50+ rotating proxies
- Full monitoring + alerting
- Redundancy setup

---

## 🔐 Security Notes

1. **NEVER commit .env to git**
   ```bash
   # Pastikan ada di .gitignore
   echo ".env" >> .gitignore
   ```

2. **Encrypt proxy credentials**
   - Gunakan environment variables
   - Atau gunakan secret manager (AWS Secrets Manager, etc)

3. **Restrict API access**
   - Tambahkan authentication untuk proxy management endpoints
   - Whitelist IP yang boleh akses

4. **Monitor usage**
   - Track berapa banyak request per proxy
   - Alert jika ada anomali

---

## 📞 Support

Jika ada pertanyaan:
1. Check logs: `pm2 logs` atau `node api-server.js`
2. Test proxy: `curl --proxy http://proxy:port https://api.ipify.org`
3. Check stats: `curl http://localhost:3000/api/proxy/stats`

---

**✅ Sekarang scraping Anda sudah pakai proxy rotation dengan auto IP change!**
