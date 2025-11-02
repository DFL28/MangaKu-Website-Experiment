// ===== PM2 Ecosystem Configuration for Alibaba Cloud =====
// File ini untuk setup PM2 di VPS

module.exports = {
  apps: [
    {
      name: 'manga-api',
      script: './api-server.js',
      instances: 1, // Untuk VPS 1 Core, pakai 1 instance saja
      exec_mode: 'fork', // Fork mode untuk 1 instance

      // Auto restart settings
      autorestart: true,
      watch: false, // Disable watch di production
      max_memory_restart: '500M', // Restart jika RAM > 500MB (hemat untuk 1GB RAM)

      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Restart delay
      min_uptime: '10s',
      max_restarts: 10,

      // Advanced
      kill_timeout: 5000,
      listen_timeout: 3000,

      // Monitoring
      instance_var: 'INSTANCE_ID'
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'root', // Ganti jika pakai user lain
      host: '47.236.90.253',
      ref: 'origin/main',
      repo: 'git@github.com:username/manga-website.git', // Ganti dengan repo Anda
      path: '/var/www/manga-website',

      // Commands to execute before setup
      'pre-setup': 'echo "Pre-setup commands"',

      // Commands after pulling code
      'post-setup': 'npm install',

      // Commands to execute on server after repo pulled
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',

      // Environment variables
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
