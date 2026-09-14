#!/bin/bash
# ============================================================
# MoveFlow EC2 Setup Script
# Run this ONCE after SSH into your EC2 instance
# Usage: bash setup-ec2.sh
# ============================================================

set -e

echo "=== MoveFlow EC2 Setup ==="

# 1. Update system
echo "[1/5] Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
echo "[2/5] Installing Docker..."
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu

# 3. Clone repo
echo "[3/5] Cloning MoveFlow repo..."
cd /home/ubuntu
if [ ! -d "Moveflow" ]; then
    git clone https://github.com/Shubham-Khanvilkar/Moveflow.git
else
    cd Moveflow && git pull
fi

# 4. Build and start services
echo "[4/5] Building and starting services..."
cd /home/ubuntu/Moveflow
docker-compose -f docker-compose.production.yml up -d --build

# 5. Verify
echo "[5/5] Verifying services..."
echo ""
echo "Waiting 15s for services to start..."
sleep 15

echo "API Health:"
curl -s http://localhost:3001/health || echo "API not ready yet"
echo ""
echo "ML Health:"
curl -s http://localhost:8000/health || echo "ML not ready yet"
echo ""

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "=== Setup Complete ==="
echo "API URL: http://${PUBLIC_IP}:3001"
echo "ML URL:  http://${PUBLIC_IP}:8000"
echo ""
echo "Next steps:"
echo "1. Share this URL with the developer to update Vercel"
echo "2. Open port 3001 and 8000 in AWS Security Group if not done"
