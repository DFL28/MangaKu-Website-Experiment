#!/bin/bash
# ===== VPS Setup Script untuk Alibaba Cloud =====
# Run di VPS: bash setup-vps.sh

set -e

echo "======================================"
echo "🚀 VPS Setup untuk Manga Website"
echo "======================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (sudo bash setup-vps.sh)"
    exit 1
fi

echo ""
echo "📦 Step 1: Updating system..."
apt update
apt upgrade -y

echo ""
echo "📦 Step 2: Installing essential tools..."
apt install -y curl wget git build-essential

echo ""
echo "📦 Step 3: Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"

echo ""
echo "📦 Step 4: Installing PM2..."
npm install -g pm2

echo "✅ PM2 version: $(pm2 -v)"

echo ""
echo "📦 Step 5: Installing Nginx..."
apt install -y nginx

echo "✅ Nginx installed"

echo ""
echo "🔧 Step 6: Setting up firewall..."
apt install -y ufw

# Configure firewall
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp

echo "✅ Firewall configured"
ufw status

echo ""
echo "📁 Step 7: Creating directories..."
mkdir -p /var/www/manga-website/logs
mkdir -p /var/www/manga-website/cache
mkdir -p /var/www/backups

echo "✅ Directories created"

echo ""
echo "💾 Step 8: Setting up swap (2GB)..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "✅ Swap created and activated"
else
    echo "ℹ️  Swap already exists"
fi

echo ""
echo "🔧 Step 9: Optimizing system..."

# Optimize sysctl for low memory
cat >> /etc/sysctl.conf << EOF

# Optimizations for 1GB RAM server
vm.swappiness=10
vm.vfs_cache_pressure=50
net.core.rmem_max=16777216
net.core.wmem_max=16777216
EOF

sysctl -p

echo "✅ System optimized"

echo ""
echo "📊 Step 10: Installing monitoring tools..."
apt install -y htop nethogs iotop

echo "✅ Monitoring tools installed"

echo ""
echo "======================================"
echo "✅ VPS Setup Complete!"
echo "======================================"
echo ""
echo "📊 System Information:"
echo "   OS: $(lsb_release -d | cut -f2)"
echo "   Node.js: $(node -v)"
echo "   npm: $(npm -v)"
echo "   PM2: $(pm2 -v)"
echo "   RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo "   Disk: $(df -h / | awk 'NR==2 {print $2}')"
echo ""
echo "📁 Directories created:"
echo "   /var/www/manga-website    - Main application"
echo "   /var/www/backups          - Backups"
echo ""
echo "🔥 Next steps:"
echo "   1. Upload your application to /var/www/manga-website"
echo "   2. Run: cd /var/www/manga-website && npm install"
echo "   3. Edit .env file"
echo "   4. Run: pm2 start ecosystem.config.js --env production"
echo "   5. Setup Nginx: cp nginx.conf /etc/nginx/sites-available/manga-website"
echo ""
echo "💡 Useful commands:"
echo "   htop           - Monitor system resources"
echo "   pm2 status     - Check PM2 status"
echo "   pm2 logs       - View application logs"
echo "   nginx -t       - Test nginx config"
echo ""
