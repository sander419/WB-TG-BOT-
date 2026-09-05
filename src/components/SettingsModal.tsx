import React, { useState } from 'react';
import { 
  Send, 
  Check, 
  RefreshCw, 
  Clock, 
  Store,
  Globe2,
  Factory
} from 'lucide-react';
import { MarketplaceConfig } from '../types';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter, Button, Badge, Input, Select } from './ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: MarketplaceConfig;
  onSaveConfig: (newConfig: MarketplaceConfig) => void;
  onResetDemoData: () => void;
}

type TabType = 'china' | 'russian' | 'telegram';

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetDemoData,
}) => {
  const [formData, setFormData] = useState<MarketplaceConfig>(config);
  const [activeTab, setActiveTab] = useState<TabType>('china');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader
        icon={
          <Globe2 className="w-5 h-5 text-indigo-600" />
        }
      >
        <div className="flex items-center gap-2">
          <Badge variant="rose" size="sm">
            🇨🇳 Фабрики Китая + РФ
          </Badge>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500">API Коннекторы</span>
        </div>
        <ModalTitle>Интеграции и подключение каналов</ModalTitle>
        <ModalDescription>
          Wildberries, Ozon, 1688 Wholesale, Taobao, JD.com и Telegram AI
        </ModalDescription>
      </ModalHeader>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-2 gap-2">
        <button
          type="button"
          id="tab-china-marketplaces"
          onClick={() => setActiveTab('china')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x cursor-pointer ${
            activeTab === 'china'
              ? 'bg-white text-rose-700 border-slate-200 border-b-white -mb-[1px] shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="text-base leading-none">🇨🇳</span>
          <span>Маркетплейсы Китая (1688 / Taobao / JD)</span>
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
        </button>

        <button
          type="button"
          id="tab-russian-marketplaces"
          onClick={() => setActiveTab('russian')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x cursor-pointer ${
            activeTab === 'russian'
              ? 'bg-white text-indigo-700 border-slate-200 border-b-white -mb-[1px] shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>РФ маркетплейсы (WB / Ozon)</span>
        </button>

        <button
          type="button"
          id="tab-telegram-settings"
          onClick={() => setActiveTab('telegram')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-t border-x cursor-pointer ${
            activeTab === 'telegram'
              ? 'bg-white text-indigo-700 border-slate-200 border-b-white -mb-[1px] shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Telegram AI</span>
        </button>
      </div>

      {/* Form and Content */}
      <form id="settings-form" onSubmit={handleSubmit}>
        <ModalBody className="space-y-4 max-h-[60vh]">
          {/* TAB: CHINA MARKETPLACES */}
          {activeTab === 'china' && (
            <div className="space-y-4">
              <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-950 flex items-start gap-3">
                <Factory className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-extrabold flex items-center gap-1.5 text-rose-900">
                    <span>Прямой контур китайских фабрик и маркетплейсов</span>
                    <Badge variant="rose" size="sm">Open API Hub</Badge>
                  </div>
                  <p className="text-rose-800 leading-relaxed text-[11px]">
                    Подключение позволяет AI сканировать фабричные каталоги <strong>1688.com</strong>, находить оригинальных производителей по фото/SKU, забирать оптовые цены в юанях (¥ CNY), автоматизировать расчёт юнит-экономики под ключ и мониторить тренды <strong>Taobao / Tmall</strong> до их появления в РФ.
                  </p>
                </div>
              </div>

              {/* Exchange Rate & Logistics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <Input
                  id="cny-exchange-rate-input"
                  label="Курс Юаня (CNY/RUB)"
                  type="number"
                  step="0.01"
                  value={formData.cnyExchangeRate || 13.45}
                  onChange={(e) => setFormData({ ...formData, cnyExchangeRate: parseFloat(e.target.value) || 13.45 })}
                  leftAddon="¥ 1 ="
                  rightAddon="₽"
                  size="sm"
                />

                <Select
                  id="china-hub-select"
                  label="Фулфилмент-хаб Китая"
                  value={formData.chinaFulfillmentHub || 'Guangzhou South Port'}
                  onChange={(e) => setFormData({ ...formData, chinaFulfillmentHub: e.target.value })}
                  size="sm"
                  options={[
                    { value: 'Guangzhou South Logistics Port #4', label: 'Гуанчжоу (Guangzhou Port #4)' },
                    { value: 'Yiwu International Sourcing Hub', label: 'Иу (Yiwu Trade Hub)' },
                    { value: 'Shenzhen Cross-Border Free Port', label: 'Шэньчжэнь (Shenzhen Free Port)' },
                    { value: 'Dongguan Smart Factory Hub', label: 'Дунгуань (Dongguan Smart Hub)' },
                  ]}
                />

                <Select
                  id="customs-broker-select"
                  label="Таможенный брокер / Карго"
                  value={formData.customsClearanceBroker || 'SilkWay DDP Cargo Express'}
                  onChange={(e) => setFormData({ ...formData, customsClearanceBroker: e.target.value })}
                  size="sm"
                  options={[
                    { value: 'SilkWay DDP Cargo Express', label: 'SilkWay DDP (Белая таможня + ГТД)' },
                    { value: 'AsiaBridge Fast Cargo 12d', label: 'AsiaBridge Express (Авиа 10-12 дней)' },
                    { value: 'TransEurasia Rail Container', label: 'ТрансЕвразия (Ж/Д контейнер 20 дней)' },
                  ]}
                />
              </div>

              {/* 1688.com Config */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    <span className="font-extrabold text-xs text-orange-950">
                      1688.com Wholesale Open Platform (Alibaba Group)
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.ali1688Connected}
                      onChange={(e) => setFormData({ ...formData, ali1688Connected: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <Badge variant={formData.ali1688Connected ? 'emerald' : 'neutral'} size="sm">
                      {formData.ali1688Connected ? 'Подключен' : 'Отключен'}
                    </Badge>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="ali1688-app-key-input"
                    label="AppKey / Client ID"
                    type="text"
                    value={formData.ali1688AppKey || ''}
                    onChange={(e) => setFormData({ ...formData, ali1688AppKey: e.target.value })}
                    placeholder="1688_live_app_..."
                    size="sm"
                  />
                  <Input
                    id="ali1688-app-secret-input"
                    label="App Secret Key"
                    type="password"
                    value={formData.ali1688AppSecret || ''}
                    onChange={(e) => setFormData({ ...formData, ali1688AppSecret: e.target.value })}
                    placeholder="sec_ali_..."
                    size="sm"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Позволяет осуществлять прямой парсинг заводских цен в Китае, автоматический расчет себестоимости и формирование контрактов с фабриками.
                </p>
              </div>

              {/* Taobao / Tmall Config */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                    <span className="font-extrabold text-xs text-red-950">
                      Taobao / Tmall (Taobao Open Platform TOP API)
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.taobaoConnected}
                      onChange={(e) => setFormData({ ...formData, taobaoConnected: e.target.checked })}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <Badge variant={formData.taobaoConnected ? 'emerald' : 'neutral'} size="sm">
                      {formData.taobaoConnected ? 'Подключен' : 'Отключен'}
                    </Badge>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="taobao-app-key-input"
                    type="text"
                    value={formData.taobaoAppKey || ''}
                    onChange={(e) => setFormData({ ...formData, taobaoAppKey: e.target.value })}
                    placeholder="Taobao AppKey"
                    size="sm"
                  />
                  <Input
                    id="taobao-session-key-input"
                    type="password"
                    value={formData.taobaoSessionKey || ''}
                    onChange={(e) => setFormData({ ...formData, taobaoSessionKey: e.target.value })}
                    placeholder="Session Access Token"
                    size="sm"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Мониторинг бестселлеров в материковом Китае для мгновенного копирования трендовой инфографики и позиционирования.
                </p>
              </div>

              {/* JD.com & Pinduoduo / Temu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                      JD.com Open API
                    </span>
                    <Badge variant="neutral" size="sm">
                      Опционально
                    </Badge>
                  </div>
                  <Input
                    id="jd-app-key-input"
                    type="text"
                    value={formData.jdAppKey || ''}
                    onChange={(e) => setFormData({ ...formData, jdAppKey: e.target.value })}
                    placeholder="JD AppKey"
                    size="sm"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Pinduoduo / Temu Feed API
                    </span>
                    <Badge variant="neutral" size="sm">
                      Опционально
                    </Badge>
                  </div>
                  <Input
                    id="pinduoduo-client-id-input"
                    type="text"
                    value={formData.pinduoduoClientId || ''}
                    onChange={(e) => setFormData({ ...formData, pinduoduoClientId: e.target.value })}
                    placeholder="PDD Client ID"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: RUSSIAN MARKETPLACES */}
          {activeTab === 'russian' && (
            <div className="space-y-4">
              {/* Wildberries Config */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-purple-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    Wildberries API Token (Статистика, Цены, Контент)
                  </span>
                  <Badge variant="emerald" size="sm">
                    Подключен (Активен)
                  </Badge>
                </div>
                <Input
                  id="wb-api-key-input"
                  type="password"
                  value={formData.wbApiKey}
                  onChange={(e) => setFormData({ ...formData, wbApiKey: e.target.value })}
                  placeholder="wb_live_secret_key_..."
                  size="sm"
                />
                <p className="text-[11px] text-slate-500">
                  Используется для чтения воронки, остатков FBO и автоматического применения цен по вашему подтверждению.
                </p>
              </div>

              {/* Ozon Config */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-sky-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                    Ozon Seller API (Client ID & API Key)
                  </span>
                  <Badge variant="emerald" size="sm">
                    Подключен (Активен)
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="ozon-client-id-input"
                    type="text"
                    value={formData.ozonClientId}
                    onChange={(e) => setFormData({ ...formData, ozonClientId: e.target.value })}
                    placeholder="Client ID (например: 149204)"
                    size="sm"
                  />
                  <Input
                    id="ozon-api-key-input"
                    type="password"
                    value={formData.ozonApiKey}
                    onChange={(e) => setFormData({ ...formData, ozonApiKey: e.target.value })}
                    placeholder="API Key"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: TELEGRAM SETTINGS */}
          {activeTab === 'telegram' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-indigo-700 flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-indigo-600" />
                    Telegram AI-Менеджер (@commerce_os_bot)
                  </span>
                  <Badge variant="indigo" size="sm">
                    Связан с аккаунтом
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      id="telegram-username-input"
                      type="text"
                      value={formData.telegramUsername}
                      onChange={(e) => setFormData({ ...formData, telegramUsername: e.target.value })}
                      placeholder="@username в Telegram"
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Сводка в:</span>
                    <input
                      type="time"
                      value={formData.morningDigestTime}
                      onChange={(e) => setFormData({ ...formData, morningDigestTime: e.target.value })}
                      className="bg-white border border-slate-200 text-xs px-2 py-1.5 rounded-lg text-slate-900 shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            id="reset-demo-data-btn"
            onClick={() => {
              onResetDemoData();
              onClose();
            }}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 mr-auto hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Перезагрузить демо-данные</span>
          </button>

          <Button variant="secondary" onClick={onClose} type="button">
            Отмена
          </Button>

          <Button
            type="submit"
            id="save-settings-btn"
            variant="primary"
            leftIcon={savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : undefined}
          >
            {savedSuccess ? 'Сохранено!' : 'Сохранить настройки'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

