#!/bin/bash
# OpenClaw Device Token Fix Script
# This script will attempt to fix the device token mismatch issue

set -e

echo "=== OpenClaw Fix Script ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Stop container
echo "1. Stopping container..."
docker-compose -f /path/to/docker-compose.yml down || docker stop openclaw-gateway
echo -e "${GREEN}✓ Container stopped${NC}"

# Step 2: Backup current state
echo ""
echo "2. Backing up current state..."
BACKUP_DIR="/root/.openclaw.backup.$(date +%Y%m%d_%H%M%S)"
if [ -d "/root/.openclaw" ]; then
    cp -r /root/.openclaw "$BACKUP_DIR"
    echo -e "${GREEN}✓ Backup created at $BACKUP_DIR${NC}"
else
    echo -e "${YELLOW}⚠ No state directory to backup${NC}"
fi

# Step 3: Remove old state
echo ""
echo "3. Removing old state directory..."
rm -rf /root/.openclaw
echo -e "${GREEN}✓ Old state removed${NC}"

# Step 4: Create fresh state directory
echo ""
echo "4. Creating fresh state directory..."
mkdir -p /root/.openclaw/workspace
chmod -R 755 /root/.openclaw
echo -e "${GREEN}✓ Fresh state directory created${NC}"

# Step 5: Update docker-compose.yml to ensure OPENCLAW_STATE_DIR is set
echo ""
echo "5. Checking docker-compose.yml..."
COMPOSE_FILE="/root/docker-compose.yml"
if [ -f "$COMPOSE_FILE" ]; then
    echo "Found docker-compose.yml at $COMPOSE_FILE"
    echo "Please ensure it has:"
    echo "  - OPENCLAW_STATE_DIR=/home/node/.openclaw"
    echo "  - Volume mount: /root/.openclaw:/home/node/.openclaw"
else
    echo -e "${YELLOW}⚠ docker-compose.yml not found at $COMPOSE_FILE${NC}"
    echo "Please update your docker-compose.yml manually"
fi

# Step 6: Start container
echo ""
echo "6. Starting container..."
docker-compose -f "$COMPOSE_FILE" up -d || docker start openclaw-gateway
sleep 5

# Step 7: Verify
echo ""
echo "7. Verifying container status..."
if docker ps | grep -q openclaw-gateway; then
    echo -e "${GREEN}✓ Container is running${NC}"
else
    echo -e "${RED}✗ Container failed to start${NC}"
    docker logs --tail 50 openclaw-gateway
    exit 1
fi

# Step 8: Check logs
echo ""
echo "8. Checking container logs..."
docker logs --tail 20 openclaw-gateway

echo ""
echo "=== Fix Complete ==="
echo ""
echo "Next steps:"
echo "1. Wait for OpenClaw to initialize (check logs)"
echo "2. Try connecting with TUI"
echo "3. If issue persists, check logs for device token errors"
