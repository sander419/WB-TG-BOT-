import React, { useState } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  Copy,
  Send
} from 'lucide-react';
import { ChinaSourcingOpportunity, CHINA_LOGISTICS_TIERS, ChinaLogisticsOption } from '../data/chinaMarketplaceData';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter, Button, Badge } from './ui';

interface Props {
  opportunity: ChinaSourcingOpportunity;
  cnyRate: number;
  onClose: () => void;
  onSendOrder: (summaryText: string) => void;
}

export const ChinaPurchaseOrderModal: React.FC<Props> = ({
  opportunity,
  cnyRate,
  onClose,
  onSendOrder,
}) => {
  const [batchQuantity, setBatchQuantity] = useState<number>(opportunity.recommendedBatchMoq);
  const [selectedLogistics, setSelectedLogistics] = useState<ChinaLogisticsOption>(CHINA_LOGISTICS_TIERS[0]);
  
  // OEM & Customization options
  const [includeCustomLogo, setIncludeCustomLogo] = useState(true);
  const [includeRussianPackaging, setIncludeRussianPackaging] = useState(true);
  const [includeWarrantyInsert, setIncludeWarrantyInsert] = useState(true);
  const [includeFactoryBarcoding, setIncludeFactoryBarcoding] = useState(true);

  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Calculations
  const baseFactoryPriceCny = opportunity.sourceItem.factoryPriceCny;
  const oemAddonCny =
    (includeCustomLogo ? 1.5 : 0) +
    (includeRussianPackaging ? 3.0 : 0) +
    (includeWarrantyInsert ? 0.5 : 0) +
    (includeFactoryBarcoding ? 0.3 : 0);

  const totalUnitFactoryPriceCny = baseFactoryPriceCny + oemAddonCny;
  const totalUnitFactoryPriceRub = Math.round(totalUnitFactoryPriceCny * cnyRate);

  // Logistics & DDP Customs estimation (based on selected tier)
  const logisticsCostPerUnitRub =
    selectedLogistics.type === 'air_express'
      ? Math.round(opportunity.arbitrage.shippingAndCustomsPerUnitRub * 1.85)
      : selectedLogistics.type === 'rail_ddp'
      ? Math.round(opportunity.arbitrage.shippingAndCustomsPerUnitRub * 0.75)
      : opportunity.arbitrage.shippingAndCustomsPerUnitRub;

  const totalLandedCostPerUnitRub = totalUnitFactoryPriceRub + logisticsCostPerUnitRub;
  const totalBatchInvestmentRub = totalLandedCostPerUnitRub * batchQuantity;
  const totalBatchFactoryCny = totalUnitFactoryPriceCny * batchQuantity;

  // Payment milestones
  const deposit30Cny = Math.round(totalBatchFactoryCny * 0.3);
  const deposit30Rub = Math.round(deposit30Cny * cnyRate);
  const balance70Cny = Math.round(totalBatchFactoryCny * 0.7);

  // Projected profit on Russian Marketplace
  const sellingPrice = opportunity.russianMarketItem.currentSellingPriceRub;
  const estimatedWbCommissionAndFulfillment = Math.round(sellingPrice * 0.28);
  const netProfitPerUnit = sellingPrice - totalLandedCostPerUnitRub - estimatedWbCommissionAndFulfillment;
  const totalBatchNetProfit = netProfitPerUnit * batchQuantity;
  const roiPercent = Math.round((totalBatchNetProfit / totalBatchInvestmentRub) * 100);

  const generateSpecificationText = () => {
    return `🇨🇳 СПЕЦИФИКАЦИЯ ОПТОВОЙ ЗАКУПКИ (CHINA PURCHASE ORDER)
-----------------------------------------------------------
Товар: ${opportunity.russianMarketItem.productName} (SKU: ${opportunity.russianMarketItem.sku})
Фабрика: ${opportunity.sourceItem.factoryName}
Город производства: ${opportunity.sourceItem.city}
Платформа: ${opportunity.sourceItem.platform.toUpperCase()}

ОБЪЕМ ПАРТИИ: ${batchQuantity} шт.
Базовая цена завода: ¥${baseFactoryPriceCny} / шт.
OEM брендирование: +¥${oemAddonCny.toFixed(1)} / шт.
Итоговая цена завода: ¥${totalUnitFactoryPriceCny.toFixed(1)} (${totalUnitFactoryPriceRub} ₽)

ЛОГИСТИКА: ${selectedLogistics.name}
Срок доставки: ${selectedLogistics.transitDays}
Таможенный статус: ${selectedLogistics.customsMode}

ФИНАНСОВЫЙ ИТОГ:
- Себестоимость DDP Москва: ${totalLandedCostPerUnitRub} ₽ / шт.
- Сумма контракта (завод): ¥${totalBatchFactoryCny.toLocaleString()}
- Депозит 30% для запуска: ¥${deposit30Cny.toLocaleString()} (${deposit30Rub.toLocaleString('ru-RU')} ₽)
- Остаток 70% после видеоинспекции: ¥${balance70Cny.toLocaleString()}
- Полный бюджет под ключ: ${totalBatchInvestmentRub.toLocaleString('ru-RU')} ₽
- Прогнозируемая чистая прибыль: +${totalBatchNetProfit.toLocaleString('ru-RU')} ₽ (ROI: ${roiPercent}%)
-----------------------------------------------------------`;
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(generateSpecificationText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      onSendOrder(generateSpecificationText());
      onClose();
    }, 400);
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="3xl">
      <ModalHeader
        icon={<Package className="w-5 h-5 text-rose-600" />}
      >
        <div className="flex items-center gap-2">
          <Badge variant="rose" size="sm">
            DDP DIRECT CONTRACT
          </Badge>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500">{opportunity.sourceItem.factoryName} ({opportunity.sourceItem.city})</span>
        </div>
        <ModalTitle>Конструктор закупки & Спецификация PO</ModalTitle>
        <ModalDescription>Прямой внешний контракт с фабрикой и DDP-доставкой в РФ</ModalDescription>
      </ModalHeader>

      <ModalBody className="space-y-6">
        {/* Top Product Summary */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-3.5">
            <img
              src={opportunity.sourceItem.imageUrl}
              alt={opportunity.sourceItem.productTitleRu}
              className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
            />
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 font-mono">
                SKU: {opportunity.russianMarketItem.sku}
              </span>
              <h4 className="font-extrabold text-slate-900 text-sm">
                {opportunity.russianMarketItem.productName}
              </h4>
              <p className="text-xs text-slate-600">
                {opportunity.sourceItem.productTitleCn}
              </p>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Розничная цена в РФ:
            </span>
            <span className="text-base font-black text-slate-900">
              {sellingPrice.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Volume & OEM Customization */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Размер партии (шт.):
                </label>
                <Badge variant="rose" size="sm">
                  Мин. MOQ: {opportunity.sourceItem.moq} шт
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={opportunity.sourceItem.moq}
                  max={3000}
                  step={50}
                  value={batchQuantity}
                  onChange={(e) => setBatchQuantity(Number(e.target.value))}
                  className="flex-1 accent-rose-600 cursor-pointer"
                />
                <input
                  type="number"
                  min={opportunity.sourceItem.moq}
                  value={batchQuantity}
                  onChange={(e) => setBatchQuantity(Math.max(opportunity.sourceItem.moq, Number(e.target.value) || opportunity.sourceItem.moq))}
                  className="w-24 px-3 py-1.5 rounded-xl border border-slate-300 font-black text-center text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* OEM Branding Checklist */}
            <div className="space-y-2.5 pt-2">
              <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                OEM Брендинг & Маркировка на фабрике:
              </label>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white cursor-pointer text-xs">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={includeCustomLogo}
                      onChange={(e) => setIncludeCustomLogo(e.target.checked)}
                      className="rounded text-rose-600 accent-rose-600 w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">Шелкография / Гравировка логотипа</span>
                      <span className="text-[11px] text-slate-500">Нанесение фирменного знака вашего бренда</span>
                    </div>
                  </div>
                  <span className="font-bold text-rose-600">+¥1.5 / шт</span>
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white cursor-pointer text-xs">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={includeRussianPackaging}
                      onChange={(e) => setIncludeRussianPackaging(e.target.checked)}
                      className="rounded text-rose-600 accent-rose-600 w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">Индивидуальная коробка на русском</span>
                      <span className="text-[11px] text-slate-500">Полноцветная коробка с вашим дизайном</span>
                    </div>
                  </div>
                  <span className="font-bold text-rose-600">+¥3.0 / шт</span>
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white cursor-pointer text-xs">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={includeWarrantyInsert}
                      onChange={(e) => setIncludeWarrantyInsert(e.target.checked)}
                      className="rounded text-rose-600 accent-rose-600 w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">Вкладыш: Инструкция + Гарантийный талон</span>
                      <span className="text-[11px] text-slate-500">Снижает процент возвратов на 24%</span>
                    </div>
                  </div>
                  <span className="font-bold text-rose-600">+¥0.5 / шт</span>
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white cursor-pointer text-xs">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={includeFactoryBarcoding}
                      onChange={(e) => setIncludeFactoryBarcoding(e.target.checked)}
                      className="rounded text-rose-600 accent-rose-600 w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">Наклейка штрихкодов WB/Ozon (EAN-13)</span>
                      <span className="text-[11px] text-slate-500">Товар готов к сдаче на склад FBO без переупаковки</span>
                    </div>
                  </div>
                  <span className="font-bold text-rose-600">+¥0.3 / шт</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right: Logistics Selection & Financial Waterfall */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                Способ международной доставки:
              </label>

              <div className="space-y-2">
                {CHINA_LOGISTICS_TIERS.map((tier) => (
                  <div
                    key={tier.id}
                    onClick={() => setSelectedLogistics(tier)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer text-xs ${
                      selectedLogistics.id === tier.id
                        ? 'border-rose-600 bg-rose-50/70 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className="text-slate-900 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-rose-600" />
                        {tier.name}
                      </span>
                      <Badge variant="neutral" size="sm">
                        {tier.tag}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>Срок: <strong className="text-slate-900">{tier.transitDays}</strong></span>
                      <span>Тариф: <strong>${tier.costPerKgUsd}/кг</strong> (${tier.costPerCbmUsd}/м³)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Box */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="text-slate-400">Себестоимость DDP за 1 шт:</span>
                <span className="font-black text-rose-400 text-sm">
                  {totalLandedCostPerUnitRub} ₽ (¥{totalUnitFactoryPriceCny.toFixed(1)} + DDP)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Аванс 30% заводу:</span>
                  <span className="font-bold text-white">
                    ¥{deposit30Cny.toLocaleString()} ({deposit30Rub.toLocaleString('ru-RU')} ₽)
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Остаток 70% после QC:</span>
                  <span className="font-bold text-white">
                    ¥{balance70Cny.toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Общий бюджет партии:</span>
                  <span className="font-black text-amber-300">
                    {totalBatchInvestmentRub.toLocaleString('ru-RU')} ₽
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Чистый профит партии:</span>
                  <span className="font-black text-emerald-400">
                    +{totalBatchNetProfit.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Рентабельность инвестиций (ROI):</span>
                <span className="font-black text-emerald-300">+{roiPercent}%</span>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          variant="outline"
          onClick={handleCopy}
          leftIcon={
            copied ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-slate-500" />
            )
          }
        >
          {copied ? 'Спецификация скопирована!' : 'Копировать PO'}
        </Button>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>

          <Button
            variant="danger"
            onClick={handleSubmit}
            disabled={submitting}
            isLoading={submitting}
            leftIcon={<Send className="w-4 h-4 text-rose-200" />}
          >
            Передать заказ AI-менеджеру для контракта
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
};

