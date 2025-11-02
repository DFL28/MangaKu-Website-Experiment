# 🚀 Panduan Deploy ke VPS Alibaba Cloud (47.236.90.253)

Panduan lengkap untuk deploy website manga ke VPS Alibaba Cloud dengan spesifikasi 1GB RAM, 1 Core, 40GB Storage.

---

## 📋 Daftar Isi

1. [Persiapan VPS](#persiapan-vps)
2. [Setup Awal Server](#setup-awal-server)
3. [Deploy Aplikasi](#deploy-aplikasi)
4. [Setup Nginx (Optional)](#setup-nginx)
5. [Setup SSL/HTTPS (Optional)](#setup-ssl)
6. [Monitoring & Maintenance](#monitoring)
7. [Troubleshooting](#troubleshooting)

---

## 🖥️ Persiapan VPS

### Spesifikasi VPS Anda:
- **IP**: 47.236.90.253
- **RAM**: 1GB
- **CPU**: 1 Core
- **Storage**: 40GB
- **OS**: Ubuntu 20.04/22.04 (recommended)

### Yang Perlu Disiapkan:
1. ✅ Akses SSH ke VPS
2. ✅ Password/SSH key untuk login
3. ✅ Domain (optional, bisa pakai IP langsung)

---

## 🔧 Setup Awal Server

### 1. Login ke VPS

```bash
# Via SSH
ssh root@47.236.90.253

# Atau jika pakai password
ssh root@47.236.90.253
# Enter password saat diminta
```

### 2. Update System

```bash
# Update package list
apt update

# Upgrade installed packages
apt upgrade -y

# Install essential tools
apt install -y curl wget git build-essential
```

### 3. Install Node.js

```bash
# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node -v
npm -v
```

### 4. Install PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 -v
```

### 5. Setup Firewall (Optional tapi Recommended)

```bash
# Install UFW
apt install -y ufw

# Allow SSH (PENTING! Jangan lupa ini!)
ufw allow 22/tcp

# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS
ufw allow 443/tcp

# Allow port 3000 (untuk testing)
ufw allow 3000/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

### 6. Buat Folder untuk Website

```bash
# Create directory
mkdir -p /var/www/manga-website

# Navigate to directory
cd /var/www/manga-website
```

---

## 📦 Deploy Aplikasi

### Method 1: Upload Manual (Recommended untuk First Time)

#### Step 1: Compress Project di Local

```bash
# Di komputer Anda (Windows)
# Buka folder project
cd "c:\Danish\Apa kek"

# Compress (jika pakai Git Bash atau WSL)
tar -czf manga-website.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='cache' \
    --exclude='logs' \
    .

# Atau pakai WinRAR/7-Zip untuk compress ke .tar.gz
```

#### Step 2: Upload ke VPS

```bash
# Via SCP (dari komputer lokal)
scp manga-website.tar.gz root@47.236.90.253:/var/www/manga-website/

# Atau gunakan FileZilla/WinSCP untuk upload
```

#### Step 3: Extract di VPS

```bash
# SSH ke VPS
ssh root@47.236.90.253

# Navigate to directory
cd /var/www/manga-website

# Extract
tar -xzf manga-website.tar.gz

# Install dependencies
npm install --production

# Copy environment file
cp .env.production .env

# IMPORTANT: Edit .env!
nano .env
```

**Edit .env - Ganti nilai ini:**
```env
JWT_SECRET=random_string_yang_kuat_12345678  # Ganti dengan random string
PROXIES=http://your-proxy:port                 # Tambahkan proxy jika ada
```

Save: `Ctrl + O`, Enter, `Ctrl + X`

#### Step 4: Create Logs & Cache Folders

```bash
# Create folders
mkdir -p logs cache

# Set permissions
chmod 755 logs cache
```

#### Step 5: Start dengan PM2

```bash
# Start application
pm2 start ecosystem.config.js --env production

# Check status
pm2 status

# View logs
pm2 logs manga-api

# Save PM2 config
pm2 save

# Setup auto-start on boot
pm2 startup systemd
# Copy-paste command yang muncul dan run
```

### Method 2: Deploy Otomatis dengan Script

```bash
# Di komputer lokal (Git Bash/WSL)
bash deploy.sh

# Script akan otomatis:
# 1. Compress project
# 2. Upload ke VPS
# 3. Extract dan install
# 4. Start dengan PM2
```

---

## 🌐 Setup Nginx (Reverse Proxy)

### Kenapa Pakai Nginx?
- ✅ Serve di port 80 (default HTTP)
- ✅ Load balancing jika nanti scale up
- ✅ Cache static files
- ✅ SSL/HTTPS support
- ✅ Better performance

### Install Nginx

```bash
# Install
apt install -y nginx

# Check status
systemctl status nginx
```

### Configure Nginx

```bash
# Copy nginx config
cp /var/www/manga-website/nginx.conf /etc/nginx/sites-available/manga-website

# Create symbolic link
ln -s /etc/nginx/sites-available/manga-website /etc/nginx/sites-enabled/

# Remove default config
rm /etc/nginx/sites-enabled/default

# Test config
nginx -t

# Reload nginx
systemctl reload nginx
```

### Akses Website

Sekarang website bisa diakses di:
- **Tanpa Nginx**: http://47.236.90.253:3000
- **Dengan Nginx**: http://47.236.90.253

---

## 🔒 Setup SSL/HTTPS (Let's Encrypt)

### Install Certbot

```bash
# Install certbot
apt install -y certbot python3-certbot-nginx
```

### Jika Pakai Domain:

```bash
# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts
# Certbot akan otomatis configure nginx untuk HTTPS
```

### Jika Pakai IP (Self-Signed):

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/nginx-selfsigned.key \
  -out /etc/ssl/certs/nginx-selfsigned.crt

# Update nginx config untuk pakai certificate ini
```

### Auto-Renew SSL

```bash
# Test renewal
certbot renew --dry-run

# Setup cron job
crontab -e

# Add this line:
0 3 * * * certbot renew --quiet
```

---

## 📊 Monitoring & Maintenance

### PM2 Commands

```bash
# View status
pm2 status

# View logs (real-time)
pm2 logs manga-api

# View logs (last 100 lines)
pm2 logs manga-api --lines 100

# Restart app
pm2 restart manga-api

# Stop app
pm2 stop manga-api

# Monitor resources
pm2 monit

# Clear logs
pm2 flush
```

### System Monitoring

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check running processes
ps aux | grep node

# Check network
netstat -tulpn | grep 3000
```

### Backup

```bash
# Backup website
cd /var/www
tar -czf manga-backup-$(date +%Y%m%d).tar.gz manga-website/

# Backup ke komputer lokal
scp root@47.236.90.253:/var/www/manga-backup-*.tar.gz ./backups/
```

### Update Application

```bash
# Method 1: Manual
cd /var/www/manga-website
git pull  # Jika pakai git
npm install --production
pm2 restart manga-api

# Method 2: Via deploy script
bash deploy.sh  # Dari komputer lokal
```

### Clean Cache

```bash
# Clear application cache
cd /var/www/manga-website
rm -rf cache/*

# Clear PM2 logs
pm2 flush

# Clear nginx cache (jika pakai)
rm -rf /var/cache/nginx/*
systemctl reload nginx
```

---

## 🔥 Optimasi untuk 1GB RAM

### 1. Swap File (Virtual Memory)

```bash
# Create 2GB swap file
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Verify
free -h
```

### 2. Limit PM2 Memory

Sudah di-set di `ecosystem.config.js`:
```javascript
max_memory_restart: '500M'  // Auto restart jika > 500MB
```

### 3. Cache Optimization

Edit `/var/www/manga-website/.env`:
```env
# Perpanjang cache duration untuk hemat RAM
CACHE_MANGA_LIST=7200000     # 2 jam
CACHE_MANGA_DETAIL=14400000  # 4 jam
CACHE_CHAPTER_PAGES=86400000 # 24 jam
```

### 4. Monitor Resources

```bash
# Install htop untuk monitoring
apt install -y htop

# Run htop
htop

# Press F10 to quit
```

---

## 🐛 Troubleshooting

### Problem 1: Port 3000 sudah dipakai

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Atau restart PM2
pm2 restart manga-api
```

### Problem 2: Out of Memory

```bash
# Check memory
free -h

# Clear cache
sync; echo 3 > /proc/sys/vm/drop_caches

# Restart PM2
pm2 restart manga-api

# Add swap jika belum
```

### Problem 3: Nginx 502 Bad Gateway

```bash
# Check PM2 status
pm2 status

# If stopped, start it
pm2 start manga-api

# Check nginx logs
tail -f /var/log/nginx/manga-error.log

# Restart nginx
systemctl restart nginx
```

### Problem 4: Permission Denied

```bash
# Fix ownership
chown -R www-data:www-data /var/www/manga-website

# Fix permissions
chmod -R 755 /var/www/manga-website
```

### Problem 5: npm install gagal

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules
rm -rf node_modules package-lock.json

# Install lagi
npm install --production
```

### Problem 6: Git clone/pull error

```bash
# Setup Git credentials
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Or use SSH key
ssh-keygen -t rsa -b 4096 -C "you@example.com"
cat ~/.ssh/id_rsa.pub
# Add to GitHub SSH keys
```

---

## 📝 Checklist Deployment

### Pre-Deployment:
- [ ] VPS sudah ready dan accessible
- [ ] Node.js terinstall
- [ ] PM2 terinstall
- [ ] Firewall configured
- [ ] Folder `/var/www/manga-website` dibuat

### Deployment:
- [ ] Code ter-upload ke VPS
- [ ] Dependencies ter-install (`npm install`)
- [ ] `.env` file sudah di-edit
- [ ] JWT_SECRET sudah diganti
- [ ] Proxy sudah ditambahkan (jika ada)
- [ ] Logs & cache folder sudah dibuat
- [ ] PM2 started dan running
- [ ] PM2 auto-start on boot configured

### Post-Deployment:
- [ ] Website accessible di http://47.236.90.253:3000
- [ ] Nginx installed dan configured (optional)
- [ ] Website accessible di http://47.236.90.253
- [ ] SSL certificate installed (optional)
- [ ] Monitoring setup
- [ ] Backup strategy defined

---

## 🎯 Quick Start Commands

```bash
# 1. SSH to VPS
ssh root@47.236.90.253

# 2. Navigate to app
cd /var/www/manga-website

# 3. Check status
pm2 status

# 4. View logs
pm2 logs manga-api --lines 50

# 5. Restart app
pm2 restart manga-api

# 6. Monitor resources
pm2 monit

# 7. Check website
curl http://localhost:3000/api/health
```

---

## 📞 Support & Resources

### Useful Links:
- PM2 Docs: https://pm2.keymetrics.io/docs/usage/quick-start/
- Nginx Docs: https://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/
- Node.js: https://nodejs.org/

### Log Locations:
- PM2 logs: `/var/www/manga-website/logs/`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/syslog`

---

**🎉 Selamat! Website manga Anda sekarang live di VPS Alibaba Cloud!**

Access: **http://47.236.90.253:3000** (atau :80 jika pakai Nginx)
