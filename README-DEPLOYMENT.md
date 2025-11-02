# Panduan Deployment - Local & Production

Server ini sekarang mendukung 2 mode: **Local Development** dan **Production (Public Access)**.

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Pilih Mode

#### Mode Local (Development)
```bash
npm run dev        # Jalankan sekali
npm run dev:watch  # Dengan auto-reload (nodemon)
```

Server akan jalan di: **http://localhost:3000** (hanya bisa diakses dari komputer Anda)

#### Mode Production (Public/VPS)
```bash
npm run prod
```

Server akan jalan di: **http://47.236.90.253:3000** (bisa diakses dari mana saja)

---

## Konfigurasi Environment

### File Environment yang Tersedia:

1. **`.env.local`** - Untuk development lokal
   ```env
   NODE_ENV=development
   PORT=3000
   HOST=localhost        # Hanya lokal
   PUBLIC_IP=localhost
   ```

2. **`.env.production`** - Untuk VPS/server public
   ```env
   NODE_ENV=production
   PORT=3000
   HOST=0.0.0.0         # Public access
   PUBLIC_IP=47.236.90.253
   ```

3. **`.env.example`** - Template/contoh

### Customize Environment

Buat file `.env` di root folder dan sesuaikan:

```bash
cp .env.local .env     # Untuk local
# atau
cp .env.production .env # Untuk production
```

---

## Deployment ke VPS (47.236.90.253)

### Step 1: Upload ke VPS

```bash
# Via SCP
scp -r * root@47.236.90.253:/var/www/manga-website/

# Atau via Git
# Di VPS:
git clone <your-repo> /var/www/manga-website
cd /var/www/manga-website
```

### Step 2: Install Dependencies

```bash
ssh root@47.236.90.253
cd /var/www/manga-website
npm install --production
```

### Step 3: Jalankan dengan PM2

```bash
# Install PM2 global (jika belum)
npm install -g pm2

# Start dengan mode production
pm2 start npm --name manga-api -- run prod

# Atau langsung dengan node
pm2 start api-server.js --name manga-api --node-args="-r dotenv/config" -- dotenv_config_path=.env.production

# Auto-restart saat server reboot
pm2 startup
pm2 save
```

### Step 4: Buka Firewall

**Di Alibaba Cloud Security Group:**
- Login ke Alibaba Cloud Console
- ECS → Security Groups
- Add Inbound Rule:
  - Port: 3000
  - Protocol: TCP
  - Source: 0.0.0.0/0

**Di VPS (UFW):**
```bash
sudo ufw allow 3000/tcp
sudo ufw status
```

### Step 5: Test

```bash
# Dari dalam VPS
curl http://localhost:3000/api/health

# Dari luar (komputer Anda)
curl http://47.236.90.253:3000/api/health
```

---

## Perbedaan Mode

| Fitur | Local (`npm run dev`) | Production (`npm run prod`) |
|-------|----------------------|----------------------------|
| **HOST** | localhost | 0.0.0.0 (semua interface) |
| **Akses** | Hanya dari komputer sendiri | Dari mana saja via internet |
| **URL** | http://localhost:3000 | http://47.236.90.253:3000 |
| **Auto-reload** | Ya (dev:watch) | Tidak |
| **Cache** | Same | Same |

---

## Monitoring & Maintenance

### Cek Status PM2
```bash
pm2 status
pm2 logs manga-api
pm2 monit
```

### Restart Server
```bash
pm2 restart manga-api
```

### Stop Server
```bash
pm2 stop manga-api
pm2 delete manga-api
```

### Update Aplikasi
```bash
cd /var/www/manga-website
git pull
npm install --production
pm2 restart manga-api
```

---

## Troubleshooting

### Server tidak bisa diakses dari luar

1. **Cek apakah server running:**
   ```bash
   pm2 status
   netstat -tulpn | grep 3000
   ```
   Output harus menunjukkan `0.0.0.0:3000` bukan `127.0.0.1:3000`

2. **Cek firewall VPS:**
   ```bash
   sudo ufw status
   ```

3. **Cek Security Group Alibaba Cloud** - Pastikan port 3000 terbuka

4. **Test dari dalam VPS:**
   ```bash
   curl http://localhost:3000/api/health
   ```

5. **Test dari luar:**
   ```bash
   curl http://47.236.90.253:3000/api/health
   ```

### Port sudah digunakan

```bash
# Cek proses yang pakai port 3000
lsof -i :3000
# atau
netstat -tulpn | grep 3000

# Kill proses
kill -9 <PID>
```

### Environment tidak terbaca

Pastikan dotenv sudah terinstall:
```bash
npm install dotenv
```

Dan jalankan dengan parameter yang benar:
```bash
node -r dotenv/config api-server.js dotenv_config_path=.env.production
```

---

## Setup Nginx (Optional - Recommended)

Untuk production, lebih baik pakai Nginx sebagai reverse proxy:

### 1. Install Nginx
```bash
sudo apt install nginx
```

### 2. Copy config
```bash
sudo cp nginx.conf /etc/nginx/sites-available/manga-website
sudo ln -s /etc/nginx/sites-available/manga-website /etc/nginx/sites-enabled/
```

### 3. Test & Restart
```bash
sudo nginx -t
sudo systemctl restart nginx
```

Sekarang bisa diakses via: **http://47.236.90.253** (tanpa port)

---

## Security Tips

1. **Ganti JWT Secret** di `.env.production`
2. **Setup HTTPS** dengan Let's Encrypt:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx
   ```
3. **Firewall** - Tutup port yang tidak perlu
4. **Update** system secara berkala:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## Scripts NPM Available

```bash
npm start          # Jalankan langsung (default, tanpa env file)
npm run dev        # Development mode (localhost only)
npm run dev:watch  # Development dengan auto-reload
npm run prod       # Production mode (public access)
```

---

## Support

Jika ada masalah, cek:
- PM2 logs: `pm2 logs manga-api`
- System logs: `journalctl -u nginx -f`
- Application logs di console saat start

---

**Selamat mencoba!** 🚀
