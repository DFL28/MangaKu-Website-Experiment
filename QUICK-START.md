# ⚡ Quick Start - Deploy ke VPS 47.236.90.253

Panduan singkat untuk deploy website manga ke VPS Alibaba Cloud.

---

## 🚀 Deployment dalam 5 Menit

### Option 1: Deploy Otomatis (Recommended)

```bash
# 1. Dari komputer lokal (Git Bash/WSL)
bash deploy.sh

# 2. SSH ke VPS dan edit .env
ssh root@47.236.90.253
cd /var/www/manga-website
nano .env
# Ganti JWT_SECRET dan tambahkan PROXIES
# Save: Ctrl+O, Enter, Ctrl+X

# 3. Website live!
# http://47.236.90.253:3000
```

### Option 2: Manual Setup

```bash
# 1. SSH ke VPS
ssh root@47.236.90.253

# 2. Setup VPS (pertama kali saja)
curl -o setup-vps.sh https://raw.githubusercontent.com/your-repo/manga-website/main/setup-vps.sh
bash setup-vps.sh

# 3. Clone/Upload code
cd /var/www/manga-website
# Upload file atau git clone

# 4. Install dependencies
npm install --production

# 5. Setup environment
cp .env.production .env
nano .env
# Edit JWT_SECRET dan PROXIES

# 6. Start dengan PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 7. Website live!
# http://47.236.90.253:3000
```

---

## 🔧 Post-Deployment

### Setup Nginx (Optional - untuk port 80)

```bash
# Install nginx
apt install -y nginx

# Copy config
cp /var/www/manga-website/nginx.conf /etc/nginx/sites-available/manga-website
ln -s /etc/nginx/sites-available/manga-website /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test & reload
nginx -t
systemctl reload nginx

# Sekarang accessible di:
# http://47.236.90.253 (tanpa :3000)
```

### Setup Proxy (untuk avoid IP blocking)

```bash
# Edit .env
nano /var/www/manga-website/.env

# Tambahkan:
PROXIES=http://user:pass@proxy1.com:8080,http://user:pass@proxy2.com:8080

# Restart
pm2 restart manga-api
```

---

## 📊 Monitoring

```bash
# Check status
pm2 status

# View logs
pm2 logs manga-api

# Monitor resources
pm2 monit

# Or use htop
htop
```

---

## 🆘 Troubleshooting

### Website tidak bisa diakses?

```bash
# 1. Check PM2
pm2 status

# 2. Check firewall
ufw status
ufw allow 3000/tcp

# 3. Check logs
pm2 logs manga-api --lines 50

# 4. Restart
pm2 restart manga-api
```

### Out of memory?

```bash
# Check memory
free -h

# Clear cache
rm -rf /var/www/manga-website/cache/*

# Restart PM2
pm2 restart manga-api
```

---

## 📝 Quick Commands

```bash
# View status
pm2 status

# Restart app
pm2 restart manga-api

# View logs
pm2 logs manga-api

# Update app
cd /var/www/manga-website
git pull  # or upload new files
npm install --production
pm2 restart manga-api

# Backup
cd /var/www
tar -czf backup-$(date +%Y%m%d).tar.gz manga-website/
```

---

## ✅ Checklist

- [ ] VPS accessible via SSH
- [ ] setup-vps.sh executed
- [ ] Code uploaded to /var/www/manga-website
- [ ] npm install completed
- [ ] .env file edited (JWT_SECRET & PROXIES)
- [ ] PM2 started
- [ ] Website accessible at http://47.236.90.253:3000
- [ ] Nginx configured (optional)
- [ ] Proxy added (optional)

---

**Access website: http://47.236.90.253:3000**

Untuk panduan lengkap, lihat [DEPLOYMENT.md](DEPLOYMENT.md)
