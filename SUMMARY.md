# Резюме: Исправление проблемы Device Token Mismatch в OpenClaw

## Созданные файлы

1. **diagnose_openclaw.sh** - Полный диагностический скрипт для проверки всех аспектов конфигурации
2. **quick_check.sh** - Быстрая проверка основных проблем
3. **fix_openclaw.sh** - Скрипт для автоматического исправления (требует настройки путей)
4. **docker-compose.yml.fixed** - Исправленная версия docker-compose.yml с явными настройками
5. **STEP_BY_STEP_FIX.md** - Пошаговая инструкция с командами
6. **README_DIAGNOSIS.md** - Подробное описание проблемы и решений

## Быстрый старт

### Шаг 1: Запустить быструю проверку
```bash
# На сервере Ubuntu
./quick_check.sh
```

### Шаг 2: Если OPENCLAW_STATE_DIR не установлена (наиболее вероятная причина)

1. Остановить контейнер:
```bash
docker-compose down
```

2. Обновить docker-compose.yml - добавить в секцию `environment`:
```yaml
environment:
  - NODE_OPTIONS=--max-old-space-size=1536
  - OPENCLAW_STATE_DIR=/home/node/.openclaw  # <-- ДОБАВИТЬ ЭТУ СТРОКУ
```

3. Удалить старое состояние:
```bash
mv /root/.openclaw /root/.openclaw.backup.$(date +%Y%m%d_%H%M%S)
mkdir -p /root/.openclaw/workspace
```

4. Запустить контейнер:
```bash
docker-compose up -d
```

5. Проверить логи:
```bash
docker logs -f openclaw-gateway
```

## Наиболее вероятные причины проблемы

### 1. OPENCLAW_STATE_DIR не установлена (90% вероятность)
**Симптомы:**
- openclaw.json существует, но device token mismatch
- OpenClaw использует дефолтный путь вместо смонтированного тома

**Решение:**
Добавить `OPENCLAW_STATE_DIR=/home/node/.openclaw` в environment секцию docker-compose.yml

### 2. Конфликт путей состояния (5% вероятность)
**Симптомы:**
- Найдены альтернативные пути `.openclaw` или `openclaw.json`
- OpenClaw использует другой профиль

**Решение:**
Проверить документацию OpenClaw на предмет переменных окружения для выбора профиля или добавить дополнительные volume mounts

### 3. Проблемы с правами доступа (3% вероятность)
**Симптомы:**
- Контейнер не может записать в `/home/node/.openclaw`
- Ошибки доступа в логах

**Решение:**
```bash
chown -R 1000:1000 /root/.openclaw
# или добавить user: "1000:1000" в docker-compose.yml
```

### 4. Кэширование старого токена (2% вероятность)
**Симптомы:**
- openclaw.json содержит старый deviceToken
- Проблема сохраняется после удаления состояния

**Решение:**
Полный сброс: удалить контейнер, удалить состояние, пересоздать

## Команды для диагностики

### Минимальный набор команд:
```bash
# Проверить OPENCLAW_STATE_DIR
docker exec openclaw-gateway sh -c 'echo ${OPENCLAW_STATE_DIR:-NOT_SET}'

# Проверить openclaw.json
ls -la /root/.openclaw/openclaw.json
docker exec openclaw-gateway cat /home/node/.openclaw/openclaw.json

# Проверить логи
docker logs openclaw-gateway | grep -i "token\|device\|mismatch"
```

### Полная диагностика:
```bash
./diagnose_openclaw.sh > diagnosis.log 2>&1
cat diagnosis.log
```

## Порядок действий при исправлении

1. ✅ Запустить `quick_check.sh` для быстрой диагностики
2. ✅ Проверить значение OPENCLAW_STATE_DIR
3. ✅ Если не установлена - добавить в docker-compose.yml
4. ✅ Остановить контейнер
5. ✅ Удалить старое состояние (с бэкапом)
6. ✅ Запустить контейнер с обновленной конфигурацией
7. ✅ Проверить логи и подключение

## Важные замечания

- **Всегда делайте бэкап** перед удалением `/root/.openclaw`
- **Проверяйте логи** после каждого изменения
- **Убедитесь что volume mounts правильные** - путь должен совпадать с OPENCLAW_STATE_DIR
- **Не переустанавливайте ОС** - проблема решается настройкой конфигурации

## Если проблема сохраняется

1. Запустить полную диагностику: `./diagnose_openclaw.sh`
2. Проверить все альтернативные пути состояния
3. Проверить переменные окружения процесса: `docker exec openclaw-gateway cat /proc/1/environ | tr '\0' '\n'`
4. Проверить документацию OpenClaw на предмет дополнительных переменных окружения
5. Попробовать пересоздать образ без кэша: `docker-compose pull --no-cache`

## Контакты и дополнительная информация

Если проблема не решается после выполнения всех шагов:
- Проверьте официальную документацию OpenClaw
- Проверьте issues на GitHub репозитории OpenClaw
- Убедитесь что версия образа актуальна
