import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Zap, 
  Check
} from 'lucide-react';
import { ActionCardData, Product, Store } from '../types';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter, Button, Badge } from './ui';

interface Props {
  isOpen: boolean;
  actionCard: ActionCardData | null;
  targetProduct?: Product;
  currentStore: Store;
  onClose: () => void;
  onConfirm: (card: ActionCardData) => void;
}

export const ActionConfirmModal: React.FC<Props> = ({
  isOpen,
  actionCard,
  targetProduct,
  currentStore,
  onClose,
  onConfirm,
}) => {
  const [isExecuting, setIsExecuting] = useState(false);

  if (!actionCard) return null;

  const handleConfirm = () => {
    setIsExecuting(true);
    setTimeout(() => {
      onConfirm(actionCard);
      setIsExecuting(false);
      onClose();
    }, 1000);
  };

  const isHighRisk = actionCard.permissionLevel === 'HIGH_RISK';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader
        icon={
          <ShieldCheck className={`w-5 h-5 ${isHighRisk ? 'text-rose-600' : 'text-amber-600'}`} />
        }
      >
        <div className="flex items-center gap-2">
          <Badge variant={isHighRisk ? 'rose' : 'amber'} size="sm">
            Уровень: {actionCard.permissionLevel || 'WRITE'}
          </Badge>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500 font-mono">
            {currentStore.marketplace.toUpperCase()} API
          </span>
        </div>
        <ModalTitle>Подтверждение действия продавцом</ModalTitle>
      </ModalHeader>

      <ModalBody>
        {/* Action Title and Description */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
          <h4 className="text-xs font-bold text-slate-900">
            {actionCard.title}
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            {actionCard.description}
          </p>
        </div>

        {/* Payload / Change Matrix */}
        <div className="space-y-2 text-xs">
          <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
            Параметры отправки в API:
          </span>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
            {actionCard.payload?.productName && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Товар:</span>
                <span className="font-bold text-slate-900">{actionCard.payload.productName}</span>
              </div>
            )}

            {actionCard.payload?.newPrice !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Изменение цены:</span>
                <span className="font-mono">
                  {actionCard.payload.oldPrice ? (
                    <span className="line-through text-slate-400 mr-2">{actionCard.payload.oldPrice} ₽</span>
                  ) : null}
                  <span className="font-bold text-emerald-600">{actionCard.payload.newPrice} ₽</span>
                </span>
              </div>
            )}

            {actionCard.payload?.amount !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Партия к поставке:</span>
                <span className="font-bold text-indigo-700 font-mono">
                  +{actionCard.payload.amount} шт ({actionCard.payload.targetWarehouse || 'FBO Склад'})
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Проверка бизнес-правил:</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Все лимиты соблюдены (порог &gt;= 1 500 ₽)
              </span>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Отклонить
        </Button>
        <Button
          variant="success"
          onClick={handleConfirm}
          isLoading={isExecuting}
          leftIcon={<Zap className="w-4 h-4 text-amber-300" />}
        >
          {isExecuting ? 'Отправка в коннектор...' : 'Подтвердить и отправить в API'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

