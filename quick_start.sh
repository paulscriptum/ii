#!/bin/bash
# Быстрый скрипт для подключения к OpenClaw на Mac

echo "=========================================="
echo "  OpenClaw - Быстрое подключение"
echo "=========================================="
echo ""

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVER="217.25.94.44"
USER="root"
PORT="18789"

echo "Шаг 1: Подключение к серверу..."
echo ""
echo "Выполните в терминале:"
echo -e "${GREEN}ssh ${USER}@${SERVER}${NC}"
echo ""
echo "Пароль: ${YELLOW}eQR^o3^3WkG4Ki${NC}"
echo ""
read -p "Нажмите Enter когда подключитесь к серверу..."

echo ""
echo "Шаг 2: Проверка статуса OpenClaw..."
echo ""
echo "Выполните на сервере:"
echo -e "${GREEN}docker ps | grep openclaw${NC}"
echo ""
read -p "Нажмите Enter для продолжения..."

echo ""
echo "Шаг 3: Создание SSH туннеля..."
echo ""
echo "Откройте НОВОЕ окно Терминала (Cmd+T) и выполните:"
echo -e "${GREEN}ssh -L ${PORT}:127.0.0.1:${PORT} ${USER}@${SERVER}${NC}"
echo ""
echo "Введите пароль: ${YELLOW}eQR^o3^3WkG4Ki${NC}"
echo ""
echo "Оставьте это окно открытым!"
echo ""
read -p "Нажмите Enter когда туннель будет создан..."

echo ""
echo "Шаг 4: Проверка подключения..."
echo ""
echo "В новом окне выполните:"
echo -e "${GREEN}curl http://127.0.0.1:${PORT}/${NC}"
echo ""

echo "=========================================="
echo "Готово! Теперь можно подключаться к OpenClaw"
echo "=========================================="
