import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Sparkles, 
  ChevronDown, 
  Check, 
  Package, 
  X, 
  Tag, 
  ShieldAlert, 
  RotateCcw, 
  CheckSquare, 
  Square, 
  MinusSquare, 
  DollarSign, 
  Truck, 
  Bot, 
  Copy, 
  Sliders, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Percent,
  Zap,
  BarChart3,
  Scale,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download
} from 'lucide-react';
import { Product, BusinessRule } from '../types';
import { ProductContentHealthCard } from './ProductContentHealthCard';
import { BatchSeoModal } from './BatchSeoModal';
import { BatchMarginFloorModal } from './BatchMarginFloorModal';
import { CompetitorBenchmarkingWidget } from './CompetitorBenchmarkingWidget';
import { CompetitorBenchmarkModal } from './CompetitorBenchmarkModal';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter, Button, Badge, Input, Select } from './ui';

interface Props {
  products: Product[];
  onAskAiAboutProduct: (product: Product) => void;
  onAskAiAboutMultipleProducts?: (selectedProducts: Product[]) => void;
  onUpdateProductPrice: (productId: string, newPrice: number) => void;
  onRestockProduct: (productId: string, amount: number) => void;
  onBatchUpdatePrices?: (updates: { productId: string; newPrice: number }[], reasonDescription?: string) => void;
  onBatchRestock?: (updates: { productId: string; amount: number; isFbs?: boolean }[], reasonDescription?: string) => void;
  onBatchApplySeo?: (updates: { productId: string; newTitle: string; newDescription: string; addedKeywords: string[] }[], reasonDescription?: string) => void;
  onAddRule?: (rule: Omit<BusinessRule, 'id'>) => void;
  onInspectContentHealth?: (product: Product) => void;
  onApplyAiFix?: (productId: string, updatedTitle: string, updatedDescription: string, addedKeywords: string[]) => void;
  initialSearchTerm?: string;
}

export type StockHealthFilter = 'all' | 'critical' | 'warning' | 'healthy' | 'overstock';

export function getProductStockHealth(daysLeft: number, status?: string): {
  key: 'critical' | 'warning' | 'healthy' | 'overstock';
  label: string;
  badgeClass: string;
  dotClass: string;
  shortText: string;
} {
  if (daysLeft <= 5 || status === 'low_stock') {
    return {
      key: 'critical',
      label: 'Критичный (<5 дн.)',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      dotClass: 'bg-rose-500 animate-pulse',
      shortText: 'Критично',
    };
  }
  if (daysLeft <= 14) {
    return {
      key: 'warning',
      label: 'Риск (5–14 дн.)',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      dotClass: 'bg-amber-500',
      shortText: 'Внимание',
    };
  }
  if (daysLeft <= 45) {
    return {
      key: 'healthy',
      label: 'Оптимальный',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500',
      shortText: 'Норма',
    };
  }
  return {
    key: 'overstock',
    label: 'Избыток (>45 дн.)',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dotClass: 'bg-indigo-500',
    shortText: 'Избыток',
  };
}

export const CatalogTable: React.FC<Props> = ({
  products,
  onAskAiAboutProduct,
  onAskAiAboutMultipleProducts,
  onUpdateProductPrice,
  onRestockProduct,
  onBatchUpdatePrices,
  onBatchRestock,
  onBatchApplySeo,
  onAddRule,
  onInspectContentHealth,
  onApplyAiFix,
  initialSearchTerm,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');

  useEffect(() => {
    if (initialSearchTerm !== undefined) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);
  const [filterPlatform, setFilterPlatform] = useState<'all' | '1688' | 'taobao' | 'jd' | 'pinduoduo' | 'wb' | 'ozon' | 'shopify'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStockHealth, setFilterStockHealth] = useState<StockHealthFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');
  const [benchmarkingProduct, setBenchmarkingProduct] = useState<Product | null>(null);

  // Sorting & Quick Segment State
  const [sortField, setSortField] = useState<'name' | 'rank' | 'price' | 'stock' | 'margin' | 'drr' | 'content'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [quickSegment, setQuickSegment] = useState<'all' | 'critical' | 'undercut' | 'top10' | 'high_margin'>('all');

  const handleSort = (field: 'name' | 'rank' | 'price' | 'stock' | 'margin' | 'drr' | 'content') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'rank' || field === 'drr' ? 'asc' : 'desc');
    }
  };

  // Multi-row Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBatchPriceModalOpen, setIsBatchPriceModalOpen] = useState(false);
  const [isBatchRestockModalOpen, setIsBatchRestockModalOpen] = useState(false);
  const [isBatchSeoModalOpen, setIsBatchSeoModalOpen] = useState(false);
  const [isBatchMarginFloorModalOpen, setIsBatchMarginFloorModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [exportFeedback, setExportFeedback] = useState(false);

  // Batch Price Modal State
  const [priceAdjustmentType, setPriceAdjustmentType] = useState<'percent_discount' | 'percent_increase' | 'fixed_discount' | 'fixed_increase' | 'match_competitor' | 'set_fixed'>('percent_discount');
  const [priceAdjustmentValue, setPriceAdjustmentValue] = useState<number>(5);

  // Batch Restock Modal State
  const [restockMode, setRestockMode] = useState<'add_fixed' | 'target_days' | 'fbs_backup'>('add_fixed');
  const [restockAmount, setRestockAmount] = useState<number>(100);
  const [targetDaysCount, setTargetDaysCount] = useState<number>(30);
  const [targetWarehouse, setTargetWarehouse] = useState<string>('FBO Коледино (WB)');

  // Extract all unique categories present in the products catalog
  const categories = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => p.category))).filter((c): c is string => Boolean(c));
    return list.sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Real-time keyword, segment & facet filter across multiple dimensions with sorting
  const filtered = useMemo(() => {
    const list = products.filter((p) => {
      const query = searchTerm.toLowerCase().trim();

      // Quick Segment filtering
      if (quickSegment === 'critical' && p.daysLeft > 7 && p.status !== 'low_stock') {
        return false;
      }
      if (quickSegment === 'undercut' && p.price <= p.competitorPrice) {
        return false;
      }
      if (quickSegment === 'top10' && p.searchRank > 10) {
        return false;
      }
      if (quickSegment === 'high_margin' && p.margin < 40) {
        return false;
      }

      // Keyword match evaluation
      const matchesKeywordSearch = !query || (() => {
        if (
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.mainKeyword.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.marketplace.toLowerCase().includes(query)
        ) {
          return true;
        }

        const health = getProductStockHealth(p.daysLeft, p.status);
        if (health.label.toLowerCase().includes(query) || health.shortText.toLowerCase().includes(query)) {
          return true;
        }

        const criticalSynonyms = ['критич', 'дефицит', 'заканч', 'мало', 'out of stock', 'out-of-stock', 'oos', 'low stock', 'low_stock', 'low'];
        if (criticalSynonyms.some((s) => query.includes(s)) && (p.daysLeft <= 5 || p.status === 'low_stock')) {
          return true;
        }

        const warningSynonyms = ['риск', 'внимани', 'warning', 'risk', 'предупрежд', 'на исходе'];
        if (warningSynonyms.some((s) => query.includes(s)) && p.daysLeft > 5 && p.daysLeft <= 14) {
          return true;
        }

        const healthySynonyms = ['норм', 'здоров', 'оптим', 'хватает', 'стабильн', 'safe', 'healthy', 'good', 'растущ'];
        if (healthySynonyms.some((s) => query.includes(s)) && p.daysLeft > 14 && p.daysLeft <= 45) {
          return true;
        }

        const overstockSynonyms = ['избыт', 'профицит', 'много', 'overstock', 'запас'];
        if (overstockSynonyms.some((s) => query.includes(s)) && p.daysLeft > 45) {
          return true;
        }

        if ((query === 'вб' || query === 'вайлдберриз' || query === 'wildberries') && p.marketplace === 'wb') return true;
        if ((query === 'озон' || query === 'ozon') && p.marketplace === 'ozon') return true;
        if ((query === 'шопифай' || query === 'shopify') && p.marketplace === 'shopify') return true;
        if ((query === '1688' || query === 'али' || query === 'фабрика' || query === 'опт') && p.marketplace === '1688') return true;
        if ((query === 'taobao' || query === 'таобао' || query === 'тао' || query === 'tmall') && p.marketplace === 'taobao') return true;
        if ((query === 'jd' || query === 'джиди' || query === 'цзиндун') && p.marketplace === 'jd') return true;
        if ((query === 'pdd' || query === 'пиндуодуо' || query === 'pinduoduo') && p.marketplace === 'pinduoduo') return true;
        if ((query === 'китай' || query === 'china' || query === 'кнр') && ['1688', 'taobao', 'jd', 'pinduoduo'].includes(p.marketplace)) return true;

        return false;
      })();

      const matchesPlatform = filterPlatform === 'all' || p.marketplace === filterPlatform;
      const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
      const matchesStockHealth = (() => {
        if (filterStockHealth === 'all') return true;
        const health = getProductStockHealth(p.daysLeft, p.status);
        return health.key === filterStockHealth;
      })();

      return matchesKeywordSearch && matchesPlatform && matchesCategory && matchesStockHealth;
    });

    // Apply Sorting
    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name, 'ru');
      } else if (sortField === 'rank') {
        comparison = a.searchRank - b.searchRank;
      } else if (sortField === 'price') {
        comparison = a.price - b.price;
      } else if (sortField === 'stock') {
        comparison = a.daysLeft - b.daysLeft;
      } else if (sortField === 'margin') {
        comparison = a.margin - b.margin;
      } else if (sortField === 'drr') {
        comparison = a.drr - b.drr;
      } else if (sortField === 'content') {
        const scoreA = a.id === 'prod-7' ? 68 : a.id === 'prod-1' ? 89 : a.id === 'prod-2' ? 62 : a.searchRank <= 5 ? 86 : 74;
        const scoreB = b.id === 'prod-7' ? 68 : b.id === 'prod-1' ? 89 : b.id === 'prod-2' ? 62 : b.searchRank <= 5 ? 86 : 74;
        comparison = scoreA - scoreB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [products, searchTerm, filterPlatform, filterCategory, filterStockHealth, quickSegment, sortField, sortOrder]);

  // Statistics for Quick-Pill counters
  const stockCounts = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let healthy = 0;
    let overstock = 0;
    products.forEach((p) => {
      const h = getProductStockHealth(p.daysLeft, p.status);
      if (h.key === 'critical') critical++;
      else if (h.key === 'warning') warning++;
      else if (h.key === 'healthy') healthy++;
      else if (h.key === 'overstock') overstock++;
    });
    return { critical, warning, healthy, overstock, total: products.length };
  }, [products]);

  // Selected products list
  const selectedProducts = useMemo(() => {
    return products.filter((p) => selectedProductIds.includes(p.id));
  }, [products, selectedProductIds]);

  const hasActiveFilters = searchTerm !== '' || filterPlatform !== 'all' || filterCategory !== 'all' || filterStockHealth !== 'all';

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterPlatform('all');
    setFilterCategory('all');
    setFilterStockHealth('all');
  };

  const handleStartEditPrice = (p: Product) => {
    setEditingPriceId(p.id);
    setTempPrice(p.price.toString());
  };

  const handleSavePrice = (productId: string) => {
    const num = parseInt(tempPrice, 10);
    if (!isNaN(num) && num > 0) {
      onUpdateProductPrice(productId, num);
    }
    setEditingPriceId(null);
  };

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedProductIds.length === filtered.length && filtered.length > 0) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filtered.map((p) => p.id));
    }
  };

  const handleToggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectLowStock = () => {
    const lowStockIds = products
      .filter((p) => p.daysLeft <= 14 || p.status === 'low_stock')
      .map((p) => p.id);
    setSelectedProductIds(lowStockIds);
  };

  const handleSelectUndercut = () => {
    const undercutIds = products
      .filter((p) => p.price > p.competitorPrice)
      .map((p) => p.id);
    setSelectedProductIds(undercutIds);
  };

  const handleSelectLowMargin = () => {
    const lowMarginIds = products.filter((p) => p.margin < 25).map((p) => p.id);
    setSelectedProductIds(lowMarginIds);
  };

  const handleSelectLowSeo = () => {
    const lowSeoIds = products.filter((p) => {
      const score = p.id === 'prod-7' ? 68 : p.id === 'prod-1' ? 89 : p.id === 'prod-2' ? 62 : p.searchRank <= 5 ? 86 : 74;
      return score < 80 || p.searchRank > 10;
    }).map((p) => p.id);
    setSelectedProductIds(lowSeoIds);
  };

  const handleCopySkus = () => {
    const text = selectedProducts.map((p) => `${p.name} (${p.sku})`).join('\n');
    navigator.clipboard?.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleExportCsv = () => {
    const itemsToExport = selectedProducts.length > 0 ? selectedProducts : filtered;
    const headers = ['ID', 'SKU', 'Название', 'Маркетплейс', 'Категория', 'Цена (₽)', 'Конкурент (₽)', 'Себестоимость (₽)', 'Маржа (%)', 'Запас FBO (шт)', 'Запас (дней)', 'Позиция в поиске', 'DRR (%)'];
    const rows = itemsToExport.map((p) => [
      p.id,
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      p.marketplace.toUpperCase(),
      `"${p.category || ''}"`,
      p.price,
      p.competitorPrice,
      p.costPrice,
      p.margin,
      p.stockFbo,
      p.daysLeft,
      p.searchRank,
      p.drr,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `catalog_export_${itemsToExport.length}_skus.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportFeedback(true);
    setTimeout(() => setExportFeedback(false), 2500);
  };

  const handleApplyBatchMarginFloor = (
    rule: Omit<BusinessRule, 'id'>,
    elevatedPrices?: { productId: string; newPrice: number }[],
    reasonDescription?: string
  ) => {
    if (onAddRule) {
      onAddRule(rule);
    }
    if (elevatedPrices && elevatedPrices.length > 0 && onBatchUpdatePrices) {
      onBatchUpdatePrices(elevatedPrices, reasonDescription);
    }
    setIsBatchMarginFloorModalOpen(false);
    setSelectedProductIds([]);
  };

  // Calculations for batch price modal
  const calculatedBatchPrices = useMemo(() => {
    return selectedProducts.map((p) => {
      let newPrice = p.price;
      if (priceAdjustmentType === 'percent_discount') {
        newPrice = Math.round(p.price * (1 - priceAdjustmentValue / 100));
      } else if (priceAdjustmentType === 'percent_increase') {
        newPrice = Math.round(p.price * (1 + priceAdjustmentValue / 100));
      } else if (priceAdjustmentType === 'fixed_discount') {
        newPrice = Math.max(p.costPrice, p.price - priceAdjustmentValue);
      } else if (priceAdjustmentType === 'fixed_increase') {
        newPrice = p.price + priceAdjustmentValue;
      } else if (priceAdjustmentType === 'match_competitor') {
        newPrice = p.competitorPrice;
      } else if (priceAdjustmentType === 'set_fixed') {
        newPrice = Math.max(100, priceAdjustmentValue);
      }

      // Projected Margin calculation
      const marketplaceFee = Math.round(newPrice * 0.23); // approx 23% MP commission + logistics
      const projectedProfit = newPrice - p.costPrice - marketplaceFee;
      const projectedMargin = Math.round((projectedProfit / newPrice) * 100);

      return {
        product: p,
        oldPrice: p.price,
        newPrice,
        priceDiff: newPrice - p.price,
        projectedMargin,
        isMarginRisk: projectedMargin < 18,
      };
    });
  }, [selectedProducts, priceAdjustmentType, priceAdjustmentValue]);

  const handleApplyBatchPrices = () => {
    const updates = calculatedBatchPrices.map((item) => ({
      productId: item.product.id,
      newPrice: item.newPrice,
    }));

    if (onBatchUpdatePrices) {
      const typeLabel = 
        priceAdjustmentType === 'percent_discount' ? `Скидка -${priceAdjustmentValue}%` :
        priceAdjustmentType === 'percent_increase' ? `Повышение +${priceAdjustmentValue}%` :
        priceAdjustmentType === 'fixed_discount' ? `Скидка -${priceAdjustmentValue} ₽` :
        priceAdjustmentType === 'fixed_increase' ? `Повышение +${priceAdjustmentValue} ₽` :
        priceAdjustmentType === 'match_competitor' ? 'Выравнивание по конкурентам' : `Единая цена ${priceAdjustmentValue} ₽`;

      onBatchUpdatePrices(updates, `Пакетное обновление (${typeLabel}) для ${updates.length} артикулов`);
    } else {
      updates.forEach((u) => onUpdateProductPrice(u.productId, u.newPrice));
    }

    setIsBatchPriceModalOpen(false);
    setSelectedProductIds([]);
  };

  // Calculations for batch restock modal
  const calculatedBatchRestock = useMemo(() => {
    return selectedProducts.map((p) => {
      let unitsToAdd = restockAmount;
      if (restockMode === 'target_days') {
        const requiredUnits = targetDaysCount * Math.max(1, p.dailyOrders);
        unitsToAdd = Math.max(30, requiredUnits - p.stockFbo);
      } else if (restockMode === 'fbs_backup') {
        unitsToAdd = Math.round(p.dailyOrders * 14); // 2 weeks backup
      }

      const newFbo = restockMode === 'fbs_backup' ? p.stockFbo : p.stockFbo + unitsToAdd;
      const newDays = Math.round(newFbo / Math.max(1, p.dailyOrders));

      return {
        product: p,
        unitsToAdd,
        newFbo,
        newDays,
        currentDays: p.daysLeft,
      };
    });
  }, [selectedProducts, restockMode, restockAmount, targetDaysCount]);

  const totalRestockUnits = useMemo(() => {
    return calculatedBatchRestock.reduce((acc, curr) => acc + curr.unitsToAdd, 0);
  }, [calculatedBatchRestock]);

  const handleApplyBatchRestock = () => {
    const updates = calculatedBatchRestock.map((item) => ({
      productId: item.product.id,
      amount: item.unitsToAdd,
      isFbs: restockMode === 'fbs_backup',
    }));

    if (onBatchRestock) {
      onBatchRestock(
        updates,
        `Пакетная поставка на ${targetWarehouse}: +${totalRestockUnits} шт для ${updates.length} товаров`
      );
    } else {
      updates.forEach((u) => onRestockProduct(u.productId, u.amount));
    }

    setIsBatchRestockModalOpen(false);
    setSelectedProductIds([]);
  };

  const isAllFilteredSelected = filtered.length > 0 && selectedProductIds.length === filtered.length;
  const isIndeterminate = selectedProductIds.length > 0 && selectedProductIds.length < filtered.length;

  return (
    <div 
      id="catalog-table-module"
      className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs relative"
    >
      {/* Top Header & Overview */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Каталог товаров и управление остатками
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {filtered.length} из {products.length}
                </span>
                {selectedProductIds.length > 0 && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs">
                    Выбрано: {selectedProductIds.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Синхронизировано со складами FBO Коледино, Хоругвино, Казань и Франкфурт
              </p>
            </div>
          </div>
        </div>

        {/* Real-Time Keyword Search Field */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
            <input
              id="catalog-search-input"
              type="text"
              placeholder="Поиск по товару, SKU, категории, стоку..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 placeholder-slate-400 text-xs pl-9 pr-8 py-2 rounded-xl transition-all shadow-2xs focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                title="Очистить поиск"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              id="catalog-reset-filters-btn"
              onClick={handleResetFilters}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 shrink-0"
              title="Сбросить все фильтры"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Сброс</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar: Categories, Stock Health Status & Marketplace Badges */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 space-y-3">
        {/* Row 1: Stock Health Status Quick-Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              Здоровье стока:
            </span>

            <button
              id="filter-stock-all-btn"
              onClick={() => setFilterStockHealth('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                filterStockHealth === 'all'
                  ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Все остатки ({stockCounts.total})
            </button>

            <button
              id="filter-stock-critical-btn"
              onClick={() => setFilterStockHealth('critical')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                filterStockHealth === 'critical'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                  : 'bg-rose-50/80 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
              <span>Критично &lt;5 дн.</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                filterStockHealth === 'critical' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-800'
              }`}>
                {stockCounts.critical}
              </span>
            </button>

            <button
              id="filter-stock-warning-btn"
              onClick={() => setFilterStockHealth('warning')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                filterStockHealth === 'warning'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-amber-50/80 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span>Риск 5–14 дн.</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                filterStockHealth === 'warning' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
              }`}>
                {stockCounts.warning}
              </span>
            </button>

            <button
              id="filter-stock-healthy-btn"
              onClick={() => setFilterStockHealth('healthy')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                filterStockHealth === 'healthy'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-emerald-50/80 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Оптимальный (15+ дн.)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                filterStockHealth === 'healthy' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-800'
              }`}>
                {stockCounts.healthy}
              </span>
            </button>
          </div>

          {/* Marketplace Badges */}
          <div className="flex flex-wrap items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
            <button
              id="filter-platform-all"
              onClick={() => setFilterPlatform('all')}
              className={`px-2 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                filterPlatform === 'all' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Все
            </button>
            <button
              id="filter-platform-1688"
              onClick={() => setFilterPlatform('1688')}
              className={`px-2 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 ${
                filterPlatform === '1688' ? 'bg-amber-600 text-white font-bold' : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              <span>🇨🇳</span>
              <span>1688</span>
            </button>
            <button
              id="filter-platform-taobao"
              onClick={() => setFilterPlatform('taobao')}
              className={`px-2 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 ${
                filterPlatform === 'taobao' ? 'bg-orange-600 text-white font-bold' : 'text-slate-600 hover:text-orange-700'
              }`}
            >
              <span>🇨🇳</span>
              <span>Taobao</span>
            </button>
            <button
              id="filter-platform-jd"
              onClick={() => setFilterPlatform('jd')}
              className={`px-2 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 ${
                filterPlatform === 'jd' ? 'bg-red-600 text-white font-bold' : 'text-slate-600 hover:text-red-700'
              }`}
            >
              <span>🇨🇳</span>
              <span>JD</span>
            </button>
            <button
              id="filter-platform-pdd"
              onClick={() => setFilterPlatform('pinduoduo')}
              className={`px-2 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 ${
                filterPlatform === 'pinduoduo' ? 'bg-rose-600 text-white font-bold' : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <span>🇨🇳</span>
              <span>PDD</span>
            </button>
            <button
              id="filter-platform-wb"
              onClick={() => setFilterPlatform('wb')}
              className={`px-2 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 ${
                filterPlatform === 'wb' ? 'bg-purple-600 text-white font-bold' : 'text-slate-600 hover:text-purple-700'
              }`}
            >
              <span>🇷🇺</span>
              <span>WB</span>
            </button>
            <button
              id="filter-platform-ozon"
              onClick={() => setFilterPlatform('ozon')}
              className={`px-2 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 ${
                filterPlatform === 'ozon' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              <span>🇷🇺</span>
              <span>Ozon</span>
            </button>
            <button
              id="filter-platform-shopify"
              onClick={() => setFilterPlatform('shopify')}
              className={`px-2 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 ${
                filterPlatform === 'shopify' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-600 hover:text-emerald-800'
              }`}
            >
              <span>🌐</span>
              <span>Shopify</span>
            </button>
          </div>
        </div>

        {/* Row 2: Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              Категории:
            </span>

            <button
              id="filter-category-all"
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                filterCategory === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Все категории
            </button>

            {categories.map((cat) => {
              const catCount = products.filter((p) => p.category === cat).length;
              const isSelected = filterCategory === cat;
              return (
                <button
                  key={cat}
                  id={`filter-category-${cat}`}
                  onClick={() => setFilterCategory(isSelected ? 'all' : cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {catCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Row Selection Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400">Быстрый выбор:</span>
            <button
              onClick={handleSelectLowStock}
              className="text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
            >
              Дефицит стока
            </button>
            <button
              onClick={handleSelectUndercut}
              className="text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
            >
              Демпинг
            </button>
            <button
              onClick={handleSelectLowMargin}
              className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
            >
              Низкая маржа (&lt;25%)
            </button>
            <button
              onClick={handleSelectLowSeo}
              className="text-[11px] font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
            >
              Слабое SEO
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Criteria Summary (when active) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
          <span className="font-semibold text-slate-700">Активные фильтры:</span>
          
          {searchTerm && (
            <span className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-800 px-2.5 py-0.5 rounded-lg text-xs font-medium shadow-2xs">
              Ключевое слово: <strong className="text-indigo-600 font-bold">"{searchTerm}"</strong>
              <button onClick={() => setSearchTerm('')} className="hover:text-rose-600 ml-0.5 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterCategory !== 'all' && (
            <span className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-800 px-2.5 py-0.5 rounded-lg text-xs font-medium shadow-2xs">
              Категория: <strong className="text-indigo-600 font-bold">{filterCategory}</strong>
              <button onClick={() => setFilterCategory('all')} className="hover:text-rose-600 ml-0.5 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterStockHealth !== 'all' && (
            <span className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-800 px-2.5 py-0.5 rounded-lg text-xs font-medium shadow-2xs">
              Здоровье стока: <strong className="text-indigo-600 font-bold">
                {filterStockHealth === 'critical' ? 'Критично (<5 дн.)' : filterStockHealth === 'warning' ? 'Риск (5-14 дн.)' : 'Оптимальный'}
              </strong>
              <button onClick={() => setFilterStockHealth('all')} className="hover:text-rose-600 ml-0.5 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterPlatform !== 'all' && (
            <span className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-800 px-2.5 py-0.5 rounded-lg text-xs font-medium shadow-2xs">
              Платформа: <strong className="text-indigo-600 font-bold">{filterPlatform.toUpperCase()}</strong>
              <button onClick={() => setFilterPlatform('all')} className="hover:text-rose-600 ml-0.5 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={handleResetFilters}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline ml-auto cursor-pointer"
          >
            Сбросить все
          </button>
        </div>
      )}

      {/* Quick Segment Presets Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs select-none">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 shrink-0">
          Сегменты:
        </span>
        <button
          id="segment-all"
          onClick={() => setQuickSegment('all')}
          className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            quickSegment === 'all'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          ⚡ Все ({products.length})
        </button>
        <button
          id="segment-critical"
          onClick={() => setQuickSegment('critical')}
          className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            quickSegment === 'critical'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-rose-700 hover:bg-rose-50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>Дефицит стока ({stockCounts.critical + stockCounts.warning})</span>
        </button>
        <button
          id="segment-undercut"
          onClick={() => setQuickSegment('undercut')}
          className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            quickSegment === 'undercut'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-amber-800 hover:bg-amber-50'
          }`}
        >
          📉 Демпинг конкурентов
        </button>
        <button
          id="segment-top10"
          onClick={() => setQuickSegment('top10')}
          className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            quickSegment === 'top10'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-indigo-700 hover:bg-indigo-50'
          }`}
        >
          🏆 ТОП-10 выдачи
        </button>
        <button
          id="segment-margin"
          onClick={() => setQuickSegment('high_margin')}
          className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            quickSegment === 'high_margin'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          💎 Маржа &gt;40%
        </button>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-semibold select-none">
              {/* Checkbox All */}
              <th className="py-3 px-3 w-10 text-center">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="p-1 rounded text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer flex items-center justify-center mx-auto"
                  title={isAllFilteredSelected ? 'Снять выделение со всех' : 'Выбрать все отфильтрованные'}
                >
                  {isAllFilteredSelected ? (
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                  ) : isIndeterminate ? (
                    <MinusSquare className="w-4 h-4 text-indigo-500" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </th>
              
              {/* Sortable Headers */}
              <th 
                onClick={() => handleSort('name')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors group/th"
                title="Сортировать по названию"
              >
                <div className="flex items-center gap-1.5">
                  <span>Товар & SKU</span>
                  {sortField === 'name' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>

              <th className="py-3 px-3">Категория</th>

              <th 
                onClick={() => handleSort('content')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors group/th"
                title="Сортировать по Content Health"
              >
                <div className="flex items-center gap-1.5">
                  <span>Content Health</span>
                  {sortField === 'content' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>

              <th 
                onClick={() => handleSort('rank')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors group/th"
                title="Сортировать по поисковой позиции"
              >
                <div className="flex items-center gap-1.5">
                  <span>Позиция в поиске</span>
                  {sortField === 'rank' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>

              <th 
                onClick={() => handleSort('price')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors group/th"
                title="Сортировать по цене"
              >
                <div className="flex items-center gap-1.5">
                  <span>Цена vs Конкурент</span>
                  {sortField === 'price' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>

              <th 
                onClick={() => handleSort('stock')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors group/th"
                title="Сортировать по дням запаса стока"
              >
                <div className="flex items-center gap-1.5">
                  <span>Остаток & Здоровье стока</span>
                  {sortField === 'stock' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>

              <th 
                onClick={() => handleSort('margin')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors group/th"
                title="Сортировать по маржинальности"
              >
                <div className="flex items-center gap-1.5">
                  <span>Маржа / ДРР</span>
                  {sortField === 'margin' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>

              <th className="py-3 px-4 text-right">AI Действие</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <div className="max-w-sm mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                      <Search className="w-6 h-6" />
                    </div>
                    <div className="font-bold text-slate-800 text-sm">Товары не найдены</div>
                    <p className="text-xs text-slate-500">
                      По запросу <span className="font-semibold text-slate-700">"{searchTerm || filterCategory || filterStockHealth}"</span> ничего не найдено в текущем каталоге.
                    </p>
                    <button
                      onClick={handleResetFilters}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Сбросить фильтры</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const isExpanded = expandedId === p.id;
                const isSelected = selectedProductIds.includes(p.id);
                const contentScore = p.id === 'prod-7' ? 68 : p.id === 'prod-1' ? 89 : p.id === 'prod-2' ? 62 : p.searchRank <= 5 ? 86 : 74;
                const stockHealth = getProductStockHealth(p.daysLeft, p.status);

                return (
                  <React.Fragment key={p.id}>
                    <tr 
                      id={`product-row-${p.id}`}
                      className={`transition-colors group ${
                        isSelected 
                          ? 'bg-indigo-50/50 hover:bg-indigo-50/80 border-l-4 border-l-indigo-600' 
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Checkbox Column */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          id={`checkbox-prod-${p.id}`}
                          onClick={(e) => handleToggleSelectRow(p.id, e)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer flex items-center justify-center mx-auto"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Product Name & SKU */}
                      <td className="py-3 px-3">
                        <div 
                          onClick={() => onInspectContentHealth?.(p)}
                          className="flex items-center gap-3 cursor-pointer group/item"
                          title="Нажмите, чтобы открыть автоматический Content Health аудит"
                        >
                          <div className="relative shrink-0">
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-11 h-11 rounded-lg object-cover border border-slate-200 group-hover/item:border-indigo-500 transition-colors"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[8px] font-bold px-1 rounded-sm opacity-0 group-hover/item:opacity-100 transition-opacity">
                              CHECK
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                p.marketplace === 'wb' 
                                   ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                                   : p.marketplace === 'ozon'
                                   ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                   : p.marketplace === '1688'
                                   ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                   : p.marketplace === 'taobao'
                                   ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                   : p.marketplace === 'jd'
                                   ? 'bg-red-50 text-red-700 border border-red-200'
                                   : p.marketplace === 'pinduoduo'
                                   ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                   : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}>
                                {p.marketplace === '1688' ? '🇨🇳 1688' : p.marketplace === 'taobao' ? '🇨🇳 TAOBAO' : p.marketplace === 'jd' ? '🇨🇳 JD' : p.marketplace === 'pinduoduo' ? '🇨🇳 PDD' : p.marketplace === 'wb' ? '🇷🇺 WB' : p.marketplace === 'ozon' ? '🇷🇺 OZON' : '🌐 SHOPIFY'}
                              </span>
                              <span className="font-mono text-[11px] text-slate-500 truncate">
                                {p.sku}
                              </span>
                              {p.factoryCity && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded border border-slate-200">
                                  🏭 {p.factoryCity}
                                </span>
                              )}
                              {p.moq && (
                                <span className="text-[10px] bg-amber-50 text-amber-700 px-1 rounded border border-amber-200">
                                  MOQ: {p.moq} шт
                                </span>
                              )}
                            </div>
                            <div className="font-semibold text-slate-900 group-hover/item:text-indigo-600 truncate max-w-[180px] sm:max-w-xs mt-0.5 transition-colors">
                              {p.name}
                            </div>
                            {p.productTitleCn && (
                              <div className="text-[10px] text-slate-400 font-sans truncate max-w-[200px]">
                                {p.productTitleCn}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-500">
                              ★ {p.rating} ({p.reviewsCount} отз.) • {p.dailyOrders} зак/день
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category Tag (Clickable to filter) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <button
                          onClick={() => setFilterCategory(filterCategory === p.category ? 'all' : p.category)}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 text-[11px] font-medium text-slate-700 transition-colors cursor-pointer"
                          title={`Изолировать категорию "${p.category}"`}
                        >
                          {p.category}
                        </button>
                      </td>

                      {/* Content Health Score Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <button
                          id={`content-health-btn-${p.id}`}
                          onClick={() => onInspectContentHealth?.(p)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-105 ${
                            contentScore >= 80 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                              : contentScore >= 65
                              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 animate-pulse'
                          }`}
                          title="Автоматический аудит: ключевые слова, фото и описание"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-600" />
                          <span>{contentScore}%</span>
                          <span className="text-[9px] font-normal text-slate-500 hidden sm:inline">Аудит</span>
                        </button>
                      </td>

                      {/* Search Rank */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <span>#{p.searchRank}</span>
                          {p.searchRankDelta > 0 ? (
                            <span className="text-emerald-600 text-[10px] font-semibold flex items-center">
                              <TrendingUp className="w-3 h-3" /> +{p.searchRankDelta}
                            </span>
                          ) : p.searchRankDelta < 0 ? (
                            <span className="text-rose-600 text-[10px] font-semibold flex items-center">
                              <TrendingDown className="w-3 h-3" /> {p.searchRankDelta}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[120px]" title={p.mainKeyword}>
                          {p.mainKeyword}
                        </div>
                      </td>

                      {/* Price & Competitor */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {editingPriceId === p.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={tempPrice}
                              onChange={(e) => setTempPrice(e.target.value)}
                              className="w-20 bg-white border border-indigo-500 text-slate-900 text-xs px-2 py-1 rounded"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSavePrice(p.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <div 
                              onClick={() => handleStartEditPrice(p)}
                              className="cursor-pointer group/price flex items-center gap-1"
                              title="Нажмите, чтобы изменить цену"
                            >
                              <span className="font-bold text-slate-900 group-hover/price:text-indigo-600 flex items-center gap-1">
                                {p.currency === '¥' || ['1688', 'taobao', 'jd', 'pinduoduo'].includes(p.marketplace) ? (
                                  <>
                                    <span>¥{p.price.toLocaleString('ru-RU')}</span>
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      (≈ {Math.round(p.price * 13.45).toLocaleString('ru-RU')} ₽)
                                    </span>
                                  </>
                                ) : p.marketplace === 'shopify' ? (
                                  <span>{p.price.toLocaleString('ru-RU')} €</span>
                                ) : (
                                  <span>{p.price.toLocaleString('ru-RU')} ₽</span>
                                )}
                                <span className="text-[10px] text-slate-400 opacity-0 group-hover/price:opacity-100">✏️</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[10px] font-medium ${p.price > p.competitorPrice ? 'text-rose-600' : 'text-emerald-600'}`}>
                                Конк.: {['1688', 'taobao', 'jd', 'pinduoduo'].includes(p.marketplace) ? `¥${p.competitorPrice}` : `${p.competitorPrice.toLocaleString('ru-RU')} ₽`}
                              </span>
                              <button
                                id={`comp-benchmark-pill-${p.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBenchmarkingProduct(p);
                                }}
                                className="px-1.5 py-0.2 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[9px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors shadow-2xs"
                                title="Сравнить с ТОП-3 конкурентами по цене, рейтингу, отзывам и скорости доставки"
                              >
                                <Zap className="w-2.5 h-2.5 text-amber-500" />
                                <span>ТОП-3</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Stock Health & Days Left Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {p.stockFbo} шт
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${stockHealth.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stockHealth.dotClass}`} />
                            <span>{p.daysLeft} дн.</span>
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          FBS: {p.stockFbs} шт • FBO запас: {p.daysLeft} дн.
                        </div>
                      </td>

                      {/* Margin & DRR */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="text-slate-800 font-medium">
                          Маржа: <span className="text-emerald-700 font-bold">{p.margin}%</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          ДРР: <span className={p.drr > 12 ? 'text-rose-600 font-medium' : 'text-slate-600'}>{p.drr}%</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Competitor Benchmarking Trigger */}
                          <button
                            id={`comp-benchmark-btn-${p.id}`}
                            onClick={() => setBenchmarkingProduct(p)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                            title="Сравнить с ТОП-3 конкурентами (Цена, Рейтинг, Отзывы, Доставка)"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-600" />
                            <span className="hidden xl:inline">ТОП-3</span>
                          </button>

                          <button
                            id={`ask-ai-prod-${p.id}`}
                            onClick={() => onAskAiAboutProduct(p)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Спросить AI</span>
                          </button>

                          <button
                            onClick={() => setExpandedId(isExpanded ? null : p.id)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Развернуть AI диагноз и бенчмаркинг"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded AI Insights, Automated Content Health & Competitor Benchmarking */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <td colSpan={9} className="p-4 space-y-4">
                          {/* Competitor Benchmarking Direct Comparison Widget */}
                          <CompetitorBenchmarkingWidget
                            product={p}
                            onUpdatePrice={onUpdateProductPrice}
                            onRestock={onRestockProduct}
                            onAskAi={onAskAiAboutProduct}
                          />

                          {/* Automated Content Health Check with 3-pillar breakdown scores */}
                          <ProductContentHealthCard
                            product={p}
                            onOpenFullAudit={onInspectContentHealth}
                            onApplyQuickFix={onApplyAiFix}
                          />

                          <div className="bg-white border border-indigo-200 rounded-xl p-4 space-y-3 shadow-xs">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                                <Sparkles className="w-4 h-4 text-indigo-600" />
                                Экспресс-диагностика AI-менеджера по {p.name}:
                              </div>
                              <span className="text-[10px] text-slate-500">
                                Себестоимость: {p.costPrice} ₽ • Прибыль с единицы: {p.price - p.costPrice - Math.round(p.price * 0.23)} ₽
                              </span>
                            </div>

                            <p className="text-xs text-slate-700 leading-relaxed">
                              {p.aiDiagnosis || 'Стабильная динамика заказов.'}
                            </p>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                              <div className="text-xs text-amber-800 font-semibold">
                                💡 Рекомендация: {p.aiRecommendation}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  id={`inspect-health-expanded-${p.id}`}
                                  onClick={() => onInspectContentHealth?.(p)}
                                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1"
                                >
                                  <Sparkles className="w-3 h-3 text-indigo-600" />
                                  <span>Детальный аудит контента</span>
                                </button>

                                {p.suggestedPrice && (
                                  <button
                                    id={`quick-price-${p.id}`}
                                    onClick={() => onUpdateProductPrice(p.id, p.suggestedPrice!)}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
                                  >
                                    Поставить {p.suggestedPrice} ₽
                                  </button>
                                )}

                                {p.suggestedStock && (
                                  <button
                                    id={`quick-restock-${p.id}`}
                                    onClick={() => onRestockProduct(p.id, p.suggestedStock!)}
                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
                                  >
                                    В план поставки (+{p.suggestedStock} шт)
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FLOATING ACTION TOOLBAR FOR BATCH OPERATIONS */}
      {selectedProductIds.length > 0 && (
        <div 
          id="catalog-batch-floating-toolbar"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 flex flex-wrap items-center gap-2.5 sm:gap-3.5 max-w-[96vw] transition-all animate-in fade-in slide-in-from-bottom-4 duration-200 ring-1 ring-white/10"
        >
          {/* Selected Count & Dismiss */}
          <div className="flex items-center gap-2 border-r border-slate-700 pr-3">
            <span className="flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-indigo-600 text-white font-bold text-xs shadow-xs">
              {selectedProductIds.length}
            </span>
            <span className="text-xs font-bold text-slate-200 hidden sm:inline">
              Выбрано {selectedProductIds.length} {selectedProductIds.length === 1 ? 'товар' : selectedProductIds.length < 5 ? 'товара' : 'товаров'}
            </span>
            <button
              id="batch-clear-selection-btn"
              onClick={() => setSelectedProductIds([])}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Снять выбор"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Batch Actions Group */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. Batch SEO Optimization */}
            <button
              id="batch-seo-btn"
              onClick={() => setIsBatchSeoModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-102"
              title="Массовая генерация оптимизированных SEO заголовков, описаний и ключей"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Применить SEO-оптимизацию</span>
            </button>

            {/* 2. Batch Minimum Margin Guardrail */}
            <button
              id="batch-margin-floor-btn"
              onClick={() => setIsBatchMarginFloorModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-102"
              title="Установить жесткий защитный порог минимальной маржи (Stop-Loss) от демпинга"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
              <span>Установить правило мин. маржи</span>
            </button>

            {/* 3. Batch Price Adjustment */}
            <button
              id="batch-price-adjust-btn"
              onClick={() => setIsBatchPriceModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-102"
              title="Пакетная корректировка цен (процент, скидка, следование за конкурентом)"
            >
              <DollarSign className="w-3.5 h-3.5 text-indigo-200" />
              <span>Изменить цены</span>
            </button>

            {/* 4. Bulk Inventory Restock */}
            <button
              id="batch-restock-btn"
              onClick={() => setIsBatchRestockModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Создать групповую поставку FBO / FBS"
            >
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Поставка & Остатки</span>
            </button>

            {/* 5. Ask AI in Telegram */}
            <button
              id="batch-ask-ai-btn"
              onClick={() => {
                if (onAskAiAboutMultipleProducts) {
                  onAskAiAboutMultipleProducts(selectedProducts);
                } else if (selectedProducts[0]) {
                  onAskAiAboutProduct(selectedProducts[0]);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Запустить сравнительный анализ выбранных SKU в Telegram-боте"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden lg:inline">Спросить AI</span>
            </button>

            {/* 6. Export CSV */}
            <button
              id="batch-export-csv-btn"
              onClick={handleExportCsv}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
              title="Экспортировать выбранные SKU в файл CSV"
            >
              {exportFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-emerald-400">Экспортировано!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">CSV</span>
                </>
              )}
            </button>

            {/* 7. Copy SKUs */}
            <button
              id="batch-copy-skus-btn"
              onClick={handleCopySkus}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
              title="Скопировать артикулы выбранных товаров"
            >
              {copyFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-emerald-400">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">SKU</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* BATCH PRICE ADJUSTMENT MODAL */}
      <Modal
        isOpen={isBatchPriceModalOpen}
        onClose={() => setIsBatchPriceModalOpen(false)}
        size="2xl"
      >
        <ModalHeader
          icon={<DollarSign className="w-5 h-5 text-indigo-600" />}
        >
          <div className="flex items-center gap-2">
            <Badge variant="indigo" size="sm">
              {selectedProducts.length} SKU ВЫБРАНО
            </Badge>
          </div>
          <ModalTitle>Пакетное изменение цен</ModalTitle>
          <ModalDescription>Массовая корректировка прайса с контролем маржинальности и сравнением с конкурентами</ModalDescription>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {/* Formula selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              1. Выберите формулу пересчета цен:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: 'percent_discount', label: 'Снизить на процент (%)', desc: 'Скидка на промо или акцию' },
                { id: 'percent_increase', label: 'Повысить на процент (%)', desc: 'Индексация цен' },
                { id: 'fixed_discount', label: 'Снизить на сумму (₽)', desc: 'Фиксированная скидка' },
                { id: 'fixed_increase', label: 'Повысить на сумму (₽)', desc: 'Фиксированная наценка' },
                { id: 'match_competitor', label: 'Выровнять по конкурентам', desc: 'Match Competitor Price' },
                { id: 'set_fixed', label: 'Установить единую цену (₽)', desc: 'Для всех выбранных товаров' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPriceAdjustmentType(f.id as any)}
                  className={`text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    priceAdjustmentType === f.id
                      ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-semibold">{f.label}</div>
                  <div className="text-[10px] text-slate-500">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Adjustment Value Input */}
          {priceAdjustmentType !== 'match_competitor' && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Значение корректировки ({priceAdjustmentType.includes('percent') ? 'Процент %' : 'Сумма в рублях ₽'}):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={priceAdjustmentValue}
                  onChange={(e) => setPriceAdjustmentValue(Math.max(1, Number(e.target.value)))}
                  className="w-32 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
                />
                <span className="text-xs font-semibold text-slate-600">
                  {priceAdjustmentType.includes('percent') ? '%' : '₽'}
                </span>
                <div className="flex items-center gap-1.5 ml-auto">
                  {[5, 10, 15, 20].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setPriceAdjustmentValue(v)}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      {v}{priceAdjustmentType.includes('percent') ? '%' : '₽'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Impact Preview Table */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Предпросмотр пересчета:</span>
              <span className="text-[11px] text-slate-500 font-normal">
                Комиссия маркетплейса + логистика: ~23%
              </span>
            </label>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Товар</th>
                    <th className="py-2 px-2 text-right">Текущая</th>
                    <th className="py-2 px-2 text-right">Новая</th>
                    <th className="py-2 px-2 text-right">Дельта</th>
                    <th className="py-2 px-3 text-right">Маржа</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculatedBatchPrices.map((item) => (
                    <tr key={item.product.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900 truncate max-w-[180px]">
                          {item.product.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.product.sku}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-slate-600">
                        {item.oldPrice} ₽
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-indigo-700">
                        {item.newPrice} ₽
                      </td>
                      <td className="py-2 px-2 text-right font-semibold">
                        {item.priceDiff > 0 ? (
                          <span className="text-emerald-600">+{item.priceDiff} ₽</span>
                        ) : item.priceDiff < 0 ? (
                          <span className="text-rose-600">{item.priceDiff} ₽</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Badge variant={item.isMarginRisk ? 'rose' : 'emerald'} size="sm">
                          {item.projectedMargin}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Safety notice */}
          {calculatedBatchPrices.some((i) => i.isMarginRisk) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Внимание: у некоторых товаров прогнозируемая маржинальность опустится ниже 18%.
              </span>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setIsBatchPriceModalOpen(false)}
          >
            Отмена
          </Button>
          <Button
            variant="primary"
            onClick={handleApplyBatchPrices}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Применить к {selectedProducts.length} товарам
          </Button>
        </ModalFooter>
      </Modal>

      {/* BULK INVENTORY RESTOCK MODAL */}
      <Modal
        isOpen={isBatchRestockModalOpen}
        onClose={() => setIsBatchRestockModalOpen(false)}
        size="2xl"
      >
        <ModalHeader
          icon={<Truck className="w-5 h-5 text-emerald-600" />}
        >
          <div className="flex items-center gap-2">
            <Badge variant="emerald" size="sm">
              {selectedProducts.length} SKU ВЫБРАНО
            </Badge>
          </div>
          <ModalTitle>Пакетное пополнение остатков & Поставка</ModalTitle>
          <ModalDescription>Формирование единой сводной партии поставки на склад маркетплейса</ModalDescription>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {/* Warehouse selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              1. Склад назначения поставки:
            </label>
            <select
              value={targetWarehouse}
              onChange={(e) => setTargetWarehouse(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
            >
              <option value="FBO Коледино (WB)">FBO Коледино (Wildberries, Центральный)</option>
              <option value="FBO Хоругвино (Ozon)">FBO Хоругвино (Ozon, Экспресс)</option>
              <option value="FBO Казань (WB/Ozon)">FBO Казань (Региональный хаб)</option>
              <option value="Резервный склад FBS">Резервный склад продавца (FBS Backup)</option>
            </select>
          </div>

          {/* Restock Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              2. Стратегия расчета объемов поставки:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'add_fixed', label: 'Фиксированное кол-во', desc: '+X шт к каждому артикулу' },
                { id: 'target_days', label: 'Целевой запас (дней)', desc: 'Расчет по скорости заказов' },
                { id: 'fbs_backup', label: 'Резервный FBS сток', desc: '+14 дней на свой склад' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setRestockMode(m.id as any)}
                  className={`text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    restockMode === m.id
                      ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 text-emerald-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-semibold">{m.label}</div>
                  <div className="text-[10px] text-slate-500">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Amount input */}
          {restockMode === 'add_fixed' && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Количество единиц на каждый товар:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Math.max(10, Number(e.target.value)))}
                  className="w-32 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
                />
                <span className="text-xs font-semibold text-slate-600">шт.</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  {[50, 100, 150, 250].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRestockAmount(v)}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      +{v} шт
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {restockMode === 'target_days' && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Целевой запас до следующей поставки:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={targetDaysCount}
                  onChange={(e) => setTargetDaysCount(Math.max(7, Number(e.target.value)))}
                  className="w-32 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
                />
                <span className="text-xs font-semibold text-slate-600">дней</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  {[14, 21, 30, 45].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTargetDaysCount(d)}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      {d} дн.
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Preview table */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Спецификация партии:</span>
              <span className="text-[11px] text-emerald-700 font-bold">
                Итого в поставке: +{totalRestockUnits} шт
              </span>
            </label>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Товар & SKU</th>
                    <th className="py-2 px-2 text-right">Текущий сток</th>
                    <th className="py-2 px-2 text-right">Добавка</th>
                    <th className="py-2 px-2 text-right">Новый сток</th>
                    <th className="py-2 px-3 text-right">Запас (дн.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculatedBatchRestock.map((item) => (
                    <tr key={item.product.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900 truncate max-w-[180px]">
                          {item.product.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.product.sku}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-slate-600">
                        {item.product.stockFbo} шт
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-emerald-700">
                        +{item.unitsToAdd} шт
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-slate-900">
                        {item.newFbo} шт
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Badge variant="emerald" size="sm">
                          {item.newDays} дн.
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setIsBatchRestockModalOpen(false)}
          >
            Отмена
          </Button>
          <Button
            variant="success"
            onClick={handleApplyBatchRestock}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Оформить поставку (+{totalRestockUnits} шт)
          </Button>
        </ModalFooter>
      </Modal>

      {/* BATCH SEO OPTIMIZATION MODAL */}
      <BatchSeoModal
        isOpen={isBatchSeoModalOpen}
        onClose={() => {
          setIsBatchSeoModalOpen(false);
          setSelectedProductIds([]);
        }}
        selectedProducts={selectedProducts}
        onApplyBatchSeo={(updates, reason) => {
          if (onBatchApplySeo) {
            onBatchApplySeo(updates, reason);
          } else if (onApplyAiFix) {
            updates.forEach(u => onApplyAiFix(u.productId, u.newTitle, u.newDescription, u.addedKeywords));
          }
          setIsBatchSeoModalOpen(false);
          setSelectedProductIds([]);
        }}
      />

      {/* BATCH MINIMUM MARGIN FLOOR RULE MODAL */}
      <BatchMarginFloorModal
        isOpen={isBatchMarginFloorModalOpen}
        onClose={() => {
          setIsBatchMarginFloorModalOpen(false);
          setSelectedProductIds([]);
        }}
        selectedProducts={selectedProducts}
        onApplyMarginFloor={handleApplyBatchMarginFloor}
      />

      {/* COMPETITOR BENCHMARKING MODAL */}
      <CompetitorBenchmarkModal
        isOpen={Boolean(benchmarkingProduct)}
        product={benchmarkingProduct}
        onClose={() => setBenchmarkingProduct(null)}
        onUpdatePrice={onUpdateProductPrice}
        onRestock={onRestockProduct}
        onAskAi={onAskAiAboutProduct}
      />
    </div>
  );
};

