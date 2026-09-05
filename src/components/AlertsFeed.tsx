import React from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  TrendingDown, 
  TrendingUp, 
  Sparkles, 
  CheckCircle2, 
  Check, 
  ArrowRight,
  BellRing
} from 'lucide-react';
import { StoreAlert, Product } from '../types';

interface Props {
  alerts: StoreAlert[];
  products: Product[];
  onResolveAlert: (alertId: string, actionType: string, productId?: string) => void;
  onSelectProduct: (p: Product) => void;
}

export const AlertsFeed: React.FC<Props> = ({
  alerts,
  products,
  onResolveAlert,
  onSelectProduct,
}) => {
  return (
    <div id="alerts-feed-module" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-amber-500" />
            Радар аномалий & Упреждающие сигналы
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            AI самостоятельно обнаруживает угрозы до того, как они срежут вашу прибыль
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          {alerts.filter(a => !a.resolved).length} активных сигналов
        </span>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const product = products.find((p) => p.id === alert.productId);

          return (
            <div
              key={alert.id}
              id={`alert-card-${alert.id}`}
              className={`p-4 rounded-xl border transition-all ${
                alert.resolved
                  ? 'bg-slate-50 border-slate-200 opacity-60'
                  : alert.severity === 'critical'
                  ? 'bg-rose-50/60 border-rose-200 shadow-2xs'
                  : alert.severity === 'opportunity'
                  ? 'bg-emerald-50/60 border-emerald-200 shadow-2xs'
                  : 'bg-amber-50/60 border-amber-200 shadow-2xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {alert.title}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      • {alert.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {alert.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {alert.resolved ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Устранено</span>
                    </div>
                  ) : (
                    <button
                      id={`resolve-alert-btn-${alert.id}`}
                      onClick={() => onResolveAlert(alert.id, alert.actionType, alert.productId)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                        alert.severity === 'critical'
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : alert.severity === 'opportunity'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{alert.actionLabel}</span>
                    </button>
                  )}

                  {product && (
                    <button
                      onClick={() => onSelectProduct(product)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                      title="Открыть товар"
                    >
                      К SKU
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
