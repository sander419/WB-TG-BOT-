import { Product, ContentHealthAudit, KeywordAuditItem, MissingKeywordItem, ImageSlideAudit } from '../types';

export function calculateContentHealth(product: Product): ContentHealthAudit {
  const name = product.name;
  const isWB = product.marketplace === 'wb';
  const isOzon = product.marketplace === 'ozon';
  const rank = product.searchRank;
  const rankDelta = product.searchRankDelta;

  // Specific tailoring per product id or deterministic generation
  if (product.id === 'prod-7') {
    // Товар №7 - Рюкзак городской
    return {
      overallScore: 68,
      grade: 'needs_work',
      lastAuditedAt: 'Только что (Live WB/Ozon API v3)',
      keywordCoverage: {
        score: 64,
        status: 'warning',
        titleKeywordsCount: 3,
        descriptionKeywordsCount: 7,
        primaryKeywordRank: 26,
        coveredKeywords: [
          { keyword: 'рюкзак мужской городской', searchVolume: 240000, density: '1.4%', inTitle: true, inDescription: true, relevance: 'HIGH', cluster: 'ВЧ' },
          { keyword: 'рюкзак для ноутбука 15.6', searchVolume: 92000, density: '0.8%', inTitle: false, inDescription: true, relevance: 'HIGH', cluster: 'ВЧ' },
          { keyword: 'черный рюкзак школьный', searchVolume: 48000, density: '0.6%', inTitle: false, inDescription: true, relevance: 'MEDIUM', cluster: 'СЧ' },
          { keyword: 'рюкзак с USB зарядкой', searchVolume: 32000, density: '0.5%', inTitle: false, inDescription: true, relevance: 'MEDIUM', cluster: 'СЧ' },
        ],
        missingKeywords: [
          { keyword: 'рюкзак водонепроницаемый мужской', estimatedVolume: 86000, potentialTrafficGain: '+24%', reason: 'Отсутствует в названии и 1-м абзаце описания' },
          { keyword: 'рюкзак туристический ручная кладь', estimatedVolume: 54000, potentialTrafficGain: '+16%', reason: 'Высокий спрос перед сезоном отпусков' },
          { keyword: 'рюкзак тактический черный непромокаемый', estimatedVolume: 38000, potentialTrafficGain: '+11%', reason: 'Частый поисковый хвост конкурентов' },
        ],
        recommendation: 'Добавить «водонепроницаемый» и «ручная кладь» в начало названия. Индексация поднимет товар в выдаче на 8–12 позиций.',
      },
      imageOptimization: {
        score: 72,
        status: 'warning',
        totalSlides: 5,
        recommendedSlides: 7,
        hasInfographics: true,
        aspectRatio: '3:4 (WB Standard)',
        aspectRatioValid: true,
        contrastScore: 78,
        mobileReadability: 'warning',
        slides: [
          { slideIndex: 1, title: 'Главный Hero-слайд', type: 'Обложка + УТП', status: 'optimal', notes: 'Четкий контраст на белом фоне, товар занимает 82% кадра', previewUrl: product.image },
          { slideIndex: 2, title: 'Вместимость и отсеки', type: 'Инфографика', status: 'optimal', notes: 'Показан ноутбук 15.6", папка А4 и термос' },
          { slideIndex: 3, title: 'Водоотталкивающая ткань', type: 'Макро-текстура', status: 'warning', notes: 'Мелкий шрифт 10pt на мобильных экранах плохо читается' },
          { slideIndex: 4, title: 'Анатомическая спинка', type: 'Эргономика', status: 'optimal', notes: 'Дышащая сетка AirMesh с указанием мягких лямок' },
          { slideIndex: 5, title: 'Размеры в сантиметрах', type: 'Габариты', status: 'warning', notes: 'Нет фото в сравнении с ростом человека (180 см)' },
          { slideIndex: 6, title: 'Видео-обложка (360°)', type: 'Видео', status: 'missing', notes: 'Видеообложка отсутствует (+18% к конверсии в клик)' },
          { slideIndex: 7, title: 'Упаковка и пломба', type: 'Транспортировка', status: 'missing', notes: 'Нет слайда о надежной плотной защитной коробке' },
        ],
        recommendation: 'Увеличить размер шрифта на 3 слайде до 16pt и добавить видеообложку 360° с тестом водонепроницаемости.',
      },
      descriptionLength: {
        score: 68,
        status: 'warning',
        characterCount: 1180,
        recommendedMinChars: 1500,
        recommendedMaxChars: 2500,
        wordCount: 154,
        keywordDensity: 1.3,
        optimalDensityRange: '2.2% — 2.8%',
        hasBulletPoints: true,
        hasUspSection: true,
        hasCareInstructions: false,
        sampleText: 'Стильный городской рюкзак для мужчин и подростков. Вместительное основное отделение для ноутбука до 15.6 дюймов. Водоотталкивающий материал Oxford 900D защитит вещи в дождь. Удобные мягкие лямки снижают нагрузку на спину.',
        recommendation: 'Текст слишком короткий (1 180 символов). Дополнить блоком ухода за тканью, сценариями (работа, учеба, спорт, самолет) и расширить LSI-семантику.',
      },
      aiAutoFixProposal: {
        optimizedTitle: 'Рюкзак мужской городской водонепроницаемый для ноутбука 15.6 черный ручная кладь',
        optimizedDescription: `Премиальный мужской городской рюкзак — идеальный выбор для работы, учебы, путешествий и повседневного использования в городе. 

🔥 ПРЕИМУЩЕСТВА И УТП:
• ВОДОНЕПРОНИЦАЕМАЯ ТКАНЬ: Высокопрочный Oxford 900D с полиуретановой пропиткой защищает электронику и документы от сильного дождя и мокрого снега.
• ЗАЩИТНЫЙ ОТСЕК ДЛЯ ГАДЖЕТОВ: Мягкий демпферный карман для ноутбука 13.3", 14", 15.6" дюймов и планшета с фиксатором на липучке.
• ВМЕСТИТЕЛЬНОСТЬ 22 ЛИТРА: Свободно вмещает формат А4, книги, сменную обувь и контейнер с ланчем.
• РУЧНАЯ КЛАДЬ В САМОЛЕТ: Габариты 44х30х14 см проходят калибраторы большинства авиакомпаний (включая Победу и S7).
• ЭРГОНОМИЧНАЯ СПИНКА: Анатомические дышащие вставки AirMesh и S-образные лямки равномерно распределяют вес.
• ВСТРОЕННЫЙ USB-ПОРТ: Удобная зарядка смартфона на ходу от вашего внешнего аккумулятора.

💼 СЦЕНАРИИ ИСПОЛЬЗОВАНИЯ:
Отлично подойдет как школьный рюкзак для старшеклассников, студенческий портфель, деловой ранец для офиса или спортивная сумка для тренировок. Прекрасный практичный подарок мужчине, мужу, сыну, брату на день рождения или 23 февраля.`,
        newKeywordsAdded: ['водонепроницаемый', 'ручная кладь', 'подарок мужчине', 'oxford 900d', 'школьный', 'для офиса'],
        infographicBriefs: [
          'Слайд 1: Обложка «Не промокает даже под ливнем + Защита ноутбука 15.6"»',
          'Слайд 3: Макро-фото капель воды на ткани Oxford с крупным шрифтом 18pt',
          'Слайд 6: Наглядный калибратор ручной клади 44х30х14 см',
        ],
        projectedScore: 96,
      },
    };
  }

  if (product.id === 'prod-1') {
    // Платье миди шелковое
    return {
      overallScore: 89,
      grade: 'optimal',
      lastAuditedAt: 'Сегодня, 11:20 (Синхронизировано)',
      keywordCoverage: {
        score: 91,
        status: 'good',
        titleKeywordsCount: 4,
        descriptionKeywordsCount: 12,
        primaryKeywordRank: 3,
        coveredKeywords: [
          { keyword: 'платье женское вечернее', searchVolume: 142000, density: '2.5%', inTitle: true, inDescription: true, relevance: 'HIGH', cluster: 'ВЧ' },
          { keyword: 'платье миди шелковое комбинация', searchVolume: 78000, density: '2.1%', inTitle: true, inDescription: true, relevance: 'HIGH', cluster: 'ВЧ' },
          { keyword: 'платье на бретелях праздничное', searchVolume: 42000, density: '1.8%', inTitle: false, inDescription: true, relevance: 'MEDIUM', cluster: 'СЧ' },
          { keyword: 'шелковое платье на выпускной', searchVolume: 31000, density: '1.4%', inTitle: false, inDescription: true, relevance: 'MEDIUM', cluster: 'СЧ' },
        ],
        missingKeywords: [
          { keyword: 'платье черное футляр комбинация', estimatedVolume: 22000, potentialTrafficGain: '+6%', reason: 'Дополнительный цветовой кластер' },
        ],
        recommendation: 'Семантическое ядро заполнено на 91%. Карточка держит ТОП-3. Рекомендуется только точечно освежить весенне-летние запросы.',
      },
      imageOptimization: {
        score: 92,
        status: 'good',
        totalSlides: 8,
        recommendedSlides: 8,
        hasInfographics: true,
        aspectRatio: '3:4 (WB Standard)',
        aspectRatioValid: true,
        contrastScore: 94,
        mobileReadability: 'passed',
        slides: [
          { slideIndex: 1, title: 'Главный кадр в движении', type: 'Обложка', status: 'optimal', notes: 'Шикарная динамика ткани, контрастный фон', previewUrl: product.image },
          { slideIndex: 2, title: 'Размерная сетка с сантиметрами', type: 'Размеры', status: 'optimal', notes: 'Четкие замеры по груди, талии, бедрам' },
          { slideIndex: 3, title: 'Шелковистая текстура Armano Silk', type: 'Ткань', status: 'optimal', notes: 'Крупный план благородного матового блеска' },
          { slideIndex: 4, title: 'Регулируемые бретели', type: 'Фурнитура', status: 'optimal', notes: 'Показана металлическая фурнитура' },
          { slideIndex: 5, title: 'Образ с жакетом и кедами', type: 'Стилизация', status: 'optimal', notes: 'Примеры повседневных и праздничных луков' },
        ],
        recommendation: 'Идеальная визуальная воронка. Все 8 слайдов отвечают на страхи покупателей.',
      },
      descriptionLength: {
        score: 85,
        status: 'good',
        characterCount: 1890,
        recommendedMinChars: 1500,
        recommendedMaxChars: 2500,
        wordCount: 238,
        keywordDensity: 2.4,
        optimalDensityRange: '2.2% — 2.8%',
        hasBulletPoints: true,
        hasUspSection: true,
        hasCareInstructions: true,
        sampleText: 'Изящное шелковое платье-комбинация миди длины с открытыми плечами и регулируемыми бретелями. Выполнено из плотного искусственного шелка высокой плотности.',
        recommendation: 'Длина и структура соответствуют стандартам маркетплейса.',
      },
    };
  }

  if (product.id === 'prod-2') {
    // Беспроводные наушники
    return {
      overallScore: 62,
      grade: 'needs_work',
      lastAuditedAt: 'Сегодня, 10:45',
      keywordCoverage: {
        score: 58,
        status: 'warning',
        titleKeywordsCount: 3,
        descriptionKeywordsCount: 6,
        primaryKeywordRank: 12,
        coveredKeywords: [
          { keyword: 'наушники беспроводные bluetooth', searchVolume: 320000, density: '1.2%', inTitle: true, inDescription: true, relevance: 'HIGH', cluster: 'ВЧ' },
          { keyword: 'наушники с шумоподавлением anc', searchVolume: 110000, density: '0.7%', inTitle: true, inDescription: true, relevance: 'HIGH', cluster: 'ВЧ' },
        ],
        missingKeywords: [
          { keyword: 'наушники для айфона и андроид', estimatedVolume: 145000, potentialTrafficGain: '+32%', reason: 'Высокочастотный запрос совместимости' },
          { keyword: 'беспроводная гарнитура с микрофоном', estimatedVolume: 84000, potentialTrafficGain: '+19%', reason: 'Офисные и игровые поисковые кластеры' },
        ],
        recommendation: 'Срочно внедрить фразы «для iPhone / Android» и «с чистым микрофоном» в заголовок и характеристики.',
      },
      imageOptimization: {
        score: 66,
        status: 'warning',
        totalSlides: 4,
        recommendedSlides: 7,
        hasInfographics: true,
        aspectRatio: '3:4',
        aspectRatioValid: true,
        contrastScore: 70,
        mobileReadability: 'warning',
        slides: [
          { slideIndex: 1, title: 'Обложка товара', type: 'Фото', status: 'optimal', notes: 'Хороший рендер кейса', previewUrl: product.image },
          { slideIndex: 2, title: 'Время работы 30 часов', type: 'Инфографика', status: 'optimal', notes: 'Понятный значок аккумулятора' },
          { slideIndex: 3, title: 'ANC Шумоподавление', type: 'Схема', status: 'warning', notes: 'Слишком сложная диаграмма децибел' },
          { slideIndex: 4, title: 'Комплектация', type: 'Фото', status: 'warning', notes: 'Не указан тип провода Type-C' },
        ],
        recommendation: 'Добавить 3 недостающих слайда: эргономика посадки в ухе, тест микрофона на улице и сравнение с аналогами.',
      },
      descriptionLength: {
        score: 62,
        status: 'warning',
        characterCount: 940,
        recommendedMinChars: 1500,
        recommendedMaxChars: 2500,
        wordCount: 118,
        keywordDensity: 1.1,
        optimalDensityRange: '2.2% — 2.8%',
        hasBulletPoints: true,
        hasUspSection: false,
        hasCareInstructions: false,
        sampleText: 'Беспроводные блютуз наушники с активным шумоподавлением. Чистый звук, глубокий бас и до 30 часов автономной работы с кейсом.',
        recommendation: 'Длина всего 940 символов. Алгоритмы WB пессимизируют короткие описания.',
      },
      aiAutoFixProposal: {
        optimizedTitle: 'Беспроводные наушники с микрофоном Bluetooth 5.3 для iPhone и Android с шумоподавлением ANC',
        optimizedDescription: `Погрузитесь в кристально чистое звучание с новыми беспроводными наушниками Pro. 

⚡ ГЛАВНЫЕ ПРЕИМУЩЕСТВА:
• АКТИВНОЕ ШУМОПОДАВЛЕНИЕ (ANC): Отсекает до 95% фонового шума метро, улицы и офиса.
• ЧИСТЫЙ МИКРОФОН С HD-ГОЛОСОМ: 4 встроенных микрофона с шумоподавлением ENC гарантируют разборчивую речь при звонках.
• 32 ЧАСА МУЗЫКИ: До 7 часов на одном заряде и еще 25 часов от компактного зарядного футляра Type-C.
• МГНОВЕННОЕ ПОДКЛЮЧЕНИЕ: Современный чип Bluetooth 5.3 обеспечивает стабильное соединение без задержек звука в играх и видео.
• СОВМЕСТИМОСТЬ 100%: Работают со всеми смартфонами iOS (Apple iPhone), Android (Samsung, Xiaomi, Realme, Honor), планшетами и ноутбуками.`,
        newKeywordsAdded: ['для iPhone и Android', 'Bluetooth 5.3', 'с микрофоном', 'ENC шумоподавление', 'TWS наушники'],
        infographicBriefs: ['Слайд с таблицей совместимости iOS/Android', 'Слайд с демонстрацией посадки в ухо 3 размеров амбушюр'],
        projectedScore: 95,
      }
    };
  }

  // Dynamic calculation for other products
  const baseScore = rank <= 5 ? 86 : rank <= 10 ? 76 : 67;
  const isHealthy = rankDelta >= 0 && rank <= 8;

  return {
    overallScore: isHealthy ? 82 : 70,
    grade: isHealthy ? 'good' : 'needs_work',
    lastAuditedAt: 'Сегодня, 12:00 (Автоматический аудит)',
    keywordCoverage: {
      score: isHealthy ? 84 : 68,
      status: isHealthy ? 'good' : 'warning',
      titleKeywordsCount: 3,
      descriptionKeywordsCount: 8,
      primaryKeywordRank: rank,
      coveredKeywords: [
        { keyword: product.mainKeyword, searchVolume: product.keywordVolume, density: '2.0%', inTitle: true, inDescription: true, relevance: 'HIGH', cluster: 'ВЧ' },
        { keyword: `${product.category.toLowerCase()} тренд`, searchVolume: Math.round(product.keywordVolume * 0.4), density: '1.2%', inTitle: false, inDescription: true, relevance: 'MEDIUM', cluster: 'СЧ' },
        { keyword: `купить ${product.name.split(' ')[0].toLowerCase()}`, searchVolume: Math.round(product.keywordVolume * 0.25), density: '0.9%', inTitle: false, inDescription: true, relevance: 'MEDIUM', cluster: 'СЧ' },
      ],
      missingKeywords: [
        { keyword: `премиум ${product.category.toLowerCase()} оригинал`, estimatedVolume: Math.round(product.keywordVolume * 0.3), potentialTrafficGain: '+18%', reason: 'Высококонверсионный коммерческий запрос' },
        { keyword: `подарок 2025 новинка`, estimatedVolume: Math.round(product.keywordVolume * 0.2), potentialTrafficGain: '+12%', reason: 'Сезонный расширитель аудитории' },
      ],
      recommendation: `Расширить семантическое ядро товара «${product.name}» за счет среднечастотных поисковых хвостов.`,
    },
    imageOptimization: {
      score: isHealthy ? 84 : 74,
      status: isHealthy ? 'good' : 'warning',
      totalSlides: 6,
      recommendedSlides: isWB ? 8 : 7,
      hasInfographics: true,
      aspectRatio: isWB ? '3:4 (WB Standard)' : '1:1 (Ozon/Shopify)',
      aspectRatioValid: true,
      contrastScore: 82,
      mobileReadability: 'passed',
      slides: [
        { slideIndex: 1, title: 'Главная обложка', type: 'Hero-фото', status: 'optimal', notes: 'Высокое разрешение и центрирование', previewUrl: product.image },
        { slideIndex: 2, title: 'Ключевые преимущества', type: 'Инфографика', status: 'optimal', notes: 'Выделены 3 главных УТП' },
        { slideIndex: 3, title: 'Габариты и замеры', type: 'Схема', status: isHealthy ? 'optimal' : 'warning', notes: 'Рекомендуется добавить сравнение с рукой/предметом' },
        { slideIndex: 4, title: 'Детали и качество', type: 'Макро-съемка', status: 'optimal', notes: 'Демонстрация швов и материала' },
      ],
      recommendation: 'Добавить 2 слайда с видео-обзором и демонстрацией заводской защитной упаковки.',
    },
    descriptionLength: {
      score: isHealthy ? 78 : 66,
      status: isHealthy ? 'good' : 'warning',
      characterCount: 1350,
      recommendedMinChars: 1500,
      recommendedMaxChars: 2500,
      wordCount: 172,
      keywordDensity: 1.7,
      optimalDensityRange: '2.2% — 2.8%',
      hasBulletPoints: true,
      hasUspSection: true,
      hasCareInstructions: true,
      sampleText: `${product.name} — надежный выбор в категории ${product.category}. Изготовлен из качественных материалов с гарантией производителя.`,
      recommendation: 'Увеличить объем описания на 300–500 символов, добавив сценарии использования и ответы на частые вопросы покупателей.',
    },
    aiAutoFixProposal: {
      optimizedTitle: `${product.name} премиум качество оригинал для подарка`,
      optimizedDescription: `Оригинальный товар «${product.name}» разработан для максимального комфорта и надежности. 

✨ КЛЮЧЕВЫЕ ХАРАКТЕРИСТИКИ:
• ПРЕМИАЛЬНЫЕ МАТЕРИАЛЫ: Долговечность и износостойкость.
• ПРОВЕРКА КАЧЕСТВА: Каждый экземпляр проходит ручной контроль перед отправкой.
• БЫСТРАЯ ДОСТАВКА: Отгрузка с ключевых складов маркетплейса за 24 часа.`,
      newKeywordsAdded: ['премиум качество', 'оригинал', 'быстрая доставка'],
      infographicBriefs: ['Слайд с сертификатами соответствия', 'Слайд с подарком внутри упаковки'],
      projectedScore: 94,
    }
  };
}
