import React from 'react';
import { Product } from '../types';
import { CompetitorBenchmarkingWidget } from './CompetitorBenchmarkingWidget';
import { Modal } from './ui';

interface Props {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onUpdatePrice?: (productId: string, newPrice: number) => void;
  onRestock?: (productId: string, amount: number) => void;
  onAskAi?: (product: Product, customPrompt?: string) => void;
}

export const CompetitorBenchmarkModal: React.FC<Props> = ({
  isOpen,
  product,
  onClose,
  onUpdatePrice,
  onRestock,
  onAskAi
}) => {
  if (!isOpen || !product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <CompetitorBenchmarkingWidget
        product={product}
        onUpdatePrice={onUpdatePrice}
        onRestock={onRestock}
        onAskAi={onAskAi}
        onClose={onClose}
      />
    </Modal>
  );
};

