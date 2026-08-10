# Прокси-сервер для Qwen Coder Bridge

## Описание

Прокси-сервер обеспечивает безопасную работу с Qwen Coder API, храня учетные данные и эмулируя браузерную сессию.

## Установка

```bash
npm install
```

## Настройка

1. Скопируйте файл `.env.example` в `.env`:
```bash
cp .env.example .env
```

2. При необходимости измените порт в `.env`

## Запуск

```bash
# Обычный запуск
npm start

# Для разработки (с авто-перезагрузкой)
npm run dev
```

Сервер запустится на порту 3000: `http://localhost:3000`

## API

### Проверка статуса авторизации
```bash
GET /api/auth/status
```

Ответ:
```json
{
  "authenticated": true,
  "message": "Авторизация активна"
}
```

### Получение URL для входа
```bash
GET /api/auth/login-url
```

Ответ:
```json
{
  "loginUrl": "https://coder.qwen.ai/",
  "instructions": "..."
}
```

### Установка cookies
```bash
POST /api/auth/set-cookies
Content-Type: application/json

{
  "cookies": "name1=value1; name2=value2; ..."
}
```

### Отправка запроса к Qwen Coder
```bash
POST /api/chat
Content-Type: application/json

{
  "message": "Объясни этот код",
  "files": [
    {
      "path": "/path/to/file.js",
      "content": "console.log('Hello');"
    }
  ]
}
```

### Выход из системы
```bash
POST /api/auth/logout
```

## Архитектура

```
VS Code Plugin ←HTTP→ Proxy Server ←HTTPS + Cookies→ coder.qwen.ai
     │                    │                                    │
     │                    │                                    │
  Webview UI         Хранение сессии                    Qwen Coder API
  Чат, файлы         Cookies, логирование               Генерация ответов
```

## Безопасность

- Cookies хранятся только в памяти сервера
- Не сохраняются на диск
- Очищаются при перезапуске сервера
- Доступ только с localhost

## Решение проблем

### Ошибка CORS
Убедитесь, что в настройках CORS указан правильный origin

### Таймаут запроса
Увеличьте timeout в настройках axios или проверьте соединение с(coder.qwen.ai

### Cookies не работают
- Убедитесь, что скопировали ВСЕ cookies с домена coder.qwen.ai
- Попробуйте перезайти на сайт и скопировать cookies заново
