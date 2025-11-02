# Panduan Deploy ke VPS (47.236.90.253)

## Perubahan yang Sudah Dilakukan

Server sudah dikonfigurasi untuk bind ke `0.0.0.0` agar bisa diakses secara public melalui IP 47.236.90.253.

## Langkah-Langkah Deploy ke VPS

### 1. Upload File ke VPS

Dari komputer lokal, upload semua file ke VPS:

```bash
# Gunakan SCP atau SFTP untuk upload
scp -r * root@47.236.90.253:/var/www/manga-website/
```

Atau bisa menggunakan Git:
```bash
# Di VPS
cd /var/www/manga-website
git clone <repository-url> .
```

### 2. Setup VPS (Pertama Kali Saja)

Login ke VPS dan jalankan setup script:

```bash
ssh root@47.236.90.253
cd /var/www/manga-website
chmod +x setup-vps.sh
sudo bash setup-vps.sh
```

### 3. Install Dependencies

```bash
cd /var/www/manga-website
npm install --production
```

### 4. Setup Environment Variables (Opsional)

```bash
nano .env
```

Tambahkan (jika diperlukan):
```
NODE_ENV=production
PORT=3000
```

### 5. Jalankan dengan PM2

```bash
# Start aplikasi
pm2 start api-server.js --name manga-api

# Atau dengan environment
pm2 start api-server.js --name manga-api --env production

# Auto-restart saat server reboot
pm2 startup
pm2 save
```

### 6. Setup Nginx (Opsional - untuk production)

```bash
# Copy config nginx
sudo cp nginx.conf /etc/nginx/sites-available/manga-website

# Buat symbolic link
sudo ln -s /etc/nginx/sites-available/manga-website /etc/nginx/sites-enabled/

# Test konfigurasi
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 7. Setup Firewall

Pastikan port 3000 terbuka:

```bash
# Jika menggunakan UFW
sudo ufw allow 3000/tcp
sudo ufw status

# Jika menggunakan firewalld
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# Atau di Alibaba Cloud Security Group
# Buka console Alibaba Cloud -> ECS -> Security Groups
# Tambahkan rule: Port 3000, Protocol TCP, Source 0.0.0.0/0
```

## Akses Website

Setelah deploy, website bisa diakses di:

- **Direct (tanpa Nginx):** http://47.236.90.253:3000
- **Dengan Nginx:** http://47.236.90.253

### Test API
```bash
# Test health check
curl http://47.236.90.253:3000/api/health

# Test manga list
curl http://47.236.90.253:3000/api/manga?source=mangadex
```

## Monitoring

### Cek Status PM2
```bash
pm2 status
pm2 logs manga-api
pm2 monit
```

### Cek Resource Usage
```bash
htop
free -h
df -h
```

### Cek Nginx Logs (jika pakai Nginx)
```bash
tail -f /var/log/nginx/manga-access.log
tail -f /var/log/nginx/manga-error.log
```

## Troubleshooting

### Port 3000 Sudah Digunakan
```bash
# Cek proses yang pakai port 3000
lsof -i :3000
# atau
netstat -tulpn | grep 3000

# Kill proses jika perlu
kill -9 <PID>
```

### Website Tidak Bisa Diakses dari Luar

1. **Cek firewall VPS:**
   ```bash
   sudo ufw status
   ```

2. **Cek Security Group di Alibaba Cloud:**
   - Login ke console Alibaba Cloud
   - Masuk ke ECS -> Security Groups
   - Pastikan ada rule untuk port 3000 (Source: 0.0.0.0/0)

3. **Cek apakah server running:**
   ```bash
   pm2 status
   curl http://localhost:3000/api/health
   ```

4. **Cek binding address:**
   ```bash
   netstat -tulpn | grep 3000
   # Harus menunjukkan 0.0.0.0:3000 bukan 127.0.0.1:3000
   ```

### Memory Habis

```bash
# Restart PM2
pm2 restart manga-api

# Atau limit memory
pm2 start api-server.js --name manga-api --max-memory-restart 500M
```

## Update Aplikasi

```bash
# Pull update dari git
cd /var/www/manga-website
git pull

# Install dependencies baru (jika ada)
npm install --production

# Restart PM2
pm2 restart manga-api
```

## Backup

```bash
# Backup database/cache
tar -czf /var/www/backups/manga-backup-$(date +%Y%m%d).tar.gz /var/www/manga-website

# Backup otomatis dengan cron
crontab -e
# Tambahkan:
# 0 2 * * * tar -czf /var/www/backups/manga-backup-$(date +\%Y\%m\%d).tar.gz /var/www/manga-website
```

## Keamanan

1. **Gunakan HTTPS** (dengan Let's Encrypt):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

2. **Update system secara berkala:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Monitoring dengan PM2:**
   ```bash
   pm2 install pm2-logrotate
   ```

## Informasi Penting

- **IP VPS:** 47.236.90.253
- **Port:** 3000 (direct), 80 (via Nginx)
- **Directory:** /var/www/manga-website
- **Logs:**
  - PM2: `pm2 logs manga-api`
  - Nginx: `/var/log/nginx/manga-*.log`
- **PM2 Config:** Bisa buat `ecosystem.config.js` untuk config lebih advanced
