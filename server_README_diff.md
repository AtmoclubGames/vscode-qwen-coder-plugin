--- server/README.md (原始)


+++ server/README.md (修改后)
# Прокси-сервер для Qwen Coder Bridge

Этот сервер выступает в роли безопасного посредника между VS Code плагином и API coder.qwen.ai.

## Возможности

- 🔐 Безопасное хранение сессионных cookies
- 🌐 CORS настройка для работы с VS Code Webview
- 📁 Поддержка отправки файлов в контексте запроса
- ⏱️ Обработка таймаутов и ошибок API

## Установка

```bash
npm install
```

## Запуск

### Режим разработки (с авто-перезагрузкой)
```bash
npm run dev
```

### Продуктовый режим
```bash
npm start
```

## Настройка

1. Скопируйте `.env.example` в `.env`:
```bash
cp .env.example .env
```

2. Отредактируйте `.env` при необходимости (порт по умолчанию 3000).

## Авторизация

### Шаг 1: Получение URL для входа
Откройте в браузере:
```
http://localhost:3000/api/auth/login-url
```

### Шаг 2: Вход в аккаунт
1. Перейдите по ссылке из ответа (https://coder.qwen.ai/)
2. Войдите в свой аккаунт
3. Откройте Developer Tools (F12)
4. Перейдите во вкладку **Application** → **Cookies** → **https://coder.qwen.ai**
5. Скопируйте все cookies в виде строки: `name1=value1; name2=value2; ...`

### Шаг 3: Установка cookies в прокси
Отправьте POST-запрос:
```bash
curl -X POST http://localhost:3000/api/auth/set-cookies \
  -H "Content-Type: application/json" \
  -d '{"cookies": "name1=value1; name2=value2; ..."}'
```

### Проверка статуса авторизации
```bash
curl http://localhost:3000/api/auth/status
```

## APIEndpoints

### POST `/api/chat`
Отправка запроса к Qwen Coder.

**Тело запроса:**
```json
{
  "message": "Объясни этот код",
  "files": [
    {
      "path": "src/index.ts",
      "content": "console.log('Hello World');"
    }
  ]
}
```

**Ответ:**
```json
{
  "success": true,
  "response": { /* ответ от Qwen */ },
  "timestamp": "2026-08-10T12:00:00.000Z"
}
```

### POST `/api/auth/logout`
Очистка сессии.

## Интеграция с VS Code плагином

В вашем плагине укажите URL прокси-сервера:
```typescript
const PROXY_URL = 'http://localhost:3000';

// Отправка запроса
const response = await fetch(`${PROXY_URL}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, files })
});
```

## Безопасность

⚠️ **Важно:** Этот сервер предназначен для локального использования. Не размещайте его на публичном сервере без дополнительной защиты!

Рекомендации:
- Используйте только на localhost
- Добавьте аутентификацию для продакшена
- Ограничьте CORS origin адресом вашего плагина

## Логи

Сервер выводит логи в консоль. В режиме разработки (`npm run dev`) автоматически перезапускается при изменениях.