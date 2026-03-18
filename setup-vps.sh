#!/bin/bash
# VPS 一键安装脚本：FRP + Nginx + SSL
# 适用于 Ubuntu/Debian

set -e

echo "🚀 开始配置 VPS..."

# 配置变量
FRP_VERSION="0.58.1"
DOMAIN="hfx.lizheng31.cc.cd"
FRP_TOKEN="$(openssl rand -hex 16)"
EMAIL="admin@lizheng31.cc.cd"

# 更新系统
echo "📦 更新系统..."
apt update -y
apt upgrade -y

# 安装必要工具
echo "📦 安装必要工具..."
apt install -y wget curl nginx certbot python3-certbot-nginx ufw

# 下载并安装 FRP 服务端
echo "📥 下载 FRP v${FRP_VERSION}..."
cd /opt
if [ ! -d "frp" ]; then
    wget -q "https://github.com/fatedier/frp/releases/download/v${FRP_VERSION}/frp_${FRP_VERSION}_linux_amd64.tar.gz"
    tar -xzf "frp_${FRP_VERSION}_linux_amd64.tar.gz"
    mv "frp_${FRP_VERSION}_linux_amd64" frp
    rm "frp_${FRP_VERSION}_linux_amd64.tar.gz"
fi

# 创建 FRP 服务端配置
echo "⚙️ 配置 FRP 服务端..."
cat > /opt/frp/frps.toml << EOF
bindPort = 7000
auth.method = "token"
auth.token = "${FRP_TOKEN}"
EOF

# 创建 systemd 服务
echo "🔧 创建 FRP 服务..."
cat > /etc/systemd/system/frps.service << 'EOF'
[Unit]
Description=FRP Server
After=network.target

[Service]
Type=simple
ExecStart=/opt/frp/frps -c /opt/frp/frps.toml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 启动 FRP 服务
systemctl daemon-reload
systemctl enable frps
systemctl start frps

# 配置防火墙
echo "🔥 配置防火墙..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 7000/tcp
ufw --force enable

# 配置 Nginx
echo "🌐 配置 Nginx..."
cat > /etc/nginx/sites-available/mobile-office-bridge << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

# 启用站点
ln -sf /etc/nginx/sites-available/mobile-office-bridge /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试并重载 Nginx
nginx -t
systemctl reload nginx

# 获取 SSL 证书
echo "🔒 获取 SSL 证书..."
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --email "${EMAIL}" || true

# 重启 Nginx
systemctl restart nginx

# 输出配置信息
echo ""
echo "✅ VPS 配置完成！"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 FRP 服务端配置"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "地址: ${DOMAIN}:7000"
echo "Token: ${FRP_TOKEN}"
echo ""
echo "📝 本机 FRP 客户端配置 (frpc.toml)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat << EOF
serverAddr = "${DOMAIN}"
serverPort = 7000
auth.method = "token"
auth.token = "${FRP_TOKEN}"

[[proxies]]
name = "mobile-office-bridge"
type = "tcp"
localIP = "127.0.0.1"
localPort = 8080
remotePort = 8080
EOF
echo ""
echo "📝 小移办公回调地址"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "https://${DOMAIN}/webhook"
echo ""
echo "⚠️  保存好上面的 Token，本机配置需要用到！"
echo ""
