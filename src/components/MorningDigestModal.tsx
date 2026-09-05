import React from 'react';
import { Sun, TrendingUp, TrendingDown, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Product } from '../types';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter, Button, Badge } from './ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onApplyAction: (product: Product, newPrice?: number, newStock?: number) => void;
  product7: Product | undefined;
  hasAppliedSolution: boolean;
}

export const MorningDigestModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectProduct,
  onApplyAction,
  product7,
  hasAppliedSolution,
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader
        icon={<Sun className="w-5 h-5 text-amber-500" />}
      >
        <div className="flex items-center gap-2">
          <Badge variant="amber" size="sm">
            Ежедневная утренняя сводка
          </Badge>
        </div>
        <ModalTitle>☀️ Что происходит с вашим магазином сегодня</ModalTitle>
        <ModalDescription>Синхронизировано с Wildberries & Ozon API</ModalDescription>
      </ModalHeader>

      <ModalBody className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <div className="text-xs text-slate-500 mb-1">Выручка сегодня</div>
            <div className="text-xl font-bold text-emerald-700 flex items-center gap-1.5">
              ↑ 14%
              <span className="text-xs text-slate-500 font-normal">348.2к ₽</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <div className="text-xs text-slate-500 mb-1">Чистая прибыль</div>
            <div className="text-xl font-bold text-emerald-700 flex items-center gap-1.5">
              ↑ 9%
              <span className="text-xs text-slate-500 font-normal">89.4к ₽</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <div className="text-xs text-slate-500 mb-1">Товары в росте</div>
            <div className="text-xl font-bold text-indigo-700 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              2 SKU
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <div className="text-xs text-slate-500 mb-1">Риск Out-of-Stock</div>
            <div className="text-xl font-bold text-rose-700 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              3 SKU
            </div>
          </div>
        </div>

        {/* Quick bullet points */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-emerald-800 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            2 товара активно растут: Платье миди (+38%) и Набор ножей (+19%)
          </div>
          <div className="flex items-center gap-2 text-amber-800 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            1 товар начал терять позиции: Рюкзак городской (Товар №7)
          </div>
          <div className="flex items-center gap-2 text-rose-800 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            3 товара скоро закончатся на складах (хватит на 2–4 дня)
          </div>
        </div>

        {/* Focus of the day (Product #7) */}
        {product7 && (
          <div className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <img
                  src={product7.image}
                  alt={product7.name}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <Badge variant="indigo" size="sm" className="mb-1">
                    🎯 Главное сегодня: обратить внимание на Товар №7
                  </Badge>
                  <h3 className="font-bold text-slate-900 text-base">
                    {product7.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {product7.sku} • Wildberries • Категория: {product7.category}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500">Текущая цена</div>
                <div className="text-lg font-bold text-slate-900">{product7.price} ₽</div>
                <div className="text-xs text-rose-600 font-semibold flex items-center justify-end gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Конкурент: {product7.competitorPrice} ₽
                </div>
              </div>
            </div>

            {/* AI Diagnosis */}
            <div className="bg-white rounded-xl p-3.5 text-xs text-slate-700 border border-indigo-200 leading-relaxed shadow-2xs">
              <strong className="text-indigo-800 font-bold block mb-1 text-sm flex items-center gap-1.5">
                🤖 Анализ AI-менеджера:
              </strong>
              Продажи просели на 34% за последние 48 часов. Конкурент «NordBag Casual» уронил цену до 1 950 ₽, а остаток на складе Коледино упал до 12 шт (скорость доставки снизила конверсию).
            </div>

            {/* AI Proposed Solution */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-700">
                <span className="font-semibold text-slate-900">Решение AI:</span> снизить цену до <span className="text-emerald-700 font-bold">1 990 ₽</span> и создать поставку на <span className="text-emerald-700 font-bold">180 шт</span>.
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {hasAppliedSolution ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200 w-full sm:w-auto justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                    Решение уже применено!
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onApplyAction(product7, 1990, 180)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    ⚡ Применить решение AI
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSelectProduct(product7);
                    onClose();
                  }}
                >
                  Обсудить в чате
                </Button>
              </div>
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <span className="text-xs text-slate-500 mr-auto">Wildberries & Ozon Live Data</span>
        <Button variant="secondary" onClick={onClose}>
          Закрыть
        </Button>
      </ModalFooter>
    </Modal>
  );
};

