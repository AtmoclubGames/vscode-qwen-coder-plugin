require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: ['http://localhost:3001', 'vscode-webview://*'], // Разрешаем запросы от VS Code
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Хранилище сессии (в памяти для простоты)
let sessionCookies = {};

// Эндпоинт для проверки статуса авторизации
app.get('/api/auth/status', (req, res) => {
    const hasSession = Object.keys(sessionCookies).length > 0;
    res.json({
        authenticated: hasSession,
        message: hasSession ? 'Авторизация активна' : 'Требуется авторизация'
    });
});

// Эндпоинт для получения cookies авторизации (через браузер)
app.get('/api/auth/login-url', (req, res) => {
    res.json({
        loginUrl: 'https://coder.qwen.ai/',
        instructions: '1. Откройте ссылку в браузере\n2. Войдите в аккаунт\n3. Скопируйте cookies из Developer Tools (Application -> Cookies)\n4. Отправьте их через POST /api/auth/set-cookies'
    });
});

// Эндпоинт для установки cookies вручную
app.post('/api/auth/set-cookies', (req, res) => {
    const { cookies } = req.body;

    if (!cookies || typeof cookies !== 'string') {
        return res.status(400).json({ error: 'Необходимо предоставить cookies в виде строки' });
    }

    // Парсим cookies
    const cookieArray = cookies.split(';');
    cookieArray.forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
            sessionCookies[name] = value;
        }
    });

    res.json({
        success: true,
        message: `Установлено ${Object.keys(sessionCookies).length} cookies`,
        cookiesCount: Object.keys(sessionCookies).length
    });
});

// Основной эндпоинт для отправки запросов к Qwen Coder
app.post('/api/chat', async (req, res) => {
    try {
        const { message, files = [] } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Сообщение обязательно' });
        }

        // Проверяем наличие сессии
        if (Object.keys(sessionCookies).length === 0) {
            return res.status(401).json({
                error: 'Требуется авторизация',
                loginUrl: 'https://coder.qwen.ai/'
            });
        }

        // Формируем cookies для запроса
        const cookieString = Object.entries(sessionCookies)
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');

        // Подготовка контекста файлов
        let fileContext = '';
        if (files.length > 0) {
            fileContext = '\n\nКонтекст файлов:\n';
            files.forEach((file, index) => {
                fileContext += `\n--- Файл ${index + 1}: ${file.path || 'без имени'} ---\n`;
                fileContext += `${file.content || ''}\n`;
            });
        }

        const fullMessage = message + fileContext;

        // Запрос к API Qwen Coder (эмуляция браузерного запроса)
        // Примечание: Здесь нужно будет адаптировать под реальный API coder.qwen.ai
        const response = await axios.post(
            'https://coder.qwen.ai/api/chat', // Замените на реальный эндпоинт
            {
                message: fullMessage,
                stream: false
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': cookieString,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 60000
            }
        );

        res.json({
            success: true,
            response: response.data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Ошибка при отправке запроса:', error.message);

        if (error.response) {
            // Ошибка от сервера Qwen
            res.status(error.response.status).json({
                error: 'Ошибка API Qwen',
                details: error.response.data,
                status: error.response.status
            });
        } else if (error.code === 'ECONNABORTED') {
            res.status(408).json({
                error: 'Таймаут запроса',
                message: 'Запрос превысил лимит времени ожидания'
            });
        } else {
            res.status(500).json({
                error: 'Внутренняя ошибка сервера',
                message: error.message
            });
        }
    }
});

// Эндпоинт для очистки сессии
app.post('/api/auth/logout', (req, res) => {
    sessionCookies = {};
    res.json({ success: true, message: 'Сессия очищена' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Прокси-сервер запущен на порту ${PORT}`);
    console.log(`📍 Локальный адрес: http://localhost:${PORT}`);
    console.log(`🔗 Авторизация: http://localhost:${PORT}/api/auth/login-url`);
});
