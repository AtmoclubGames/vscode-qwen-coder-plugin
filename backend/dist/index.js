"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = __importDefault(require("./routes"));
const db_1 = __importDefault(require("./db"));
const bot_1 = require("./bot");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Mount API routes
app.use('/api', routes_1.default);
// MAX Webhook Receiver Endpoint
app.post('/api/webhooks/max', (req, res) => {
    console.log('--- Received MAX Messenger Webhook Payload ---');
    console.dir(req.body, { depth: null });
    res.sendStatus(200);
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});
async function ensureDailySlots() {
    const timeSlots = [
        { start: '09:00', end: '12:00' },
        { start: '12:00', end: '14:00' },
        { start: '14:00', end: '18:00' },
        { start: '18:00', end: '20:00' },
    ];
    const dates = [new Date(), new Date(Date.now() + 24 * 60 * 60 * 1000)];
    const allMenuItems = await db_1.default.menuItem.findMany();
    for (const date of dates) {
        const d = new Date(date);
        d.setUTCHours(0, 0, 0, 0);
        for (const item of allMenuItems) {
            for (const slot of timeSlots) {
                const exists = await db_1.default.dailyStock.findFirst({
                    where: {
                        menuItemId: item.id,
                        date: {
                            gte: d,
                            lt: new Date(d.getTime() + 24 * 60 * 60 * 1000),
                        },
                        slotStart: slot.start,
                        slotEnd: slot.end,
                    }
                });
                if (!exists) {
                    await db_1.default.dailyStock.create({
                        data: {
                            date: d,
                            menuItemId: item.id,
                            slotStart: slot.start,
                            slotEnd: slot.end,
                            totalCount: 15,
                            bookedCount: 0,
                        },
                    });
                    console.log(`Auto-created missing stock slot for ${item.name} on ${d.toISOString().split('T')[0]} at ${slot.start}-${slot.end}`);
                }
            }
        }
    }
}
// Auto-seed function to populate DB with testing data if empty
async function autoSeed() {
    try {
        const vendorsCount = await db_1.default.vendor.count();
        if (vendorsCount > 0) {
            console.log('Database already has data. Checking/generating daily slots...');
            await ensureDailySlots();
            return;
        }
        console.log('Database is empty. Starting auto-seeding of mock data...');
        // 0. Create default Hub
        const hub = await db_1.default.hub.create({
            data: {
                name: 'Главный Сортировочный Центр (Хаб)',
                address: 'ул. Морская 10, Севастополь',
                latitude: 44.5900,
                longitude: 33.5100
            }
        });
        console.log(`Created default Hub in DB: ${hub.name}`);
        // 1. Create a Vendor
        const vendor = await db_1.default.vendor.create({
            data: {
                name: 'Фермерское Хозяйство "Солнечный Берег"',
                description: 'Свежая фермерская продукция',
                address: 'ул. Центральная 1, Село Прибрежное',
                latitude: 44.5,
                longitude: 33.4,
            },
        });
        // 2. Create Pickup Points
        const point1 = await db_1.default.pickupPoint.create({
            data: {
                name: 'Золотой пляж - Спуск #1 (Высокая точка)',
                latitude: 44.5123,
                longitude: 33.4567,
            },
        });
        const point2 = await db_1.default.pickupPoint.create({
            data: {
                name: 'Дикий берег - Кемпинг у скалы',
                latitude: 44.5201,
                longitude: 33.4682,
            },
        });
        // 3. Create Menu Items
        const itemsData = [
            {
                name: 'Плов с говядиной (Порция)',
                price: 350,
                description: 'Традиционный узбекский плов с нежной говядиной, рисом лазер, специями и барбарисом.',
                imageUrl: '/images/plov.png',
                weight: '350 г',
                ingredients: 'Рис лазер, говядина халяль, желтая морковь, лук, чеснок, барбарис, зира, специи',
            },
            {
                name: 'Хачапури по-аджарски',
                price: 280,
                description: 'Горячая выпечка в форме лодочки со смесью сыров сулугуни и имеретинского, с яичным желтком.',
                imageUrl: '/images/khachapuri.png',
                weight: '280 г',
                ingredients: 'Пшеничная мука, сыр сулугуни, сыр имеретинский, яйцо куриное, сливочное масло, соль, вода',
            },
            {
                name: 'Домашняя окрошка на квасе',
                price: 220,
                description: 'Холодный летний суп с отварной говядиной, редисом, огурцом, зеленью и сметаной.',
                imageUrl: '/images/okroshka.png',
                weight: '300 г',
                ingredients: 'Квас домашний, картофель отварной, говядина отварная, огурцы свежие, редис, яйцо отварное, лук зеленый, укроп, петрушка, сметана, соль, горчица',
            },
            {
                name: 'Морс брусничный (0.5л)',
                price: 120,
                description: 'Прохладный натуральный морс из лесной брусники собственного приготовления.',
                imageUrl: '/images/mors.png',
                weight: '500 мл',
                ingredients: 'Брусника лесная свежемороженая, сахар-песок, вода питьевая очищенная',
            },
        ];
        const menuItems = [];
        for (const item of itemsData) {
            const dbItem = await db_1.default.menuItem.create({
                data: {
                    ...item,
                    vendorId: vendor.id,
                },
            });
            menuItems.push(dbItem);
        }
        // 4. Create DailyStock slots for today and tomorrow
        const timeSlots = [
            { start: '09:00', end: '12:00' },
            { start: '12:00', end: '14:00' },
            { start: '14:00', end: '18:00' },
            { start: '18:00', end: '20:00' },
        ];
        const dates = [new Date(), new Date(Date.now() + 24 * 60 * 60 * 1000)]; // Today and Tomorrow
        for (const date of dates) {
            date.setUTCHours(0, 0, 0, 0);
            for (const item of menuItems) {
                for (const slot of timeSlots) {
                    await db_1.default.dailyStock.create({
                        data: {
                            date,
                            menuItemId: item.id,
                            slotStart: slot.start,
                            slotEnd: slot.end,
                            totalCount: 15, // 15 portions available per slot
                            bookedCount: 0,
                        },
                    });
                }
            }
        }
        console.log('Auto-seeding completed successfully!');
        console.log(`Created Vendor: ${vendor.name}`);
        console.log(`Created Points: "${point1.name}" and "${point2.name}"`);
        console.log(`Created Menu Items: ${menuItems.map(i => i.name).join(', ')}`);
    }
    catch (error) {
        console.error('Error during auto-seeding:', error);
    }
}
// Start Server and bots
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    // Initialize DB data if needed
    await autoSeed();
    // Launch Telegram Bot if token is set
    if (bot_1.tgBot) {
        bot_1.tgBot.launch()
            .then(() => console.log('Telegram Bot successfully launched (polling)'))
            .catch(err => console.error('Error launching Telegram Bot:', err));
    }
    else {
        console.log('Telegram Bot Token not configured or default. Bot launching skipped.');
    }
});
// Graceful shutdowns
process.once('SIGINT', () => {
    bot_1.tgBot?.stop('SIGINT');
    db_1.default.$disconnect();
    process.exit(0);
});
process.once('SIGTERM', () => {
    bot_1.tgBot?.stop('SIGTERM');
    db_1.default.$disconnect();
    process.exit(0);
});
