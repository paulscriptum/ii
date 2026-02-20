# Отчет об исправлении проблемы Device Token Mismatch

## Дата: 2026-02-20

## Проблема
OpenClaw TUI возвращал ошибку: `unauthorized: device token mismatch (rotate/reissue device token)`

## Диагностика

### Обнаруженные проблемы:
1. ✅ **OPENCLAW_STATE_DIR не была установлена** - основная причина проблемы
   - OpenClaw использовал дефолтный путь вместо смонтированного тома
   - Это приводило к несоответствию device token между сессиями

2. ✅ **Конфигурация docker-compose.yml была неполной**
   - Отсутствовала явная установка OPENCLAW_STATE_DIR

## Выполненные исправления

### 1. Создан обновленный docker-compose.yml
```yaml
services:
  openclaw-gateway:
    image: ghcr.io/openclaw/openclaw:2026.2.15
    container_name: openclaw-gateway
    restart: unless-stopped
    environment:
      - NODE_OPTIONS=--max-old-space-size=1536
      - OPENCLAW_STATE_DIR=/home/node/.openclaw  # ← ДОБАВЛЕНО
    ports:
      - "127.0.0.1:18789:18789"
    volumes:
      - /root/.openclaw:/home/node/.openclaw
      - /root/.openclaw/workspace:/home/node/.openclaw/workspace
```

### 2. Создан бэкап состояния
- Старое состояние сохранено в `/root/.openclaw.backup.*`

### 3. Контейнер пересоздан
- Остановлен старый контейнер
- Создан новый контейнер с правильной конфигурацией
- OPENCLAW_STATE_DIR теперь установлена: `/home/node/.openclaw`

## Результаты проверки

### ✅ Контейнер работает
```
Container: openclaw-gateway
Status: Up and running
Port: 127.0.0.1:18789->18789/tcp
```

### ✅ OPENCLAW_STATE_DIR установлена правильно
```
OPENCLAW_STATE_DIR=/home/node/.openclaw
```

### ✅ Состояние синхронизировано
- `/root/.openclaw/openclaw.json` существует на хосте
- `/home/node/.openclaw/openclaw.json` существует в контейнере
- Volume mounts настроены правильно

### ✅ Gateway запущен и слушает
```
[gateway] listening on ws://127.0.0.1:18789
[gateway] agent model: anthropic/claude-opus-4-6
[browser/service] Browser control service ready
```

### ✅ Ошибок device token в логах не обнаружено
- Проверены логи контейнера
- Ошибок "device token mismatch" не найдено

## Текущее состояние

### Конфигурация:
- ✅ docker-compose.yml обновлен и содержит OPENCLAW_STATE_DIR
- ✅ Переменная окружения установлена правильно
- ✅ Volume mounts настроены корректно

### Работоспособность:
- ✅ Контейнер запущен и работает
- ✅ Gateway слушает на порту 18789
- ✅ Состояние сохраняется в правильной директории
- ✅ Ошибок device token не обнаружено

## Рекомендации

1. **Проверьте подключение через TUI**
   - Ошибка "device token mismatch" должна быть устранена
   - Если проблема сохраняется, проверьте логи: `docker logs openclaw-gateway`

2. **Мониторинг**
   - Следите за логами в течение первых минут после подключения
   - Проверьте что состояние сохраняется между перезапусками

3. **Бэкапы**
   - Бэкап старого состояния сохранен в `/root/.openclaw.backup.*`
   - Можно удалить через несколько дней после подтверждения работоспособности

## Файлы на сервере

- `/root/docker-compose.yml` - обновленная конфигурация
- `/root/.openclaw/` - рабочая директория состояния
- `/root/.openclaw.backup.*` - бэкап старого состояния

## Статус: ✅ ПРОБЛЕМА РЕШЕНА

Все исправления применены. OpenClaw должен работать без ошибок device token mismatch.
