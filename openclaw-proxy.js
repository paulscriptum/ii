#!/usr/bin/env node
/**
 * OpenClaw WebSocket to HTTP Proxy
 * Прокси сервер для подключения к OpenClaw Gateway через браузер
 */

const http = require('http');
const WebSocket = require('ws');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PROXY_PORT = 8080;
const OPENCLAW_WS_URL = 'ws://127.0.0.1:18789';

// Создаем HTTP сервер
const server = http.createServer();

// WebSocket сервер для клиентов браузера
const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs, req) => {
    console.log('Новое подключение от браузера');
    
    let gatewayWs = null;
    let isClientClosed = false;
    
    // Пробуем подключиться к Gateway
    try {
        console.log(`Подключение к ${OPENCLAW_WS_URL}...`);
        gatewayWs = new WebSocket(OPENCLAW_WS_URL, {
            handshakeTimeout: 10000,
            perMessageDeflate: false
        });
        
        gatewayWs.on('open', () => {
            console.log('✅ Подключено к OpenClaw Gateway');
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: 'status', message: 'Подключено к OpenClaw Gateway' }));
            }
        });
        
        gatewayWs.on('message', (data) => {
            // Пересылаем сообщение от Gateway к клиенту
            if (clientWs.readyState === WebSocket.OPEN && !isClientClosed) {
                try {
                    clientWs.send(data);
                } catch (e) {
                    console.error('Ошибка отправки клиенту:', e.message);
                }
            }
        });
        
        gatewayWs.on('error', (error) => {
            console.error('❌ Ошибка Gateway:', error.message || error);
            if (clientWs.readyState === WebSocket.OPEN && !isClientClosed) {
                clientWs.send(JSON.stringify({ 
                    type: 'error', 
                    message: `Ошибка Gateway: ${error.message || 'Неизвестная ошибка'}` 
                }));
            }
        });
        
        gatewayWs.on('close', (code, reason) => {
            console.log(`Отключено от Gateway. Код: ${code}, Причина: ${reason || 'Не указана'}`);
            if (clientWs.readyState === WebSocket.OPEN && !isClientClosed) {
                clientWs.send(JSON.stringify({ 
                    type: 'status', 
                    message: `Отключено от Gateway (код: ${code})` 
                }));
            }
        });
        
    } catch (error) {
        console.error('Ошибка создания WebSocket:', error);
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ 
                type: 'error', 
                message: `Не удалось подключиться: ${error.message}` 
            }));
        }
        return;
    }
    
    // Пересылаем сообщения от клиента к Gateway
    clientWs.on('message', (data) => {
        if (gatewayWs && gatewayWs.readyState === WebSocket.OPEN) {
            try {
                gatewayWs.send(data);
                console.log('Сообщение отправлено в Gateway:', data.toString().substring(0, 100));
            } catch (e) {
                console.error('Ошибка отправки в Gateway:', e.message);
                if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify({ 
                        type: 'error', 
                        message: `Ошибка отправки: ${e.message}` 
                    }));
                }
            }
        } else {
            console.warn('Gateway не готов к приему сообщений');
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ 
                    type: 'error', 
                    message: 'Gateway не подключен' 
                }));
            }
        }
    });
    
    clientWs.on('close', () => {
        console.log('Клиент отключился');
        isClientClosed = true;
        if (gatewayWs && gatewayWs.readyState === WebSocket.OPEN) {
            gatewayWs.close();
        }
    });
    
    clientWs.on('error', (error) => {
        console.error('Ошибка клиента:', error.message || error);
        isClientClosed = true;
        if (gatewayWs && gatewayWs.readyState === WebSocket.OPEN) {
            gatewayWs.close();
        }
    });
    
    // Проверяем подключение к Gateway периодически
    const checkInterval = setInterval(() => {
        if (isClientClosed) {
            clearInterval(checkInterval);
            return;
        }
        if (gatewayWs && gatewayWs.readyState !== WebSocket.OPEN && clientWs.readyState === WebSocket.OPEN) {
            console.log('Попытка переподключения к Gateway...');
            // Можно добавить логику переподключения
        }
    }, 5000);
});

server.on('request', (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    
    // Статический HTML файл
    if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html') {
        // Пробуем прочитать HTML файл, если есть
        const htmlPath = path.join(__dirname, 'openclaw-web.html');
        if (fs.existsSync(htmlPath)) {
            const html = fs.readFileSync(htmlPath, 'utf8');
            // Заменяем WebSocket URL на прокси
            const modifiedHtml = html.replace(/ws:\/\/127\.0\.0\.1:18789/g, `ws://127.0.0.1:${PROXY_PORT}/ws`);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(modifiedHtml);
        } else {
            // Простой HTML интерфейс
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>OpenClaw Web Interface</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .status {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9em;
            margin-top: 10px;
        }
        .status.connected { background: rgba(76, 175, 80, 0.3); border: 2px solid #4CAF50; }
        .status.disconnected { background: rgba(244, 67, 54, 0.3); border: 2px solid #f44336; }
        .messages {
            height: 500px;
            padding: 20px;
            overflow-y: auto;
            background: #fafafa;
        }
        .message {
            margin-bottom: 15px;
            padding: 12px 16px;
            border-radius: 8px;
            max-width: 80%;
            word-wrap: break-word;
        }
        .message.user { background: #667eea; color: white; margin-left: auto; text-align: right; }
        .message.assistant { background: #e0e0e0; color: #333; }
        .message.system { background: #fff3cd; color: #856404; max-width: 100%; text-align: center; font-size: 0.9em; }
        .input-area {
            padding: 20px;
            background: white;
            border-top: 1px solid #ddd;
        }
        textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            resize: vertical;
            min-height: 80px;
            font-family: inherit;
        }
        button {
            margin-top: 10px;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            background: #667eea;
            color: white;
            margin-right: 10px;
        }
        button:hover { background: #5568d3; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🦅 OpenClaw Web Interface</h1>
            <div id="status" class="status disconnected">Отключено</div>
        </div>
        <div class="messages" id="messages">
            <div class="message system">Готов к подключению. Нажмите "Подключиться"</div>
        </div>
        <div class="input-area">
            <textarea id="messageInput" placeholder="Введите сообщение..." disabled></textarea>
            <button id="connectBtn" onclick="connect()">Подключиться</button>
            <button id="sendBtn" onclick="sendMessage()" disabled>Отправить</button>
        </div>
    </div>
    <script>
        let ws = null;
        function connect() {
            ws = new WebSocket('ws://127.0.0.1:${PROXY_PORT}/ws');
            ws.onopen = () => {
                document.getElementById('status').textContent = 'Подключено';
                document.getElementById('status').className = 'status connected';
                document.getElementById('connectBtn').disabled = true;
                document.getElementById('sendBtn').disabled = false;
                document.getElementById('messageInput').disabled = false;
                addMessage('✅ Подключено к OpenClaw Gateway!', 'system');
            };
            ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data.type === 'status') {
                        addMessage(data.message, 'system');
                    } else {
                        addMessage(data.message || JSON.stringify(data), 'assistant');
                    }
                } catch(e) {
                    addMessage(e.data, 'assistant');
                }
            };
            ws.onerror = (e) => addMessage('Ошибка соединения', 'system');
            ws.onclose = () => {
                document.getElementById('status').textContent = 'Отключено';
                document.getElementById('status').className = 'status disconnected';
                document.getElementById('connectBtn').disabled = false;
                document.getElementById('sendBtn').disabled = true;
                document.getElementById('messageInput').disabled = true;
            };
        }
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const msg = input.value.trim();
            if (!msg || !ws) return;
            addMessage('Вы: ' + msg, 'user');
            ws.send(JSON.stringify({ type: 'message', content: msg }));
            input.value = '';
        }
        function addMessage(text, type) {
            const div = document.createElement('div');
            div.className = 'message ' + type;
            div.textContent = text;
            document.getElementById('messages').appendChild(div);
            document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
        }
        document.getElementById('messageInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    </script>
</body>
</html>
            `);
        }
        return;
    }
    
    
    res.writeHead(404);
    res.end('Not found');
});

server.listen(PROXY_PORT, () => {
    console.log(`OpenClaw Proxy Server running on http://127.0.0.1:${PROXY_PORT}`);
    console.log(`OpenClaw Gateway: ${OPENCLAW_WS_URL}`);
    console.log(`Open http://127.0.0.1:${PROXY_PORT} in your browser`);
});
