const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding mock orders and clients...');

  // Get references
  const vendors = await prisma.vendor.findMany();
  const menuItems = await prisma.menuItem.findMany({ include: { stocks: true } });
  const points = await prisma.pickupPoint.findMany();

  if (vendors.length === 0 || menuItems.length === 0 || points.length === 0) {
    console.error('Please run initial seed first to populate vendors, menu, and points.');
    return;
  }

  // Generate random order number
  const getOrderNum = () => Math.floor(1000 + Math.random() * 9000);

  // 1. Order that is AT_HUB (Ready for Logistician)
  await prisma.order.create({
    data: {
      orderNumber: getOrderNum(),
      clientName: 'Алексей (Мок)',
      clientPhone: '+79991234567',
      clientTgId: 'TEST_ID_1',
      messenger: 'TELEGRAM',
      paymentStatus: 'PAID',
      status: 'AT_HUB',
      slotDate: new Date(),
      slotTime: '18:00 - 20:00',
      pickupPointId: points[0].id,
      items: {
        create: [
          {
            menuItemId: menuItems[0].id,
            quantity: 2,
            status: 'AT_HUB'
          }
        ]
      }
    }
  });

  // 2. Order that is PREPARING (Farmer is making it)
  await prisma.order.create({
    data: {
      orderNumber: getOrderNum(),
      clientName: 'Мария (Мок)',
      clientPhone: '+79997654321',
      clientTgId: 'TEST_ID_2',
      messenger: 'MAX',
      paymentStatus: 'PAID',
      status: 'PENDING',
      slotDate: new Date(),
      slotTime: '18:00 - 20:00',
      pickupPointId: points[1 % points.length].id,
      items: {
        create: [
          {
            menuItemId: menuItems[1 % menuItems.length].id,
            quantity: 1,
            status: 'PREPARING'
          }
        ]
      }
    }
  });

  // 3. Order that is already IN_TRANSIT (Given to Driver)
  const transitOrder = await prisma.order.create({
    data: {
      orderNumber: getOrderNum(),
      clientName: 'Иван (Мок)',
      clientPhone: '+79990001122',
      clientTgId: 'TEST_ID_3',
      messenger: 'TELEGRAM',
      paymentStatus: 'PAID',
      status: 'DELIVERING',
      slotDate: new Date(),
      slotTime: '18:00 - 20:00',
      pickupPointId: points[0].id,
      items: {
        create: [
          {
            menuItemId: menuItems[0].id,
            quantity: 3,
            status: 'AT_HUB'
          }
        ]
      }
    }
  });

  // Create a Logistics Task for the IN_TRANSIT order
  await prisma.logisticsTask.create({
    data: {
      driverName: 'Тест Водитель #1',
      orderId: transitOrder.id,
      type: 'DROPOFF_CLIENT',
      status: 'EN_ROUTE',
      address: points[0].name,
      targetLat: points[0].latitude,
      targetLng: points[0].longitude,
      sortOrder: 0
    }
  });

  console.log('Successfully seeded 3 test orders (AT_HUB, PREPARING, IN_TRANSIT with driver Task).');
}

seed().catch(e => console.error(e)).finally(() => prisma.$disconnect());
