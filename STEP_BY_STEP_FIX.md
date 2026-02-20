# Пошаговое исправление проблемы Device Token Mismatch

## Шаг 1: Диагностика текущего состояния

Выполните на сервере следующие команды для диагностики:

```bash
# 1. Проверить статус контейнера
docker ps -a | grep openclaw

# 2. Проверить переменные окружения внутри контейнера
docker exec openclaw-gateway env | grep -E "(OPENCLAW|NODE|HOME|USER)" | sort

# 3. Проверить существование и содержимое openclaw.json на хосте
ls -la /root/.openclaw/
cat /root/.openclaw/openclaw.json 2>/dev/null | jq -r 'del(.deviceToken, .tokens, .auth)' || echo "File not found or not JSON"

# 4. Проверить openclaw.json внутри контейнера
docker exec openclaw-gateway cat /home/node/.openclaw/openclaw.json 2>/dev/null | jq -r 'del(.deviceToken, .tokens, .auth)' || echo "File not accessible"

# 5. Проверить альтернативные пути состояния
docker exec openclaw-gateway find /home/node -name "openclaw.json" 2>/dev/null
docker exec openclaw-gateway find /root -name "openclaw.json" 2>/dev/null
docker exec openclaw-gateway find / -name ".openclaw" -type d 2>/dev/null | head -10

# 6. Проверить переменную OPENCLAW_STATE_DIR
docker exec openclaw-gateway sh -c 'echo "OPENCLAW_STATE_DIR=${OPENCLAW_STATE_DIR:-NOT SET}"'

# 7. Проверить пользователя и права доступа
docker exec openclaw-gateway id
docker exec openclaw-gateway ls -la /home/node/.openclaw/ 2>/dev/null || echo "Directory not accessible"

# 8. Проверить логи на ошибки device token
docker logs openclaw-gateway 2>&1 | grep -i -E "(token|device|auth|unauthorized|mismatch)" | tail -20

# 9. Проверить volume mounts
docker inspect openclaw-gateway | jq -r '.[0].Mounts[]'

# 10. Проверить процессы и их окружение
docker exec openclaw-gateway ps aux | grep -E "(node|openclaw)"
```

## Шаг 2: Анализ результатов

После выполнения команд проверьте:

1. **OPENCLAW_STATE_DIR**: Если не установлена или указывает на другой путь - это может быть причиной
2. **openclaw.json**: Существует ли файл и в каком месте (хост vs контейнер)
3. **Альтернативные пути**: Найдены ли другие директории `.openclaw` или файлы `openclaw.json`
4. **Права доступа**: Правильные ли права у файлов и директорий
5. **Логи**: Есть ли конкретные ошибки о device token

## Шаг 3: Исправление

### Вариант A: Если OPENCLAW_STATE_DIR не установлена

1. Остановить контейнер:
```bash
cd /root  # или где находится docker-compose.yml
docker-compose down
```

2. Обновить docker-compose.yml:
```bash
nano docker-compose.yml  # или vi/vim
```

Добавить в секцию `environment`:
```yaml
- OPENCLAW_STATE_DIR=/home/node/.openclaw
```

3. Убедиться что volume mounts правильные:
```yaml
volumes:
  - /root/.openclaw:/home/node/.openclaw
  - /root/.openclaw/workspace:/home/node/.openclaw/workspace
```

4. Удалить старое состояние (с бэкапом):
```bash
# Создать бэкап
mv /root/.openclaw /root/.openclaw.backup.$(date +%Y%m%d_%H%M%S)

# Создать новую директорию
mkdir -p /root/.openclaw/workspace
chmod -R 755 /root/.openclaw
```

5. Запустить контейнер:
```bash
docker-compose up -d
```

6. Проверить логи:
```bash
docker logs -f openclaw-gateway
```

### Вариант B: Если найдены альтернативные пути состояния

Если OpenClaw использует другой путь (например `/home/node/.config/openclaw`):

1. Остановить контейнер
2. Добавить дополнительный volume mount:
```yaml
volumes:
  - /root/.openclaw:/home/node/.openclaw
  - /root/.openclaw:/home/node/.config/openclaw  # если используется этот путь
```

Или установить OPENCLAW_STATE_DIR на существующий путь.

### Вариант C: Проблема с правами доступа

Если контейнер запускается от пользователя node (UID 1000):

```bash
chown -R 1000:1000 /root/.openclaw
chmod -R 755 /root/.openclaw
```

Или в docker-compose.yml добавить:
```yaml
user: "1000:1000"  # если образ использует пользователя node
```

### Вариант D: Полный сброс с правильной конфигурацией

1. Остановить и удалить контейнер:
```bash
docker-compose down
docker rm -f openclaw-gateway 2>/dev/null || true
```

2. Удалить состояние:
```bash
rm -rf /root/.openclaw
mkdir -p /root/.openclaw/workspace
```

3. Использовать обновленный docker-compose.yml (см. `docker-compose.yml.fixed`)

4. Запустить:
```bash
docker-compose up -d
```

5. Дождаться инициализации и проверить логи:
```bash
sleep 10
docker logs openclaw-gateway
```

## Шаг 4: Проверка после исправления

```bash
# 1. Проверить что контейнер запущен
docker ps | grep openclaw

# 2. Проверить что openclaw.json создан
ls -la /root/.openclaw/openclaw.json

# 3. Проверить логи на ошибки
docker logs openclaw-gateway 2>&1 | tail -50

# 4. Проверить что gateway слушает порт
docker exec openclaw-gateway netstat -tlnp | grep 18789 || \
docker exec openclaw-gateway ss -tlnp | grep 18789

# 5. Попробовать подключиться через TUI
```

## Шаг 5: Если проблема сохраняется

### Дополнительная диагностика:

1. Проверить все переменные окружения процесса:
```bash
PID=$(docker exec openclaw-gateway pgrep -f "node.*openclaw" | head -1)
docker exec openclaw-gateway cat /proc/$PID/environ | tr '\0' '\n' | grep -E "(OPENCLAW|HOME|USER)" | sort
```

2. Проверить все файлы конфигурации:
```bash
docker exec openclaw-gateway find / -name "*openclaw*" -type f 2>/dev/null | head -20
```

3. Проверить использование памяти и возможные утечки:
```bash
docker stats openclaw-gateway --no-stream
```

4. Проверить сетевые подключения:
```bash
docker exec openclaw-gateway netstat -an | grep 18789
```

5. Попробовать пересоздать контейнер без кэша:
```bash
docker-compose down
docker rmi ghcr.io/openclaw/openclaw:2026.2.15
docker-compose pull
docker-compose up -d
```

## Важные замечания

1. **Не удаляйте docker-compose.yml** - только обновляйте его
2. **Всегда делайте бэкап** перед удалением `/root/.openclaw`
3. **Проверяйте логи** после каждого изменения
4. **Убедитесь что volume mounts правильные** - путь должен совпадать с OPENCLAW_STATE_DIR
5. **Проверьте права доступа** - файлы должны быть доступны пользователю, от которого запускается контейнер
