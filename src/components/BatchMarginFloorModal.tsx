import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Lock,
  Zap,
  Info,
  Sliders
} from 'lucide-react';
import { Product, BusinessRule } from '../types';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter, Button, Badge } from './ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: Product[];
  onApplyMarginFloor: (
    rule: Omit<BusinessRule, 'id'>,
    elevatedPrices?: { productId: string; newPrice: number }[],
    reasonDescription?: string
  ) => void;
}

export const BatchMarginFloorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedProducts,
  onApplyMarginFloor,
}) => {
  const [minMarginPercent, setMinMarginPercent] = useState<number>(20);
  const [enforcementMode, setEnforcementMode] = useState<'lock_repricer' | 'auto_elevate' | 'telegram_alert'>('lock_repricer');
  const [estimatedMpCommission] = useState<number>(23); // 23% avg MP fee + logistics
  const [includedProductIds, setIncludedProductIds] = useState<string[]>([]);

  // Initialize included products when modal opens
  React.useEffect(() => {
    if (isOpen && selectedProducts.length > 0) {
      setIncludedProductIds(selectedProducts.map((p) => p.id));
    }
  }, [isOpen, selectedProducts]);

  const toggleIncludeProduct = (id: string) => {
    setIncludedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const selectAllProducts = () => {
    setIncludedProductIds(selectedProducts.map((p) => p.id));
  };

  const deselectAllProducts = () => {
    setIncludedProductIds([]);
  };

  // Calculations for each product
  const calculatedItems = useMemo(() => {
    const feeDecimal = estimatedMpCommission / 100;
    const marginDecimal = minMarginPercent / 100;
    const divisor = Math.max(0.1, 1 - feeDecimal - marginDecimal);

    return selectedProducts.map((p) => {
      // P_min = CostPrice / (1 - MP_Fee% - TargetMargin%)
      const minSafePrice = Math.ceil(p.costPrice / divisor);
      const isCurrentlyUnderFloor = p.price < minSafePrice || p.margin < minMarginPercent;
      const priceDelta = Math.max(0, minSafePrice - p.price);
      const isIncluded = includedProductIds.includes(p.id);

      // Current actual margin
      const currentMpFee = Math.round(p.price * feeDecimal);
      const currentProfit = p.price - p.costPrice - currentMpFee;
      const currentActualMargin = Math.round((currentProfit / p.price) * 100);

      // Margin at floor price
      const floorMpFee = Math.round(minSafePrice * feeDecimal);
      const floorProfit = minSafePrice - p.costPrice - floorMpFee;
      const floorMargin = Math.round((floorProfit / minSafePrice) * 100);

      return {
        product: p,
        currentPrice: p.price,
        costPrice: p.costPrice,
        minSafePrice,
        isCurrentlyUnderFloor,
        priceDelta,
        currentActualMargin,
        floorMargin,
        isIncluded,
      };
    });
  }, [selectedProducts, minMarginPercent, estimatedMpCommission, includedProductIds]);

  const activeCalculatedItems = calculatedItems.filter((i) => i.isIncluded);
  const itemsUnderFloorCount = activeCalculatedItems.filter((i) => i.isCurrentlyUnderFloor).length;

  const handleSaveRule = () => {
    if (activeCalculatedItems.length === 0) return;

    const skuSample = activeCalculatedItems.slice(0, 3).map((i) => i.product.sku).join(', ');
    const moreCount = activeCalculatedItems.length > 3 ? ` и ещё ${activeCalculatedItems.length - 3}` : '';

    let actionText = '';
    let category: BusinessRule['category'] = 'safety';

    if (enforcementMode === 'lock_repricer') {
      actionText = `Блокировать снижение цены репрайсером ниже порога ${minMarginPercent}% маржинальности`;
      category = 'pricing';
    } else if (enforcementMode === 'auto_elevate') {
      actionText = `Автоматически повышать цену до безопасного уровня (${minMarginPercent}% маржи)`;
      category = 'pricing';
    } else {
      actionText = `Отправлять экстренное уведомление в Telegram при риске пробития маржи < ${minMarginPercent}%`;
      category = 'safety';
    }

    const newRule: Omit<BusinessRule, 'id'> = {
      condition: `Маржинальность товара < ${minMarginPercent}% ИЛИ Цена < P_min для SKU [${skuSample}${moreCount}]`,
      action: actionText,
      description: `Защитный порог маржи ≥${minMarginPercent}% для ${activeCalculatedItems.length} SKU. Режим: ${
        enforcementMode === 'lock_repricer'
          ? 'Защита от демпинга (Stop-Loss)'
          : enforcementMode === 'auto_elevate'
          ? 'Авто-повышение цен'
          : 'Алерт в Telegram'
      }.`,
      enabled: true,
      category,
    };

    let elevatedPrices: { productId: string; newPrice: number }[] | undefined = undefined;

    if (enforcementMode === 'auto_elevate') {
      elevatedPrices = activeCalculatedItems
        .filter((i) => i.isCurrentlyUnderFloor)
        .map((i) => ({
          productId: i.product.id,
          newPrice: i.minSafePrice,
        }));
    }

    onApplyMarginFloor(
      newRule,
      elevatedPrices,
      `Установлено защитное правило минимальной маржи ≥${minMarginPercent}% для ${activeCalculatedItems.length} товаров (${
        enforcementMode === 'auto_elevate' ? `авто-повышено ${elevatedPrices?.length || 0} цен` : 'контроль репрайсера'
      })`
    );

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalHeader
        icon={
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
        }
      >
        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="sm">
            {selectedProducts.length} SKU
          </Badge>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500">Safety Guardrail</span>
        </div>
        <ModalTitle>Установка правила минимальной маржи</ModalTitle>
        <ModalDescription>
          Формирование детерминированного защитного барьера от демпинга и нерентабельных продаж
        </ModalDescription>
      </ModalHeader>

      <ModalBody className="space-y-5">
        {/* 1. Target Margin Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Целевой минимальный порог маржинальности (%):</span>
            </label>
            <Badge variant="emerald" size="md">
              Порог: {minMarginPercent}%
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[15, 18, 20, 25, 30].map((percent) => (
              <button
                key={percent}
                type="button"
                onClick={() => setMinMarginPercent(percent)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  minMarginPercent === percent
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-sm">{percent}%</span>
                <span className={`text-[10px] font-normal ${minMarginPercent === percent ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {percent === 15 ? 'Минимум' : percent === 20 ? 'Стандарт' : percent >= 25 ? 'Премиум' : 'Эконом'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Enforcement Action Strategy */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-600" />
            <span>2. Реакция системы при риске пробития минимального порога:</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                id: 'lock_repricer',
                title: 'Stop-Loss репрайсера',
                desc: 'Запретить алгоритму снижать цену ниже P_min, даже если конкурент демпингует',
                icon: Lock,
                tag: 'Рекомендуется',
                color: 'indigo',
              },
              {
                id: 'auto_elevate',
                title: 'Авто-подтягивание цен',
                desc: 'Немедленно повысить текущие цены товаров до уровня безопасного минимума P_min',
                icon: TrendingUp,
                tag: 'Коррекция цен',
                color: 'emerald',
              },
              {
                id: 'telegram_alert',
                title: 'Алерт & Подтверждение',
                desc: 'Создавать аномалию и слать алерт в Telegram перед любым изменением цены',
                icon: Zap,
                tag: 'Ручной контроль',
                color: 'purple',
              },
            ].map((strategy) => {
              const IconComponent = strategy.icon;
              const isSelected = enforcementMode === strategy.id;
              return (
                <button
                  key={strategy.id}
                  type="button"
                  onClick={() => setEnforcementMode(strategy.id as any)}
                  className={`text-left p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <Badge variant="neutral" size="sm">
                        {strategy.tag}
                      </Badge>
                    </div>
                    <div className="font-bold text-xs text-slate-900 mb-1">{strategy.title}</div>
                    <div className="text-[11px] text-slate-500 leading-snug">{strategy.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Mathematical Formula Explanation */}
        <div className="bg-slate-900 text-slate-200 rounded-2xl p-3.5 border border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-emerald-400 font-mono flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Формула расчета минимальной цены продажи (P_min):
            </span>
            <span className="text-[11px] text-slate-400">
              Комиссия MP + логистика: <strong>{estimatedMpCommission}%</strong>
            </span>
          </div>
          <div className="bg-slate-950/80 p-2.5 rounded-xl font-mono text-[11px] text-slate-300 border border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <code>P_min = CostPrice / (1 - {estimatedMpCommission}% - {minMarginPercent}%)</code>
            <span className="text-emerald-400 font-bold">
              Делитель: {(1 - (estimatedMpCommission + minMarginPercent) / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* 4. Products Live Impact Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-800">
                Спецификация по товарам ({activeCalculatedItems.length} из {selectedProducts.length}):
              </label>
              {itemsUnderFloorCount > 0 && (
                <Badge variant="amber" size="sm" dot>
                  {itemsUnderFloorCount} ниже порога
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={selectAllProducts}
                className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                Выбрать все
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={deselectAllProducts}
                className="text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
              >
                Снять выбор
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase border-b border-slate-200 sticky top-0 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 w-8 text-center">✓</th>
                  <th className="py-2.5 px-3">Товар & SKU</th>
                  <th className="py-2.5 px-2 text-right">Себестоимость</th>
                  <th className="py-2.5 px-2 text-right">Тек. цена & маржа</th>
                  <th className="py-2.5 px-2 text-right">Мин. цена (P_min)</th>
                  <th className="py-2.5 px-3 text-right">Статус правила</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculatedItems.map((item) => {
                  const isSelected = item.isIncluded;
                  return (
                    <tr
                      key={item.product.id}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? 'hover:bg-slate-50' : 'bg-slate-50/50 opacity-60'
                      }`}
                      onClick={() => toggleIncludeProduct(item.product.id)}
                    >
                      <td className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleIncludeProduct(item.product.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900 truncate max-w-[190px]">
                          {item.product.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.product.sku} • {item.product.marketplace.toUpperCase()}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-slate-600 font-mono">
                        {item.costPrice.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="font-bold text-slate-900 font-mono">
                          {item.currentPrice.toLocaleString('ru-RU')} ₽
                        </div>
                        <div className={`text-[10px] font-bold ${item.isCurrentlyUnderFloor ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {item.product.margin}% маржа
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-slate-900 font-mono">
                        {item.minSafePrice.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="py-2 px-3 text-right">
                        {item.isCurrentlyUnderFloor ? (
                          <Badge variant="amber" size="sm" dot>
                            +{item.priceDelta} ₽ до пола
                          </Badge>
                        ) : (
                          <Badge variant="emerald" size="sm">
                            В безопасности
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="text-xs text-slate-500 mr-auto hidden sm:block">
          Модуль: <strong>Архитектура & Бизнес-правила</strong>
        </div>

        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>

        <Button
          id="btn-confirm-margin-floor"
          variant="success"
          onClick={handleSaveRule}
          disabled={activeCalculatedItems.length === 0}
          leftIcon={<ShieldCheck className="w-4 h-4" />}
        >
          {enforcementMode === 'auto_elevate' && itemsUnderFloorCount > 0
            ? `Установить правило и поднять ${itemsUnderFloorCount} цен`
            : `Установить правило для ${activeCalculatedItems.length} SKU`}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

