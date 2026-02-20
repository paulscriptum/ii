#!/bin/bash
# Скрипт для запуска прокси сервера OpenClaw

echo "Запуск OpenClaw Web Proxy..."

# Проверяем что Node.js установлен
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен!"
    echo "Установите Node.js: https://nodejs.org/"
    exit 1
fi

# Проверяем что WebSocket библиотека установлена
if ! npm list ws &> /dev/null; then
    echo "Установка библиотеки ws..."
    npm install ws
fi

# Запускаем прокси сервер
cd "$(dirname "$0")"
node openclaw-proxy.js
