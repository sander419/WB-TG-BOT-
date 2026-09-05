import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Zap
} from 'lucide-react';
import { Store } from '../types';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter, Button, Badge } from './ui';

interface Props {
  store: Store;
  isOpen: boolean;
  onClose: () => void;
  onExecutePrimaryAction: () => void;
}

export const FirstConnectAuditModal: React.FC<Props> = ({
  store,
  isOpen,
  onClose,
  onExecutePrimaryAction,
}) => {
  const [executed, setExecuted] = useState(false);

  if (!isOpen) return null;

  const handleApply = () => {
    setExecuted(true);
    setTimeout(() => {
      onExecutePrimaryAction();
      onClose();
      setExecuted(false);
    }, 1200);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader
        icon={<Sparkles className="w-5 h-5 text-indigo-600" />}
      >
        <div className="flex items-center gap-2">
          <Badge variant="indigo" size="sm">
            WOW-момент первого подключения
          </Badge>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500 font-medium">Снимок магазина {store.marketplace.toUpperCase()}</span>
        </div>
        <ModalTitle>«Я полностью изучил ваш магазин»</ModalTitle>
        <ModalDescription>Экспресс-аудит каталога, цен и поисковых позиций</ModalDescription>
      </ModalHeader>

      <ModalBody className="space-y-6">
        {/* 30-day Big Numbers Summary */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-3 text-center">
          <div>
            <span className="text-[11px] text-slate-500 block">Выручка за 30 дней</span>
            <span className="text-base sm:text-lg font-black text-slate-900">
              3 840 000 ₽
            </span>
          </div>
          <div className="border-x border-slate-200">
            <span className="text-[11px] text-slate-500 block">Всего товаров</span>
            <span className="text-base sm:text-lg font-black text-slate-900">
              184 SKU
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Выкупленных заказов</span>
            <span className="text-base sm:text-lg font-black text-slate-900">
              1 920 шт
            </span>
          </div>
        </div>

        {/* Three Tier Diagnostic Breakdown */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
            <span className="text-xs font-bold text-rose-700 block">🔴 3 проблемы</span>
            <span className="text-[10px] text-rose-600 mt-0.5 block">Требуют решения сегодня</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <span className="text-xs font-bold text-amber-800 block">🟡 7 точек роста</span>
            <span className="text-[10px] text-amber-700 mt-0.5 block">Для масштабирования</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <span className="text-xs font-bold text-emerald-800 block">🟢 12 возможностей</span>
            <span className="text-[10px] text-emerald-700 mt-0.5 block">+302 800 ₽ к прибыли</span>
          </div>
        </div>

        {/* Primary Case Deep-Dive: Товар №7 */}
        <div className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Главная находка: Товар №7 (Рюкзак городской WB-77291048)</span>
            </span>
            <Badge variant="rose" size="sm">
              -32 позиции в выдаче
            </Badge>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            Я уже разобрался, почему выручка просела на 34% за последнюю неделю:
          </p>

          <div className="space-y-2 text-xs text-slate-700 bg-white/80 p-3.5 rounded-xl border border-indigo-100">
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
              <span><strong>Демпинг конкурента:</strong> LuxeBag снизил цену на 240 ₽ и перетянул органические клики.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
              <span><strong>Остатки на складе:</strong> На ключевом хабе Коледино осталось всего 12 шт (риск Out-of-Stock).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
              <span><strong>Рекламная утечка:</strong> В кампании крутится 18 нерелевантных минус-фраз (ДРР 16.5%).</span>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="text-xs text-slate-500 flex items-center gap-1.5 mr-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Защита Business Rule: цена не упадет ниже порога 1 500 ₽</span>
        </div>

        <Button variant="secondary" onClick={onClose}>
          Закрыть
        </Button>

        <Button
          variant="primary"
          onClick={handleApply}
          disabled={executed}
          isLoading={executed}
          leftIcon={<Zap className="w-4 h-4 text-amber-300" />}
        >
          {executed ? 'Отправка в API...' : '⚡ Применить решение AI в 1 клик'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

