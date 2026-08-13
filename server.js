const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

// Простой HTTP сервер для раздачи статики (index.html)
const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
    });
});

const wss = new WebSocket.Server({ server });

// Игровое состояние
let snakes = {};
let foods = [];
const worldSize = 4000;
const foodCount = 300;
const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF5', '#F5FF33', '#FF8C33'];

// Генерация начальной еды
function spawnFood(count) {
    for (let i = 0; i < count; i++) {
        foods.push({
            x: Math.random() * worldSize - worldSize / 2,
            y: Math.random() * worldSize - worldSize / 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            value: 1
        });
    }
}
spawnFood(foodCount);

wss.on('connection', (ws) => {
    let playerId = null;
    let playerData = null;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'join') {
            playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            playerData = {
                id: playerId,
                name: data.name || 'Player',
                x: Math.random() * 1000 - 500,
                y: Math.random() * 1000 - 500,
                angle: Math.random() * Math.PI * 2,
                length: 10,
                speed: 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                path: [],
                boost: false
            };
            snakes[playerId] = playerData;
            
            // Инициализация пути
            for(let i=0; i<20; i++) {
                playerData.path.push({x: playerData.x, y: playerData.y});
            }

            ws.send(JSON.stringify({ type: 'init', id: playerId }));
        } else if (data.type === 'input' && playerData) {
            playerData.angle = data.angle;
            playerData.boost = data.boost;
        }
    });

    ws.on('close', () => {
        if (playerId && snakes[playerId]) {
            // Превращаем змею в еду при смерти
            const deadSnake = snakes[playerId];
            for (let i = 0; i < deadSnake.path.length; i+=2) {
                foods.push({
                    x: deadSnake.path[i].x + (Math.random() - 0.5) * 20,
                    y: deadSnake.path[i].y + (Math.random() - 0.5) * 20,
                    color: deadSnake.color,
                    value: 2
                });
            }
            delete snakes[playerId];
        }
    });
});

// Игровой цикл
setInterval(() => {
    // Обновление позиций змей
    Object.values(snakes).forEach(snake => {
        const speed = snake.boost ? snake.speed * 2 : snake.speed;
        
        // Движение
        snake.x += Math.cos(snake.angle) * speed;
        snake.y += Math.sin(snake.angle) * speed;

        // Ограничение мира
        snake.x = Math.max(-worldSize/2, Math.min(worldSize/2, snake.x));
        snake.y = Math.max(-worldSize/2, Math.min(worldSize/2, snake.y));

        // Обновление пути
        snake.path.push({x: snake.x, y: snake.y});
        
        // Уменьшаем длину пути если змея не растет
        const targetLength = Math.floor(snake.length * 5);
        while (snake.path.length > targetLength) {
            snake.path.shift();
        }

        // Рост (медленный)
        if (!snake.boost || snake.length < 10) {
            snake.length += 0.05;
        } else {
            snake.length -= 0.1; // Теряем массу при бусте
        }

        // Проверка столкновений с едой
        for (let i = foods.length - 1; i >= 0; i--) {
            const f = foods[i];
            const dx = snake.x - f.x;
            const dy = snake.y - f.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 15 + snake.length/5) {
                snake.length += f.value;
                foods.splice(i, 1);
                spawnFood(1);
            }
        }
    });

    // Проверка столкновений между змеями
    Object.values(snakes).forEach(snake => {
        Object.values(snakes).forEach(other => {
            if (snake.id === other.id) return;
            
            // Проверяем столкновение головы с телом другой змеи
            for (let i = 0; i < other.path.length; i++) {
                const p = other.path[i];
                const dx = snake.x - p.x;
                const dy = snake.y - p.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < 10 + snake.length/5) {
                    // Смерть!
                    wsDead(snake);
                    break;
                }
            }
        });
    });

    // Отправка состояния всем клиентам
    const state = {
        type: 'state',
        snakes: snakes,
        foods: foods.slice(0, 100) // Отправляем только ближайшую еду для оптимизации
    };

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(state));
        }
    });

}, 1000 / 30); // 30 FPS

function wsDead(snake) {
    if (snakes[snake.id]) {
        // Находим клиента этой змеи и отправляем сообщение о смерти
        wss.clients.forEach(client => {
            // В простой реализации мы просто удаляем змею
            // В полной нужно отслеживать какой клиент какому ID принадлежит
        });
        delete snakes[snake.id];
    }
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущен!`);
    console.log(`Откройте в браузере:`);
    console.log(`  Локально: http://localhost:${PORT}`);
    
    // Получаем локальный IP
    const interfaces = require('os').networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(`  В локальной сети (WiFi): http://${iface.address}:${PORT}`);
            }
        }
    }
    console.log(`\nПодключайтесь с других устройств в той же WiFi сети!`);
});