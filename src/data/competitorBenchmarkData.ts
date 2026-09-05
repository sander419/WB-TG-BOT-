import { Product, CompetitorBenchmarkReport, CompetitorBenchmarkItem } from '../types';

export function getCompetitorBenchmarkForProduct(product: Product): CompetitorBenchmarkReport {
  const isWb = product.marketplace === 'wb';
  const isOzon = product.marketplace === 'ozon';
  
  // Deterministic seed based on product ID
  const basePrice = product.price;
  const comp1Price = product.competitorPrice || Math.round(basePrice * 0.92);
  const comp2Price = Math.round(basePrice * 0.96);
  const comp3Price = Math.round(basePrice * 1.05);

  const comp1Rating = product.id === 'prod-7' ? 4.9 : 4.8;
  const comp2Rating = 4.7;
  const comp3Rating = 4.9;

  const comp1Reviews = product.reviewsCount > 500 ? Math.round(product.reviewsCount * 2.4) : 1420;
  const comp2Reviews = Math.round(comp1Reviews * 0.65);
  const comp3Reviews = Math.round(comp1Reviews * 1.8);

  const ourDeliveryDays = product.daysLeft <= 4 ? 3 : product.marketplace === 'wb' ? 1 : 2;
  const ourDeliverySpeed = ourDeliveryDays === 1 
    ? 'Завтра (1 день, FBO Коледино)' 
    : ourDeliveryDays === 2 
    ? '2 дня (FBO Электросталь / Казань)' 
    : '3-4 дня (FBS Экспресс / Дальний склад)';

  const topCompetitors: CompetitorBenchmarkItem[] = [
    {
      id: `${product.id}-comp-1`,
      rank: 1,
      sku: isWb ? `WB-${Math.abs(product.sku.split('-')[1] ? parseInt(product.sku.split('-')[1], 10) + 1042 : 8829104)}` : `OZ-9918234`,
      name: `${product.name.split(' ').slice(0, 3).join(' ')} Premium Max`,
      brand: product.competitorName || 'UrbanLeader Official',
      price: comp1Price,
      oldPrice: Math.round(comp1Price * 1.25),
      rating: comp1Rating,
      reviewsCount: comp1Reviews,
      deliverySpeed: 'Завтра (1 день, FBO Коледино)',
      deliveryDays: 1,
      warehouse: isWb ? 'Коледино (WB)' : 'Хоругвино (Ozon)',
      dailyRevenue: Math.round(product.dailyRevenue * 1.9),
      dailyOrders: Math.round(product.dailyOrders * 2.1),
      isSponsored: false,
      strengths: [
        `Цена на ${Math.abs(basePrice - comp1Price)} ₽ ниже нашей (${comp1Price} ₽ vs ${basePrice} ₽)`,
        `Выше социальное доверие: ${comp1Reviews} отзывов vs ${product.reviewsCount}`,
        'Быстрая доставка за 24 часа со склада Коледино'
      ],
      weaknesses: [
        'Меньше цветовых вариаций (только 2 цвета)',
        'Хуже комплектация (нет фирменного чехла)'
      ]
    },
    {
      id: `${product.id}-comp-2`,
      rank: 2,
      sku: isWb ? `WB-${Math.abs(product.sku.split('-')[1] ? parseInt(product.sku.split('-')[1], 10) + 2099 : 7710293)}` : `OZ-8840192`,
      name: `${product.name.split(' ').slice(0, 3).join(' ')} Trend Comfort`,
      brand: 'TopStyle Pro',
      price: comp2Price,
      oldPrice: Math.round(comp2Price * 1.18),
      rating: comp2Rating,
      reviewsCount: comp2Reviews,
      deliverySpeed: 'Завтра (1 день, FBO Подольск)',
      deliveryDays: 1,
      warehouse: isWb ? 'Подольск (WB)' : 'Тверь (Ozon)',
      dailyRevenue: Math.round(product.dailyRevenue * 1.4),
      dailyOrders: Math.round(product.dailyOrders * 1.5),
      isSponsored: true,
      strengths: [
        'Активная автореклама в поиске (ТОП-2 по ставке)',
        'Инфографика с 3D-рендерами и видеообзором'
      ],
      weaknesses: [
        `Рейтинг ${comp2Rating} ниже нашего (${product.rating})`,
        'Растут жалобы на упаковку за последние 7 дней'
      ]
    },
    {
      id: `${product.id}-comp-3`,
      rank: 3,
      sku: isWb ? `WB-${Math.abs(product.sku.split('-')[1] ? parseInt(product.sku.split('-')[1], 10) + 3381 : 6629104)}` : `OZ-7719283`,
      name: `${product.name.split(' ').slice(0, 3).join(' ')} Classic Line`,
      brand: 'Nordic Pack Studio',
      price: comp3Price,
      oldPrice: Math.round(comp3Price * 1.3),
      rating: comp3Rating,
      reviewsCount: comp3Reviews,
      deliverySpeed: '2 дня (FBO Казань)',
      deliveryDays: 2,
      warehouse: isWb ? 'Казань (WB)' : 'Казань (Ozon)',
      dailyRevenue: Math.round(product.dailyRevenue * 1.2),
      dailyOrders: Math.round(product.dailyOrders * 1.1),
      isSponsored: false,
      strengths: [
        `Высокий органический рейтинг ${comp3Rating}`,
        `Большая база лояльных отзывов (${comp3Reviews} шт)`
      ],
      weaknesses: [
        `Цена выше нашей на ${comp3Price - basePrice} ₽ (${comp3Price} ₽)`,
        'Доставка 2 дня (склад Казань)'
      ]
    }
  ];

  const avgTopRating = Number(((comp1Rating + comp2Rating + comp3Rating) / 3).toFixed(2));
  const avgTopReviews = Math.round((comp1Reviews + comp2Reviews + comp3Reviews) / 3);
  const minCompetitorPrice = Math.min(comp1Price, comp2Price, comp3Price);
  const priceDiff = basePrice - comp1Price;
  const priceDiffPct = Math.round(((basePrice - comp1Price) / comp1Price) * 100);

  const pricePosition = priceDiff > 0 ? 'more_expensive' : priceDiff < 0 ? 'cheaper' : 'equal';
  const ratingStatus = product.rating > avgTopRating ? 'higher' : product.rating < avgTopRating ? 'lower' : 'equal';
  const deliveryStatus = ourDeliveryDays < 1 ? 'faster' : ourDeliveryDays === 1 ? 'equal' : 'slower';

  // Specific AI diagnoses based on products
  let verdict = '';
  let keyRisk = '';
  let growthOpportunity = '';
  let actionSteps: Array<{ title: string; desc: string; buttonLabel?: string; actionType?: 'price' | 'restock' | 'seo' | 'ask_ai'; payload?: any }> = [];

  if (product.id === 'prod-7') {
    verdict = 'Критичный разрыв конверсии: ключевой конкурент «UrbanPacker» держит цену 1 950 ₽ (на 240 ₽ ниже нашей) и обеспечивает доставку за 24 часа. Это обрушило поисковую позицию с #7 до #26.';
    keyRisk = 'Дальнейшая потеря органических позиций и упущенная выручка ~44 000 ₽/день из-за перетекания трафика к ТОП-1 конкуренту.';
    growthOpportunity = 'Выравнивание цены до 1 990 ₽ и пополнение склада Коледино восстановит позицию в ТОП-10 за 48 часов.';
    actionSteps = [
      {
        title: 'Выровнять цену с конкурентом',
        desc: 'Снизить цену до 1 990 ₽ (маржа останется безопасной: 32%)',
        buttonLabel: 'Установить 1 990 ₽',
        actionType: 'price',
        payload: { productId: product.id, newPrice: 1990 }
      },
      {
        title: 'Ускорить доставку до 24 часов',
        desc: 'Перераспределить 100 шт на центральный хаб FBO Коледино',
        buttonLabel: 'Поставка на Коледино (+100 шт)',
        actionType: 'restock',
        payload: { productId: product.id, amount: 100 }
      },
      {
        title: 'Обновить SEO-запросы карточки',
        desc: 'Внедрить высокочастотный ключ «рюкзак мужской городской водонепроницаемый»',
        buttonLabel: 'Оптимизировать SEO',
        actionType: 'seo',
        payload: { productId: product.id }
      }
    ];
  } else if (priceDiff > 0) {
    verdict = `Товар дороже лидера выдачи на ${priceDiff} ₽ (+${priceDiffPct}%). Рейтинг ${product.rating} ★ сопоставим с ТОП-1 (${comp1Rating} ★), но покупатели выбирают более выгодную цену и доставку ${topCompetitors[0].deliverySpeed}.`;
    keyRisk = 'Снижение кликабельности (CTR) в поисковой выдаче и рост доли рекламных расходов.';
    growthOpportunity = 'Тестовое промо-снижение цены или добавление подарка/комплекта для оправдания премиального чека.';
    actionSteps = [
      {
        title: 'Скорректировать цену',
        desc: `Установить конкурентную цену ${Math.round((basePrice + comp1Price) / 2)} ₽`,
        buttonLabel: `Поставить ${Math.round((basePrice + comp1Price) / 2)} ₽`,
        actionType: 'price',
        payload: { productId: product.id, newPrice: Math.round((basePrice + comp1Price) / 2) }
      },
      {
        title: 'Усилить УТП на главном фото',
        desc: 'Добавить плашку с ключевыми преимуществами (материал, гарантия, фурнитура)',
        buttonLabel: 'Спросить AI в чате',
        actionType: 'ask_ai',
        payload: { product }
      }
    ];
  } else {
    verdict = `Отличное ценовое преимущество: наша цена выгоднее лидера ТОП-1 на ${Math.abs(priceDiff)} ₽ при рейтинге ${product.rating} ★. Главный фактор для роста — скорость доставки и число отзывов.`;
    keyRisk = ourDeliveryDays > 1 ? 'Конкуренты доставляют за 1 день со склада Коледино, забирая часть горячих заказов.' : 'Потенциальный риск дефицита остатков.';
    growthOpportunity = `При текущей конверсии увеличение рекламного бюджета на ключевые слова поднимет позицию с #${product.searchRank} в ТОП-3.`;
    actionSteps = [
      {
        title: 'Защитить позиции поставкой FBO',
        desc: `Оформить поставку на региональные склады для сокращения срока доставки`,
        buttonLabel: 'Поставка FBO (+150 шт)',
        actionType: 'restock',
        payload: { productId: product.id, amount: 150 }
      },
      {
        title: 'Сбор отзывов через авто-рассылку',
        desc: `Сократить отставание по отзывам (${product.reviewsCount} vs ${comp1Reviews})`,
        buttonLabel: 'Запустить сбор отзывов',
        actionType: 'ask_ai',
        payload: { product }
      }
    ];
  }

  return {
    productId: product.id,
    productName: product.name,
    searchQuery: product.mainKeyword || 'рюкзак городской',
    searchVolume: product.keywordVolume || 142000,
    ourProduct: {
      sku: product.sku,
      name: product.name,
      price: product.price,
      rating: product.rating,
      reviewsCount: product.reviewsCount,
      deliverySpeed: ourDeliverySpeed,
      deliveryDays: ourDeliveryDays,
      searchRank: product.searchRank,
      warehouse: isWb ? 'Коледино (WB)' : 'Хоругвино (Ozon)',
      dailyOrders: product.dailyOrders,
      dailyRevenue: product.dailyRevenue
    },
    topCompetitors,
    metricsSummary: {
      priceComparison: {
        ourPrice: basePrice,
        topCompetitorPrice: comp1Price,
        diff: priceDiff,
        diffPercent: priceDiffPct,
        position: pricePosition
      },
      ratingComparison: {
        ourRating: product.rating,
        avgTopRating,
        diff: Number((product.rating - avgTopRating).toFixed(2)),
        status: ratingStatus
      },
      reviewsComparison: {
        ourReviews: product.reviewsCount,
        avgTopReviews,
        gap: product.reviewsCount - comp1Reviews
      },
      deliveryComparison: {
        ourDays: ourDeliveryDays,
        topCompetitorDays: 1,
        status: deliveryStatus
      }
    },
    aiAnalysis: {
      verdict,
      keyRisk,
      growthOpportunity,
      actionSteps
    }
  };
}
