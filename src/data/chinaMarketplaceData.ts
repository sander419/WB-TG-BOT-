import { ChinaFactorySource, Product } from '../types';

export interface ChinaSourcingOpportunity {
  id: string;
  category: string;
  sourceItem: ChinaFactorySource;
  russianMarketItem: {
    sku: string;
    productName: string;
    currentSellingPriceRub: number;
    currentWbCostPrice: number;
    salesVolumeMonthlyUnits: number;
  };
  arbitrage: {
    unitFactoryPriceCny: number;
    unitFactoryPriceRub: number;
    shippingAndCustomsPerUnitRub: number;
    totalLandedCostRub: number;
    currentCostSavingRub: number;
    marginExpansionPercent: number;
    potentialMonthlyExtraProfitRub: number;
  };
  recommendedBatchMoq: number;
  recommendedInvestmentRub: number;
  paybackDays: number;
}

export interface ChinaNegotiationScript {
  id: string;
  category: 'sample' | 'bulk_discount' | 'lead_time' | 'custom_oem' | 'quality_qc';
  titleRu: string;
  description: string;
  chineseText: string;
  russianText: string;
  successRate: string;
  tip: string;
}

export interface ChinaLogisticsOption {
  id: string;
  name: string;
  type: 'air_express' | 'fast_auto' | 'rail_ddp' | 'sea_container';
  transitDays: string;
  costPerKgUsd: number;
  costPerCbmUsd: number;
  minWeightKg: number;
  customsMode: string;
  recommendedFor: string;
  tag: string;
}

export const INITIAL_CHINA_FACTORIES: ChinaFactorySource[] = [
  {
    id: 'factory-1688-01',
    factoryName: 'Guangdong Aomei Smart Textile Co., Ltd. (广东奥美智能纺织有限公司)',
    city: 'Guangzhou (Гуанчжоу)',
    platform: '1688',
    factoryPriceCny: 42,
    factoryPriceRub: 565, // ~13.45 CNY
    moq: 200,
    landedCostRub: 820,
    estimatedMarginPotential: 54,
    verifiedSupplierRating: 4.96,
    yearsInBusiness: 11,
    leadTimeDays: 14,
    sampleAvailable: true,
    oemCustomization: true,
    productTitleCn: '桑蚕丝法式优雅连衣裙 夏季高端女装',
    productTitleRu: 'Шелковое платье миди премиум (Аналог Товар №1)',
    imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&q=80',
    factoryAreaSqMeters: 18500,
    workersCount: 320,
    dailyProductionUnits: 4500,
    defectRatePercent: 0.18,
    certifications: ['ISO9001', 'OEKO-TEX 100', 'BSCI Audit', 'EAC Declaration'],
    exportSharePercent: 74,
    wechatContactMasked: 'wxid_aomei_export_**',
  },
  {
    id: 'factory-1688-02',
    factoryName: 'Zhejiang Yiwu Apex Luggage & Bags Factory (浙江义乌顶点箱包实业)',
    city: 'Yiwu (Иу)',
    platform: '1688',
    factoryPriceCny: 38,
    factoryPriceRub: 511,
    moq: 300,
    landedCostRub: 790,
    estimatedMarginPotential: 62,
    verifiedSupplierRating: 4.92,
    yearsInBusiness: 8,
    leadTimeDays: 12,
    sampleAvailable: true,
    oemCustomization: true,
    productTitleCn: '商务防盗多功能双肩包 大容量防水男包',
    productTitleRu: 'Рюкзак городской мужской с USB (Аналог Товар №7)',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&q=80',
    factoryAreaSqMeters: 12000,
    workersCount: 180,
    dailyProductionUnits: 6000,
    defectRatePercent: 0.22,
    certifications: ['ISO9001', 'Sedex Smeta', 'EAC', 'CE'],
    exportSharePercent: 82,
    wechatContactMasked: 'yiwu_apex_bag_**',
  },
  {
    id: 'factory-taobao-03',
    factoryName: 'Shenzhen TechMaster Electronic Innovation Co. (深圳智造电子科技有限公司)',
    city: 'Shenzhen (Шэньчжэнь)',
    platform: 'taobao',
    factoryPriceCny: 29,
    factoryPriceRub: 390,
    moq: 150,
    landedCostRub: 620,
    estimatedMarginPotential: 68,
    verifiedSupplierRating: 4.98,
    yearsInBusiness: 14,
    leadTimeDays: 10,
    sampleAvailable: true,
    oemCustomization: true,
    productTitleCn: '静音超声波香薰加湿器 氛围灯家用小型',
    productTitleRu: 'Ультразвуковой увлажнитель воздуха (Аналог Товар №4)',
    imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=300&q=80',
    factoryAreaSqMeters: 22000,
    workersCount: 450,
    dailyProductionUnits: 12000,
    defectRatePercent: 0.12,
    certifications: ['ISO9001', 'ISO14001', 'CE', 'RoHS', 'FCC', 'EAC Certificate'],
    exportSharePercent: 88,
    wechatContactMasked: 'sz_techmaster_intl_**',
  },
  {
    id: 'factory-jd-04',
    factoryName: 'Yangjiang Precision Damascus Cutlery (阳江市精密大马士革刀具制造)',
    city: 'Yangjiang (Янцзян)',
    platform: 'jd',
    factoryPriceCny: 58,
    factoryPriceRub: 780,
    moq: 100,
    landedCostRub: 1190,
    estimatedMarginPotential: 58,
    verifiedSupplierRating: 4.95,
    yearsInBusiness: 16,
    leadTimeDays: 15,
    sampleAvailable: true,
    oemCustomization: true,
    productTitleCn: '高端大马士革钢厨刀套装 德国进口钢材',
    productTitleRu: 'Набор кухонных ножей из дамасской стали (Аналог Товар №2)',
    imageUrl: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=300&q=80',
    factoryAreaSqMeters: 16000,
    workersCount: 210,
    dailyProductionUnits: 3200,
    defectRatePercent: 0.15,
    certifications: ['ISO9001', 'LFGB Food Safe', 'FDA', 'EAC Declaration'],
    exportSharePercent: 65,
    wechatContactMasked: 'yangjiang_knives_**',
  },
  {
    id: 'factory-1688-05',
    factoryName: 'Dongguan MasterSound Audio Technology Co. (东莞市大师声学科技有限公司)',
    city: 'Dongguan (Дунгуань)',
    platform: '1688',
    factoryPriceCny: 35,
    factoryPriceRub: 470,
    moq: 200,
    landedCostRub: 720,
    estimatedMarginPotential: 65,
    verifiedSupplierRating: 4.97,
    yearsInBusiness: 9,
    leadTimeDays: 11,
    sampleAvailable: true,
    oemCustomization: true,
    productTitleCn: '主动降噪无线蓝牙耳机 游戏低延迟防水',
    productTitleRu: 'Беспроводные TWS наушники с ANC (Аналог Товар №3)',
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&q=80',
    factoryAreaSqMeters: 26000,
    workersCount: 520,
    dailyProductionUnits: 15000,
    defectRatePercent: 0.14,
    certifications: ['ISO9001', 'BQB Bluetooth', 'CE', 'RoHS', 'EAC Нотификация ФСБ'],
    exportSharePercent: 91,
    wechatContactMasked: 'dg_mastersound_**',
  },
];

export const INITIAL_CHINA_SOURCING_OPPORTUNITIES: ChinaSourcingOpportunity[] = [
  {
    id: 'opp-china-1',
    category: 'Снижение себестоимости через 1688',
    sourceItem: INITIAL_CHINA_FACTORIES[1], // Backpack factory
    russianMarketItem: {
      sku: 'WB-77291048',
      productName: 'Рюкзак городской мужской',
      currentSellingPriceRub: 2190,
      currentWbCostPrice: 1050,
      salesVolumeMonthlyUnits: 450,
    },
    arbitrage: {
      unitFactoryPriceCny: 38,
      unitFactoryPriceRub: 511,
      shippingAndCustomsPerUnitRub: 279,
      totalLandedCostRub: 790,
      currentCostSavingRub: 260, // 1050 - 790
      marginExpansionPercent: 11.8,
      potentialMonthlyExtraProfitRub: 117000, // 260 * 450
    },
    recommendedBatchMoq: 300,
    recommendedInvestmentRub: 237000,
    paybackDays: 28,
  },
  {
    id: 'opp-china-2',
    category: 'Прямой фабричный контракт Гуанчжоу',
    sourceItem: INITIAL_CHINA_FACTORIES[0], // Silk dress factory
    russianMarketItem: {
      sku: 'WB-99182301',
      productName: 'Шелковое платье миди',
      currentSellingPriceRub: 4290,
      currentWbCostPrice: 1200,
      salesVolumeMonthlyUnits: 380,
    },
    arbitrage: {
      unitFactoryPriceCny: 42,
      unitFactoryPriceRub: 565,
      shippingAndCustomsPerUnitRub: 255,
      totalLandedCostRub: 820,
      currentCostSavingRub: 380, // 1200 - 820
      marginExpansionPercent: 8.9,
      potentialMonthlyExtraProfitRub: 144400,
    },
    recommendedBatchMoq: 200,
    recommendedInvestmentRub: 164000,
    paybackDays: 22,
  },
  {
    id: 'opp-china-3',
    category: 'Шэньчжэнь High-Tech электроника',
    sourceItem: INITIAL_CHINA_FACTORIES[2], // Humidifier factory
    russianMarketItem: {
      sku: 'WB-44192004',
      productName: 'Ультразвуковой увлажнитель воздуха',
      currentSellingPriceRub: 1890,
      currentWbCostPrice: 850,
      salesVolumeMonthlyUnits: 520,
    },
    arbitrage: {
      unitFactoryPriceCny: 29,
      unitFactoryPriceRub: 390,
      shippingAndCustomsPerUnitRub: 230,
      totalLandedCostRub: 620,
      currentCostSavingRub: 230,
      marginExpansionPercent: 12.1,
      potentialMonthlyExtraProfitRub: 119600,
    },
    recommendedBatchMoq: 300,
    recommendedInvestmentRub: 186000,
    paybackDays: 24,
  },
];

export const CHINA_LOGISTICS_TIERS: ChinaLogisticsOption[] = [
  {
    id: 'log-fast-auto',
    name: 'Быстрое Авто DDP (Хоргос / Маньчжурия)',
    type: 'fast_auto',
    transitDays: '12–16 дней',
    costPerKgUsd: 3.2,
    costPerCbmUsd: 210,
    minWeightKg: 50,
    customsMode: 'Белая таможня DDP + ГТД + Честный Знак',
    recommendedFor: 'Одежда, текстиль, рюкзаки, хозтовары (Оптимальный баланс)',
    tag: 'САМЫЙ ПОПУЛЯРНЫЙ',
  },
  {
    id: 'log-air-express',
    name: 'Авиа Экспресс DDP (Шэньчжэнь / Гуанчжоу → Шереметьево)',
    type: 'air_express',
    transitDays: '5–7 дней',
    costPerKgUsd: 6.8,
    costPerCbmUsd: 480,
    minWeightKg: 20,
    customsMode: 'Ускоренное оформление Внуково/Шереметьево',
    recommendedFor: 'Образцы новинок, трендовая электроника, срочный out-of-stock',
    tag: 'МАКС. СКОРОСТЬ',
  },
  {
    id: 'log-rail-ddp',
    name: 'Прямой ж/д контейнер (Чэнду / Сиань → Ворсино)',
    type: 'rail_ddp',
    transitDays: '22–26 дней',
    costPerKgUsd: 1.8,
    costPerCbmUsd: 135,
    minWeightKg: 300,
    customsMode: 'Контейнерная белая таможня + полный пакет EAC',
    recommendedFor: 'Крупные партии от 1000 шт, стабильный круглогодичный сток',
    tag: 'НИЗКАЯ СЕБЕСТОИМОСТЬ',
  },
];

export const CHINA_NEGOTIATION_SCRIPTS: ChinaNegotiationScript[] = [
  {
    id: 'script-sample',
    category: 'sample',
    titleRu: 'Заказ фабричного образца с возвратом стоимости в первой партии',
    description: 'Шаблон запроса сэмпла в чате 1688 / WeChat с фиксацией вычета стоимости образца из оптового заказа.',
    chineseText: '您好！我们是俄罗斯头部电商卖家，在WB/Ozon月销数万件。我们对贵司的这款产品非常感兴趣，计划首批采购 500-1000 件。请问是否支持寄送样品进行质量检测？样品费是否可以在后续大货订单中全额抵扣？期待长期合作！',
    russianText: 'Здравствуйте! Мы крупный продавец на российских маркетплейсах WB/Ozon. Нас заинтересовал данный товар, планируем первую партию 500–1000 шт. Можете ли вы отправить образец для проверки качества? Засчитывается ли стоимость образца в счет будущего оптового заказа? Настроены на долгосрочное сотрудничество!',
    successRate: '96% фабрик соглашаются на вычет сэмпла',
    tip: 'Упоминание объемов WB/Ozon мотивирует фабричного менеджера сразу дать статус VIP-клиента.',
  },
  {
    id: 'script-bulk-discount',
    category: 'bulk_discount',
    titleRu: 'Торг на объем от 500–1000 шт (Скидка 8–15%)',
    description: 'Аргументированный запрос оптовой цены при регулярных ежемесячных отгрузках.',
    chineseText: '老板您好！我们的采购预算已经通过。如果第一批采购 800 件，并且签订季度供货协议，单价能否优惠到 ¥[ЦЕНА]? 如果价格合适，我们今天即可支付 30% 定金安排生产。',
    russianText: 'Здравствуйте! Наш бюджет утвержден. Если мы берем первую партию 800 шт и подписываем соглашение на ежеквартальные поставки, можете ли снизить цену до ¥[ЦЕНА]? Если договоримся по цене, мы готовы внести 30% депозит сегодня для запуска.',
    successRate: 'Снижает цену в среднем на 7–12%',
    tip: 'Китайские заводы охотно уступают в марже ради гарантированного 30% депозита в день переговоров.',
  },
  {
    id: 'script-custom-oem',
    category: 'custom_oem',
    titleRu: 'Брендирование OEM: нанесение логотипа и русский мануал',
    description: 'Запрос на лазерную гравировку/шелкографию логотипа бренда и вложение русской инструкции.',
    chineseText: '请问该产品支持 OEM 贴牌定制吗？起订量 (MOQ) 是多少？我们需要印制我们品牌的 Logo、俄文说明书以及定制俄文彩盒包装。请告知定制版面费及交付周期。',
    russianText: 'Подскажите, возможен ли OEM брендинг? Какой минимальный тираж (MOQ)? Нам необходимо нанести логотип нашего бренда, вложить инструкцию на русском языке и изготовить брендированную коробку. Сообщите стоимость клише и сроки изготовления.',
    successRate: 'Доступно у 92% проверенных поставщиков',
    tip: 'Индивидуальная русская упаковка повышает выкуп на WB на 18% и защищает карточку от склейки конкурентами.',
  },
  {
    id: 'script-quality-qc',
    category: 'quality_qc',
    titleRu: 'Требование видеоинспекции качества и жестких сроков',
    description: 'Условие проведения независимой инспекции на складе в Гуанчжоу/Иу перед финальной оплатой 70%.',
    chineseText: '关于付款条款，我们采用标准的 30% 预付款 + 70% 尾款（大货验货合格后支付）。大货完成后，我们的广州质检代理会进行现场验货并录制全流程视频。请确保产品合格率在 99.5% 以上。',
    russianText: 'По условиям оплаты: стандартные 30% аванс + 70% остаток после успешного прохождения контроля качества. По готовности партии наш представитель в Гуанчжоу проведет инспекцию и видеофиксацию. Пожалуйста, обеспечьте качество от 99.5%.',
    successRate: 'Полностью исключает риск бракованной партии',
    tip: 'Предупреждение о видеоинспекции заставляет китайский цех ставить лучших контролеров на вашу линию.',
  },
];
