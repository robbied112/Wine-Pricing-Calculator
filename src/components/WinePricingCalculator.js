import React, { useEffect, useMemo, useState } from 'react';
import { calculatePricing } from '../lib/pricingEngine';
import { PRESETS, applyPresetToInputs, loadUserPresets, saveUserPresets, getAllPresets } from '../lib/presets';

const defaultState = {
  wineName: 'Wine Example 1',
  currency: 'EUR',
  exchangeRate: 1.08,
  exchangeBuffer: 0,
  bottleCost: 5.25,
  caseCost: '',
  casePack: 12,
  bottleSize: '750ml',
  diFreight: 13,
  tariff: 0,
  statesideLogistics: 10,
  supplierMargin: 30,
  distributorMargin: 30,
  retailerMargin: 33,
  roundRetail: true,
  casesSold: 100,
};

const currencySymbol = {
  USD: '$',
  EUR: '€',
};


const formatMoney = (value, currency = 'USD') => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
const NumberInput = ({ label, prefix, suffix, disabled, ...props }) => (
  <label className="flex flex-col space-y-1 text-sm text-slate-700">
    <span className="font-medium">{label}</span>
    <div className="flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-200">
      {prefix && <span className="mr-2 text-xs text-slate-500">{prefix}</span>}
      <input
        {...props}
        disabled={disabled}
        className={`w-full border-none bg-transparent text-base text-slate-900 placeholder-slate-400 focus:outline-none ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        }`}
        type="number"
      />
      {suffix && <span className="ml-2 text-xs text-slate-500">{suffix}</span>}
    </div>
  </label>
);

const TextInput = ({ label, disabled, ...props }) => (
  <label className="flex flex-col space-y-1 text-sm text-slate-700">
    <span className="font-medium">{label}</span>
    <input
      {...props}
      disabled={disabled}
      className={`rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      }`}
      type="text"
    />
  </label>
);

const SelectInput = ({ label, children, disabled, ...props }) => (
  <label className="flex flex-col space-y-1 text-sm text-slate-700">
    <span className="font-medium">{label}</span>
    <select
      {...props}
      disabled={disabled}
      className={`rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      }`}
    >
      {children}
    </select>
  </label>
);

const Card = ({ title, kicker, children, accent = false, collapsible = false, defaultCollapsed = false, sticky = false }) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const containerClasses = [
    'rounded-2xl border p-6 space-y-4',
    accent ? 'border-amber-300 bg-white/90 shadow-lg shadow-amber-100' : 'border-slate-200 bg-white shadow-sm',
    sticky ? 'lg:sticky lg:top-4' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={containerClasses}>
      <div className="flex justify-between items-center space-y-1">
        <div>
          {kicker && <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">{kicker}</p>}
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        {collapsible && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-sm text-slate-500 hover:text-slate-700 focus:outline-none"
            aria-expanded={!collapsed}
            aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          >
            {collapsed ? '▸' : '▾'}
          </button>
        )}
      </div>
      {!collapsed && children}
    </section>
  );
};

const SummaryRow = ({ label, value, helper }) => (
  <div className="flex items-start justify-between py-2 border-b border-slate-100 last:border-0">
    <div>
      <p className="text-sm font-medium text-slate-800">{label}</p>
      {helper && <p className="text-xs text-slate-500">{helper}</p>}
    </div>
    <p className="text-sm font-semibold text-slate-900">{value}</p>
  </div>
);

const LockIcon = () => (
  <span className="ml-2 text-slate-400" title="Locked by preset">🔒</span>
);

const WinePricingCalculator = () => {
  const [inputs, setInputs] = useState(defaultState);
  const [rateStatus, setRateStatus] = useState({ loading: false, error: null });

  const [activePresetId, setActivePresetId] = useState('eu-default');
  const [isOverrideUnlocked, setIsOverrideUnlocked] = useState(false);
  const [userPresets, setUserPresets] = useState([]);

  const [isScenarioBEnabled, setIsScenarioBEnabled] = useState(false);
  const [scenarioBLabel, setScenarioBLabel] = useState('Scenario B');
  const [scenarioBOverrides, setScenarioBOverrides] = useState({
    bottleCost: '',
    caseCost: '',
    casePack: '',
    tariff: '',
    diFreight: '',
    statesideLogistics: '',
    supplierMargin: '',
    distributorMargin: '',
    retailerMargin: '',
  });

  const allPresets = getAllPresets(userPresets);

  const activePreset = useMemo(
    () => allPresets.find((p) => p.id === activePresetId) || null,
    [activePresetId, allPresets]
  );

  const lockedFields = activePreset?.lockedFields || [];

  const isLocked = (fieldName) =>
    !isOverrideUnlocked && lockedFields.includes(fieldName);

  const fetchExchangeRate = async () => {
    if (inputs.currency !== 'EUR') return;

    setRateStatus({ loading: true, error: null });

    try {
      const response = await fetch('https://open.er-api.com/v6/latest/EUR');
      if (!response.ok) throw new Error('Unable to fetch exchange rate');

      const data = await response.json();
      const liveRate = data?.rates?.USD;

      if (!liveRate || Number.isNaN(Number(liveRate))) throw new Error('Invalid rate from service');

      setInputs((prev) => ({
        ...prev,
        exchangeRate: Number(Number(liveRate).toFixed(4)),
      }));
      setRateStatus({ loading: false, error: null });
    } catch (error) {
      setRateStatus({ loading: false, error: error.message || 'Failed to refresh rate' });
    }
  };

  useEffect(() => {
    if (inputs.currency === 'EUR' && process.env.NODE_ENV !== 'test') {
      fetchExchangeRate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs.currency]);

  // Apply sensible tariff defaults when currency changes.
  // - EUR suppliers: default tariff 15 if unset ('' or 0)
  // - USD suppliers: default tariff 0 if previously defaulted or unset
  useEffect(() => {
    if (inputs.currency === 'EUR') {
      setInputs((prev) => ({
        ...prev,
        tariff: prev.tariff === 0 || prev.tariff === '' ? 15 : prev.tariff,
      }));
    }

    if (inputs.currency === 'USD') {
      setInputs((prev) => ({
        ...prev,
        tariff: prev.tariff === 15 || prev.tariff === '' ? 0 : prev.tariff,
      }));
    }
    // Only run when currency changes
  }, [inputs.currency]);

  useEffect(() => {
    const loaded = loadUserPresets();
    setUserPresets(loaded);
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    const parsedValue = () => {
      if (type === 'checkbox') return checked;
      if (value === '') return '';

      const numericValue = Number(value);
      return Number.isNaN(numericValue) ? value : numericValue;
    };

    setInputs((prev) => ({
      ...prev,
      [name]: parsedValue(),
    }));
  };

  

  const handleSaveAsPreset = () => {
    const name = window.prompt('Preset name (e.g. "Italy – 6pks aggressive")');
    if (!name) return;

    const id = `user-${Date.now()}`;

    const euDefault = PRESETS.find((p) => p.id === 'eu-default');
    const lockedFields = euDefault?.lockedFields || [];

    const newPreset = {
      id,
      name,
      description: 'Custom preset',
      lockedFields,
      values: {
        ...inputs,
      },
    };

    setUserPresets((prev) => {
      const updated = [...prev, newPreset];
      saveUserPresets(updated);
      return updated;
    });

    setActivePresetId(id);
    setIsOverrideUnlocked(false);
  };

  const derived = useMemo(() => calculatePricing(inputs), [inputs]);

  const scenarioBInputs = useMemo(() => {
    if (!isScenarioBEnabled) return null;
    return {
      ...inputs,
      ...Object.fromEntries(
        Object.entries(scenarioBOverrides).filter(([, value]) => value !== '' && value !== null && value !== undefined)
      ),
    };
  }, [inputs, isScenarioBEnabled, scenarioBOverrides]);

  const derivedB = useMemo(
    () => (scenarioBInputs ? calculatePricing(scenarioBInputs) : null),
    [scenarioBInputs]
  );

  // Add helper function for formatting deltas
  const formatDeltaMoney = (value, currency = 'USD') => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    const absFormatted = formatMoney(Math.abs(num), currency);
    if (num > 0) return `+${absFormatted}`;
    if (num < 0) return `-${absFormatted}`;
    return formatMoney(0, currency);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* LEFT COLUMN: All input cards */}
      <div className="space-y-6">
        {/* Preset selector */}
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="flex flex-col space-y-1 text-sm text-slate-700">
            <span className="font-medium">Pricing preset</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              value={activePresetId}
              onChange={(e) => {
                const newId = e.target.value;
                setActivePresetId(newId);
                setIsOverrideUnlocked(false);
                const preset = allPresets.find((p) => p.id === newId) || null;
                if (preset) {
                  setInputs((prev) => applyPresetToInputs(prev, preset));
                }
              }}
            >
              {allPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            {activePreset && <p className="text-xs text-slate-500">{activePreset.description}</p>}
            <label className="mt-1 inline-flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={isOverrideUnlocked}
                onChange={(e) => setIsOverrideUnlocked(e.target.checked)}
                className="h-3 w-3 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
              />
              <span>Unlock all fields</span>
            </label>
            <button
              type="button"
              className="mt-2 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-amber-400 hover:text-amber-800"
              onClick={handleSaveAsPreset}
            >
              Save current as preset
            </button>
          </label>
        </div>

        {/* Input cards */}
        <div className="space-y-6">
          {/* Product basics card */}
          <Card title="Product basics" kicker="Foundation" collapsible defaultCollapsed={false}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col space-y-1 text-sm text-slate-700 md:col-span-2">
                <span className="font-medium">Wine name</span>
                <input
                  type="text"
                  name="wineName"
                  value={inputs.wineName}
                  onChange={(e) => setInputs({ ...inputs, wineName: e.target.value })}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  placeholder="E.g. Estate Chardonnay 2022"
                />
              </label>
              <SelectInput
                label={
                  <span className="font-medium flex items-center">
                    Supplier currency
                    {isLocked('currency') && <LockIcon />}
                  </span>
                }
                name="currency"
                value={inputs.currency}
                onChange={handleChange}
                disabled={isLocked('currency')}
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </SelectInput>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <NumberInput
                      label={
                        <span className="font-medium flex items-center">
                          Exchange rate (EUR → USD)
                          {isLocked('exchangeRate') && <LockIcon />}
                        </span>
                      }
                      name="exchangeRate"
                      value={inputs.exchangeRate}
                      onChange={handleChange}
                      step="0.0001"
                      disabled={inputs.currency === 'USD' || isLocked('exchangeRate')}
                    />
                  </div>
                  {inputs.currency === 'EUR' && (
                    <button
                      type="button"
                      onClick={fetchExchangeRate}
                      className="mt-6 whitespace-nowrap rounded-lg border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-800 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={rateStatus.loading}
                      aria-label="Refresh exchange rate"
                    >
                      {rateStatus.loading ? 'Updating…' : 'Use live rate'}
                    </button>
                  )}
                </div>
                {inputs.currency === 'EUR' && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <NumberInput
                      label="Exchange buffer"
                      name="exchangeBuffer"
                      value={inputs.exchangeBuffer}
                      onChange={handleChange}
                      disabled={isLocked('exchangeBuffer')}
                      step="0.1"
                      suffix="%"
                    />
                    <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800 shadow-inner">
                      <p className="font-semibold">Effective rate</p>
                      <p>
                        Base {inputs.exchangeRate || '—'} × buffer ={' '}
                        <span className="font-semibold">{((Number(inputs.exchangeRate) || 0) * (1 + (Number(inputs.exchangeBuffer) || 0) / 100)).toFixed(4)}</span>
                      </p>
                      {rateStatus.error && <p className="mt-1 text-red-600">{rateStatus.error}</p>}
                    </div>
                  </div>
                )}
              </div>
              <NumberInput
                label={
                  <span className="font-medium flex items-center">
                    Bottle cost
                    {isLocked('bottleCost') && <LockIcon />}
                  </span>
                }
                name="bottleCost"
                value={inputs.bottleCost}
                onChange={handleChange}
                step="0.01"
                suffix={currencySymbol[inputs.currency]}
                disabled={isLocked('bottleCost')}
              />
              <NumberInput
                label={
                  <span className="font-medium flex items-center">
                    Case cost (override)
                    {isLocked('caseCost') && <LockIcon />}
                  </span>
                }
                name="caseCost"
                value={inputs.caseCost}
                onChange={handleChange}
                step="0.01"
                suffix={currencySymbol[inputs.currency]}
                disabled={isLocked('caseCost')}
              />
              <div className="space-y-2">
                <NumberInput
                  label={
                    <span className="font-medium flex items-center">
                      Case pack
                      {isLocked('casePack') && <LockIcon />}
                    </span>
                  }
                  name="casePack"
                  value={inputs.casePack}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setInputs((prev) => ({ ...prev, casePack: '' }));
                      return;
                    }
                    const n = Number(val);
                    setInputs((prev) => ({
                      ...prev,
                      casePack: Number.isNaN(n) ? prev.casePack : n,
                    }));
                  }}
                  step="1"
                  disabled={isLocked('casePack')}
                />
                <div className="flex flex-wrap gap-2">
                  {[1, 3, 6, 12, 24].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        inputs.casePack === option
                          ? 'border-amber-500 bg-amber-50 text-amber-800'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                      onClick={() =>
                        setInputs((prev) => ({
                          ...prev,
                          casePack: option,
                        }))
                      }
                      disabled={isLocked('casePack')}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <SelectInput label="Bottle size" name="bottleSize" value={inputs.bottleSize} onChange={handleChange}>
                {['187ml', '375ml', '500ml', '750ml', '1L', '1.5L', '3L'].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </SelectInput>
            </div>
          </Card>

          {/* Scenario B card */}
          <Card title="Scenario B (optional)" kicker="Comparison" collapsible defaultCollapsed={true}>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isScenarioBEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setIsScenarioBEnabled(enabled);
                    if (enabled) {
                      setScenarioBOverrides({
                        bottleCost: inputs.bottleCost,
                        caseCost: inputs.caseCost,
                        casePack: inputs.casePack,
                        tariff: inputs.tariff,
                        diFreight: inputs.diFreight,
                        statesideLogistics: inputs.statesideLogistics,
                        supplierMargin: inputs.supplierMargin,
                        distributorMargin: inputs.distributorMargin,
                        retailerMargin: inputs.retailerMargin,
                      });
                    } else {
                      setScenarioBOverrides({
                        bottleCost: '',
                        caseCost: '',
                        casePack: '',
                        tariff: '',
                        diFreight: '',
                        statesideLogistics: '',
                        supplierMargin: '',
                        distributorMargin: '',
                        retailerMargin: '',
                      });
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                />
                <span>Enable comparison scenario</span>
              </label>

              {isScenarioBEnabled && (
                <>
                  <TextInput
                    label="Scenario label"
                    name="scenarioBLabel"
                    value={scenarioBLabel}
                    onChange={(e) => setScenarioBLabel(e.target.value)}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <NumberInput
                      label="Bottle cost (B)"
                      name="bottleCostB"
                      value={scenarioBOverrides.bottleCost}
                      onChange={(e) =>
                        setScenarioBOverrides((prev) => ({ ...prev, bottleCost: e.target.value }))
                      }
                      step="0.01"
                    />
                    <NumberInput
                      label="Case cost (override) (B)"
                      name="caseCostB"
                      value={scenarioBOverrides.caseCost}
                      onChange={(e) =>
                        setScenarioBOverrides((prev) => ({ ...prev, caseCost: e.target.value }))
                      }
                      step="0.01"
                    />
                    <NumberInput
                      label="Case pack (B)"
                      name="casePackB"
                      value={scenarioBOverrides.casePack}
                      onChange={(e) =>
                        setScenarioBOverrides((prev) => ({ ...prev, casePack: e.target.value }))
                      }
                      step="1"
                    />
                    <NumberInput
                      label="Tariff (B)"
                      name="tariffB"
                      value={scenarioBOverrides.tariff}
                      onChange={(e) =>
                        setScenarioBOverrides((prev) => ({ ...prev, tariff: e.target.value }))
                      }
                      step="0.1"
                      suffix="%"
                    />
                    <NumberInput
                      label="Direct import freight / case (B)"
                      name="diFreightB"
                      value={scenarioBOverrides.diFreight}
                      onChange={(e) =>
                        setScenarioBOverrides((prev) => ({ ...prev, diFreight: e.target.value }))
                      }
                      step="0.01"
                      prefix="$"
                    />
                    <NumberInput
                      label="Stateside logistics / case (B)"
                      name="statesideLogisticsB"
                      value={scenarioBOverrides.statesideLogistics}
                      onChange={(e) =>
                        setScenarioBOverrides((prev) => ({ ...prev, statesideLogistics: e.target.value }))
                      }
                      step="0.01"
                      prefix="$"
                    />
                    <NumberInput
                      label="Supplier margin (B)"
                      name="supplierMarginB"
                      value={scenarioBOverrides.supplierMargin}
                      onChange={(e) =>
                        setScenarioBOverrides((prev) => ({ ...prev, supplierMargin: e.target.value }))
                      }
                      step="0.1"
                      suffix="%"
                    />
                    <NumberInput
                      label="Distributor margin (B)"
                      name="distributorMarginB"
                      value={scenarioBOverrides.distributorMargin}
                      onChange={(e) =>
                        setScenarioBOverrides((prev) => ({ ...prev, distributorMargin: e.target.value }))
                      }
                      step="0.1"
                      suffix="%"
                    />
                    <NumberInput
                      label="Retailer margin (B)"
                      name="retailerMarginB"
                      value={scenarioBOverrides.retailerMargin}
                      onChange={(e) =>
                        setScenarioBOverrides((prev) => ({ ...prev, retailerMargin: e.target.value }))
                      }
                      step="0.1"
                      suffix="%"
                    />
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Logistics & margins card */}
          <Card title="Logistics & margins" kicker="Cost stack" collapsible defaultCollapsed={false}>
            <div className="grid gap-4 md:grid-cols-2">
              <NumberInput label={<span className="font-medium flex items-center">Direct import freight / case{isLocked('diFreight') && <LockIcon />}</span>} name="diFreight" value={inputs.diFreight} onChange={handleChange} step="0.01" suffix="$" disabled={isLocked('diFreight')} />
              <NumberInput label={<span className="font-medium flex items-center">Tariff{isLocked('tariff') && <LockIcon />}</span>} name="tariff" value={inputs.tariff} onChange={handleChange} step="0.1" suffix="%" disabled={isLocked('tariff')} />
              <NumberInput label={<span className="font-medium flex items-center">Stateside logistics / case{isLocked('statesideLogistics') && <LockIcon />}</span>} name="statesideLogistics" value={inputs.statesideLogistics} onChange={handleChange} step="0.01" suffix="$" disabled={isLocked('statesideLogistics')} />
              <NumberInput label={<span className="font-medium flex items-center">Distributor margin{isLocked('distributorMargin') && <LockIcon />}</span>} name="distributorMargin" value={inputs.distributorMargin} onChange={handleChange} step="0.1" suffix="%" disabled={isLocked('distributorMargin')} />
              <NumberInput label={<span className="font-medium flex items-center">Retailer margin{isLocked('retailerMargin') && <LockIcon />}</span>} name="retailerMargin" value={inputs.retailerMargin} onChange={handleChange} step="0.1" suffix="%" disabled={isLocked('retailerMargin')} />
              <label className="flex items-center space-x-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <input type="checkbox" name="roundRetail" checked={inputs.roundRetail} onChange={handleChange} className="h-4 w-4 text-amber-600 focus:ring-amber-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">Round SRP to .99</p>
                  <p className="text-xs text-slate-500">Keeps shelf prices consumer-friendly.</p>
                </div>
              </label>
            </div>
          </Card>

          {/* Sales assumptions card */}
          <Card title="Sales assumptions" kicker="Volume" collapsible defaultCollapsed={false}>
            <div className="grid gap-4 md:grid-cols-2">
              <NumberInput label="Projected cases sold" name="casesSold" value={inputs.casesSold} onChange={handleChange} step="1" />
              <NumberInput label={<span className="font-medium flex items-center">Supplier margin target{isLocked('supplierMargin') && <LockIcon />}</span>} name="supplierMargin" value={inputs.supplierMargin} onChange={handleChange} step="0.1" suffix="%" disabled={isLocked('supplierMargin')} />
            </div>
          </Card>
        </div>
      </div>

      {/* RIGHT COLUMN: Pricing snapshot, Channel view, Recap */}
      <div className="space-y-6">
        {derivedB && (
          <Card
            title="Scenario comparison"
            kicker={`${inputs.wineName || 'Baseline'} vs ${scenarioBLabel}`}
          >
            <div className="text-sm">
              <div className="grid grid-cols-4 gap-2 py-2 border-b border-slate-200 font-medium">
                <span className="text-slate-500">Metric</span>
                <span className="text-right text-slate-500">Baseline</span>
                <span className="text-right text-slate-500">{scenarioBLabel}</span>
                <span className="text-right text-slate-500">Delta (B − A)</span>
              </div>

              {[
                { label: 'Stateside landed case', a: derived.landedCase, b: derivedB.landedCase },
                { label: 'Wholesale case', a: derived.wholesaleCase, b: derivedB.wholesaleCase },
                { label: 'SRP per bottle', a: derived.srpBottle, b: derivedB.srpBottle },
                { label: 'SRP per case', a: derived.srpCase, b: derivedB.srpCase },
                { label: 'Gross margin / case', a: derived.grossMargin, b: derivedB.grossMargin },
              ].map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-4 gap-2 py-1 border-b border-slate-100"
                >
                  <span className="text-slate-600">{row.label}</span>
                  <span className="text-right tabular-nums">
                    {formatMoney(row.a)}
                  </span>
                  <span className="text-right tabular-nums">
                    {formatMoney(row.b)}
                  </span>
                  <span
                    className={`text-right tabular-nums ${
                      row.b - row.a > 0
                        ? 'text-emerald-700'
                        : row.b - row.a < 0
                        ? 'text-rose-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {formatDeltaMoney(row.b - row.a)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card title="Pricing snapshot" kicker={inputs.wineName || 'Summary'} accent sticky>
          <SummaryRow
            label="Base case cost"
            helper={`Converted from ${inputs.currency} with pack of ${derived.casePack}`}
            value={`${formatMoney(derived.caseCost, inputs.currency)} → ${formatMoney(derived.baseCaseUSD, 'USD')}`}
          />
          <SummaryRow
            label="Supplier FOB (with margin)"
            helper={`Targets ${inputs.supplierMargin}% supplier margin`}
            value={formatMoney(derived.supplierCaseUSD, 'USD')}
          />
          <SummaryRow label="Base bottle cost" value={formatMoney(derived.baseBottleUSD, 'USD')} helper={`${inputs.bottleSize} format`} />
          <SummaryRow label="Import landed case" value={formatMoney(derived.importCase, 'USD')} helper="Supplier + freight + tariffs" />
          <SummaryRow label="Stateside landed case" value={formatMoney(derived.landedCase, 'USD')} helper="Includes domestic logistics" />
          <SummaryRow label="Wholesale case" value={formatMoney(derived.wholesaleCase, 'USD')} helper={`After distributor margin of ${inputs.distributorMargin}%`} />
          <SummaryRow label="SRP per bottle" value={formatMoney(derived.srpBottle, 'USD')} helper={`Retail margin of ${inputs.retailerMargin}%${inputs.roundRetail ? ' with rounding' : ''}`} />
          <SummaryRow label="SRP per case" value={formatMoney(derived.srpCase, 'USD')} />
        </Card>

        <Card title="Channel view" kicker="How it sells">
          <div className="grid gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Retail shelf</p>
              <div className="flex items-center justify-between py-1">
                <p className="text-sm text-slate-600">SRP per bottle</p>
                <p className="text-lg font-semibold text-slate-900">{formatMoney(derived.srpBottle, 'USD')}</p>
              </div>
              <div className="flex items-center justify-between py-1">
                <p className="text-sm text-slate-600">Gross margin / case</p>
                <p className="text-lg font-semibold text-emerald-700">{formatMoney(derived.grossMargin, 'USD')}</p>
              </div>
              <div className="flex items-center justify-between py-1">
                <p className="text-sm text-slate-600">Revenue on {inputs.casesSold || 0} cases</p>
                <p className="text-lg font-semibold text-slate-900">{formatMoney(derived.revenue, 'USD')}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Shareable recap" kicker="Talking points">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>
              {inputs.wineName || 'This wine'} lands at <span className="font-semibold">{formatMoney(derived.landedCase, 'USD')}</span> per case after freight
              and tariffs.
            </li>
            <li>
              Distributor margin at {inputs.distributorMargin}% yields a wholesale of <span className="font-semibold">{formatMoney(derived.wholesaleBottle, 'USD')}</span> per bottle.
            </li>
            <li>
              Retail pricing targets <span className="font-semibold">{formatMoney(derived.srpBottle, 'USD')}</span> on shelf ({formatMoney(derived.srpCase, 'USD')} per case) with a
              {inputs.retailerMargin}% retailer margin.
            </li>
            <li>
              At {inputs.casesSold || 0} cases sold, projected top-line revenue is <span className="font-semibold">{formatMoney(derived.revenue, 'USD')}</span>.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default WinePricingCalculator;
