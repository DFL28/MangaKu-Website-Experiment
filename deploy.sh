#!/bin/bash
# ===== Deploy Script ke VPS Alibaba Cloud =====
# Usage: bash deploy.sh

set -e

echo "======================================"
echo "🚀 Deploying Manga Website"
echo "======================================"

VPS_IP="47.236.90.253"
VPS_USER="root"
VPS_PATH="/var/www/manga-website"
LOCAL_PATH="."

echo ""
echo "📦 Step 1: Creating archive..."
tar -czf manga-website.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='cache' \
    --exclude='logs' \
    --exclude='*.log' \
    --exclude='.env' \
    --exclude='manga-website.tar.gz' \
    .

echo "✅ Archive created: manga-website.tar.gz"

echo ""
echo "📤 Step 2: Uploading to VPS..."
scp manga-website.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/

echo "✅ Upload complete"

echo ""
echo "🔧 Step 3: Extracting and setting up on VPS..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
set -e

# Create directory if not exists
mkdir -p /var/www/manga-website
cd /var/www/manga-website

# Backup old version
if [ -d "api-server.js" ]; then
    echo "📦 Backing up old version..."
    mkdir -p ../backups
    tar -czf ../backups/backup-$(date +%Y%m%d-%H%M%S).tar.gz . 2>/dev/null || true
fi

# Extract new version
echo "📦 Extracting new version..."
tar -xzf /tmp/manga-website.tar.gz -C /var/www/manga-website

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Copy production env
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.production..."
    cp .env.production .env
    echo "⚠️  IMPORTANT: Edit .env and set your JWT_SECRET and PROXIES!"
fi

# Create logs directory
mkdir -p logs

# Create cache directory
mkdir -p cache

# Set permissions
chown -R www-data:www-data /var/www/manga-website 2>/dev/null || true

# Clean up
rm /tmp/manga-website.tar.gz

echo "✅ Setup complete"
ENDSSH

echo ""
echo "🔄 Step 4: Restarting application..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
cd /var/www/manga-website

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Stop old process if exists
pm2 stop manga-api 2>/dev/null || true
pm2 delete manga-api 2>/dev/null || true

# Start with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 config
pm2 save

# Setup PM2 startup
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# Show status
echo ""
echo "📊 PM2 Status:"
pm2 status
ENDSSH

echo ""
echo "🧹 Step 5: Cleanup local archive..."
rm manga-website.tar.gz

echo ""
echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""
echo "🌐 Your website is now running at:"
echo "   http://47.236.90.253:3000"
echo ""
echo "📊 Useful commands on VPS:"
echo "   pm2 status         - Check status"
echo "   pm2 logs manga-api - View logs"
echo "   pm2 restart manga-api - Restart app"
echo "   pm2 monit          - Real-time monitor"
echo ""
echo "⚠️  Don't forget to:"
echo "   1. Edit /var/www/manga-website/.env"
echo "   2. Set JWT_SECRET to random string"
echo "   3. Add your PROXIES if needed"
echo "   4. Setup Nginx (optional but recommended)"
echo ""
