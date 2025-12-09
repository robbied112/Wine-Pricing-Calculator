import React, { useMemo, useState } from 'react';

const defaultState = {
  wineName: 'Estate Red Blend 2021',
  currency: 'EUR',
  exchangeRate: 1.08,
  bottleCost: 5.25,
  caseCost: '',
  casePack: 12,
  bottleSize: '750ml',
  diFreight: 13,
  tariff: 0,
  statesideLogistics: 10,
  supplierMargin: 30,
  distributorMargin: 30,
  distributorBtgMargin: 27,
  retailerMargin: 33,
  roundRetail: true,
  casesSold: 100,
};

const currencySymbol = {
  USD: '$',
  EUR: '€',
};

const roundPrice = (value) => {
  if (Number.isNaN(value)) return value;
  const floored = Math.floor(value);
  return value - floored < 0.4 ? Math.max(0, floored - 1 + 0.99) : floored + 0.99;
};

const applyMargin = (cost, marginPct) => {
  const margin = marginPct / 100;
  return margin >= 1 ? 0 : cost / (1 - margin);
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

const NumberInput = ({ label, suffix, ...props }) => (
  <label className="flex flex-col space-y-1 text-sm text-slate-700">
    <span className="font-medium">{label}</span>
    <div className="flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-200">
      <input
        {...props}
        className="w-full border-none bg-transparent text-base text-slate-900 placeholder-slate-400 focus:outline-none"
        type="number"
      />
      {suffix && <span className="ml-2 text-xs text-slate-500">{suffix}</span>}
    </div>
  </label>
);

const SelectInput = ({ label, children, ...props }) => (
  <label className="flex flex-col space-y-1 text-sm text-slate-700">
    <span className="font-medium">{label}</span>
    <select
      {...props}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
    >
      {children}
    </select>
  </label>
);

const Card = ({ title, kicker, children, accent = false }) => (
  <section
    className={`rounded-2xl border ${accent ? 'border-amber-300 bg-white/90 shadow-lg shadow-amber-100' : 'border-slate-200 bg-white shadow-sm'} p-6 space-y-4`}
  >
    <div className="space-y-1">
      {kicker && <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">{kicker}</p>}
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    </div>
    {children}
  </section>
);

const SummaryRow = ({ label, value, helper }) => (
  <div className="flex items-start justify-between py-2 border-b border-slate-100 last:border-0">
    <div>
      <p className="text-sm font-medium text-slate-800">{label}</p>
      {helper && <p className="text-xs text-slate-500">{helper}</p>}
    </div>
    <p className="text-sm font-semibold text-slate-900">{value}</p>
  </div>
);

const WinePricingCalculator = () => {
  const [inputs, setInputs] = useState(defaultState);

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

  const derived = useMemo(() => {
    const casePack = Number(inputs.casePack) || 12;
    const bottleCost = Number(inputs.bottleCost) || 0;
    const caseCost = inputs.caseCost !== '' ? Number(inputs.caseCost) : bottleCost * casePack;
    const baseCaseUSD = inputs.currency === 'EUR' ? caseCost * (Number(inputs.exchangeRate) || 0) : caseCost;
    const baseBottleUSD = baseCaseUSD / casePack;

    const importCase = baseCaseUSD * (1 + (Number(inputs.tariff) || 0) / 100) + (Number(inputs.diFreight) || 0);
    const landedCase = importCase + (Number(inputs.statesideLogistics) || 0);

    const wholesaleCase = applyMargin(landedCase, Number(inputs.distributorMargin) || 0);
    const wholesaleBottle = wholesaleCase / casePack;

    const btgBottle = applyMargin(landedCase / casePack, Number(inputs.distributorBtgMargin) || 0);

    let srpBottle = applyMargin(wholesaleBottle, Number(inputs.retailerMargin) || 0);
    if (inputs.roundRetail) srpBottle = roundPrice(srpBottle);

    const srpCase = srpBottle * casePack;
    const revenue = srpCase * (Number(inputs.casesSold) || 0);
    const grossMargin = srpCase - wholesaleCase;

    return {
      casePack,
      bottleCost,
      caseCost,
      baseCaseUSD,
      baseBottleUSD,
      importCase,
      landedCase,
      wholesaleCase,
      wholesaleBottle,
      btgBottle,
      srpBottle,
      srpCase,
      revenue,
      grossMargin,
    };
  }, [inputs]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card title="Product basics" kicker="Foundation">
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
            <SelectInput label="Supplier currency" name="currency" value={inputs.currency} onChange={handleChange}>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
            </SelectInput>
            <NumberInput
              label="Exchange rate (EUR → USD)"
              name="exchangeRate"
              value={inputs.exchangeRate}
              onChange={handleChange}
              step="0.0001"
              disabled={inputs.currency === 'USD'}
            />
            <NumberInput
              label="Bottle cost"
              name="bottleCost"
              value={inputs.bottleCost}
              onChange={handleChange}
              step="0.01"
              suffix={currencySymbol[inputs.currency]}
            />
            <NumberInput
              label="Case cost (override)"
              name="caseCost"
              value={inputs.caseCost}
              onChange={handleChange}
              step="0.01"
              suffix={currencySymbol[inputs.currency]}
            />
            <NumberInput label="Case pack" name="casePack" value={inputs.casePack} onChange={handleChange} step="1" />
            <SelectInput label="Bottle size" name="bottleSize" value={inputs.bottleSize} onChange={handleChange}>
              {['187ml', '375ml', '500ml', '750ml', '1L', '1.5L', '3L'].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </SelectInput>
          </div>
        </Card>

        <Card title="Logistics & margins" kicker="Cost stack">
          <div className="grid gap-4 md:grid-cols-2">
            <NumberInput label="Direct import freight / case" name="diFreight" value={inputs.diFreight} onChange={handleChange} step="0.01" suffix="$" />
            <NumberInput label="Tariff" name="tariff" value={inputs.tariff} onChange={handleChange} step="0.1" suffix="%" />
            <NumberInput label="Stateside logistics / case" name="statesideLogistics" value={inputs.statesideLogistics} onChange={handleChange} step="0.01" suffix="$" />
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="Distributor margin" name="distributorMargin" value={inputs.distributorMargin} onChange={handleChange} step="0.1" suffix="%" />
              <NumberInput label="Distributor BTG margin" name="distributorBtgMargin" value={inputs.distributorBtgMargin} onChange={handleChange} step="0.1" suffix="%" />
            </div>
            <NumberInput label="Retailer margin" name="retailerMargin" value={inputs.retailerMargin} onChange={handleChange} step="0.1" suffix="%" />
            <label className="flex items-center space-x-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <input type="checkbox" name="roundRetail" checked={inputs.roundRetail} onChange={handleChange} className="h-4 w-4 text-amber-600 focus:ring-amber-500" />
              <div>
                <p className="text-sm font-medium text-slate-800">Round SRP to .99</p>
                <p className="text-xs text-slate-500">Keeps shelf prices consumer-friendly.</p>
              </div>
            </label>
          </div>
        </Card>

        <Card title="Sales assumptions" kicker="Volume" >
          <div className="grid gap-4 md:grid-cols-2">
            <NumberInput label="Projected cases sold" name="casesSold" value={inputs.casesSold} onChange={handleChange} step="1" />
            <NumberInput label="Supplier margin target" name="supplierMargin" value={inputs.supplierMargin} onChange={handleChange} step="0.1" suffix="%" />
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="Pricing snapshot" kicker={inputs.wineName || 'Summary'} accent>
          <SummaryRow
            label="Base case cost"
            helper={`Converted from ${inputs.currency} with pack of ${derived.casePack}`}
            value={`${formatMoney(derived.caseCost, inputs.currency)} → ${formatMoney(derived.baseCaseUSD, 'USD')}`}
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

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">By the glass</p>
              <div className="flex items-center justify-between py-1">
                <p className="text-sm text-slate-700">Distributor BTG bottle</p>
                <p className="text-lg font-semibold text-slate-900">{formatMoney(derived.btgBottle, 'USD')}</p>
              </div>
              <div className="flex items-center justify-between py-1">
                <p className="text-sm text-slate-700">Suggested BTG pour (5oz)</p>
                <p className="text-lg font-semibold text-slate-900">{formatMoney((derived.srpBottle / 5) * 1.25, 'USD')}</p>
              </div>
              <p className="text-xs text-amber-800 mt-1">Uses distributor BTG margin of {inputs.distributorBtgMargin}%.</p>
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
