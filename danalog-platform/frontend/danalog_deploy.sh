#!/bin/bash

# ==========================================
# AUTO DEPLOY SCRIPT (Ubuntu 20.04/22.04)
# ==========================================

# 1. Update System
echo "Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 18
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PM2
echo "Installing PM2..."
sudo npm install -g pm2

# 4. Install Nginx
echo "Installing Nginx..."
sudo apt install -y nginx

# 5. Setup Project
APP_DIR="/var/www/danalog-frontend"
echo "Setting up app in $APP_DIR..."

if [ ! -d "$APP_DIR" ]; then
    echo "Directory not found. Please upload your code to $APP_DIR first!"
    exit 1
fi

cd $APP_DIR

echo "Installing dependencies..."
npm install

echo "Building frontend..."
npm run build

# 6. Start Backend with PM2
echo "Starting backend..."
pm2 delete "danalog-frontend" 2>/dev/null || true
pm2 start server.js --name "danalog-frontend"
pm2 save
pm2 startup

# 7. Configure Nginx
echo "Configuring Nginx..."
DOMAIN="your_domain.com" # <--- REPLACE THIS WITH YOUR DOMAIN

sudo bash -c "cat > /etc/nginx/sites-available/danalog-all <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF"

sudo ln -s /etc/nginx/sites-available/danalog-all /etc/nginx/sites-enabled/ 2>/dev/null || true
sudo nginx -t
sudo systemctl restart nginx

echo "Deployment Complete! don't forget to run Certbot for HTTPS!"
