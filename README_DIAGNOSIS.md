# OpenClaw Device Token Mismatch - Диагностика и исправление

## Проблема
После полного удаления `/root/.openclaw` и пересоздания контейнера все еще возникает ошибка:
```
unauthorized: device token mismatch (rotate/reissue device token)
```

## Возможные причины

1. **OPENCLAW_STATE_DIR не установлен или указывает на другое место**
   - OpenClaw может использовать дефолтный путь вместо смонтированного тома
   - Проверить переменные окружения внутри контейнера

2. **Конфликт пользователей (UID/GID)**
   - Контейнер может запускаться от root, но OpenClaw ожидает пользователя node
   - Файлы создаются с неправильными правами доступа

3. **Кэширование device token в памяти или другом месте**
   - OpenClaw может кэшировать токен в памяти процесса
   - Может быть альтернативный профиль или конфигурация

4. **Несоответствие путей монтирования**
   - Volume mount может не совпадать с ожидаемым путем внутри контейнера
   - Вложенное монтирование workspace может создавать проблемы

## План диагностики

### Шаг 1: Запустить диагностический скрипт
```bash
chmod +x diagnose_openclaw.sh
./diagnose_openclaw.sh > diagnosis_output.txt 2>&1
```

### Шаг 2: Проверить вывод скрипта
Особое внимание на:
- Значение `OPENCLAW_STATE_DIR` внутри контейнера
- Существование `openclaw.json` и его содержимое
- Альтернативные директории состояния
- Логи с ошибками device token

### Шаг 3: Ручная проверка (если нужно)

#### Проверить переменные окружения:
```bash
docker exec openclaw-gateway env | grep OPENCLAW
docker exec openclaw-gateway env | grep HOME
```

#### Проверить содержимое openclaw.json:
```bash
# На хосте
cat /root/.openclaw/openclaw.json | jq .

# В контейнере
docker exec openclaw-gateway cat /home/node/.openclaw/openclaw.json | jq .
```

#### Проверить альтернативные пути:
```bash
docker exec openclaw-gateway find /home/node -name "openclaw.json" 2>/dev/null
docker exec openclaw-gateway find /root -name "openclaw.json" 2>/dev/null
```

#### Проверить процессы и их окружение:
```bash
docker exec openclaw-gateway ps aux
docker exec openclaw-gateway cat /proc/$(docker exec openclaw-gateway pgrep -f openclaw)/environ | tr '\0' '\n' | grep OPENCLAW
```

## Решение

### Вариант 1: Явная установка OPENCLAW_STATE_DIR

Обновить `docker-compose.yml`:
```yaml
environment:
  - OPENCLAW_STATE_DIR=/home/node/.openclaw
```

### Вариант 2: Полный сброс с правильной конфигурацией

1. Остановить контейнер:
```bash
docker-compose down
# или
docker stop openclaw-gateway
```

2. Удалить состояние (с бэкапом):
```bash
mv /root/.openclaw /root/.openclaw.backup.$(date +%Y%m%d_%H%M%S)
mkdir -p /root/.openclaw/workspace
chmod -R 755 /root/.openclaw
```

3. Обновить docker-compose.yml (использовать `docker-compose.yml.fixed` как пример)

4. Запустить контейнер:
```bash
docker-compose up -d
```

5. Проверить логи:
```bash
docker logs -f openclaw-gateway
```

### Вариант 3: Проверка прав доступа

Если контейнер запускается от пользователя node (UID 1000), убедиться что права правильные:
```bash
chown -R 1000:1000 /root/.openclaw
```

Или запустить контейнер от root (если образ это позволяет):
```yaml
user: "0:0"  # root
```

## Проверка после исправления

1. Проверить что контейнер запущен:
```bash
docker ps | grep openclaw
```

2. Проверить логи на ошибки:
```bash
docker logs openclaw-gateway | grep -i "token\|device\|auth"
```

3. Проверить что openclaw.json создан:
```bash
ls -la /root/.openclaw/openclaw.json
```

4. Попробовать подключиться через TUI

## Дополнительная диагностика

Если проблема сохраняется:

1. Проверить сетевые подключения:
```bash
docker exec openclaw-gateway netstat -tlnp | grep 18789
```

2. Проверить использование памяти:
```bash
docker stats openclaw-gateway
```

3. Проверить все файлы конфигурации:
```bash
docker exec openclaw-gateway find / -name "*openclaw*" -type f 2>/dev/null
```

4. Проверить переменные окружения процесса:
```bash
docker exec openclaw-gateway cat /proc/1/environ | tr '\0' '\n' | sort
```
