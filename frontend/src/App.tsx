import React, { useState, useEffect } from 'react';
import sdk from './sdk';
import { 
  ShoppingBag, 
  MapPin, 
  Check, 
  Truck, 
  Plus, 
  Minus, 
  Info, 
  Clock, 
  QrCode, 
  Printer, 
  Coffee,
  AlertCircle,
  ChefHat,
  Sliders,
  Edit,
  Phone,
  Map as MapIcon,
  User,
  Trash,
  Star,
  Bell,
  Heart
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const loadYandexMaps = async (callback: () => void) => {
  console.log('[MAPS] Init script load sequence called');
  const ymaps3 = (window as any).ymaps3;
  if (!ymaps3) {
    console.error('[MAPS] ymaps3 object not found on window. Is the script blocked?');
    callback();
    return;
  }
  await ymaps3.ready;
  console.log('[MAPS] ymaps3.ready resolved. Executing callback');
  callback();
};

const renderMockMap = (containerId: string, points: any[], center?: [number, number]) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  container.style.position = 'relative';
  container.style.overflow = 'hidden';
  container.style.background = '#1a1d24';
  container.style.border = '1px solid rgba(255,255,255,0.08)';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.borderRadius = '12px';
  container.style.height = '250px';
  
  const grid = document.createElement('div');
  grid.style.position = 'absolute';
  grid.style.width = '200%';
  grid.style.height = '200%';
  grid.style.backgroundImage = 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)';
  grid.style.backgroundSize = '20px 20px';
  grid.style.opacity = '0.5';
  container.appendChild(grid);
  
  const infoBox = document.createElement('div');
  infoBox.style.position = 'absolute';
  infoBox.style.top = '10px';
  infoBox.style.left = '10px';
  infoBox.style.background = 'rgba(0,0,0,0.85)';
  infoBox.style.border = '1px solid rgba(255,126,64,0.3)';
  infoBox.style.borderRadius = '6px';
  infoBox.style.padding = '6px 10px';
  infoBox.style.fontSize = '10px';
  infoBox.style.color = '#fff';
  infoBox.style.zIndex = '10';
  infoBox.innerHTML = `📡 <strong>Симуляция карты (API заблокирован)</strong><br/>Активных точек: ${points.length}`;
  container.appendChild(infoBox);

  points.forEach((point, idx) => {
    if (!point) return;
    let x = 50;
    let y = 50;

    if (center) {
      x = 50 + (point.longitude - center[0]) * 5000;
      y = 50 - (point.latitude - center[1]) * 5000;
    } else if (points.length > 1) {
      const latRange = 0.05;
      const lngRange = 0.05;
      x = 10 + ((point.longitude % 0.05) / 0.05) * 80;
      y = 10 + ((point.latitude % 0.05) / 0.05) * 80;
    } else {
      x = 40 + Math.random() * 20;
      y = 40 + Math.random() * 20;
    }
    
    x = Math.max(15, Math.min(85, x));
    y = Math.max(15, Math.min(85, y));

    const marker = document.createElement('div');
    marker.style.position = 'absolute';
    marker.style.left = `${x}%`;
    marker.style.top = `${y}%`;
    marker.style.transform = 'translate(-50%, -50%)';
    marker.style.display = 'flex';
    marker.style.flexDirection = 'column';
    marker.style.alignItems = 'center';
    marker.style.zIndex = '5';
    marker.style.cursor = 'pointer';

    const pin = document.createElement('div');
    pin.style.width = '24px';
    pin.style.height = '24px';
    pin.style.borderRadius = '50%';
    pin.style.background = '#ff7e40';
    pin.style.border = '2px solid #fff';
    pin.style.display = 'flex';
    pin.style.alignItems = 'center';
    pin.style.justifyContent = 'center';
    pin.style.fontWeight = 'bold';
    pin.style.fontSize = '10px';
    pin.style.color = '#fff';
    pin.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
    pin.innerHTML = point.name ? point.name.substring(0, 1) : String(idx + 1);
    
    const title = document.createElement('div');
    title.style.background = 'rgba(0,0,0,0.8)';
    title.style.color = '#fff';
    title.style.fontSize = '9px';
    title.style.padding = '2px 6px';
    title.style.borderRadius = '4px';
    title.style.marginTop = '4px';
    title.style.whiteSpace = 'nowrap';
    title.innerHTML = point.name || ('Точка ' + (idx + 1));

    marker.appendChild(pin);
    marker.appendChild(title);
    container.appendChild(marker);
  });
};

(window as any).renderMockMap = renderMockMap;



interface Slot {
  id: string;
  slotStart: string;
  slotEnd: string;
  total: number;
  booked: number;
  available: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  weight: string | null;
  ingredients?: string | null;
  slots: Slot[];
  vendorName?: string;
  vendorType?: string;
  vendorRating?: number;
  unitType?: string;
  vendorId?: string;
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  slotTime: string;
  slotId: string;
}

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [role, setRole] = useState<'CLIENT' | 'COURIER' | 'KITCHEN' | 'KITCHEN_ADMIN' | 'LOGISTICIAN' | 'DRIVER' | 'SMM_ADMIN' | 'VENDOR' | 'HUB'>('CLIENT');
  const [pointId, setPointId] = useState<string>('');
  const [pointInfo, setPointInfo] = useState<any>(null);
  
  // Client state
  const [menu, setMenu] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'TOMORROW' | 'TODAY'>('TOMORROW');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<any>(null);
  const [activeDetailsItem, setActiveDetailsItem] = useState<any>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientComment, setClientComment] = useState('');
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [userCoords, setUserCoords] = useState<any>(null);

  // Expanded client state
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [clientActiveTab, setClientActiveTab] = useState<'MENU' | 'TRACKING' | 'PROFILE'>('MENU');
  const [checkoutStep, setCheckoutStep] = useState<number>(1);
  const [mapSimulatedCoords, setMapSimulatedCoords] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'HOT' | 'BAKERY' | 'SOUP' | 'DRINK'>('ALL');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [callSimulation, setCallSimulation] = useState<any>(null);
  const [driverLocations, setDriverLocations] = useState<any[]>([]);
  const [clientSort, setClientSort] = useState('');
  const [pointsList, setPointsList] = useState<any[]>([]);
  const [vendorDateTab, setVendorDateTab] = useState('TODAY');
  const [vendorMenu, setVendorMenu] = useState<any[]>([]);

  // Admin / Dispatcher State
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [adminEditingOrder, setAdminEditingOrder] = useState<any>(null);

  // Logistician State
  const [logisticianSelectedOrders, setLogisticianSelectedOrders] = useState<string[]>([]);
  const [logisticianDriverName, setLogisticianDriverName] = useState('');

  // Driver State
  const [driverNameInput, setDriverNameInput] = useState('');
  const [logisticsTasks, setLogisticsTasks] = useState<any[]>([]);
  const [driverOrders, setDriverOrders] = useState<any[]>([]);

  // SMM / Admin State
  const [pointCreatedData, setPointCreatedData] = useState<any>(null);
  const [newPointName, setNewPointName] = useState('');
  const [newPointLat, setNewPointLat] = useState('');
  const [newPointLng, setNewPointLng] = useState('');
  const [editingStockSlot, setEditingStockSlot] = useState<any>(null);
  const [newStockTotal, setNewStockTotal] = useState<any>('');

  const [chatInput, setChatInput] = useState('');
  const [vendorTab, setVendorTab] = useState('ORDERS');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminChatOpenId, setAdminChatOpenId] = useState<string | null>(null);
  const [adminChatMessages, setAdminChatMessages] = useState<any[]>([]);
  const [adminChatInput, setAdminChatInput] = useState('');
  const [activePlacardPoint, setActivePlacardPoint] = useState<any>(null);
  const [callStatusText, setCallStatusText] = useState('');
  const [callDialogTranscripts, setCallDialogTranscripts] = useState<any[]>([]);
  const [logisticianDeliveryType, setLogisticianDeliveryType] = useState('DIRECT');
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [activeStory, setActiveStory] = useState<any>(null);
  const [hubsList, setHubsList] = useState<any[]>([]);

  const storiesList = [
    { 
      id: 1, 
      tag: 'Новое', 
      title: 'Свежие новинки', 
      color: '#ff7e40', 
      img: '/images/smm_new.png', 
      text: 'Встречайте свежие фермерские продукты этой недели: парное коровье и козье молоко, натуральный брусничный мед, свежие яйца свободного выгула и хрустящий бездрожжевой хлеб прямо из дровяной печи. Попробуйте лучшее от наших поваров и фермеров!' 
    },
    { 
      id: 2, 
      tag: 'Рецепты', 
      title: 'Как варят наш сыр', 
      color: '#ffd54f', 
      img: '/images/smm_cheese.png', 
      text: 'Наш знаменитый сыр сулугуни варится вручную по традиционному рецепту. Мы используем только цельное молоко утренней дойки и натуральную закваску. Сыр прессуется, а затем выдерживается в рассоле до достижения идеальной волокнистой текстуры.' 
    },
    { 
      id: 3, 
      tag: 'Видео', 
      title: 'Экскурсия по ферме', 
      color: '#7f56da', 
      img: '/images/smm_video.png', 
      text: 'Посмотрите видеоэкскурсию по нашей ферме «Солнечный Берег»! Познакомьтесь с нашими коровами джерсейской породы, посмотрите на работу чистейшего автоматизированного доильного цеха и полюбуйтесь зелеными крымскими холмами.' 
    },
    { 
      id: 4, 
      tag: 'События', 
      title: 'Жизнь нашей фермы', 
      color: '#03a9f4', 
      img: '/images/smm_tour.png', 
      text: 'Каждую субботу мы открываем двери для гостей. Приезжайте всей семьей на дегустацию сыров, парного молока и горячей выпечки из тандыра. Дети смогут покормить ягнят и кроликов в нашем контактном мини-зоопарке!' 
    },
    { 
      id: 5, 
      tag: 'Отзывы', 
      title: 'Что говорят клиенты', 
      color: '#00e676', 
      img: '/images/smm_reviews.png', 
      text: 'Наши покупатели делятся впечатлениями: "Заказывали доставку прямо на пляж. Курьер прибежал вовремя, плов был огненно-горячим, а хачапури просто таял во рту! Это лучший сервис еды у моря, который я видел."' 
    }
  ];

  const [newVendorItem, setNewVendorItem] = useState<any>({});
  const [hasNewMessage, setHasNewMessage] = useState(false);


  // Load persisted client name & phone on startup
  useEffect(() => {
    const savedName = localStorage.getItem('beach_delivery_client_name');
    if (savedName) setClientName(savedName);
    
    const savedPhone = localStorage.getItem('beach_delivery_client_phone');
    if (savedPhone) setClientPhone(savedPhone);
  }, []);

  // Poll Client Chat Messages
  useEffect(() => {
    if (!activeOrder || clientActiveTab !== 'TRACKING') return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_BASE}/orders/${activeOrder.id}/messages`);
        if (res.ok) {
          const data = await res.json();
          setChatMessages(data);
        }
      } catch (err) {
        console.error("Failed to fetch chat messages:", err);
      }
    };

    fetchMessages(); // fetch immediately
    const interval = setInterval(fetchMessages, 3000); // poll every 3s
    return () => clearInterval(interval);
  }, [activeOrder?.id, clientActiveTab]);

  // Poll Admin Chat Messages
  useEffect(() => {
    if (!adminChatOpenId || role !== 'SMM_ADMIN') return;

    const fetchAdminMessages = async () => {
      try {
        const res = await fetch(`${API_BASE}/orders/${adminChatOpenId}/messages`);
        if (res.ok) {
          const data = await res.json();
          setAdminChatMessages(data);
        }
      } catch (err) {
        console.error("Failed to fetch admin chat messages:", err);
      }
    };

    fetchAdminMessages();
    const interval = setInterval(fetchAdminMessages, 3000);
    return () => clearInterval(interval);
  }, [adminChatOpenId, role]);

  const handleSendClientMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeOrder) return;
    
    try {
      const res = await fetch(`${API_BASE}/orders/${activeOrder.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'CLIENT', text: chatInput })
      });
      if (res.ok) {
        const newMessage = await res.json();
        setChatMessages(prev => [...prev, newMessage]);
        setChatInput('');
      }
    } catch (err) {
      console.error("Failed to send client message:", err);
    }
  };

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminChatInput.trim() || !adminChatOpenId) return;

    try {
      const res = await fetch(`${API_BASE}/orders/${adminChatOpenId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'ADMIN', text: adminChatInput })
      });
      if (res.ok) {
        const newMessage = await res.json();
        setAdminChatMessages(prev => [...prev, newMessage]);
        setAdminChatInput('');
      }
    } catch (err) {
      console.error("Failed to send admin message:", err);
    }
  };

  // Interactive Call Simulation lifecycle with Russian dial tones (425Hz)
  useEffect(() => {
    if (!callSimulation) {
      setCallStatusText('Вызов...');
      setCallDialogTranscripts([]);
      return;
    }

    setCallStatusText('Вызов...');
    setCallDialogTranscripts([]);
    
    let beepInterval: any = null;
    let dialogueTimeouts: any[] = [];
    
    const playBeep = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(425, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.start();
        
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
        setTimeout(() => {
          try {
            osc.stop();
            audioCtx.close();
          } catch(e) {}
        }, 900);
      } catch (e) {
        console.warn("Web Audio beep blocked/unsupported:", e);
      }
    };

    // Play first beep
    playBeep();
    
    let beepCount = 1;
    beepInterval = setInterval(() => {
      if (beepCount >= 3) {
        clearInterval(beepInterval);
        setCallStatusText('Разговор...');
        startDialogue();
      } else {
        playBeep();
        beepCount++;
      }
    }, 2000);

    const startDialogue = () => {
      let lines: string[] = [];
      if (callSimulation.roleName === 'Покупатель') {
        lines = [
          `📞 Покупатель: Алло, да, слушаю.`,
          `💼 Диспетчер: Добрый день! Вы сделали заказ #${activeOrder?.orderNumber || '104'}. Хотели что-то изменить?`,
          `📞 Покупатель: Да, здравствуйте! А можно добавить еще один морс и убрать одну окрошку?`,
          `💼 Диспетчер: Конечно, я сейчас отредактирую ваш заказ в панели администратора.`,
          `📞 Покупатель: Отлично, спасибо вам огромное!`,
          `💼 Диспетчер: Без проблем, приятного отдыха!`
        ];
      } else if (callSimulation.roleName === 'Курьер') {
        lines = [
          `🚴 Водитель: Да, алло! На связи Иван.`,
          `💼 Диспетчер: Иван, привет! Заказ #${activeOrder?.orderNumber || '104'} уже забрал с кухни?`,
          `🚴 Водитель: Да, забираю прямо сейчас, складываю в термосумку. Через 10 минут буду на месте.`,
          `💼 Диспетчер: Отлично, там клиент ждет у синего зонта. Поторопись, пожалуйста!`,
          `🚴 Водитель: Понял, сделаю в лучшем виде.`,
          `💼 Диспетчер: Давай, на связи!`
        ];
      } else if (callSimulation.roleName === 'Администратор') {
        lines = [
          `💼 Администратор: Маркетплейс продуктов, здравствуйте! Диспетчер на связи.`,
          `👤 Клиент (Вы): Здравствуйте! Я сделал заказ #${activeOrder?.orderNumber || '104'}. А приборы вы положите?`,
          `💼 Администратор: Да, конечно! К каждому блюду мы обязательно кладем одноразовые приборы и салфетки.`,
          `👤 Клиент (Вы): Ой, отлично! А то на природе совсем без вилок неудобно.`,
          `💼 Администратор: Не переживайте, все упаковано. Курьер скоро выезжает к вам.`,
          `👤 Клиент (Вы): Спасибо большое! Хорошего дня.`
        ];
      } else {
        lines = [
          `📞 Собеседник: Алло!`,
          `👤 Вы: Здравствуйте!`,
          `📞 Собеседник: Да, слушаю вас. Я на связи, готов обсудить детали.`
        ];
      }

      lines.forEach((line, index) => {
        const timeout = setTimeout(() => {
          setCallDialogTranscripts(prev => [...prev, line]);
        }, index * 2500);
        dialogueTimeouts.push(timeout);
      });
    };

    return () => {
      clearInterval(beepInterval);
      dialogueTimeouts.forEach(clearTimeout);
    };
  }, [callSimulation, activeOrder?.orderNumber]);


  // Checkout Map Initialization
  useEffect(() => {
    if (checkoutStep === 2 && pointsList.length > 0 && checkoutOpen) {
      loadYandexMaps(async () => {
        const ymaps3 = (window as any).ymaps3;
        if (!ymaps3) {
          (window as any).renderMockMap('checkout-points-map', pointsList, pointsList[0] ? [pointsList[0].longitude, pointsList[0].latitude] : undefined);
          return;
        }
          console.log('[MAPS] ymaps3.ready fulfilled. Mounting...');
          const container = document.getElementById('checkout-points-map');
          if (!container) return;
          container.innerHTML = '';
          const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapListener } = ymaps3;
          const { YMapDefaultMarker } = await ymaps3.import('@yandex/ymaps3-markers@0.0.1');
          
          const centerLat = pointsList.reduce((sum, p) => sum + p.latitude, 0) / pointsList.length;
          const centerLng = pointsList.reduce((sum, p) => sum + p.longitude, 0) / pointsList.length;

          const myMap = new YMap(container, {
            location: { center: [centerLng, centerLat], zoom: 12 }
          });
          myMap.addChild(new YMapDefaultSchemeLayer());
          myMap.addChild(new YMapDefaultFeaturesLayer());

          pointsList.forEach(point => {
            const el = document.createElement('div');
            el.innerHTML = `<div style="background: white; border: 2px solid #ff7e40; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 10px; color: #ff7e40; cursor: pointer;">${point.name.substring(0,1)}</div>`;
            
            const marker = new YMapDefaultMarker({
              coordinates: [point.longitude, point.latitude],
              title: point.name,
              color: '#ff7e40'
            });
            myMap.addChild(marker);
          });
        });
    }
  }, [checkoutStep, pointsList, checkoutOpen]);



  // Logistician Map Initialization
  useEffect(() => {
    if (role === 'LOGISTICIAN') {
      loadYandexMaps(async () => {
        const ymaps3 = (window as any).ymaps3;

          const container = document.getElementById('logistician-map');
          if (!container) return;
          container.innerHTML = '';
          const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer } = ymaps3;
          const { YMapDefaultMarker } = await ymaps3.import('@yandex/ymaps3-markers@0.0.1');
          
          const myMap = new YMap(container, {
            location: { center: [103.8198, 1.3521], zoom: 11 } // fallback
          });
          myMap.addChild(new YMapDefaultSchemeLayer());
          myMap.addChild(new YMapDefaultFeaturesLayer());
        });
    }
  }, [role, adminOrders]);

  // Driver Route Map Initialization
  useEffect(() => {
    if (role === 'DRIVER' && logisticsTasks.length > 0) {
      loadYandexMaps(async () => {
        const ymaps3 = (window as any).ymaps3;
        if (!ymaps3) {
          const points = adminOrders.map((o: any) => o.pickupPoint).filter(Boolean);
          (window as any).renderMockMap('logistician-map', points);
          return;
        }
          const container = document.getElementById('driver-route-map');
          if (!container) return;
          container.innerHTML = '';
          const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer } = ymaps3;
          const { YMapDefaultMarker } = await ymaps3.import('@yandex/ymaps3-markers@0.0.1');
          
          const tasks = logisticsTasks.filter(t => t.driverName === driverNameInput && (t.status === 'EN_ROUTE' || t.status === 'PENDING'));
          if (tasks.length === 0) return;

          const centerLat = tasks[0].targetLat;
          const centerLng = tasks[0].targetLng;

          const myMap = new YMap(container, {
            location: { center: [centerLng, centerLat], zoom: 13 }
          });
          myMap.addChild(new YMapDefaultSchemeLayer());
          myMap.addChild(new YMapDefaultFeaturesLayer());

          tasks.forEach((task, idx) => {
            const marker = new YMapDefaultMarker({
              coordinates: [task.targetLng, task.targetLat],
              title: `${idx+1}. ${task.address}`,
              color: task.status === 'EN_ROUTE' ? '#ffc107' : '#9ca3af'
            });
            myMap.addChild(marker);
          });
        });
    }
  }, [role, logisticsTasks, driverNameInput]);

  // Initialize Yandex Maps for order tracking
  useEffect(() => {
    if (clientActiveTab !== 'TRACKING' || !activeOrder) return;
    
    loadYandexMaps(async () => {
      const ymaps3 = (window as any).ymaps3;
      if (!ymaps3) {
        const point = activeOrder.pickupPoint;
        if (point) {
          (window as any).renderMockMap('tracking-map', [point], [point.longitude, point.latitude]);
        }
        return;
      }
      
      const point = activeOrder.pickupPoint;
      const targetLat = point.latitude;
      const targetLng = point.longitude;
      
      let userLat = userCoords?.latitude;
      let userLng = userCoords?.longitude;
      
      if (mapSimulatedCoords) {
        userLat = mapSimulatedCoords.latitude;
        userLng = mapSimulatedCoords.longitude;
      } else if (!userLat || !userLng) {
        // simulated beach location offset
        userLat = targetLat + 0.0025;
        userLng = targetLng + 0.0035;
      }
      

        const mapContainer = document.getElementById('tracking-map');
        if (!mapContainer) return;
        
        mapContainer.innerHTML = '';
        
        const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapListener } = ymaps3;
        const { YMapDefaultMarker } = await ymaps3.import('@yandex/ymaps3-markers@0.0.1');

        const myMap = new YMap(mapContainer, {
          location: {
            center: [targetLng, targetLat],
            zoom: 15
          }
        });
        
        myMap.addChild(new YMapDefaultSchemeLayer());
        myMap.addChild(new YMapDefaultFeaturesLayer());
        
        const pointMarker = new YMapDefaultMarker({
          coordinates: [targetLng, targetLat],
          title: point.name,
          subtitle: activeOrder.slotTime,
          color: '#ff0000'
        });
        myMap.addChild(pointMarker);
        
        const userMarker = new YMapDefaultMarker({
          coordinates: [userLng, userLat],
          title: 'Вы здесь',
          color: '#0000ff'
        });
        myMap.addChild(userMarker);

        const mapListener = new YMapListener({
          layer: 'any',
          onClick: (_object: any, event: any) => {
            if (event?.coordinates) {
              setMapSimulatedCoords({
                latitude: event.coordinates[1],
                longitude: event.coordinates[0]
              });
            }
          }
        });
        myMap.addChild(mapListener);
      });
  }, [clientActiveTab, activeOrder?.id, userCoords, mapSimulatedCoords]);

  // Initialize Yandex Maps for courier active orders
  useEffect(() => {
    if (role !== 'DRIVER') return;
    
    loadYandexMaps(async () => {
      const ymaps3 = (window as any).ymaps3;
      if (!ymaps3) {
        const activeDeliveries = driverOrders.filter((order: any) => 
          order.driverName === driverNameInput && 
          (order.status === 'DELIVERING' || order.status === 'READY')
        );
        const points = activeDeliveries.map((d: any) => d.pickupPoint).filter(Boolean);
        (window as any).renderMockMap('courier-map', points);
        return;
      }

      // Find all active orders assigned to this courier that are DELIVERING or READY
      const activeDeliveries = driverOrders.filter(order => 
        order.driverName === driverNameInput && 
        (order.status === 'DELIVERING' || order.status === 'READY')
      );

      const mapContainer = document.getElementById('courier-map');
      if (!mapContainer) return;

      if (activeDeliveries.length === 0) {
        mapContainer.innerHTML = '<div style="color: var(--text-dim); text-align: center; padding: 90px 0; font-size: 12px;">Нет активных доставок для отображения на карте</div>';
        return;
      }


        const container = document.getElementById('courier-map');
        if (!container) return;
        container.innerHTML = '';

        const points = activeDeliveries.map(d => d.pickupPoint);
        const centerLat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
        const centerLng = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;

        const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer } = ymaps3;
        const { YMapDefaultMarker } = await ymaps3.import('@yandex/ymaps3-markers@0.0.1');

        const myMap = new YMap(container, {
          location: {
            center: [centerLng, centerLat],
            zoom: 14
          }
        });

        myMap.addChild(new YMapDefaultSchemeLayer());
        myMap.addChild(new YMapDefaultFeaturesLayer());

        // Add placemarks for each unique point
        const uniquePoints = Array.from(
          new Map(points.map(p => [p.id, p])).values()
        );

        uniquePoints.forEach(p => {
          const pointOrders = activeDeliveries.filter(d => d.pickupPointId === p.id);
          const orderNums = pointOrders.map(o => `#${o.orderNumber}`).join(', ');
          
          const placemark = new YMapDefaultMarker({
            coordinates: [p.longitude, p.latitude],
            title: p.name,
            subtitle: `Заказы: ${orderNums}`,
            color: '#ffa500'
          });
          myMap.addChild(placemark);
        });
        
        if (userCoords) {
          const driverPlacemark = new YMapDefaultMarker({
            coordinates: [userCoords.longitude, userCoords.latitude],
            title: 'Вы (Курьер)',
            color: '#0000ff'
          });
          myMap.addChild(driverPlacemark);
        }
      });
  }, [role, driverOrders, driverNameInput, userCoords]);

  // Setup SDK and read URL params
  useEffect(() => {
    sdk.ready();
    sdk.expand();

    const initialPointId = sdk.getStartParam();
    // In Telegram/MAX it might come with prefix point_
    const cleanedPointId = initialPointId.replace('point_', '');
    
    if (cleanedPointId) {
      setPointId(cleanedPointId);
    } else {
      // If no point ID (meaning opened directly in browser/admin link), default to list of points
      fetchPoints();
    }

    // Geolocation detection
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn("Geolocation error or permission denied:", error);
        }
      );
    }
  }, []);

  // Automatically select first point as default if none is set on startup
  useEffect(() => {
    if (!pointId && pointsList.length > 0) {
      setPointId(pointsList[0].id);
    }
  }, [pointsList, pointId]);

  // Fetch Pickup Point Info
  useEffect(() => {
    if (pointId) {
      fetch(`${API_BASE}/points/${pointId}`)
        .then(res => {
          if (!res.ok) throw new Error('Point not found');
          return res.json();
        })
        .then(data => {
          setPointInfo(data);
          fetchMenu(pointId);
        })
        .catch(err => {
          console.error(err);
          setErrorMessage('Точка выдачи не найдена. Пожалуйста, проверьте QR-код.');
        });
    }
  }, [pointId]);

  // Fetch Driver/Vendor/Logistician/Hub data on role switch
  useEffect(() => {
    if (role === 'DRIVER') {
      fetchDriverOrders();
      fetchPoints();
      fetchLogisticsTasks();
    } else if (role === 'VENDOR') {
      fetchDriverOrders();
      fetchPoints();
      if (vendorTab === 'STOCK') {
        fetchVendorMenu();
      }
    } else if (role === 'LOGISTICIAN') {
      fetchAdminOrders();
      fetchLogisticsTasks();
      fetchHubs();
    } else if (role === 'HUB') {
      fetchAdminOrders();
    }
  }, [role, vendorTab, vendorDateTab]);

  const fetchHubs = async () => {
    try {
      const res = await fetch(`${API_BASE}/hubs`);
      if (res.ok) {
        const data = await res.json();
        setHubsList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLogisticsTasks = async () => {
    try {
      const res = await fetch(`${API_BASE}/logistics/tasks`);
      const data = await res.json();
      setLogisticsTasks(data);
    } catch (err) {
      console.error(err);
    }
  };

  
  const handleLogisticianCreateTask = async () => {
    if (logisticianSelectedOrders.length === 0) return alert('Выберите хотя бы один заказ');
    if (!logisticianDriverName) return alert('Укажите позывной или номер машины водителя');

    const tasks = logisticianSelectedOrders.map((orderId, i) => {
      const order = adminOrders.find((o: any) => o.id === orderId);
      const isHub = logisticianDeliveryType === 'HUB';
      const targetHub = hubsList[0]; // Use first hub as default sorting center
      
      const targetLat = (isHub && targetHub) ? targetHub.latitude : (order?.pickupPoint?.latitude || 0);
      const targetLng = (isHub && targetHub) ? targetHub.longitude : (order?.pickupPoint?.longitude || 0);
      const address = (isHub && targetHub) ? targetHub.name : (order?.pickupPoint?.name || 'Адрес клиента');
      const taskType = isHub ? 'DROPOFF_HUB' : 'DROPOFF_CLIENT';

      return {
        orderId: orderId,
        type: taskType,
        targetLat,
        targetLng,
        address,
        sortOrder: i
      };
    });

    try {
      const res = await fetch(`${API_BASE}/logistics/tasks/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverName: logisticianDriverName, tasks })
      });
      if (res.ok) {
        alert('Маршрутный лист успешно сформирован!');
        setLogisticianSelectedOrders([]);
        setLogisticianDriverName('');
        fetchAdminOrders();
        fetchLogisticsTasks();
      } else {
        const d = await res.json();
        alert('Ошибка: ' + d.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleHubReceive = async (orderId: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'AT_HUB' })
      });
      if (res.ok) fetchAdminOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  const getDistanceLabel = (dist: number) => {
    if (dist < 1) {
      return `${Math.round(dist * 1000)} м`;
    }
    return `${dist.toFixed(1)} км`;
  };

  const fetchPoints = async () => {
    try {
      const res = await fetch(`${API_BASE}/points`);
      const data = await res.json();
      setPointsList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVendorMenu = async () => {
    try {
      let pid = pointId;
      if (!pid && pointsList.length > 0) {
        pid = pointsList[0].id;
      }
      if (!pid) {
        const resPts = await fetch(`${API_BASE}/points`);
        const pts = await resPts.json();
        setPointsList(pts);
        if (pts.length > 0) {
          pid = pts[0].id;
        }
      }
      if (!pid) return;

      const date = new Date();
      if (vendorDateTab === 'TOMORROW') {
        date.setDate(date.getDate() + 1);
      }
      const dateStr = date.toISOString().split('T')[0];

      const res = await fetch(`${API_BASE}/menu?pointId=${pid}&date=${dateStr}`);
      const data = await res.json();
      setVendorMenu(data);
    } catch (err) {
      console.error("Error fetching kitchen menu:", err);
    }
  };

  const fetchMenu = async (pid: string) => {
    try {
      const date = new Date();
      if (activeTab === 'TOMORROW') {
        date.setDate(date.getDate() + 1);
      }
      const dateStr = date.toISOString().split('T')[0];
      
      const res = await fetch(`${API_BASE}/menu?pointId=${pid}&date=${dateStr}`);
      const data = await res.json();
      setMenu(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Re-fetch menu when client toggles Today/Tomorrow tabs
  useEffect(() => {
    if (pointId) {
      fetchMenu(pointId);
      setCart([]); // Clear cart when switching dates
    }
  }, [activeTab]);

  const fetchDriverOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/orders`);
      const data = await res.json();
      setDriverOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Cart operations
  const addToCart = (item: MenuItem, slotParam?: any) => {
    const slot = slotParam || (selectedTimeSlot 
      ? item.slots.find(s => s.slotStart === selectedTimeSlot.slotStart && s.slotEnd === selectedTimeSlot.slotEnd)
      : null);

    const slotId = slot ? slot.id : 'PENDING';
    const slotTime = slot ? `${slot.slotStart}-${slot.slotEnd}` : 'PENDING';

    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id && c.slotId === slotId);
      
      if (existing) {
        if (slot && existing.quantity >= slot.available) return prev; // Limit to stock only if slot is known
        
        // If pending, limit to the total available across all slots
        if (slotId === 'PENDING') {
          const totalAvail = item.slots.reduce((sum, s) => sum + s.available, 0);
          if (existing.quantity >= totalAvail) return prev;
        }

        return prev.map(c => 
          (c.menuItemId === item.id && c.slotId === slotId) 
            ? { ...c, quantity: c.quantity + 1 } 
            : c
        );
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, unitType: item.unitType, vendorId: item.vendorId, vendorName: item.vendorName, slotTime, slotId }];
    });
  };

  const removeFromCart = (item: MenuItem, slotParam?: any) => {
    const slot = slotParam || (selectedTimeSlot 
      ? item.slots.find(s => s.slotStart === selectedTimeSlot.slotStart && s.slotEnd === selectedTimeSlot.slotEnd)
      : null);

    const slotId = slot ? slot.id : 'PENDING';

    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id && c.slotId === slotId);
      if (!existing) return prev;
      if (existing.quantity === 1) {
        return prev.filter(c => !(c.menuItemId === item.id && c.slotId === slotId));
      }
      return prev.map(c => 
        (c.menuItemId === item.id && c.slotId === slotId) 
          ? { ...c, quantity: c.quantity - 1 } 
          : c
      );
    });
  };

  const getCartQuantity = (itemId: string, slotIdParam?: string) => {
    let slotId = slotIdParam;
    if (!slotId) {
      if (selectedTimeSlot) {
        const matchingItem = menu.find(item => item.id === itemId);
        const slot = matchingItem?.slots.find((s: any) => s.slotStart === selectedTimeSlot.slotStart && s.slotEnd === selectedTimeSlot.slotEnd);
        slotId = slot?.id;
      } else {
        slotId = 'PENDING';
      }
    }
    const item = cart.find(c => c.menuItemId === itemId && c.slotId === slotId);
    return item ? item.quantity : 0;
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  // Dynamic filter based on keyword categories
  const getFilteredMenu = () => {
    let result = selectedCategory === 'ALL' ? menu : menu.filter(item => {
      const name = item.name.toLowerCase();
      const desc = item.description.toLowerCase();
      switch (selectedCategory) {
        case 'HOT': return name.includes('плов') || name.includes('шашлык') || name.includes('куриц') || name.includes('мясо') || name.includes('горяч') || name.includes('картоф') || name.includes('пюре') || desc.includes('плов') || desc.includes('шашлык') || desc.includes('куриц') || desc.includes('мясо') || desc.includes('горяч') || desc.includes('картоф') || desc.includes('пюре');
        case 'BAKERY': return name.includes('пирог') || name.includes('хачапури') || name.includes('булоч') || name.includes('хлеб') || name.includes('выпеч') || name.includes('лаваш') || desc.includes('пирог') || desc.includes('хачапури') || desc.includes('булоч') || desc.includes('хлеб') || desc.includes('выпеч') || desc.includes('лаваш');
        case 'SOUP': return name.includes('суп') || name.includes('окрошка') || name.includes('борщ') || name.includes('солянка') || name.includes('уха') || name.includes('бульон') || desc.includes('суп') || desc.includes('окрошка') || desc.includes('борщ') || desc.includes('солянка') || desc.includes('уха') || desc.includes('бульон');
        case 'DRINK': return name.includes('морс') || name.includes('компот') || name.includes('сок') || name.includes('вода') || name.includes('напит') || name.includes('чай') || name.includes('лимонад') || desc.includes('морс') || desc.includes('компот') || desc.includes('сок') || desc.includes('вода') || desc.includes('напит') || desc.includes('чай') || desc.includes('лимонад');
        default: return true;
      }
    });

    if (clientSort === 'POPULAR') result = [...result].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    else if (clientSort === 'CHEAP') result = [...result].sort((a, b) => a.price - b.price);
    else if (clientSort === 'NEW') result = [...result].reverse(); // mock for new items
    else if (clientSort === 'FAST') result = [...result]; // mock for fast

    return result;
  };

  // Validates cart against slot availability and updates slot mappings simultaneously
  const applySlotToCart = (slot: { slotStart: string; slotEnd: string }) => {
    let hasChanges = false;
    let warningMsg = '';

    const updatedCart = cart.map(cartItem => {
      const menuItem = menu.find(m => m.id === cartItem.menuItemId);
      if (!menuItem) {
        hasChanges = true;
        warningMsg += `Блюдо "${cartItem.name}" удалено, так как его нет в меню.\n`;
        return null;
      }
      
      const itemSlot = menuItem.slots.find((s: any) => s.slotStart === slot.slotStart && s.slotEnd === slot.slotEnd);
      const available = itemSlot ? itemSlot.available : 0;
      
      if (available <= 0) {
        hasChanges = true;
        warningMsg += `Блюдо "${cartItem.name}" раскуплено на выбранный интервал.\n`;
        return null;
      } 
      
      let finalQty = cartItem.quantity;
      if (cartItem.quantity > available) {
        hasChanges = true;
        warningMsg += `Количество "${cartItem.name}" уменьшено до ${available} шт. (доступный лимит).\n`;
        finalQty = available;
      }

      return {
        ...cartItem,
        quantity: finalQty,
        slotId: itemSlot!.id,
        slotTime: `${slot.slotStart}-${slot.slotEnd}`
      };
    }).filter(Boolean) as CartItem[];

    setCart(updatedCart);
    if (hasChanges) {
      setErrorMessage(warningMsg);
    }
  };

  // Submit Order
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setErrorMessage('');

    try {
      const date = new Date();
      if (activeTab === 'TOMORROW') {
        date.setDate(date.getDate() + 1);
      }
      const slotDate = date.toISOString().split('T')[0];

      // Groups items by slot
      const firstCartItem = cart[0];

      const orderBody = {
        messenger: sdk.getMessenger() === 'BROWSER' ? 'TELEGRAM' : sdk.getMessenger(),
        initData: sdk.getInitData(),
        clientName: clientName || sdk.getUser().firstName,
        clientPhone,
        clientComment,
        pickupPointId: pointId,
        slotDate,
        slotTime: firstCartItem.slotTime,
        items: cart.map(c => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
        })),
      };

      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderBody),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      setCreatedOrder(data);
      setActiveOrder(data);
      localStorage.setItem('beach_delivery_active_order', JSON.stringify(data));
      setCart([]);
      setSelectedTimeSlot(null);
      setCheckoutOpen(false);
      setCheckoutStep(1);
      setClientActiveTab('TRACKING');
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const fetchAdminOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/orders`);
      const data = await res.json();
      setAdminOrders(data);
    } catch (err) {
      console.error("Failed to fetch admin orders:", err);
    }
  };

  const startEditingOrder = async (order: any) => {
    await fetchMenu(order.pickupPointId);
    setAdminEditingOrder(JSON.parse(JSON.stringify(order)));
  };

  const handleDriverTakeOrder = async (orderId: string) => {
    try {
      // Assign courier name
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/courier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverName: driverNameInput }),
      });
      if (res.ok) {
        fetchDriverOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Courier: update status
  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    const statusSequence = ['PENDING', 'PREPARING', 'READY_TO_SHIP', 'DELIVERING', 'READY', 'COMPLETED'];
    const currentIdx = statusSequence.indexOf(currentStatus);
    if (currentIdx === -1 || currentIdx === statusSequence.length - 1) return;
    
    const nextStatus = statusSequence[currentIdx + 1];

    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchDriverOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Courier: create new pickup point
  const handleCreatePoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPointName) return;

    try {
      const res = await fetch(`${API_BASE}/admin/points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPointName,
          latitude: parseFloat(newPointLat),
          longitude: parseFloat(newPointLng),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPointCreatedData(data);
        setNewPointName('');
        fetchPoints();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Kitchen: update stock limit
  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStockSlot) return;

    try {
      const date = new Date();
      if (vendorDateTab === 'TOMORROW') {
        date.setDate(date.getDate() + 1);
      }
      const dateStr = date.toISOString().split('T')[0];

      const res = await fetch(`${API_BASE}/admin/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuItemId: editingStockSlot.menuItemId,
          date: dateStr,
          slotStart: editingStockSlot.slotStart,
          slotEnd: editingStockSlot.slotEnd,
          totalCount: newStockTotal
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update stock');
      }

      fetchVendorMenu();
      setEditingStockSlot(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Новый';
      case 'PREPARING': return 'Собирается';
      case 'READY_TO_SHIP': return 'Готов к отправке';
      case 'DELIVERING': return 'В пути';
      case 'READY': return 'Ожидает на точке';
      case 'COMPLETED': return 'Выдан';
      default: return status;
    }
  };



  return (
    <div className="app-container" style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', padding: '16px', position: 'relative' }}>
      
      {/* Banner / Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Coffee style={{ color: '#ff7e40' }} />
          <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px' }}>Домашняя Кухня</span>
        </div>
        
        {/* Messenger detection badge & Theme Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="interactive"
            style={{ 
              padding: '6px 8px', 
              fontSize: '11px', 
              borderRadius: '8px', 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid var(--border-light)', 
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontWeight: '600'
            }}
            onClick={() => {
              const nextTheme = theme === 'dark' ? 'light' : 'dark';
              setTheme(nextTheme);
              localStorage.setItem('beach_delivery_theme', nextTheme);
            }}
          >
            {theme === 'dark' ? '☀️ День' : '🌙 Ночь'}
          </button>

          {sdk.getMessenger() === 'TELEGRAM' && <span className="badge badge-tg">Telegram</span>}
          {sdk.getMessenger() === 'MAX' && <span className="badge badge-max">MAX</span>}
          {sdk.getMessenger() === 'BROWSER' && (
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-light)', overflowX: 'auto', scrollbarWidth: 'none' }}>
              <button 
                className="interactive"
                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', background: role === 'CLIENT' ? '#ff7e40' : 'transparent', color: role === 'CLIENT' ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: '700', whiteSpace: 'nowrap' }}
                onClick={() => setRole('CLIENT')}
              >Покупатель</button>
              <button 
                className="interactive"
                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', background: role === 'DRIVER' ? '#ff7e40' : 'transparent', color: role === 'DRIVER' ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: '700', whiteSpace: 'nowrap' }}
                onClick={() => setRole('DRIVER')}
              >Водитель</button>
              <button 
                className="interactive"
                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', background: role === 'VENDOR' ? '#ff7e40' : 'transparent', color: role === 'VENDOR' ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: '700', whiteSpace: 'nowrap' }}
                onClick={() => setRole('VENDOR')}
              >Вендор</button>
              <button 
                className="interactive"
                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', background: role === 'LOGISTICIAN' ? '#ff7e40' : 'transparent', color: role === 'LOGISTICIAN' ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: '700', whiteSpace: 'nowrap' }}
                onClick={() => { setRole('LOGISTICIAN'); fetchAdminOrders(); fetchLogisticsTasks(); }}
              >Логист</button>
              <button 
                className="interactive"
                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', background: role === 'HUB' ? '#ff7e40' : 'transparent', color: role === 'HUB' ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: '700', whiteSpace: 'nowrap' }}
                onClick={() => { setRole('HUB'); fetchAdminOrders(); }}
              >Хаб</button>
              <button 
                className="interactive"
                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', background: role === 'SMM_ADMIN' ? '#ff7e40' : 'transparent', color: role === 'SMM_ADMIN' ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: '700', whiteSpace: 'nowrap' }}
                onClick={() => { setRole('SMM_ADMIN'); fetchAdminOrders(); }}
              >SMM/Диспетчер</button>
            </div>
          )}
        </div>
      </header>

      {errorMessage && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '12px', color: '#f87171', display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <AlertCircle style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '13px' }}>{errorMessage}</span>
        </div>
      )}

      {/* CLIENT FLOW */}
      {/* CLIENT FLOW */}
      {role === 'CLIENT' && (
        <div>
          {/* Case 1: Point Info Loaded */}
          {pointInfo ? (
            <div>
              {/* Tab Selector for Client */}
              <div className="tabs-container" style={{ marginBottom: '16px' }}>
                <button 
                  className={`tab-btn ${clientActiveTab === 'MENU' ? 'active' : ''}`}
                  onClick={() => setClientActiveTab('MENU')}
                >
                  <ShoppingBag size={14} style={{ marginRight: '6px', display: 'inline' }} />
                  Выбор меню
                </button>
                {activeOrder && (
                  <button 
                    className={`tab-btn ${clientActiveTab === 'TRACKING' ? 'active' : ''}`}
                    onClick={() => setClientActiveTab('TRACKING')}
                  >
                    <MapIcon size={14} style={{ marginRight: '6px', display: 'inline' }} />
                    Отслеживание #{activeOrder.orderNumber}
                  </button>
                )}
                <button 
                  className={`tab-btn ${clientActiveTab === 'PROFILE' ? 'active' : ''}`}
                  onClick={() => {
                    setClientActiveTab('PROFILE');
                    fetchAdminOrders(); // fetch all orders so we can filter history
                  }}
                >
                  <User size={14} style={{ marginRight: '6px', display: 'inline' }} />
                  Кабинет
                </button>
              </div>

              {/* Client Views */}
              {clientActiveTab === 'TRACKING' && activeOrder && (
                <div className="glass-panel" style={{ borderRadius: '20px', padding: '20px', textAlign: 'left', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Статус Заказа #{activeOrder.orderNumber}</h3>
                    <span className={`badge-status status-${activeOrder.status.toLowerCase()}`}>
                      {getStatusLabel(activeOrder.status)}
                    </span>
                  </div>

                  {/* Timeline Progress */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', margin: '24px 0', padding: '0 10px' }}>
                    {/* Background Line */}
                    <div style={{ position: 'absolute', top: '10px', left: '20px', right: '20px', height: '3px', background: 'rgba(255,255,255,0.06)', zIndex: 1 }} />
                    
                    {/* Active Fill Line */}
                    {(() => {
                      const statuses = ['PENDING', 'PREPARING', 'READY_TO_SHIP', 'DELIVERING', 'READY', 'COMPLETED'];
                      const currentIdx = statuses.indexOf(activeOrder.status);
                      let val = 0;
                      if (currentIdx === 1 || currentIdx === 2) val = 1;
                      else if (currentIdx === 3) val = 2;
                      else if (currentIdx === 4) val = 3;
                      else if (currentIdx === 5) val = 4;
                      
                      const percent = val === 0 ? 0 : (val / 4) * 100;
                      return (
                        <div style={{ position: 'absolute', top: '10px', left: '20px', width: `calc(${percent}% - 40px)`, height: '3px', background: '#ff7e40', zIndex: 2, transition: 'width 0.4s ease' }} />
                      );
                    })()}

                    {['Принят', 'Готовится', 'В пути', 'На точке', 'Выдан'].map((lbl, idx) => {
                      const statuses = ['PENDING', 'PREPARING', 'READY_TO_SHIP', 'DELIVERING', 'READY', 'COMPLETED'];
                      const currentIdx = statuses.indexOf(activeOrder.status);
                      
                      let mappedIdx = 0;
                      if (currentIdx === 1 || currentIdx === 2) mappedIdx = 1;
                      else if (currentIdx === 3) mappedIdx = 2;
                      else if (currentIdx === 4) mappedIdx = 3;
                      else if (currentIdx === 5) mappedIdx = 4;
                      
                      const isPast = idx <= mappedIdx;
                      const isCurrent = idx === mappedIdx;
                      
                      return (
                        <div key={lbl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 3 }}>
                          <div style={{ 
                            width: '22px', 
                            height: '22px', 
                            borderRadius: '50%', 
                            background: isCurrent ? '#ff7e40' : isPast ? '#ff7e40' : 'var(--bg-card)', 
                            border: isCurrent ? '4px solid rgba(255,126,64,0.3)' : '2px solid var(--border-light)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                            transition: 'all 0.3s'
                          }}>
                            {isPast && !isCurrent && <Check size={10} style={{ color: 'white' }} />}
                          </div>
                          <span style={{ fontSize: '10px', color: isCurrent ? '#ff7e40' : 'var(--text-muted)', fontWeight: isCurrent ? '700' : '500', marginTop: '6px' }}>{lbl}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Delivery Information Box */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
                    <div style={{ marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Место выдачи:</span> <strong>{activeOrder.pickupPoint.name}</strong>
                    </div>
                    <div style={{ marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Временной слот:</span> <strong style={{ color: '#ff7e40' }}>{activeOrder.slotTime}</strong>
                    </div>
                    {activeOrder.driverName && (
                      <div style={{ marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Ваш водитель:</span> <strong style={{ color: '#ff7e40' }}>{activeOrder.driverName}</strong>
                      </div>
                    )}
                    {activeOrder.clientComment && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Ваш ориентир:</span> <span style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>{activeOrder.clientComment}</span>
                      </div>
                    )}
                  </div>

                  {/* Map Container */}
                  <div className="glass-panel" style={{ padding: '10px', borderRadius: '14px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapIcon size={14} style={{ color: '#ff7e40' }} /> Карта пешего маршрута
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Кликните на карту для симуляции GPS</span>
                    </div>
                    
                    <div id="tracking-map" style={{ width: '100%', height: '220px', borderRadius: '10px', overflow: 'hidden', background: 'rgba(0,0,0,0.1)' }}></div>
                  </div>

                  {/* Customer-to-Admin Support Chat */}
                  <div className="glass-panel" style={{ padding: '16px', borderRadius: '14px', marginBottom: '16px', border: '1px solid rgba(255,126,64,0.15)' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '800', margin: '0 0 10px 0', color: '#ff7e40', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💬</span> Чат с Администратором / Диспетчером
                    </h4>
                    
                    {/* Message list */}
                    <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', paddingRight: '4px' }}>
                      {chatMessages.length === 0 ? (
                        <p style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', margin: '10px 0' }}>Сообщений пока нет. Вы можете написать администратору, чтобы изменить заказ.</p>
                      ) : (
                        chatMessages.map((m: any) => {
                          const isClient = m.sender === 'CLIENT';
                          return (
                            <div 
                              key={m.id} 
                              style={{ 
                                alignSelf: isClient ? 'flex-end' : 'flex-start',
                                background: isClient ? '#ff7e40' : 'rgba(255,255,255,0.06)',
                                color: isClient ? 'white' : 'var(--text-main)',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                borderTopRightRadius: isClient ? '2px' : '12px',
                                borderTopLeftRadius: isClient ? '12px' : '2px',
                                maxWidth: '80%',
                                fontSize: '12px',
                                wordBreak: 'break-word',
                                textAlign: 'left'
                              }}
                            >
                              <div>{m.text}</div>
                              <div style={{ fontSize: '9px', color: isClient ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    {/* Chat Input Form */}
                    <form onSubmit={handleSendClientMessage} style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
                        placeholder="Напишите сообщение..."
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                      />
                      <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                        Отправить
                      </button>
                    </form>

                    {/* Simulated In-App Call Button */}
                    <button 
                      type="button"
                      className="btn-secondary"
                      style={{ width: '100%', padding: '8px 12px', fontSize: '11px', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      onClick={() => setCallSimulation({ isOpen: true, name: 'Администрация кухни', phone: '+7 (800) 555-35-35', roleName: 'Администратор' })}
                    >
                      <Phone size={12} /> Позвонить диспетчеру (in-app Call)
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      className="btn-secondary" 
                      style={{ flex: 1, padding: '10px', fontSize: '12px' }}
                      onClick={() => {
                        localStorage.removeItem('beach_delivery_active_order');
                        setActiveOrder(null);
                        setClientActiveTab('MENU');
                      }}
                    >
                      <Trash size={12} style={{ marginRight: '6px', display: 'inline' }} />
                      Сбросить заказ
                    </button>
                    <button 
                      className="btn-primary" 
                      style={{ flex: 1, padding: '10px', fontSize: '12px' }}
                      onClick={() => setClientActiveTab('MENU')}
                    >
                      Назад к меню
                    </button>
                  </div>
                </div>
              )}

              {clientActiveTab === 'MENU' && (
                <div>
                  {/* Welcoming Top Info Bar */}
                  <div 
                    className="glass-panel" 
                    style={{ 
                      borderRadius: '16px', 
                      padding: '12px 16px', 
                      marginBottom: '20px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      border: '1px solid rgba(255, 126, 64, 0.2)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>
                        🌾 Маркетплейс фермерских продуктов
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '700', display: 'block', margin: '2px 0' }}>
                        Выбирайте вкусные блюда прямо сейчас!
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>
                        Точку выдачи и время доставки выберем при оформлении заказа.
                      </span>
                    </div>
                  </div>

                  {/* Special Offers Section */}
                  {(() => {
                    const promos = [
                      {
                        id: 'promo_combo_1',
                        title: '📦 Фермерский Комбо-Набор',
                        description: 'Сытный плов + освежающий морс + хачапури.',
                        price: 650,
                        oldPrice: 750,
                        badge: 'Выгодно',
                        action: () => {
                          const plov = menu.find(m => m.name.includes('Плов'));
                          const mors = menu.find(m => m.name.includes('Морс'));
                          const khachapuri = menu.find(m => m.name.includes('Хачапури'));
                          if (plov) addToCart(plov);
                          if (mors) addToCart(mors);
                          if (khachapuri) addToCart(khachapuri);
                        }
                      },
                      {
                        id: 'promo_dish_day',
                        title: '⭐ Блюдо Дня: Окрошка',
                        description: 'Свежая прохладная окрошка на домашнем квасе со скидкой 15%!',
                        price: 187,
                        oldPrice: 220,
                        badge: '-15%',
                        action: () => {
                          const okroshka = menu.find(m => m.name.includes('Окрошка'));
                          if (okroshka) addToCart(okroshka);
                        }
                      }
                    ];

                    return (
                      <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left' }}>
                          <span>🎁</span> Акции и Спецпредложения
                        </h3>
                        <div className="promo-scroll" style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                          {promos.map(p => (
                            <div key={p.id} className="glass-panel" style={{ flexShrink: 0, width: '250px', padding: '14px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(135deg, rgba(255,126,64,0.05) 0%, rgba(255,255,255,0.01) 100%)', textAlign: 'left' }}>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                  <span style={{ fontSize: '10px', background: '#ff7e40', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: '800' }}>{p.badge}</span>
                                </div>
                                <h4 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 4px 0' }}>{p.title}</h4>
                                <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '0 0 12px 0', lineHeight: '1.3' }}>{p.description}</p>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                                <div>
                                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#ff7e40' }}>{p.price} ₽</span>
                                  <span style={{ fontSize: '11px', textDecoration: 'line-through', color: 'var(--text-muted)', marginLeft: '6px' }}>{p.oldPrice} ₽</span>
                                </div>
                                <button 
                                  className="btn-primary" 
                                  style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '10px' }}
                                  onClick={p.action}
                                >
                                  Добавить
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  
                  {/* SMM Stories Block */}
                  <div style={{ marginBottom: '24px' }}>
                    <div className="stories-scroll" style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                      {storiesList.map(story => (
                        <div 
                          key={story.id} 
                          onClick={() => setActiveStory(story)}
                          style={{ 
                            minWidth: '115px', height: '165px', borderRadius: '16px', 
                            background: `url(${story.img}) center/cover no-repeat`, 
                            border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', 
                            justifyContent: 'space-between', padding: '12px', position: 'relative', overflow: 'hidden',
                            cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                            transition: 'transform 0.2s'
                          }}
                          className="story-card-interactive"
                        >
                          <div style={{ 
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.85) 100%)', 
                            zIndex: 0 
                          }}></div>
                          
                          <span style={{ 
                            fontSize: '9px', fontWeight: '800', background: story.color, color: '#fff', 
                            padding: '2px 6px', borderRadius: '8px', alignSelf: 'flex-start', 
                            textTransform: 'uppercase', zIndex: 1, boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                          }}>
                            {story.tag}
                          </span>
                          
                          <span style={{ 
                            fontSize: '11px', fontWeight: '700', lineHeight: '1.3', color: '#fff', zIndex: 1,
                            textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                          }}>
                            {story.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Horizontal Scroll Category Pills */}
                  <div className="category-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px', scrollbarWidth: 'none' }}>
                    {[
                      { id: 'ALL', label: 'Все' },
                      { id: 'HOT', label: '🔥 Горячее' },
                      { id: 'BAKERY', label: '🍕 Выпечка' },
                      { id: 'SOUP', label: '🥣 Супы' },
                      { id: 'DRINK', label: '🍹 Напитки' }
                    ].map(cat => (
                      <button 
                        key={cat.id}
                        className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat.id as any)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '20px',
                          border: '1px solid var(--border-light)',
                          background: selectedCategory === cat.id ? '#ff7e40' : 'rgba(255,255,255,0.05)',
                          color: selectedCategory === cat.id ? 'white' : 'var(--text-main)',
                          fontWeight: '600',
                          fontSize: '12px',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  
                  {/* Filters (Sort) */}
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '12px' }}>
                    {['POPULAR', 'NEW', 'CHEAP', 'FAST'].map(sort => {
                      const labels: any = { POPULAR: '🔥 Популярное', NEW: '✨ Новинки', CHEAP: '💰 Дешевле', FAST: '⚡ Быстрее' };
                      return (
                        <button
                          key={sort}
                          onClick={() => setClientSort(sort)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-light)',
                            background: clientSort === sort ? 'rgba(255,126,64,0.1)' : 'transparent',
                            color: clientSort === sort ? '#ff7e40' : 'var(--text-dim)',
                            fontSize: '11px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer'
                          }}
                        >
                          {labels[sort]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Menu Items List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '80px' }}>
                    {(() => {
                      const filtered = getFilteredMenu();
                      if (filtered.length === 0) {
                        return <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px 0' }}>На выбранную дату блюд нет.</p>;
                      }
                      
                      const groupedByVendor = filtered.reduce((acc, item) => {
                        const vName = item.vendorName || 'Неизвестный продавец';
                        if (!acc[vName]) acc[vName] = { vendorType: item.vendorType, vendorRating: item.vendorRating, items: [] };
                        acc[vName].items.push(item);
                        return acc;
                      }, {} as Record<string, {vendorType?: string, vendorRating?: number, items: typeof filtered}>);
                      
                      return Object.entries(groupedByVendor).map(([vName, vData]: [string, any]) => (
                        <div key={vName} style={{ marginBottom: '24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '0 4px' }}>
                            <div>
                              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'white' }}>{vName}</h3>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>{vData.vendorType || 'Фермер'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ffc107', fontSize: '13px', fontWeight: '700' }}>
                              <Star size={14} fill="#ffc107" /> {vData.vendorRating || '5.0'}
                            </div>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                            {vData.items.map((item: any) => {
                              const available = item.slots.reduce((sum: number, s: any) => sum + s.available, 0);
                              const count = getCartQuantity(item.id);

                              return (
                                <div key={item.id} className="food-card" style={{ flexDirection: 'column', gap: '8px', alignItems: 'stretch', textAlign: 'left', padding: '12px' }}>
                                  {item.imageUrl && (
                                    <div style={{ position: 'relative', width: '100%', height: '120px', flexShrink: 0 }}>
                                      <img 
                                        src={item.imageUrl} 
                                        alt={item.name} 
                                        style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border-light)' }} 
                                      />
                                      {item.weight && (
                                        <span 
                                          style={{ 
                                            position: 'absolute', 
                                            bottom: '4px', 
                                            right: '4px', 
                                            background: 'rgba(0,0,0,0.6)', 
                                            color: 'white', 
                                            fontSize: '9px', 
                                            padding: '2px 4px', 
                                            borderRadius: '4px',
                                            fontWeight: '600'
                                          }}
                                        >
                                          {item.weight}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '4px' }}>
                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h4 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>{item.name}</h4>
                                        <span style={{ fontWeight: '800', color: '#ff7e40', fontSize: '14px', whiteSpace: 'nowrap' }}>{item.price} ₽</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#f43f5e', fontSize: '10px', fontWeight: '700' }}>
                                          <Heart size={10} fill="#f43f5e" /> {item.likesCount || 0}
                                        </div>
                                        <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>• {item.unitType || 'порция'}</span>
                                      </div>
                                      <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                        {item.description}
                                      </p>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                      <button 
                                        className="interactive"
                                        style={{ background: 'transparent', border: 'none', color: '#ff7e40', fontSize: '11px', fontWeight: '700', cursor: 'pointer', padding: '4px 0' }}
                                        onClick={() => setActiveDetailsItem(item)}
                                      >
                                        Подробнее...
                                      </button>

                                      {available > 0 ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          {count > 0 ? (
                                            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', border: '1px solid var(--border-light)' }}>
                                              <button 
                                                className="interactive"
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '4px 8px', cursor: 'pointer' }}
                                                onClick={() => removeFromCart(item)}
                                              >
                                                <Minus size={10} />
                                              </button>
                                              <span style={{ fontSize: '12px', fontWeight: '700', minWidth: '14px', textAlign: 'center' }}>{count}</span>
                                              <button 
                                                className="interactive"
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '4px 8px', cursor: 'pointer' }}
                                                onClick={() => addToCart(item)}
                                                disabled={count >= available}
                                              >
                                                <Plus size={10} />
                                              </button>
                                            </div>
                                          ) : (
                                            <button 
                                              className="btn-primary" 
                                              style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '14px' }}
                                              onClick={() => addToCart(item)}
                                            >
                                              В корзину
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>Раскупили</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Floating Bottom Cart Bar */}
                  {cart.length > 0 && (
                    <div className="glass-panel" style={{ position: 'fixed', bottom: '16px', left: '16px', right: '16px', maxWidth: '448px', margin: '0 auto', borderRadius: '16px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 }}>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', textAlign: 'left' }}>Итого к оплате:</span>
                        <span style={{ fontSize: '20px', fontWeight: '800', color: '#ff7e40' }}>{getCartTotal()} ₽</span>
                      </div>
                      <button className="btn-primary" style={{ padding: '12px 24px' }} onClick={() => { setCheckoutStep(1); setCheckoutOpen(true); }}>
                        Оформить <ShoppingBag size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {clientActiveTab === 'PROFILE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Profile Edit Panel */}
                  <div className="glass-panel" style={{ borderRadius: '20px', padding: '20px', textAlign: 'left' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '14px', color: '#ff7e40', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={18} style={{ color: '#ff7e40' }} /> Личные данные покупателя
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Ваше имя</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={clientName}
                          onChange={e => {
                            setClientName(e.target.value);
                            localStorage.setItem('beach_delivery_client_name', e.target.value);
                          }}
                          placeholder="Имя"
                        />
                      </div>
                      
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Телефон</label>
                        <input 
                          type="tel" 
                          className="form-input" 
                          value={clientPhone}
                          onChange={e => {
                            setClientPhone(e.target.value);
                            localStorage.setItem('beach_delivery_client_phone', e.target.value);
                          }}
                          placeholder="+7 (999) 000-00-00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Orders History Panel */}
                  <div className="glass-panel" style={{ borderRadius: '20px', padding: '20px', textAlign: 'left', marginBottom: '80px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '14px', color: '#ff7e40' }}>
                      📜 История ваших заказов
                    </h3>
                    
                    {(() => {
                      const userOrders = adminOrders.filter(o => o.clientPhone === clientPhone && clientPhone);
                      if (userOrders.length === 0) {
                        return (
                          <p style={{ color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                            {clientPhone ? 'У вас пока нет оформленных заказов на этот номер.' : 'Введите номер телефона выше, чтобы увидеть историю заказов.'}
                          </p>
                        );
                      }
                      
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {userOrders.map(o => (
                            <div key={o.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontWeight: '700', fontSize: '13px' }}>Заказ #{o.orderNumber}</span>
                                <span className={`badge-status status-${o.status.toLowerCase()}`} style={{ fontSize: '10px' }}>
                                  {getStatusLabel(o.status)}
                                </span>
                              </div>
                              
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                Точка: {o.pickupPoint.name}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                Время: {o.slotTime} ({new Date(o.slotDate).toLocaleDateString()})
                              </div>
                              
                              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
                                {o.items.map((it: any) => (
                                  <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{it.menuItem?.name}</span>
                                    <span>x{it.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Case 2: No Point Loaded (Browser test welcome view) */
            <div className="glass-panel" style={{ borderRadius: '24px', padding: '24px', textAlign: 'center', marginTop: '20px' }}>
              <Coffee size={48} style={{ color: '#ff7e40', margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Добро пожаловать!</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
                Вы открыли приложение в браузере. Выберите точку выдачи, чтобы войти в меню покупателя, или воспользуйтесь панелью управления.
              </p>
              
              <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} style={{ color: '#ff7e40' }} />
                  {userCoords ? 'Ближайшие точки выдачи' : 'Доступные точки выдачи'}
                </h3>
                
                
                        <div id="checkout-points-map" style={{ width: '100%', height: '250px', borderRadius: '12px', background: 'rgba(0,0,0,0.1)', marginBottom: '16px' }}></div>

                      {pointsList.length === 0 ? (
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-light)', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '12px' }}>Точки выдачи пока не зарегистрированы.</p>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '8px 16px', fontSize: '12px' }}
                      onClick={() => setRole('DRIVER')}
                    >
                      Создать первую точку
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                    {[...pointsList]
                      .map(pt => {
                        const dist = userCoords 
                          ? calculateDistance(userCoords.latitude, userCoords.longitude, pt.latitude, pt.longitude)
                          : null;
                        return { ...pt, dist };
                      })
                      .sort((a, b) => {
                        if (a.dist !== null && b.dist !== null) return a.dist - b.dist;
                        return 0;
                      })
                      .map((pt, idx) => (
                        <div 
                          key={pt.id} 
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '12px', 
                            background: idx === 0 && userCoords ? 'rgba(255, 126, 64, 0.08)' : 'rgba(255,255,255,0.03)', 
                            border: idx === 0 && userCoords ? '1px solid rgba(255, 126, 64, 0.4)' : '1px solid var(--border-light)', 
                            borderRadius: '12px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ textAlign: 'left' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'white', display: 'block' }}>
                              {pt.name}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {pt.dist !== null ? `📍 ${getDistanceLabel(pt.dist)} от вас` : 'Координаты зафиксированы'}
                              {idx === 0 && userCoords && <span style={{ color: '#ff7e40', marginLeft: '6px', fontWeight: '700' }}>(Рекомендуемая)</span>}
                            </span>
                          </div>
                          <button 
                            className="btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}
                            onClick={() => {
                              setErrorMessage('');
                              setPointId(pt.id);
                            }}
                          >
                            Выбрать
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button 
                  className="btn-secondary" 
                  style={{ padding: '12px' }}
                  onClick={() => setRole('DRIVER')}
                >
                  Панель управления курьера
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ITEM DETAILS PREVIEW */}
      {activeDetailsItem && (() => {
        const available = selectedTimeSlot 
          ? (activeDetailsItem.slots.find((s: any) => s.slotStart === selectedTimeSlot.slotStart && s.slotEnd === selectedTimeSlot.slotEnd)?.available || 0)
          : Math.max(0, ...activeDetailsItem.slots.map((s: any) => s.available));
        const count = getCartQuantity(activeDetailsItem.id);

        return (
          <div className="modal-overlay" onClick={() => setActiveDetailsItem(null)}>
            <div className="modal-content glass-panel" style={{ padding: 0, overflow: 'hidden', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
              {activeDetailsItem.imageUrl && (
                <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                  <img 
                    src={activeDetailsItem.imageUrl} 
                    alt={activeDetailsItem.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  <button
                    className="interactive"
                    style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}
                    onClick={() => setActiveDetailsItem(null)}
                  >
                    ×
                  </button>
                </div>
              )}
              
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>{activeDetailsItem.name}</h3>
                  <span style={{ fontSize: '18px', fontWeight: '900', color: '#ff7e40' }}>{activeDetailsItem.price} ₽</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                  {activeDetailsItem.weight && <span style={{ background: 'rgba(255,255,255,0.06)', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}>Вес: {activeDetailsItem.weight}</span>}
                  <span style={{ background: 'rgba(255,255,255,0.06)', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', color: available > 0 ? '#34d399' : '#f87171' }}>
                    {available > 0 ? `В наличии: ${available} шт.` : 'Раскупили'}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.4' }}>
                  {activeDetailsItem.description}
                </div>

                {activeDetailsItem.ingredients && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '10px', fontSize: '12px' }}>
                    <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Состав:</strong>
                    <span style={{ color: 'var(--text-main)' }}>{activeDetailsItem.ingredients}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button 
                    className="btn-secondary" 
                    style={{ flex: 1, padding: '12px' }} 
                    onClick={() => setActiveDetailsItem(null)}
                  >
                    Назад к меню
                  </button>
                  
                  {available > 0 ? (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'stretch' }}>
                      {count > 0 ? (
                        <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                          <button 
                            className="interactive"
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '12px 18px', cursor: 'pointer', fontSize: '16px' }}
                            onClick={() => removeFromCart(activeDetailsItem)}
                          >
                            <Minus size={14} />
                          </button>
                          <span style={{ fontSize: '14px', fontWeight: '700' }}>{count}</span>
                          <button 
                            className="interactive"
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '12px 18px', cursor: 'pointer', fontSize: '16px' }}
                            onClick={() => addToCart(activeDetailsItem)}
                            disabled={count >= available}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          className="btn-primary" 
                          style={{ flex: 1, padding: '12px' }}
                          onClick={() => addToCart(activeDetailsItem)}
                        >
                          В корзину
                        </button>
                      )}
                    </div>
                  ) : (
                    <button className="btn-secondary" style={{ flex: 1, padding: '12px', cursor: 'not-allowed', opacity: 0.6 }} disabled>
                      Нет в наличии
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

            {/* DRIVER FLOW */}
      {role === 'DRIVER' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ borderRadius: '20px', padding: '20px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '16px', color: '#ff7e40' }}>Панель Водителя</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ваш позывной / номер машины:</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Газель #12" 
                value={driverNameInput}
                onChange={e => setDriverNameInput(e.target.value)}
              />
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>Мой Маршрутный Лист</h3>
            <div id="driver-route-map" style={{ width: '100%', height: '220px', borderRadius: '12px', background: 'rgba(0,0,0,0.15)', marginBottom: '16px' }}></div>
            <div id="courier-map" style={{ width: '100%', height: '220px', borderRadius: '12px', background: 'rgba(0,0,0,0.15)', marginBottom: '16px' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {logisticsTasks.filter(t => t.driverName === driverNameInput).length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Задач пока нет. Ожидайте назначения логистом.</p>
              ) : (
                logisticsTasks.filter(t => t.driverName === driverNameInput).map(task => (
                  <div key={task.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: task.status === 'COMPLETED' ? '1px solid #4caf50' : '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '700', fontSize: '14px' }}>Точка: {task.address}</span>
                      <span style={{ fontSize: '11px', color: task.status === 'COMPLETED' ? '#4caf50' : '#ffc107', fontWeight: '700' }}>{task.status}</span>
                    </div>
                    {task.order && (
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                        Заказ #{task.order.orderNumber} • Клиент: {task.order.clientName}
                      </div>
                    )}
                    
                    {task.status === 'PENDING' && (
                      <button 
                        className="btn-primary" 
                        style={{ width: '100%', padding: '10px', fontSize: '12px' }}
                        onClick={async () => {
                          await fetch(`${API_BASE}/logistics/tasks/${task.id}/status`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({status: 'EN_ROUTE'})});
                          fetchLogisticsTasks();
                        }}
                      >Взять в работу (Еду)</button>
                    )}
                    {task.status === 'EN_ROUTE' && (
                      <button 
                        className="btn-primary" 
                        style={{ width: '100%', padding: '10px', fontSize: '12px', background: '#ff9800', color: '#fff' }}
                        onClick={async () => {
                          await fetch(`${API_BASE}/logistics/tasks/${task.id}/status`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({status: 'ARRIVED'})});
                          fetchLogisticsTasks();
                        }}
                      >📍 Я на месте (Жду клиента)</button>
                    )}
                    {task.status === 'ARRIVED' && (
                      <button 
                        className="btn-primary" 
                        style={{ width: '100%', padding: '10px', fontSize: '12px', background: '#4caf50', color: '#fff' }}
                        onClick={async () => {
                          await fetch(`${API_BASE}/logistics/tasks/${task.id}/status`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({status: 'COMPLETED'})});
                          fetchLogisticsTasks();
                        }}
                      >✅ Выдал заказ (Завершить)</button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VENDOR FLOW */}
      {role === 'VENDOR' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Tabs for active orders and stock management */}
          <div className="tabs-container">
            <button 
              className={`tab-btn ${vendorTab === 'ORDERS' ? 'active' : ''}`}
              onClick={() => setVendorTab('ORDERS')}
            >
              <ChefHat size={14} style={{ marginRight: '6px', display: 'inline' }} />
              Заказы для кухни
            </button>
            <button 
              className={`tab-btn ${vendorTab === 'STOCK' ? 'active' : ''}`}
              onClick={() => {
                setVendorTab('STOCK');
                fetchVendorMenu();
              }}
            >
              <Sliders size={14} style={{ marginRight: '6px', display: 'inline' }} />
              Лимиты порций
            </button>
          </div>

          {vendorTab === 'ORDERS' && (
            <div className="glass-panel" style={{ borderRadius: '20px', padding: '20px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChefHat size={18} style={{ color: '#ff7e40' }} /> Очередь готовки
              </h2>
              
              {driverOrders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING').length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                  Нет заказов, требующих приготовления на кухне.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {driverOrders
                    .filter(o => o.status === 'PENDING' || o.status === 'PREPARING')
                    .map(order => (
                      <div key={order.id} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span className="badge badge-order-num">Заказ #{order.orderNumber}</span>
                          <span className={`badge-status status-${order.status.toLowerCase()}`}>{getStatusLabel(order.status)}</span>
                        </div>

                        <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Клиент: </span>
                          <span style={{ fontWeight: '600' }}>{order.clientName} ({order.clientPhone})</span>
                        </div>

                        <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Точка: </span>
                          <span style={{ fontWeight: '600' }}>{order.pickupPoint?.name || 'Не указана'}</span>
                        </div>

                        <div style={{ fontSize: '13px', marginBottom: '10px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Слот доставки: </span>
                          <span style={{ fontWeight: '600', color: '#ff7e40' }}>
                            {new Date(order.slotDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} ({order.slotTime})
                          </span>
                        </div>

                        {order.clientComment && (
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', color: '#ffd54f', marginBottom: '12px', borderLeft: '3px solid #ffd54f' }}>
                            <strong>Ориентир:</strong> {order.clientComment}
                          </div>
                        )}

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginBottom: '14px' }}>
                          <p style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600' }}>Блюда:</p>
                          {order.items.map((item: any) => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                              <span>{item.menuItem?.name}</span>
                              <span style={{ fontWeight: '700' }}>x{item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        <button 
                          className="btn-primary" 
                          style={{ padding: '8px', width: '100%', fontSize: '12px' }}
                          onClick={() => handleUpdateStatus(order.id, order.status)}
                        >
                          {order.status === 'PENDING' ? 'Начать готовить' : 'Готово, передать доставке'}
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {vendorTab === 'STOCK' && (
            <div className="glass-panel" style={{ borderRadius: '20px', padding: '20px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={18} style={{ color: '#ff7e40' }} /> Лимиты порций
                </h2>
                <button 
                  className="btn-primary" 
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                  onClick={() => setIsVendorModalOpen(true)}
                >
                  + Добавить блюдо
                </button>
              </div>


              <div className="tabs-container" style={{ marginBottom: '16px' }}>
                <button 
                  className={`tab-btn ${vendorDateTab === 'TODAY' ? 'active' : ''}`}
                  onClick={() => setVendorDateTab('TODAY')}
                >
                  Сегодня
                </button>
                <button 
                  className={`tab-btn ${vendorDateTab === 'TOMORROW' ? 'active' : ''}`}
                  onClick={() => setVendorDateTab('TOMORROW')}
                >
                  Завтра
                </button>
              </div>

              {vendorMenu.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                  Меню отсутствует или точки не созданы.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {vendorMenu.map(item => (
                    <div key={item.id} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 4px 0' }}>{item.name}</h3>
                          <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>
                            {item.weight && `${item.weight} • `} {item.unitType || 'порция'}
                          </p>
                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontStyle: 'italic' }}>
                            {item.description?.slice(0, 60)}...
                          </p>
                        </div>
                        <button 
                          className="interactive" 
                          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px 10px', color: '#ff7e40', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => alert('Редактирование карточки товара в разработке.')}
                        >
                          <Edit size={12} /> Изменить
                        </button>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {item.slots.map((slot: any) => (
                          <div 
                            key={slot.id} 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: '8px 10px', 
                              background: 'rgba(255,255,255,0.02)', 
                              border: '1px solid var(--border-light)', 
                              borderRadius: '8px' 
                            }}
                          >
                            <span style={{ fontSize: '12px', fontWeight: '500' }}>
                              🕒 {slot.slotStart} - {slot.slotEnd}
                            </span>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Забронировано: <strong style={{ color: '#fff' }}>{slot.booked}</strong> / Лимит: <strong style={{ color: '#ff7e40' }}>{slot.total}</strong>
                              </span>
                              
                              <button 
                                className="btn-secondary" 
                                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px' }}
                                onClick={() => {
                                  setEditingStockSlot({
                                    menuItemId: item.id,
                                    slotId: slot.id,
                                    slotStart: slot.slotStart,
                                    slotEnd: slot.slotEnd,
                                    total: slot.total,
                                    booked: slot.booked
                                  });
                                  setNewStockTotal(slot.total);
                                }}
                              >
                                <Edit size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SMM_ADMIN FLOW */}
      {role === 'SMM_ADMIN' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="glass-panel" style={{ borderRadius: '20px', padding: '20px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} style={{ color: '#ff7e40' }} /> Панель Диспетчера / Админа
              {hasNewMessage && <Bell size={18} className="blink" style={{ color: '#ff4c8a', cursor: 'pointer', marginLeft: 'auto' }} onClick={() => setHasNewMessage(false)} />}
            </h2>

            {/* Search and filter controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Поиск по номеру заказа или клиенту..." 
                value={adminSearch}
                onChange={e => setAdminSearch(e.target.value)}
                style={{ fontSize: '13px' }}
              />
            </div>

            {(() => {
              const filtered = adminOrders.filter(order => {
                if (!adminSearch) return true;
                const search = adminSearch.toLowerCase();
                return order.orderNumber.toString().includes(search) || 
                       order.clientName.toLowerCase().includes(search) ||
                       (order.clientPhone && order.clientPhone.includes(search));
              });

              if (filtered.length === 0) {
                return <p style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Заказы не найдены.</p>;
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filtered.map(order => (
                    <div key={order.id} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '14px', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span className="badge badge-order-num">Заказ #{order.orderNumber}</span>
                        <span className={`badge-status status-${order.status.toLowerCase()}`}>{getStatusLabel(order.status)}</span>
                      </div>

                      <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Клиент:</span> <strong>{order.clientName}</strong> ({order.clientPhone || 'Без телефона'})
                      </div>

                      <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Точка:</span> <strong>{order.pickupPoint.name}</strong>
                      </div>

                      <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Слот:</span> <strong>{order.slotTime} ({new Date(order.slotDate).toLocaleDateString()})</strong>
                      </div>

                      {/* Courier assign dropdown */}
                      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Назначить курьера:</span>
                        <select 
                          value={order.driverName || ''} 
                          onChange={async (e) => {
                            const val = e.target.value;
                            try {
                              const res = await fetch(`${API_BASE}/admin/orders/${order.id}/courier`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ driverName: val || null }),
                              });
                              if (res.ok) {
                                fetchAdminOrders();
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="form-input"
                          style={{ padding: '4px 8px', fontSize: '12px', width: 'auto', flex: 1, background: 'rgba(0,0,0,0.2)' }}
                        >
                          <option value="">Не назначен</option>
                          <option value="Иван">Иван</option>
                          <option value="Сергей">Сергей</option>
                          <option value="Алексей">Алексей</option>
                        </select>
                      </div>

                      {order.clientComment && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', borderLeft: '3px solid #ff7e40', marginBottom: '10px', color: 'var(--text-dim)' }}>
                          Ориентир: {order.clientComment}
                        </div>
                      )}

                      <div style={{ borderTop: '1px dashed var(--border-light)', paddingTop: '8px', marginBottom: '12px' }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '700' }}>Состав заказа:</p>
                        {order.items.map((it: any) => (
                          <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span>{it.menuItem?.name}</span>
                            <span>x{it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => startEditingOrder(order)}
                        >
                          <Edit size={12} /> Изменить позиции
                        </button>
                        
                        {order.clientPhone && (
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setCallSimulation({ isOpen: true, name: order.clientName, phone: order.clientPhone, roleName: 'Покупатель' })}
                          >
                            <Phone size={12} /> Клиенту
                          </button>
                        )}

                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setCallSimulation({ isOpen: true, name: order.driverName || 'Курьер не назначен', phone: '+7 (999) 777-66-55', roleName: 'Курьер' })}
                          disabled={!order.driverName}
                        >
                          <Phone size={12} /> Курьеру
                        </button>
                      </div>

                      {/* Admin Chat with Client */}
                      <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                        {adminChatOpenId === order.id ? (
                          <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '800', color: '#ff7e40' }}>💬 Чат с клиентом</span>
                              <button 
                                type="button"
                                className="interactive"
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '10px', cursor: 'pointer' }}
                                onClick={() => setAdminChatOpenId(null)}
                              >
                                Свернуть
                              </button>
                            </div>

                            {/* Chat Messages */}
                            <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px', paddingRight: '2px' }}>
                              {adminChatMessages.length === 0 ? (
                                <p style={{ fontSize: '10px', color: 'var(--text-dim)', textAlign: 'center', margin: '6px 0' }}>Сообщений нет</p>
                              ) : (
                                adminChatMessages.map((m: any) => {
                                  const isAdmin = m.sender === 'ADMIN';
                                  return (
                                    <div 
                                      key={m.id} 
                                      style={{ 
                                        alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                                        background: isAdmin ? '#ff7e40' : 'rgba(255,255,255,0.06)',
                                        color: isAdmin ? 'white' : 'var(--text-main)',
                                        padding: '6px 10px',
                                        borderRadius: '10px',
                                        borderTopRightRadius: isAdmin ? '2px' : '10px',
                                        borderTopLeftRadius: isAdmin ? '10px' : '2px',
                                        maxWidth: '85%',
                                        fontSize: '11px',
                                        wordBreak: 'break-word',
                                        textAlign: 'left'
                                      }}
                                    >
                                      <div>{m.text}</div>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* Chat Form */}
                            <form onSubmit={handleSendAdminMessage} style={{ display: 'flex', gap: '6px' }}>
                              <input 
                                type="text" 
                                className="form-input" 
                                style={{ flex: 1, padding: '6px 10px', fontSize: '11px' }}
                                placeholder="Ответить клиенту..."
                                value={adminChatInput}
                                onChange={e => setAdminChatInput(e.target.value)}
                              />
                              <button type="submit" className="btn-primary" style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '8px' }}>
                                Отправить
                              </button>
                            </form>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            className="btn-secondary" 
                            style={{ width: '100%', padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '8px' }}
                            onClick={() => {
                              setAdminChatOpenId(order.id);
                              setAdminChatMessages([]);
                            }}
                          >
                            💬 Открыть Чат с Клиентом
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: EDIT STOCK */}
      {editingStockSlot && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '360px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '12px', color: '#ff7e40' }}>
              Изменить лимит порций
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Интервал: {editingStockSlot.slotStart} - {editingStockSlot.slotEnd}<br/>
              Уже забронировано покупателями: {editingStockSlot.booked} порц.
            </p>

            <form onSubmit={handleUpdateStock}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Максимальное количество порций
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  min={editingStockSlot.booked}
                  value={newStockTotal}
                  onChange={e => setNewStockTotal(parseInt(e.target.value, 10) || 0)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '10px' }} 
                  onClick={() => setEditingStockSlot(null)}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1, padding: '10px' }}
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHECKOUT */}
      {checkoutOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '400px', width: '100%' }}>
            {checkoutStep === 1 && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: '#ff7e40', textAlign: 'left' }}>
                  Шаг 1: Проверьте ваш заказ
                </h3>

                {/* Horizontal Collage */}
                {(() => {
                  const totalQty = cart.reduce((sum, c) => sum + c.quantity, 0);
                  return (
                    <div style={{ display: 'flex', width: '100%', height: '120px', borderRadius: '16px', overflow: 'hidden', gap: '3px', marginBottom: '16px', position: 'relative', background: 'rgba(0,0,0,0.2)' }}>
                      {cart.map((cartItem) => {
                        const menuItem = menu.find(m => m.id === cartItem.menuItemId);
                        const widthPct = totalQty > 0 ? (cartItem.quantity / totalQty) * 100 : 0;
                        const imageUrl = menuItem?.imageUrl || '';
                        
                        return (
                          <div 
                            key={cartItem.menuItemId} 
                            style={{ 
                              width: `${widthPct}%`, 
                              height: '100%', 
                              position: 'relative', 
                              transition: 'width 0.3s ease', 
                              overflow: 'hidden',
                              background: 'linear-gradient(135deg, rgba(255,126,64,0.3) 0%, rgba(255,75,0,0.3) 100%)'
                            }}
                          >
                            {imageUrl ? (
                              <img 
                                src={imageUrl} 
                                alt={cartItem.name} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              />
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white', fontWeight: 'bold', fontSize: '11px', padding: '4px', textAlign: 'center' }}>
                                {cartItem.name.slice(0, 8)}...
                              </div>
                            )}
                            <div style={{ position: 'absolute', bottom: '6px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '800' }}>
                              {cartItem.quantity}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Edit Quantities inside checkout */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
                  {cart.map(cartItem => {
                    const menuItem = menu.find(m => m.id === cartItem.menuItemId);
                    if (!menuItem) return null;
                    const itemSlot = menuItem.slots.find((s: any) => s.id === cartItem.slotId);
                    const available = cartItem.slotId === 'PENDING' 
                      ? menuItem.slots.reduce((sum: number, s: any) => sum + s.available, 0)
                      : (itemSlot ? itemSlot.available : 0);
                    
                    return (
                      <div key={cartItem.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '8px 12px' }}>
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', display: 'block' }}>{cartItem.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{cartItem.price} ₽ / шт.</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', border: '1px solid var(--border-light)' }}>
                          <button 
                            type="button"
                            className="interactive"
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '4px 8px', cursor: 'pointer' }}
                            onClick={() => removeFromCart(menuItem)}
                          >
                            <Minus size={10} />
                          </button>
                          <span style={{ fontSize: '12px', fontWeight: '700', minWidth: '14px', textAlign: 'center' }}>{cartItem.quantity}</span>
                          <button 
                            type="button"
                            className="interactive"
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '4px 8px', cursor: 'pointer' }}
                            onClick={() => addToCart(menuItem)}
                            disabled={cartItem.quantity >= available}
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>Итого:</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#ff7e40' }}>{getCartTotal()} ₽</span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" style={{ flex: 1, padding: '12px' }} onClick={() => setCheckoutOpen(false)}>Назад</button>
                  <button 
                    className="btn-primary" 
                    style={{ flex: 1, padding: '12px' }} 
                    onClick={() => setCheckoutStep(2)}
                    disabled={cart.length === 0}
                  >
                    Продолжить
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === 2 && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: '#ff7e40', textAlign: 'left' }}>
                  Шаг 2: Выберите точку выдачи
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
                  {(() => {
                    let sortedPoints = [...pointsList];
                    if (userCoords) {
                      sortedPoints = sortedPoints.map(pt => {
                        const dist = calculateDistance(userCoords.latitude, userCoords.longitude, pt.latitude, pt.longitude);
                        return { ...pt, distance: dist };
                      }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
                    }

                    return sortedPoints.map((pt, index) => {
                      const isSelected = pointId === pt.id;
                      const isClosest = userCoords && index === 0;

                      return (
                        <button
                          key={pt.id}
                          className="interactive glass-panel"
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '12px',
                            border: isSelected ? '2px solid #ff7e40' : '1px solid var(--border-light)',
                            background: isSelected ? 'rgba(255,126,64,0.08)' : 'rgba(255,255,255,0.01)',
                            textAlign: 'left',
                            color: 'var(--text-main)',
                            position: 'relative'
                          }}
                          onClick={() => setPointId(pt.id)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700' }}>{pt.name}</span>
                            {isClosest && (
                              <span style={{ fontSize: '9px', background: '#00e676', color: 'black', padding: '1px 6px', borderRadius: '8px', fontWeight: '800' }}>Ближайшая</span>
                            )}
                          </div>
                          
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Координаты: {pt.latitude.toFixed(4)}, {pt.longitude.toFixed(4)}
                            {pt.distance !== undefined && ` • ${getDistanceLabel(pt.distance)}`}
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" style={{ flex: 1, padding: '12px' }} onClick={() => setCheckoutStep(1)}>Назад</button>
                  <button 
                    className="btn-primary" 
                    style={{ flex: 1, padding: '12px' }} 
                    onClick={() => setCheckoutStep(3)}
                    disabled={!pointId}
                  >
                    Продолжить
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === 3 && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: '#ff7e40', textAlign: 'left' }}>
                  Шаг 3: Время доставки
                </h3>

                {/* Day selector tabs */}
                <div className="tabs-container" style={{ marginBottom: '16px' }}>
                  <button 
                    className={`tab-btn ${activeTab === 'TOMORROW' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('TOMORROW');
                      setSelectedTimeSlot(null);
                    }}
                  >
                    На завтра
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'TODAY' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('TODAY');
                      setSelectedTimeSlot(null);
                    }}
                  >
                    Сегодня (Срочно)
                  </button>
                </div>

                {/* Slots Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
                  {menu.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', padding: '20px 0' }}>На выбранную дату нет доступных слотов.</p>
                  ) : (
                    Array.from(
                      new Map(
                        menu.flatMap(item => 
                          item.slots.map((s: any) => [
                            `${s.slotStart}-${s.slotEnd}`, 
                            { slotStart: s.slotStart, slotEnd: s.slotEnd }
                          ])
                        )
                      ).values()
                    )
                    .sort((a: any, b: any) => a.slotStart.localeCompare(b.slotStart))
                    .map((slot: any) => {
                      const isAvailable = menu.some(item => {
                        const s = item.slots.find((x: any) => x.slotStart === slot.slotStart && x.slotEnd === slot.slotEnd);
                        return s ? s.available > 0 : false;
                      });

                      const isSelected = selectedTimeSlot?.slotStart === (slot as any).slotStart && selectedTimeSlot?.slotEnd === (slot as any).slotEnd;

                      return (
                        <button
                          key={`${(slot as any).slotStart}-${(slot as any).slotEnd}`}
                          className="interactive glass-panel"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: isSelected ? '2px solid #ff7e40' : '1px solid var(--border-light)',
                            background: isSelected ? 'rgba(255,126,64,0.08)' : isAvailable ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.05)',
                            opacity: isAvailable ? 1 : 0.6,
                            cursor: isAvailable ? 'pointer' : 'not-allowed',
                            textAlign: 'left',
                            color: 'var(--text-main)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          disabled={!isAvailable}
                          onClick={() => {
                            applySlotToCart(slot as any);
                            setSelectedTimeSlot({ id: '', slotStart: slot.slotStart, slotEnd: slot.slotEnd, available: 1 });
                          }}
                        >
                          <span style={{ fontSize: '13px', fontWeight: '700' }}>
                            Интервал: {(slot as any).slotStart} - {(slot as any).slotEnd}
                          </span>
                          <span style={{ fontSize: '10px', color: isAvailable ? '#00e676' : '#f87171' }}>
                            {isAvailable ? 'Доступно' : 'Раскупили'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="btn-secondary" 
                    style={{ flex: 1, padding: '12px' }} 
                    onClick={() => {
                      // revert slot mappings to pending when going back
                      const reverted = cart.map(c => ({ ...c, slotId: 'PENDING', slotTime: 'PENDING' }));
                      setCart(reverted);
                      setSelectedTimeSlot(null);
                      setCheckoutStep(2);
                    }}
                  >
                    Назад
                  </button>
                  <button 
                    className="btn-primary" 
                    style={{ flex: 1, padding: '12px' }} 
                    onClick={() => setCheckoutStep(4)}
                    disabled={!selectedTimeSlot || cart.length === 0}
                  >
                    Продолжить
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === 4 && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: '#ff7e40' }}>Детали доставки</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Ваше имя</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={clientName}
                      onChange={e => {
                        setClientName(e.target.value);
                        localStorage.setItem('beach_delivery_client_name', e.target.value);
                      }}
                      placeholder={sdk.getUser().firstName || "Иван"}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Номер телефона (для связи)</label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      placeholder="+7 (999) 000-00-00"
                      value={clientPhone}
                      onChange={e => {
                        setClientPhone(e.target.value);
                        localStorage.setItem('beach_delivery_client_phone', e.target.value);
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Ориентир для курьера (цвет дома, палатки, авто)</label>
                    <textarea 
                      className="form-input" 
                      rows={2}
                      style={{ resize: 'none' }}
                      placeholder="Например: Желтый зонт в 10 метрах слева от спуска к морю"
                      value={clientComment}
                      onChange={e => setClientComment(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" style={{ flex: 1, padding: '12px' }} onClick={() => setCheckoutStep(3)}>Назад</button>
                  <button 
                    className="btn-primary" 
                    style={{ flex: 1, padding: '12px' }} 
                    onClick={() => setCheckoutStep(5)}
                    disabled={!clientPhone}
                  >
                    К оплате {getCartTotal()} ₽
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === 5 && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: '#ff7e40' }}>Оплата заказа</h3>
                <div style={{ background: 'rgba(255,126,64,0.05)', border: '1px dashed #ff7e40', borderRadius: '12px', padding: '16px', marginBottom: '20px', fontSize: '13px', lineHeight: '1.5', textAlign: 'left' }}>
                  <p style={{ margin: '0 0 12px 0', color: 'var(--text-main)', fontWeight: '700', fontSize: '15px' }}>
                    Сумма: <span style={{ color: '#00e676' }}>{getCartTotal()} ₽</span>
                  </p>
                  <p style={{ margin: '0 0 8px 0', color: 'var(--text-dim)' }}>
                    Средства будут <strong style={{ color: '#ff7e40' }}>зарезервированы</strong> (холдированы) на вашем счете.
                  </p>
                  <p style={{ margin: '0', color: 'var(--text-dim)', fontSize: '12px' }}>
                    Фактическое списание произойдет только после того, как сборный заказ будет укомплектован на хабе. Если кто-то из фермеров не сможет отгрузить товар, его стоимость автоматически вернется вам.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <button 
                    className="interactive" 
                    style={{ padding: '12px', background: '#0088cc', color: 'white', border: 'none', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }} 
                    onClick={handlePlaceOrder}
                  >
                    Оплатить через Telegram Stars ⭐️
                  </button>
                  <button 
                    className="interactive" 
                    style={{ padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }} 
                    onClick={handlePlaceOrder}
                  >
                    Банковская карта (ЮKassa) 💳
                  </button>
                </div>

                <button className="btn-secondary" style={{ width: '100%', padding: '12px' }} onClick={() => setCheckoutStep(4)}>Назад</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: ORDER CONFIRMATION SCREEN */}
      {createdOrder && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ textAlign: 'center', padding: '30px 24px' }}>
            <div style={{ background: 'rgba(0,230,118,0.15)', border: '2px solid #00e676', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={28} style={{ color: '#00e676' }} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Заказ успешно оплачен!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
              Кухня уже приняла ваш заказ в работу.
            </p>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', marginBottom: '24px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Номер вашего заказа для курьера:</span>
              <span style={{ fontSize: '32px', fontWeight: '900', color: '#ff7e40', letterSpacing: '1px' }}>#{createdOrder.orderNumber}</span>
              
              <div style={{ fontSize: '13px', marginTop: '12px', color: 'white', textAlign: 'left', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                <p>📍 Точка выдачи: {createdOrder.pickupPoint.name}</p>
                <p>🕒 Время доставки: {createdOrder.slotTime}</p>
              </div>
            </div>

            <div style={{ background: 'rgba(248,192,69,0.1)', border: '1px solid rgba(248,192,69,0.2)', padding: '12px', borderRadius: '10px', fontSize: '12px', color: '#f8c045', marginBottom: '24px', textAlign: 'left' }}>
              <Clock size={16} style={{ float: 'left', marginRight: '8px' }} />
              Мы пришлем вам уведомление в {createdOrder.messenger === 'MAX' ? 'мессенджер MAX' : 'Telegram'}, как только курьер выедет к вашей точке выдачи. Пожалуйста, будьте неподалеку.
            </div>

            <button className="btn-primary" style={{ width: '100%', padding: '12px' }} onClick={() => setCreatedOrder(null)}>
              Вернуться в меню
            </button>
          </div>
        </div>
      )}

      {/* PLACARD PRINT PREVIEW MODAL */}
      {activePlacardPoint && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.9)' }}>
          <div className="modal-content" style={{ background: 'white', color: 'black', maxWidth: '400px', borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: 'none' }}>
            
            {/* Header / Logo */}
            <div style={{ borderBottom: '3px solid #ff7e40', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#ff7e40', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Домашняя кухня</h2>
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>ТОЧКА ВЫДАЧИ ЗАКАЗОВ</p>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '8px', color: '#1e293b' }}>{activePlacardPoint.name}</h3>
            
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
              Сканируйте QR-код вашим любимым мессенджером, выбирайте время доставки и оформляйте заказ горячей домашней еды прямо к вашему зонту или палатке!
            </p>

            {/* Two QR Codes */}
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <QRCodeSVG value={`https://t.me/your_tg_bot/app?startapp=point_${activePlacardPoint.id}`} size={110} />
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#0088cc' }}>Telegram App</span>
              </div>
              <div style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <QRCodeSVG value={`https://max.ru/your_max_bot?startapp=point_${activePlacardPoint.id}`} size={110} />
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#7f56da' }}>Messenger MAX</span>
              </div>
            </div>

            <p style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '16px' }}>
              ID Точки: {activePlacardPoint.id}
            </p>

            {/* Action buttons (Print / Close) */}
            <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }} className="no-print">
              <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1' }} 
                onClick={() => setActivePlacardPoint(null)}
              >
                Закрыть
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 1, padding: '10px' }} 
                onClick={() => window.print()}
              >
                Печатать плакат
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MODAL: SMM STORY DETAIL */}
      {activeStory && (
        <div 
          className="modal-overlay" 
          style={{ 
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', 
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' 
          }}
          onClick={() => setActiveStory(null)}
        >
          <div 
            className="glass-panel" 
            style={{ 
              maxWidth: '400px', width: '100%', borderRadius: '24px', overflow: 'hidden', 
              background: '#15181f', border: '1px solid rgba(255,255,255,0.08)', position: 'relative',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              animation: 'modalSlideUp 0.3s ease-out'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header Image */}
            <div style={{ width: '100%', height: '220px', background: `url(${activeStory.img}) center/cover no-repeat`, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(180deg, transparent 50%, #15181f 100%)' }}></div>
              <span style={{ position: 'absolute', top: '16px', left: '16px', fontSize: '9px', fontWeight: '800', background: activeStory.color, color: '#fff', padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>
                {activeStory.tag}
              </span>
              <button 
                onClick={() => setActiveStory(null)}
                style={{ 
                  position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.6)', 
                  border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', 
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontWeight: 'bold', fontSize: '14px', transition: 'background-color 0.2s'
                }}
                className="close-story-btn"
              >
                ✕
              </button>
            </div>
            
            {/* Content Body */}
            <div style={{ padding: '20px', color: '#fff' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: '#ff7e40' }}>{activeStory.title}</h3>
              <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'rgba(255,255,255,0.75)', margin: 0, fontWeight: '400' }}>
                {activeStory.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CALL SIMULATION */}
      {callSimulation && (
        <div className="modal-overlay" style={{ zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '340px', borderRadius: '24px', padding: '24px 20px', textAlign: 'center', background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,126,64,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Phone size={28} style={{ color: '#ff7e40' }} className="pulse-phone" />
            </div>
            <h4 style={{ color: 'white', fontSize: '15px', fontWeight: '800', margin: '0 0 2px 0' }}>{callSimulation.name}</h4>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: '0 0 16px 0' }}>{callSimulation.phone}</p>
            
            <div style={{ color: '#ff7e40', fontSize: '12px', fontWeight: '700', marginBottom: '16px' }} className="blink-animation">
              {callStatusText} ({callSimulation.roleName})
            </div>

            {/* Dialog transcript bubbles */}
            <div 
              style={{ 
                maxHeight: '160px', 
                overflowY: 'auto', 
                background: 'rgba(0,0,0,0.3)', 
                borderRadius: '12px', 
                padding: '10px', 
                textAlign: 'left', 
                fontSize: '11px', 
                lineHeight: '1.4', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                marginBottom: '20px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              {callDialogTranscripts.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', margin: '20px 0', fontStyle: 'italic' }}>Идет соединение...</p>
              ) : (
                callDialogTranscripts.map((t, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      color: t.includes('💼') || t.includes('Диспетчер') || t.includes('Вы') ? '#ff9e64' : '#7aa2f7', 
                      background: 'rgba(255,255,255,0.03)', 
                      padding: '6px 10px', 
                      borderRadius: '8px' 
                    }}
                  >
                    {t}
                  </div>
                ))
              )}
            </div>
            
            <button 
              className="interactive"
              style={{ background: '#ef4444', border: 'none', color: 'white', padding: '10px 24px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
              onClick={() => setCallSimulation(null)}
            >
              Сбросить звонок
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN EDIT ORDER */}
      {adminEditingOrder && (
        <div className="modal-overlay" style={{ zIndex: 105 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '380px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '12px', color: '#ff7e40' }}>
              Редактирование Заказа #{adminEditingOrder.orderNumber}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
              {menu.map(menuItem => {
                const orderItem = adminEditingOrder.items.find((it: any) => it.menuItemId === menuItem.id);
                const qty = orderItem ? orderItem.quantity : 0;
                
                return (
                  <div key={menuItem.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>{menuItem.name}</span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', border: '1px solid var(--border-light)' }}>
                      <button 
                        type="button"
                        className="interactive"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '2px 6px', cursor: 'pointer' }}
                        onClick={() => {
                          setAdminEditingOrder((prev: any) => {
                            const existing = prev.items.find((it: any) => it.menuItemId === menuItem.id);
                            if (!existing) return prev;
                            let newItems;
                            if (existing.quantity === 1) {
                              newItems = prev.items.filter((it: any) => it.menuItemId !== menuItem.id);
                            } else {
                              newItems = prev.items.map((it: any) => it.menuItemId === menuItem.id ? { ...it, quantity: it.quantity - 1 } : it);
                            }
                            return { ...prev, items: newItems };
                          });
                        }}
                      >
                        <Minus size={10} />
                      </button>
                      <span style={{ fontSize: '12px', fontWeight: '700', minWidth: '14px', textAlign: 'center' }}>{qty}</span>
                      <button 
                        type="button"
                        className="interactive"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '2px 6px', cursor: 'pointer' }}
                        onClick={() => {
                          setAdminEditingOrder((prev: any) => {
                            const existing = prev.items.find((it: any) => it.menuItemId === menuItem.id);
                            let newItems;
                            if (existing) {
                              newItems = prev.items.map((it: any) => it.menuItemId === menuItem.id ? { ...it, quantity: it.quantity + 1 } : it);
                            } else {
                              newItems = [...prev.items, { id: Math.random().toString(), menuItemId: menuItem.id, menuItem, quantity: 1 }];
                            }
                            return { ...prev, items: newItems };
                          });
                        }}
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button"
                className="btn-secondary" 
                style={{ flex: 1, padding: '10px' }} 
                onClick={() => setAdminEditingOrder(null)}
              >
                Отмена
              </button>
              <button 
                type="button"
                className="btn-primary" 
                style={{ flex: 1, padding: '10px' }}
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_BASE}/admin/orders/${adminEditingOrder.id}/items`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        items: adminEditingOrder.items.map((it: any) => ({
                          menuItemId: it.menuItemId,
                          quantity: it.quantity
                        }))
                      })
                    });
                    if (!res.ok) {
                      const errData = await res.json();
                      throw new Error(errData.error || 'Failed to edit order items');
                    }
                    
                    fetchAdminOrders();
                    setAdminEditingOrder(null);
                  } catch (e: any) {
                    alert(e.message);
                  }
                }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS print override to print only placard */}

      {/* LOGISTICIAN FLOW */}
      {role === 'LOGISTICIAN' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ borderRadius: '20px', padding: '20px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '16px', color: '#ff7e40' }}>Дашборд Логиста</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '16px' }}>
              Выберите заказы, которые готовы к отправке с Хаба, и сгруппируйте их в Маршрутный Лист для водителя.
            </p>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Позывной водителя (напр. Газель #12)" 
                value={logisticianDriverName}
                onChange={e => setLogisticianDriverName(e.target.value)}
                style={{ marginBottom: '10px' }}
              />
              
              <select 
                className="form-input" 
                value={logisticianDeliveryType}
                onChange={e => setLogisticianDeliveryType(e.target.value as any)}
                style={{ marginBottom: '10px' }}
              >
                <option value="DROPOFF_CLIENT">Напрямую Клиенту (Доставка)</option>
                <option value="DROPOFF_HUB">На Хаб (Сборка пакетов)</option>
              </select>
              <button 
                className="btn-primary" 
                onClick={handleLogisticianCreateTask}
                disabled={logisticianSelectedOrders.length === 0 || !logisticianDriverName}
                style={{ width: '100%', padding: '12px', opacity: (logisticianSelectedOrders.length === 0 || !logisticianDriverName) ? 0.5 : 1 }}
              >
                Назначить водителю ({logisticianSelectedOrders.length} заказ.)
              </button>
            </div>
            
            <div id="logistician-map" style={{ width: '100%', height: '250px', borderRadius: '12px', background: 'rgba(0,0,0,0.1)', marginBottom: '16px' }}></div>

            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>Нераспределенные заказы (На Хабе или готовятся)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {adminOrders.filter(o => ['PREPARING', 'READY_TO_SHIP', 'AT_HUB', 'PAYMENT_HELD'].includes(o.status)).map(order => (
                <div key={order.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', border: logisticianSelectedOrders.includes(order.id) ? '1px solid #ff7e40' : '1px solid transparent' }}>
                  <input 
                    type="checkbox" 
                    checked={logisticianSelectedOrders.includes(order.id)}
                    onChange={(e) => {
                      if (e.target.checked) setLogisticianSelectedOrders(prev => [...prev, order.id]);
                      else setLogisticianSelectedOrders(prev => prev.filter(id => id !== order.id));
                    }}
                    style={{ width: '20px', height: '20px', accentColor: '#ff7e40' }}
                  />
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '13px' }}>Заказ #{order.orderNumber} - {order.clientName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{order.pickupPoint?.name || 'Адрес не указан'} • Слот: {order.slotTime}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginTop: '30px', marginBottom: '10px' }}>Активные Маршрутные Листы</h3>
            {logisticsTasks.length === 0 ? <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Нет активных задач.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {logisticsTasks.map(task => (
                  <div key={task.id} style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: '#ff7e40' }}>{task.driverName}</span>
                      <span style={{ fontSize: '11px', color: task.status === 'COMPLETED' ? '#4caf50' : '#ffc107' }}>{task.status}</span>
                    </div>
                    <div style={{ fontSize: '12px' }}>Заказ #{task.order?.orderNumber} • Точка: {task.address}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {/* VENDOR ITEM MODAL */}
      {isVendorModalOpen && (
        <div className="modal-overlay" onClick={() => setIsVendorModalOpen(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Добавление блюда</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" className="form-input" placeholder="Название (напр. Плов)" value={newVendorItem.name} onChange={e => setNewVendorItem({...newVendorItem, name: e.target.value})} />
              <input type="number" className="form-input" placeholder="Цена (₽)" value={newVendorItem.price} onChange={e => setNewVendorItem({...newVendorItem, price: e.target.value})} />
              <input type="text" className="form-input" placeholder="Вес/Объем (напр. 350г)" value={newVendorItem.weight} onChange={e => setNewVendorItem({...newVendorItem, weight: e.target.value})} />
              <textarea className="form-input" placeholder="Описание и состав" value={newVendorItem.description} onChange={e => setNewVendorItem({...newVendorItem, description: e.target.value})} style={{ minHeight: '60px' }} />
              <input type="text" className="form-input" placeholder="URL картинки (опционально)" value={newVendorItem.imageUrl} onChange={e => setNewVendorItem({...newVendorItem, imageUrl: e.target.value})} />
              
              <button 
                className="btn-primary" 
                style={{ padding: '12px', marginTop: '10px' }}
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_BASE}/admin/menu`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...newVendorItem,
                        vendorId: 'eb58b68a-6b8f-4ba9-8687-f273ed956894', // Using a default/first vendor ID for MVP
                        categoryId: 'CAT_HOT'
                      })
                    });
                    if (res.ok) {
                      setIsVendorModalOpen(false);
                      setNewVendorItem({ name: '', description: '', price: '', weight: '', imageUrl: '' });
                      fetchVendorMenu();
                    }
                  } catch (e) {
                    alert('Ошибка: ' + e);
                  }
                }}
              >
                Сохранить блюдо
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HUB FLOW */}
      {role === 'HUB' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ borderRadius: '20px', padding: '20px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '16px', color: '#ff7e40' }}>Консолидация Хаба</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '16px' }}>
              Отметьте заказы, которые поступили от Фермеров на Хаб и готовы к упаковке.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {adminOrders.filter(o => o.status === 'PREPARING' || o.status === 'READY_TO_SHIP' || o.status === 'PAYMENT_HELD' || o.status === 'AT_HUB').map(order => (
                <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>Заказ #{order.orderNumber}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Товаров: {order.items?.length || 0} шт.</div>
                    {order.items && order.items.length > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--text-main)', marginTop: '6px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '8px' }}>
                        <strong>Чеклист приемки:</strong>
                        <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', color: 'var(--text-dim)' }}>
                          {order.items.map((it: any) => (
                            <li key={it.id}>{it.menuItem?.name || 'Товар'} x{it.quantity}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Статус: <strong style={{ color: order.status === 'AT_HUB' ? '#4caf50' : '#ffc107' }}>{order.status}</strong>
                    </div>
                  </div>
                  {order.status !== 'AT_HUB' && (
                    <button 
                      className="btn-primary" 
                      style={{ padding: '8px 16px', fontSize: '11px' }}
                      onClick={() => handleHubReceive(order.id)}
                    >
                      Принять на Хаб
                    </button>
                  )}
                  {order.status === 'AT_HUB' && (
                    <div style={{ padding: '8px 16px', fontSize: '11px', color: '#4caf50', fontWeight: '700' }}>
                      ✓ Упакован
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .pulse-phone {
          animation: pulse 1.5s infinite ease-in-out;
        }
        .blink-animation {
          animation: blink 1.2s infinite ease-in-out;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .modal-overlay, .modal-overlay * {
            visibility: visible;
          }
          .modal-overlay {
            position: absolute;
            left: 0; top: 0; width: 100%; height: 100%;
            background: white !important;
            backdrop-filter: none !important;
          }
          .modal-content {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
    </div>
  );

}
