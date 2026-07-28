import { Router, Request, Response } from 'express';
import prisma from './db';
import { validateMAXData, validateTelegramData } from './validation';
import { sendNotification } from './bot';

const router = Router();

// Help function to validate initData and extract user information
function parseInitData(messenger: 'TELEGRAM' | 'MAX', initData: string) {
  // If tokens are not set or default, allow bypassing for local browser testing
  const isDev = process.env.NODE_ENV === 'development' || 
                process.env.TELEGRAM_BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN' ||
                !initData;
                
  if (isDev && !initData) {
    return {
      userId: 'test_user_id',
      firstName: 'Тестовый',
      lastName: 'Пользователь',
      username: 'test_user',
    };
  }

  if (messenger === 'TELEGRAM') {
    const token = process.env.TELEGRAM_BOT_TOKEN || '';
    const isValid = validateTelegramData(initData, token);
    if (!isValid && !isDev) {
      throw new Error('Invalid Telegram initData signature');
    }
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (!userStr) throw new Error('User data missing in Telegram initData');
    const user = JSON.parse(userStr);
    return {
      userId: String(user.id),
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      username: user.username || '',
    };
  } else if (messenger === 'MAX') {
    const token = process.env.MAX_BOT_TOKEN || '';
    const isValid = validateMAXData(initData, token);
    if (!isValid && !isDev) {
      throw new Error('Invalid MAX initData signature');
    }
    // Extract parameters from query string
    const params = initData.split('&').reduce((acc, pair) => {
      const idx = pair.indexOf('=');
      if (idx !== -1) {
        acc[pair.slice(0, idx)] = decodeURIComponent(pair.slice(idx + 1));
      }
      return acc;
    }, {} as Record<string, string>);

    const userStr = params['user'];
    if (!userStr) throw new Error('User data missing in MAX initData');
    const user = JSON.parse(userStr);
    return {
      userId: String(user.id),
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      username: user.username || '',
    };
  }

  throw new Error('Unsupported messenger type');
}

/**
 * GET /api/points
 * Retrieve all registered pickup points.
 */
router.get('/points', async (req: Request, res: Response) => {
  try {
    const points = await prisma.pickupPoint.findMany();
    res.json(points);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/points/:id
 * Retrieve details of a specific pickup point.
 */
router.get('/points/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const point = await prisma.pickupPoint.findUnique({
      where: { id },
    });

    if (!point) {
      return res.status(404).json({ error: 'Pickup point not found' });
    }

    res.json(point);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/menu
 * Get menu items for the kitchen of a specific pickup point along with portions availability.
 * Query: pointId (required), date (YYYY-MM-DD, optional)
 */
router.get('/menu', async (req: Request, res: Response) => {
  try {
    const { date: dateStr } = req.query;

    const date = dateStr ? new Date(dateStr as string) : new Date();
    // Reset hours to compare dates only
    date.setUTCHours(0, 0, 0, 0);

    // Fetch all menu items from all vendors
    const menuItems = await prisma.menuItem.findMany({
      include: { vendor: true }
    });

    // Fetch daily stock for these items on the target date
    const dailyStocks = await prisma.dailyStock.findMany({
      where: {
        date: {
          gte: date,
          lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    // Combine menu items with stock information
    const responseMenu = menuItems.map(item => {
      const itemStocks = dailyStocks.filter(s => s.menuItemId === item.id);
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        weight: item.weight,
        unitType: item.unitType,
        ingredients: item.ingredients,
        likesCount: item.likesCount,
        vendorId: item.vendorId,
        vendorName: item.vendor?.name,
        vendorType: item.vendor?.type,
        vendorRating: item.vendor?.rating,
        isPreorderOnly: item.isPreorderOnly,
        slots: itemStocks.map(s => ({
          id: s.id,
          slotStart: s.slotStart,
          slotEnd: s.slotEnd,
          total: s.totalCount,
          booked: s.bookedCount,
          available: Math.max(0, s.totalCount - s.bookedCount),
        })),
      };
    });

    res.json(responseMenu);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orders
 * Create a new order with validation and transaction-based stock deduction.
 */
router.post('/orders', async (req: Request, res: Response) => {
  try {
    const {
      messenger,
      initData,
      clientName,
      clientPhone,
      clientComment,
      pickupPointId,
      slotDate, // YYYY-MM-DD
      slotTime, // e.g., "13:00-14:00"
      items, // array of { menuItemId: string, quantity: number }
    } = req.body;

    if (!messenger || !pickupPointId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required order fields' });
    }

    // 1. Validate initData signature and get client user ID
    let clientInfo;
    try {
      clientInfo = parseInitData(messenger, initData);
    } catch (err: any) {
      return res.status(401).json({ error: `Authentication failed: ${err.message}` });
    }

    const orderDate = new Date(slotDate);
    orderDate.setUTCHours(0, 0, 0, 0);

    const [slotStart, slotEnd] = slotTime.split('-');

    // 2. Process order and stock modifications in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check availability and decrement stock
      for (const item of items) {
        const stock = await tx.dailyStock.findFirst({
          where: {
            menuItemId: item.menuItemId,
            date: {
              gte: orderDate,
              lt: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000),
            },
            slotStart,
            slotEnd,
          },
        });

        if (!stock) {
          throw new Error(`Stock slot not found for item ${item.menuItemId} at ${slotTime}`);
        }

        const available = stock.totalCount - stock.bookedCount;
        if (available < item.quantity) {
          throw new Error(`Not enough portions available for item. Requested ${item.quantity}, available ${available}`);
        }

        // Deduct portions
        await tx.dailyStock.update({
          where: { id: stock.id },
          data: { bookedCount: { increment: item.quantity } },
        });
      }

      // Generate order number for the day
      const ordersCountToday = await tx.order.count({
        where: {
          slotDate: {
            gte: orderDate,
            lt: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });
      const orderNumber = 100 + ordersCountToday + 1; // start from 101 each day

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          messenger,
          clientTgId: clientInfo.userId,
          clientName: clientName || clientInfo.firstName,
          clientPhone: clientPhone || '',
          clientComment: clientComment || '',
          pickupPointId,
          slotDate: orderDate,
          slotTime,
          status: 'PENDING',
          items: {
            create: items.map((item: any) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: {
            include: { menuItem: true },
          },
          pickupPoint: true,
        },
      });

      return newOrder;
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/orders/:id
 * Retrieve details of a specific order (for client tracking).
 */
router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { menuItem: true },
        },
        pickupPoint: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * POST /api/admin/points
 * Courier API to create a new pickup point using current location.
 */
router.post('/admin/points', async (req: Request, res: Response) => {
  try {
    const { name, latitude, longitude } = req.body;
    
    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing name, latitude or longitude' });
    }

    const newPoint = await prisma.pickupPoint.create({
      data: {
        name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
    });

    // Generate launch links for the QR codes
    const tgBotName = process.env.TELEGRAM_BOT_TOKEN ? 'your_tg_bot' : 'mock_tg_bot'; // Replace with real bot name from @BotFather
    const maxBotName = process.env.MAX_BOT_TOKEN ? 'your_max_bot' : 'mock_max_bot'; // Replace with real MAX bot ник
    
    const tgLink = `https://t.me/${tgBotName}/app?startapp=point_${newPoint.id}`;
    const maxLink = `https://max.ru/${maxBotName}?startapp=point_${newPoint.id}`;

    res.status(201).json({
      point: newPoint,
      links: {
        telegram: tgLink,
        max: maxLink,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/orders
 * Retrieve active orders for the courier dashboard.
 */
router.get('/admin/orders', async (req: Request, res: Response) => {
  try {
    const { pickupPointId } = req.query;

    const orders = await prisma.order.findMany({
      where: pickupPointId ? { pickupPointId: String(pickupPointId) } : {},
      include: {
        items: {
          include: { menuItem: true },
        },
        pickupPoint: true,
      },
      orderBy: [
        { slotDate: 'asc' },
        { slotTime: 'asc' },
        { orderNumber: 'asc' },
      ],
    });

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/orders/:id/status
 * Update order status and trigger instant notifications.
 */
router.post('/admin/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { pickupPoint: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: { pickupPoint: true },
    });

    // Trigger customer notification depending on status
    let messageText = '';
    const pointName = order.pickupPoint.name;
    const orderNum = order.orderNumber;

    if (status === 'DELIVERING') {
      messageText = `🚴 Курьер выехал! Ваш заказ #${orderNum} уже в пути к точке выдачи «${pointName}». Пожалуйста, приготовьтесь подойти через 10-15 минут.`;
    } else if (status === 'READY') {
      messageText = `📍 Курьер прибыл! Ваш заказ #${orderNum} готов к выдаче на точке «${pointName}». Пожалуйста, подойдите к указателю «Домашняя кухня» и назовите номер заказа курьеру.`;
    } else if (status === 'COMPLETED') {
      messageText = `✅ Заказ #${orderNum} успешно выдан! Приятного аппетита. Ждем вас снова!`;
    }

    if (messageText && order.clientTgId) {
      await sendNotification(
        order.messenger as 'TELEGRAM' | 'MAX',
        order.clientTgId,
        messageText
      );
    }

    res.json(updatedOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/stock
 * Kitchen Operator API to create or update DailyStock records.
 */
router.post('/admin/stock', async (req: Request, res: Response) => {
  try {
    const { menuItemId, date, slotStart, slotEnd, totalCount } = req.body;

    if (!menuItemId || !date || !slotStart || !slotEnd || totalCount === undefined) {
      return res.status(400).json({ error: 'Missing required parameters: menuItemId, date, slotStart, slotEnd, totalCount' });
    }

    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);

    const parsedTotalCount = parseInt(totalCount, 10);
    if (isNaN(parsedTotalCount) || parsedTotalCount < 0) {
      return res.status(400).json({ error: 'totalCount must be a non-negative integer' });
    }

    const existingStock = await prisma.dailyStock.findFirst({
      where: {
        menuItemId,
        date: {
          gte: d,
          lt: new Date(d.getTime() + 24 * 60 * 60 * 1000),
        },
        slotStart,
        slotEnd,
      },
    });

    if (existingStock) {
      if (parsedTotalCount < existingStock.bookedCount) {
        return res.status(400).json({
          error: `Нельзя установить лимит меньше уже забронированных порций (${existingStock.bookedCount})`,
        });
      }

      const updated = await prisma.dailyStock.update({
        where: { id: existingStock.id },
        data: { totalCount: parsedTotalCount },
      });
      return res.json(updated);
    }

    const newStock = await prisma.dailyStock.create({
      data: {
        menuItemId,
        date: d,
        slotStart,
        slotEnd,
        totalCount: parsedTotalCount,
        bookedCount: 0,
      },
    });

    res.status(201).json(newStock);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/orders/:id/courier
 * Assign or update courierName for an order.
 */
router.post('/admin/orders/:id/courier', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { courierName } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { courierName },
      include: {
        items: {
          include: { menuItem: true },
        },
        pickupPoint: true,
      },
    });

    res.json(updatedOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/orders/:id/items
 * Edit order items and adjust DailyStock accordingly.
 */
router.post('/admin/orders/:id/items', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { items } = req.body; // array of { menuItemId: string, quantity: number }

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items list is required' });
    }

    const filteredItems = items.filter(it => it.quantity > 0);
    if (filteredItems.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item with quantity > 0' });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const [slotStart, slotEnd] = order.slotTime.split('-').map(s => s.trim());
      const orderDate = new Date(order.slotDate);
      orderDate.setUTCHours(0, 0, 0, 0);

      // Maps of quantities
      const oldItemsMap = new Map<string, number>();
      for (const oldItem of order.items) {
        oldItemsMap.set(oldItem.menuItemId, oldItem.quantity);
      }

      const newItemsMap = new Map<string, number>();
      for (const newItem of filteredItems) {
        newItemsMap.set(newItem.menuItemId, newItem.quantity);
      }

      const allItemIds = new Set([...oldItemsMap.keys(), ...newItemsMap.keys()]);

      // Adjust stocks
      for (const itemId of allItemIds) {
        const oldQty = oldItemsMap.get(itemId) || 0;
        const newQty = newItemsMap.get(itemId) || 0;
        const diff = newQty - oldQty;

        if (diff !== 0) {
          const stock = await tx.dailyStock.findFirst({
            where: {
              menuItemId: itemId,
              date: {
                gte: orderDate,
                lt: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000),
              },
              slotStart,
              slotEnd,
            },
          });

          if (!stock) {
            throw new Error(`Лимиты порций не найдены для блюда ID ${itemId} на интервал ${order.slotTime}`);
          }

          if (diff > 0) {
            const available = stock.totalCount - stock.bookedCount;
            if (available < diff) {
              throw new Error(`Недостаточно порций для блюда. Доступно к заказу: ${available} шт.`);
            }
          }

          await tx.dailyStock.update({
            where: { id: stock.id },
            data: { bookedCount: { increment: diff } },
          });
        }
      }

      // Recreate order items
      await tx.orderItem.deleteMany({
        where: { orderId: id },
      });

      await tx.orderItem.createMany({
        data: filteredItems.map(item => ({
          orderId: id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        })),
      });

      return tx.order.findUnique({
        where: { id },
        include: {
          items: {
            include: { menuItem: true },
          },
          pickupPoint: true,
        },
      });
    });

    res.json(updatedOrder);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

interface OrderMessage {
  id: string;
  orderId: string;
  sender: 'CLIENT' | 'ADMIN';
  text: string;
  createdAt: string;
}

const orderMessagesInMemory: OrderMessage[] = [];

/**
 * GET /api/orders/:id/messages
 * Fetch chat messages for an order.
 */
router.get('/orders/:id/messages', (req: Request, res: Response) => {
  const { id } = req.params;
  const messages = orderMessagesInMemory.filter(m => m.orderId === id);
  res.json(messages);
});

/**
 * POST /api/orders/:id/messages
 * Post a new chat message for an order.
 */
router.post('/orders/:id/messages', (req: Request, res: Response) => {
  const { id } = req.params;
  const { sender, text } = req.body;

  if (!sender || !text) {
    return res.status(400).json({ error: 'Sender and text are required' });
  }

  const newMessage: OrderMessage = {
    id: Math.random().toString(),
    orderId: id,
    sender,
    text,
    createdAt: new Date().toISOString(),
  };

  orderMessagesInMemory.push(newMessage);
  res.status(201).json(newMessage);
});

/**
 * GET /api/logistics/tasks
 */

/**
 * GET /api/hubs
 */
router.get('/hubs', async (req: Request, res: Response) => {
  try {
    const hubs = await prisma.hub.findMany();
    res.json(hubs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/logistics/tasks', async (req: Request, res: Response) => {
  try {
    const tasks = await prisma.logisticsTask.findMany({
      include: {
        order: {
          include: {
            items: { include: { menuItem: { include: { vendor: true } } } },
            pickupPoint: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/logistics/tasks/batch
 */
router.post('/logistics/tasks/batch', async (req: Request, res: Response) => {
  try {
    const { driverName, tasks } = req.body;
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'Tasks array is required' });
    }

    const createdTasks = await Promise.all(
      tasks.map((t: any) => prisma.logisticsTask.create({
        data: {
          driverName: driverName || 'Не назначен',
          status: 'PENDING',
          type: t.type || 'DROPOFF_HUB',
          orderId: t.orderId,
          targetLat: t.targetLat,
          targetLng: t.targetLng,
          address: t.address,
          sortOrder: t.sortOrder || 0
        }
      }))
    );

    const orderIds = tasks.map((t: any) => t.orderId);
    console.log(`[LOGISTICS] Creating logistics tasks batch for driver "${driverName}". Order IDs: ${orderIds.join(', ')}`);
    
    // Update status to READY_TO_SHIP ONLY for orders that are not currently being prepared (PENDING/PREPARING)
    await prisma.order.updateMany({
      where: { 
        id: { in: orderIds },
        NOT: {
          status: { in: ['PENDING', 'PREPARING'] }
        }
      },
      data: { status: 'READY_TO_SHIP' }
    });
    console.log('[LOGISTICS] Order status update processed.');

    res.json(createdTasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/logistics/tasks/:id/status
 */
router.put('/logistics/tasks/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const task = await prisma.logisticsTask.update({
      where: { id },
      data: { status },
      include: { order: true }
    });

    console.log(`[LOGISTICS] Task ${id} status updated to "${status}". Task Type: ${task.type}, Order ID: ${task.orderId}`);
    
    if (status === 'EN_ROUTE') {
      await prisma.order.update({
        where: { id: task.orderId },
        data: { status: 'DELIVERING' }
      });
      console.log(`[LOGISTICS] Order ${task.orderId} status set to DELIVERING`);
    } else if (status === 'ARRIVED') {
      // Driver arrived at the delivery point
      await prisma.order.update({
        where: { id: task.orderId },
        data: { status: 'READY' }
      });
      console.log(`[LOGISTICS] Order ${task.orderId} status set to READY (Driver arrived at location)`);
    } else if (status === 'COMPLETED') {
      // If task is dropping off at HUB, it becomes AT_HUB. Else if delivering directly, COMPLETED.
      const orderStatus = task.type === 'DROPOFF_HUB' ? 'AT_HUB' : 'COMPLETED';
      await prisma.order.update({
        where: { id: task.orderId },
        data: { status: orderStatus }
      });
      console.log(`[LOGISTICS] Order ${task.orderId} status set to ${orderStatus} (Delivery task completed)`);
    }

    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * POST /api/admin/menu
 * Create a new menu item for a vendor
 */
router.post('/admin/menu', async (req: Request, res: Response) => {
  try {
    const { name, description, price, imageUrl, weight, vendorId } = req.body;
    
    // Auto-generate DailyStock slots for this new item (for today and tomorrow)
    const timeSlots = [
      { start: '09:00', end: '12:00' },
      { start: '12:00', end: '14:00' },
      { start: '14:00', end: '18:00' },
      { start: '18:00', end: '20:00' },
    ];
    const dates = [new Date(), new Date(Date.now() + 24 * 60 * 60 * 1000)];

    const newItem = await prisma.menuItem.create({
      data: {
        name, description, price: Number(price), imageUrl, weight, vendorId,
        stocks: {
          create: dates.flatMap(date => {
            const d = new Date(date);
            d.setUTCHours(0, 0, 0, 0);
            return timeSlots.map(slot => ({
              date: d,
              slotStart: slot.start,
              slotEnd: slot.end,
              totalCount: 50, // default limit
            }));
          })
        }
      }
    });

    res.json(newItem);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

