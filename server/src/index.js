require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: ['http://localhost:3001', 'vscode-webview://*', 'http://localhost:3000'], credentials: true }));
app.use(express.json());
app.use(cookieParser());

let sessionCookies = {};

const authHTML = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Qwen Coder - Авторизация</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.container{background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-width:800px;width:100%;padding:40px}h1{color:#333;margin-bottom:10px;font-size:28px}.subtitle{color:#666;margin-bottom:30px;font-size:14px}.status{padding:15px;border-radius:8px;margin-bottom:25px;font-weight:500}.status.authenticated{background:#d4edda;color:#155724;border:1px solid #c3e6cb}.status.not-authenticated{background:#fff3cd;color:#856404;border:1px solid #ffeaa7}.status.success{background:#d4edda;color:#155724}.status.error{background:#f8d7da;color:#721c24}label{display:block;margin-bottom:8px;color:#333;font-weight:500}textarea{width:100%;height:200px;padding:15px;border:2px solid #e0e0e0;border-radius:8px;font-family:'Consolas',monospace;font-size:13px;resize:vertical}textarea:focus{outline:none;border-color:#667eea}.hint{font-size:12px;color:#666;margin-top:8px;padding:10px;background:#f8f9fa;border-radius:6px}.btn{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;padding:15px 30px;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;width:100%;margin-top:20px;transition:transform 0.2s,box-shadow 0.2s}.btn:hover{transform:translateY(-2px);box-shadow:0 10px 20px rgba(102,126,234,0.4)}.btn-secondary{background:#6c757d;margin-top:10px}.btn-link{background:transparent;border:2px solid #667eea;color:#667eea;margin-top:15px}.btn-link:hover{background:#667eea;color:#fff}.cookies-list{margin-top:20px;padding:15px;background:#f8f9fa;border-radius:8px;max-height:200px;overflow-y:auto}.cookie-item{font-family:monospace;font-size:12px;padding:5px 0;border-bottom:1px solid #e0e0e0}.cookie-name{color:#667eea;font-weight:bold}.steps{background:#e7f3ff;padding:20px;border-radius:8px;margin-bottom:25px}.steps h3{color:#0066cc;margin-bottom:15px;font-size:16px}.steps ol{margin-left:20px}.steps li{margin-bottom:10px;color:#333;line-height:1.5}.steps code{background:#fff;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:12px}</style></head><body><div class="container"><h1>🔐 Qwen Coder Авторизация</h1><p class="subtitle">Прокси-сервер для безопасной работы с API</p><div id="status" class="status not-authenticated">⚠️ Требуется авторизация</div><div class="steps"><h3>📋 Как получить cookies:</h3><ol><li>Откройте <a href="https://coder.qwen.ai/" target="_blank">coder.qwen.ai</a></li><li>Войдите в аккаунт</li><li>Нажмите F12 для DevTools</li><li>Application → Cookies</li><li>Выделите все (Ctrl+A) и скопируйте (Ctrl+C)</li><li>Вставьте в поле ниже</li></ol></div><label for="cookiesInput">📥 Вставьте cookies:</label><textarea id="cookiesInput" placeholder="Вставьте данные из браузера (Ctrl+V)&#10;&#10;Пример:&#10;isgBL-....qwen.ai/2027-02-07...&#10;tokeneyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."></textarea><div class="hint">💡 Поддерживается любой формат: таблица браузера, строка name=value, JSON</div><button class="btn" onclick="setCookies()">🚀 Авторизовать</button><button class="btn btn-secondary" onclick="checkStatus()">🔄 Проверить статус</button><button class="btn btn-link" onclick="logout()">🚪 Выйти</button><div id="result" style="margin-top:20px"></div><div id="cookiesList" class="cookies-list" style="display:none"><strong>Активные cookies:</strong><div id="cookiesListContent"></div></div><button class="btn btn-link" onclick="window.location.href='https://coder.qwen.ai/'" target="_blank">🔗 Открыть coder.qwen.ai</button></div><script>const API_BASE='';async function checkStatus(){try{const res=await fetch(API_BASE+'/api/auth/status');const data=await res.json();updateStatus(data.authenticated);if(data.authenticated)showCookiesList();}catch(err){showResult('Ошибка подключения','error');}}async function setCookies(){const input=document.getElementById('cookiesInput').value.trim();if(!input){showResult('❌ Введите cookies','error');return;}try{const res=await fetch(API_BASE+'/api/auth/set-cookies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cookies:input})});const data=await res.json();if(data.success){showResult('✅ '+data.message,'success');updateStatus(true);showCookiesList();document.getElementById('cookiesInput').value='';}else{showResult('❌ '+(data.error||'Ошибка'),'error');}}catch(err){showResult('❌ Ошибка: '+err.message,'error');}}async function logout(){try{await fetch(API_BASE+'/api/auth/logout',{method:'POST'});showResult('✅ Сессия очищена','success');updateStatus(false);document.getElementById('cookiesList').style.display='none';}catch(err){showResult('❌ Ошибка: '+err.message,'error');}}function updateStatus(isAuth){const el=document.getElementById('status');if(isAuth){el.className='status authenticated';el.innerHTML='✅ Авторизация активна';}else{el.className='status not-authenticated';el.innerHTML='⚠️ Требуется авторизация';}}function showResult(msg,type){const el=document.getElementById('result');el.innerHTML='<div class="status '+type+'">'+msg+'</div>';setTimeout(()=>el.innerHTML='',5000);}function showCookiesList(){fetch(API_BASE+'/api/auth/status').then(r=>r.json()).then(d=>{if(d.cookies){document.getElementById('cookiesListContent').innerHTML=Object.entries(d.cookies).map(([n,v])=>'<div class="cookie-item"><span class="cookie-name">'+n+'</span>: '+v.substring(0,50)+(v.length>50?'...':'')+'</div>').join('');document.getElementById('cookiesList').style.display='block';}});}checkStatus();</script></body></html>`;

app.get('/', (req, res) => res.send(authHTML));

app.get('/api/auth/status', (req, res) => {
    const hasSession = Object.keys(sessionCookies).length > 0;
    res.json({ 
        authenticated: hasSession, 
        message: hasSession ? 'Авторизация активна' : 'Требуется авторизация', 
        cookiesCount: Object.keys(sessionCookies).length, 
        cookies: sessionCookies 
    });
});

app.get('/api/auth/login-url', (req, res) => {
    res.json({ 
        loginUrl: 'https://coder.qwen.ai/', 
        webInterface: 'http://localhost:' + PORT, 
        instructions: '1. Откройте http://localhost:' + PORT + '\n2. Следуйте инструкциям' 
    });
});

function parseCookies(input) {
    const cookies = {};
    const lines = input.split(/[\n\r]+/);
    
    for (const line of lines) {
        if (!line.trim()) continue;
        
        // Формат таблицы браузера (tab-separated): name\tvalue\tdomain...
        const tabMatch = line.match(/^([^\t]+)\t([^\t]+)\t/);
        if (tabMatch) { 
            cookies[tabMatch[1].trim()] = tabMatch[2].trim(); 
            continue; 
        }
        
        // Формат name=value; name2=value2
        if (line.includes('=') && !line.includes('\t')) {
            line.split(';').forEach(pair => {
                const trimmed = pair.trim();
                if (trimmed.includes('=')) {
                    const idx = trimmed.indexOf('=');
                    const name = trimmed.substring(0, idx).trim();
                    const value = trimmed.substring(idx + 1).trim();
                    if (name && value) cookies[name] = value;
                }
            });
            continue;
        }
        
        // JSON формат
        try {
            const json = JSON.parse(line);
            if (Array.isArray(json)) {
                json.forEach(c => { if (c.name && c.value) cookies[c.name] = c.value; });
            } else if (typeof json === 'object') {
                Object.entries(json).forEach(([n, v]) => cookies[n] = v);
            }
        } catch (e) {}
    }
    
    return cookies;
}

app.post('/api/auth/set-cookies', (req, res) => {
    const { cookies } = req.body;
    if (!cookies || typeof cookies !== 'string') {
        return res.status(400).json({ error: 'Необходимо предоставить cookies в виде строки' });
    }
    const parsed = parseCookies(cookies);
    if (Object.keys(parsed).length === 0) {
        return res.status(400).json({ 
            error: 'Не удалось распарсить cookies', 
            hint: 'Поддерживаются: таблица браузера, name=value, JSON' 
        });
    }
    Object.entries(parsed).forEach(([n, v]) => sessionCookies[n] = v);
    res.json({ 
        success: true, 
        message: 'Установлено ' + Object.keys(sessionCookies).length + ' cookies', 
        cookiesCount: Object.keys(sessionCookies).length, 
        parsedCount: Object.keys(parsed).length 
    });
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, files = [] } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Сообщение обязательно' });
        }
        
        if (Object.keys(sessionCookies).length === 0) {
            return res.status(401).json({ error: 'Требуется авторизация', loginUrl: 'http://localhost:' + PORT });
        }
        
        const cookieString = Object.entries(sessionCookies).map(([n, v]) => n + '=' + v).join('; ');
        
        let fileContext = '';
        if (files.length > 0) {
            fileContext = '\n\nКонтекст файлов:\n';
            files.forEach((f, i) => { 
                fileContext += '\n--- Файл ' + (i + 1) + ': ' + (f.path || 'без имени') + ' ---\n' + (f.content || '') + '\n'; 
            });
        }
        
        console.log('📤 Отправка запроса к Qwen Coder...');
        console.log('🍪 Cookies:', Object.keys(sessionCookies).length, 'шт');
        console.log('💬 Сообщение:', message.substring(0, 100) + '...');
        
        // Пробуем разные варианты эндпоинтов
        const endpoints = [
            'https://coder.qwen.ai/api/chat',
            'https://coder.qwen.ai/api/v1/chat',
            'https://coder.qwen.ai/v1/chat/completions'
        ];
        
        let lastError = null;
        let responseData = null;
        
        for (const endpoint of endpoints) {
            try {
                console.log('🔄 Попытка:', endpoint);
                
                const response = await axios.post(endpoint, 
                    { 
                        message: message + fileContext, 
                        stream: false,
                        model: 'qwen-coder-plus'
                    }, 
                    { 
                        headers: { 
                            'Content-Type': 'application/json', 
                            'Cookie': cookieString, 
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Origin': 'https://coder.qwen.ai',
                            'Referer': 'https://coder.qwen.ai/'
                        }, 
                        timeout: 60000 
                    }
                );
                
                responseData = response.data;
                console.log('✅ Успех!', endpoint);
                console.log('📦 Ответ:', JSON.stringify(responseData).substring(0, 200));
                break;
            } catch (err) {
                lastError = err;
                console.log('❌ Ошибка:', endpoint, err.response?.status || 'N/A', err.message);
                if (err.response) {
                    console.log('📄 Детали ошибки:', JSON.stringify(err.response.data).substring(0, 500));
                }
            }
        }
        
        if (!responseData) {
            throw lastError || new Error('Все эндпоинты не доступны');
        }
        
        res.json({ success: true, response: responseData, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
        if (error.response) {
            res.status(error.response.status).json({ 
                error: 'Ошибка API Qwen', 
                status: error.response.status,
                details: error.response.data,
                headers: error.response.headers
            });
        } else if (error.code === 'ECONNABORTED') {
            res.status(408).json({ error: 'Таймаут ожидания ответа' });
        } else {
            res.status(500).json({ 
                error: 'Внутренняя ошибка сервера', 
                message: error.message,
                stack: error.stack
            });
        }
    }
});

app.post('/api/auth/logout', (req, res) => { 
    sessionCookies = {}; 
    res.json({ success: true, message: 'Сессия очищена' }); 
});

app.listen(PORT, () => {
    console.log('🚀 Прокси-сервер запущен!');
    console.log('📍 Адрес: http://localhost:' + PORT);
    console.log('🔐 Веб-интерфейс: http://localhost:' + PORT);
    console.log('💡 Откройте в браузере для удобной авторизации');
});
