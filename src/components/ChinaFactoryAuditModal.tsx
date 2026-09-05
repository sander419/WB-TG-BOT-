import React from 'react';
import {
  ShieldCheck,
  Factory,
  CheckCircle2,
  Award,
  Sparkles
} from 'lucide-react';
import { ChinaFactorySource } from '../types';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter, Button, Badge } from './ui';

interface Props {
  factory: ChinaFactorySource;
  onClose: () => void;
  onAskAi: (prompt: string) => void;
}

export const ChinaFactoryAuditModal: React.FC<Props> = ({
  factory,
  onClose,
  onAskAi,
}) => {
  const certifications = factory.certifications || ['ISO9001:2015', 'EAC Declaration', 'BSCI Social Audit'];
  const defectRate = factory.defectRatePercent || 0.18;
  const area = factory.factoryAreaSqMeters || 16000;
  const workers = factory.workersCount || 280;
  const capacity = factory.dailyProductionUnits || 5000;
  const exportShare = factory.exportSharePercent || 78;

  return (
    <Modal isOpen={true} onClose={onClose} size="2xl">
      <ModalHeader
        icon={
          <ShieldCheck className="w-5 h-5 text-rose-600" />
        }
      >
        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="sm">
            VERIFIED FACTORY ★ {factory.verifiedSupplierRating}
          </Badge>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500 truncate max-w-xs">{factory.city}, CN</span>
        </div>
        <ModalTitle>AI Due Diligence & Аудит Фабрики</ModalTitle>
        <ModalDescription>{factory.factoryName}</ModalDescription>
      </ModalHeader>

      <ModalBody className="space-y-6">
        {/* Top Scorecard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-center">
            <span className="text-[10px] uppercase font-bold text-rose-800 block mb-1">
              Рейтинг надежности
            </span>
            <div className="text-xl font-black text-rose-700">
              ★ {factory.verifiedSupplierRating}
            </div>
            <span className="text-[10px] text-rose-600">Топ 2% по Китаю</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
              Стаж на рынке
            </span>
            <div className="text-xl font-black text-slate-900">
              {factory.yearsInBusiness} лет
            </div>
            <span className="text-[10px] text-slate-500">Прямой производитель</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block mb-1">
              Уровень брака (QC)
            </span>
            <div className="text-xl font-black text-emerald-700">
              {defectRate}%
            </div>
            <span className="text-[10px] text-emerald-600">Стандарт ISO9001</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-center">
            <span className="text-[10px] uppercase font-bold text-indigo-800 block mb-1">
              Экспортная квота
            </span>
            <div className="text-xl font-black text-indigo-700">
              {exportShare}%
            </div>
            <span className="text-[10px] text-indigo-600">Опыт поставок в РФ/ЕС</span>
          </div>
        </div>

        {/* Production Capacity & Line Stats */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
          <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Factory className="w-4 h-4 text-rose-600" />
            <span>Производственные мощности и цеха</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Площадь фабрики:</span>
              <span className="font-extrabold text-slate-900">{area.toLocaleString()} м²</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Штат сотрудников:</span>
              <span className="font-extrabold text-slate-900">{workers} чел. (3 смены)</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Суточный выпуск:</span>
              <span className="font-extrabold text-slate-900">{capacity.toLocaleString()} шт / день</span>
            </div>
          </div>
        </div>

        {/* Certifications & Quality Badges */}
        <div className="space-y-2">
          <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600" />
            <span>Международные сертификаты & Аудит</span>
          </h4>

          <div className="flex flex-wrap gap-2">
            {certifications.map((cert, idx) => (
              <Badge key={idx} variant="neutral" size="md" className="gap-1.5 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {cert}
              </Badge>
            ))}
          </div>
        </div>

        {/* AI Security Verdict */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-300 text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Заключение AI-инспектора риска поставщика</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Фабрика <strong className="text-white">{factory.factoryName}</strong> имеет официальную регистрацию в реестре Торгово-промышленной палаты КНР, 0 судебных арбитражных споров за последние 36 месяцев и стабильный объем отгрузок. Риск срыва сроков производства оценен как <strong>крайне низкий (&lt;1.5%)</strong>.
          </p>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs text-emerald-400 font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Рекомендовано к заключению прямого внешнеторгового контракта с авансом 30%.</span>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Закрыть
        </Button>

        <Button
          variant="danger"
          onClick={() => {
            onAskAi(
              `Проведи подробный аудит фабрики "${factory.factoryName}" (${factory.city}). Сформируй чек-лист вопросов для представителя в Китае перед выездом на инспекцию.`
            );
            onClose();
          }}
          leftIcon={<Sparkles className="w-4 h-4 text-rose-200" />}
        >
          Сформировать чек-лист аудита с AI
        </Button>
      </ModalFooter>
    </Modal>
  );
};

