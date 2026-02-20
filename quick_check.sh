#!/bin/bash
# Быстрая проверка основных проблем с OpenClaw device token

echo "=== Быстрая проверка OpenClaw ==="
echo ""

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Проверка 1: Контейнер запущен
echo "1. Проверка контейнера..."
if docker ps | grep -q openclaw-gateway; then
    echo -e "${GREEN}✓ Контейнер запущен${NC}"
else
    echo -e "${RED}✗ Контейнер не запущен${NC}"
    exit 1
fi

# Проверка 2: OPENCLAW_STATE_DIR
echo ""
echo "2. Проверка OPENCLAW_STATE_DIR..."
STATE_DIR=$(docker exec openclaw-gateway sh -c 'echo ${OPENCLAW_STATE_DIR:-NOT_SET}' 2>/dev/null)
if [ "$STATE_DIR" = "/home/node/.openclaw" ]; then
    echo -e "${GREEN}✓ OPENCLAW_STATE_DIR установлена правильно: $STATE_DIR${NC}"
elif [ "$STATE_DIR" = "NOT_SET" ]; then
    echo -e "${RED}✗ OPENCLAW_STATE_DIR НЕ УСТАНОВЛЕНА${NC}"
    echo "  Это может быть причиной проблемы!"
    echo "  Решение: Добавьте в docker-compose.yml:"
    echo "    environment:"
    echo "      - OPENCLAW_STATE_DIR=/home/node/.openclaw"
else
    echo -e "${YELLOW}⚠ OPENCLAW_STATE_DIR установлена на: $STATE_DIR${NC}"
    echo "  Убедитесь что это соответствует volume mount"
fi

# Проверка 3: openclaw.json существует
echo ""
echo "3. Проверка openclaw.json..."
if [ -f "/root/.openclaw/openclaw.json" ]; then
    echo -e "${GREEN}✓ openclaw.json существует на хосте${NC}"
    SIZE=$(stat -c%s /root/.openclaw/openclaw.json 2>/dev/null || echo "0")
    echo "  Размер: $SIZE байт"
    
    # Проверить наличие deviceToken в файле
    if grep -q "deviceToken" /root/.openclaw/openclaw.json 2>/dev/null; then
        echo -e "${YELLOW}  ⚠ Файл содержит deviceToken${NC}"
        echo "  Если это старый токен, он может вызывать mismatch"
    fi
else
    echo -e "${YELLOW}⚠ openclaw.json не найден на хосте${NC}"
fi

# Проверка 4: openclaw.json в контейнере
echo ""
echo "4. Проверка openclaw.json в контейнере..."
if docker exec openclaw-gateway test -f /home/node/.openclaw/openclaw.json 2>/dev/null; then
    echo -e "${GREEN}✓ openclaw.json существует в контейнере${NC}"
    
    # Сравнить файлы
    HOST_HASH=$(md5sum /root/.openclaw/openclaw.json 2>/dev/null | cut -d' ' -f1)
    CONTAINER_HASH=$(docker exec openclaw-gateway md5sum /home/node/.openclaw/openclaw.json 2>/dev/null | cut -d' ' -f1)
    
    if [ "$HOST_HASH" = "$CONTAINER_HASH" ] && [ -n "$HOST_HASH" ]; then
        echo -e "${GREEN}  ✓ Файлы синхронизированы${NC}"
    else
        echo -e "${YELLOW}  ⚠ Файлы могут отличаться${NC}"
    fi
else
    echo -e "${RED}✗ openclaw.json не найден в контейнере${NC}"
fi

# Проверка 5: Альтернативные пути
echo ""
echo "5. Поиск альтернативных путей состояния..."
ALT_PATHS=$(docker exec openclaw-gateway find /home/node /root -name "openclaw.json" -o -name ".openclaw" -type d 2>/dev/null | head -5)
if [ -n "$ALT_PATHS" ]; then
    echo -e "${YELLOW}⚠ Найдены альтернативные пути:${NC}"
    echo "$ALT_PATHS" | while read path; do
        echo "  - $path"
    done
    echo "  Это может указывать на использование другого пути для состояния"
else
    echo -e "${GREEN}✓ Альтернативные пути не найдены${NC}"
fi

# Проверка 6: Volume mounts
echo ""
echo "6. Проверка volume mounts..."
MOUNTS=$(docker inspect openclaw-gateway 2>/dev/null | jq -r '.[0].Mounts[] | "\(.Source) -> \(.Destination)"' 2>/dev/null)
if echo "$MOUNTS" | grep -q "/root/.openclaw.*/home/node/.openclaw"; then
    echo -e "${GREEN}✓ Volume mount настроен правильно${NC}"
    echo "$MOUNTS" | grep "/root/.openclaw"
else
    echo -e "${YELLOW}⚠ Проверьте volume mounts:${NC}"
    echo "$MOUNTS"
fi

# Проверка 7: Логи с ошибками
echo ""
echo "7. Проверка логов на ошибки device token..."
TOKEN_ERRORS=$(docker logs openclaw-gateway 2>&1 | grep -i -E "(token.*mismatch|device.*token|unauthorized.*device)" | tail -5)
if [ -n "$TOKEN_ERRORS" ]; then
    echo -e "${RED}✗ Найдены ошибки device token:${NC}"
    echo "$TOKEN_ERRORS"
else
    echo -e "${GREEN}✓ Ошибок device token в логах не найдено${NC}"
fi

# Проверка 8: Права доступа
echo ""
echo "8. Проверка прав доступа..."
if [ -d "/root/.openclaw" ]; then
    PERMS=$(stat -c "%a %U:%G" /root/.openclaw 2>/dev/null || echo "unknown")
    echo "Права на /root/.openclaw: $PERMS"
    
    # Проверить доступность из контейнера
    if docker exec openclaw-gateway test -r /home/node/.openclaw 2>/dev/null; then
        echo -e "${GREEN}  ✓ Директория доступна для чтения из контейнера${NC}"
    else
        echo -e "${RED}  ✗ Директория НЕ доступна для чтения из контейнера${NC}"
        echo "  Возможна проблема с правами доступа"
    fi
    
    if docker exec openclaw-gateway test -w /home/node/.openclaw 2>/dev/null; then
        echo -e "${GREEN}  ✓ Директория доступна для записи из контейнера${NC}"
    else
        echo -e "${RED}  ✗ Директория НЕ доступна для записи из контейнера${NC}"
        echo "  Возможна проблема с правами доступа"
    fi
fi

echo ""
echo "=== Проверка завершена ==="
echo ""
echo "Рекомендации:"
echo "1. Если OPENCLAW_STATE_DIR не установлена - добавьте её в docker-compose.yml"
echo "2. Если найдены альтернативные пути - проверьте документацию OpenClaw"
echo "3. Если есть ошибки в логах - удалите старое состояние и пересоздайте контейнер"
echo "4. Если проблемы с правами - проверьте user directive в docker-compose.yml"
