import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, MinusCircle, Save, Download, Printer, ChevronDown, ChevronUp } from 'lucide-react';

// Constants
const CURRENCIES = ['EUR', 'USD'];
const BOTTLE_SIZES = ['750ml', '375ml', '1.5L', '3L'];
const CASE_PACK_SIZES = [12, 6, 3, 1];
const DEFAULT_FORM_DATA = {
  wineName: '',
  currency: 'EUR',
  exchangeRate: 1.09,
  exchangeBuffer: 5,
  useCustomExchangeRate: false,
  customExchangeRate: 1.09,
  bottleCost: '',
  casePackSize: 12,
  bottleSize: '750ml',
  diLogistics: 13,
  tariff: 0,
  statesideLogistics: 10,
  supplierMargin: 30,
  distributorMargin: 30,
  distributorBtgMargin: 27,
  retailerMargin: 33,
};

// Input Panel Component
const InputPanel = ({
  formData,
  setFormData,
  handleInputChange,
  handleCurrencyChange,
  handleSelectChange,
  fetchCurrentExchangeRate,
  isExchangeRateLoading,
  exchangeRateError,
  showAdvanced,
  setShowAdvanced,
  errors,
}) => (
  <div className="md:col-span-1 bg-gray-50 p-6 rounded-lg">
    <h2 className="text-xl font-semibold mb-6 text-gray-700">Input Parameters</h2>

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Wine Name</label>
      <input
        type="text"
        name="wineName"
        value={formData.wineName}
        onChange={handleInputChange}
        className="w-full p-2 border border-gray-300 rounded-md"
        placeholder="Enter wine name"
      />
    </div>

    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bottle Cost</label>
        <div className="flex">
          <select
            name="currency"
            value={formData.currency}
            onChange={handleCurrencyChange}
            className="p-2 border border-gray-300 rounded-l-md bg-gray-100"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
          <input
            type="number"
            name="bottleCost"
            value={formData.bottleCost}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-r-md"
            min="0"
            step="0.01"
          />
        </div>
        {errors.bottleCost && <p className="text-red-500 text-xs mt-1">{errors.bottleCost}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Exchange Rate</label>
        <div className="flex flex-col">
          <div className="flex items-center mb-2">
            <span className="text-sm mr-2">Base Rate:</span>
            <input
              type="number"
              name="exchangeRate"
              value={formData.exchangeRate}
              onChange={handleInputChange}
              className="w-24 p-2 border border-gray-300 rounded-md text-center"
              min="0"
              step="0.01"
              disabled={formData.currency === 'USD' || isExchangeRateLoading}
            />
            <button
              className="ml-2 p-1 bg-gray-200 rounded-md hover:bg-gray-300 text-xs"
              onClick={fetchCurrentExchangeRate}
              disabled={formData.currency === 'USD' || isExchangeRateLoading}
              type="button"
            >
              {isExchangeRateLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <span className="text-sm mr-2">Buffer (%):</span>
              <div className="flex items-center">
                <button
                  className="p-1 bg-gray-200 rounded-md"
                  onClick={() => setFormData((prev) => ({ ...prev, exchangeBuffer: Math.max(0, prev.exchangeBuffer - 1) }))}
                  disabled={formData.currency === 'USD' || formData.useCustomExchangeRate}
                  type="button"
                >
                  <MinusCircle className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  name="exchangeBuffer"
                  value={formData.exchangeBuffer}
                  onChange={handleInputChange}
                  className="w-12 mx-1 p-1 border border-gray-300 rounded-md text-center"
                  min="0"
                  disabled={formData.currency === 'USD' || formData.useCustomExchangeRate}
                />
                <button
                  className="p-1 bg-gray-200 rounded-md"
                  onClick={() => setFormData((prev) => ({ ...prev, exchangeBuffer: prev.exchangeBuffer + 1 }))}
                  disabled={formData.currency === 'USD' || formData.useCustomExchangeRate}
                  type="button"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="useCustomRate"
              checked={formData.useCustomExchangeRate}
              onChange={(e) => setFormData((prev) => ({ ...prev, useCustomExchangeRate: e.target.checked }))}
              className="mr-2"
              disabled={formData.currency === 'USD'}
            />
            <label htmlFor="useCustomRate" className="text-sm mr-2">Override Rate:</label>
            <input
              type="number"
              name="customExchangeRate"
              value={formData.customExchangeRate}
              onChange={handleInputChange}
              className="w-20 p-1 border border-gray-300 rounded-md text-center"
              min="0"
              step="0.0001"
              disabled={formData.currency === 'USD' || !formData.useCustomExchangeRate}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formData.currency === 'EUR'
              ? `Effective rate: ${formData.useCustomExchangeRate
                  ? formData.customExchangeRate.toFixed(4)
                  : (formData.exchangeRate * (1 + formData.exchangeBuffer / 100)).toFixed(4)}`
              : 'N/A'}
          </div>
          {exchangeRateError && <p className="text-red-500 text-xs mt-1">{exchangeRateError}</p>}
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Case Pack Size</label>
        <select
          name="casePackSize"
          value={formData.casePackSize}
          onChange={handleSelectChange}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          {CASE_PACK_SIZES.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bottle Size</label>
        <select
          name="bottleSize"
          value={formData.bottleSize}
          onChange={handleSelectChange}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          {BOTTLE_SIZES.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>
    </div>

    <div className="mb-6">
      <button
        className="flex items-center text-sm text-blue-600"
        onClick={() => setShowAdvanced(!showAdvanced)}
        type="button"
      >
        {showAdvanced ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
        {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
      </button>
    </div>

    {showAdvanced && (
      <>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">DI Logistics ($ per case)</label>
          <input
            type="number"
            name="diLogistics"
            value={formData.diLogistics}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            min="0"
            step="0.01"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tariff (%)</label>
          <input
            type="number"
            name="tariff"
            value={formData.tariff}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            min="0"
            max="200"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Stateside Logistics ($ per case)</label>
          <input
            type="number"
            name="statesideLogistics"
            value={formData.statesideLogistics}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            min="0"
            step="0.01"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Margin (%)</label>
            <input
              type="number"
              name="supplierMargin"
              value={formData.supplierMargin}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              min="0"
              max="100"
            />
            {errors.supplierMargin && <p className="text-red-500 text-xs mt-1">{errors.supplierMargin}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Distributor Margin (%)</label>
            <input
              type="number"
              name="distributorMargin"
              value={formData.distributorMargin}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              min="0"
              max="100"
            />
            {errors.distributorMargin && <p className="text-red-500 text-xs mt-1">{errors.distributorMargin}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Distributor BTG Margin (%)</label>
            <input
              type="number"
              name="distributorBtgMargin"
              value={formData.distributorBtgMargin}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              min="0"
              max="100"
            />
            {errors.distributorBtgMargin && <p className="text-red-500 text-xs mt-1">{errors.distributorBtgMargin}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Retailer Margin (%)</label>
            <input
              type="number"
              name="retailerMargin"
              value={formData.retailerMargin}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              min="0"
              max="100"
            />
            {errors.retailerMargin && <p className="text-red-500 text-xs mt-1">{errors.retailerMargin}</p>}
          </div>
        </div>
      </>
    )}
  </div>
);

const WinePricingCalculator = () => {
  // State
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [calculations, setCalculations] = useState({});
  const [isExchangeRateLoading, setIsExchangeRateLoading] = useState(false);
  const [exchangeRateError, setExchangeRateError] = useState(null);
  const [displayView, setDisplayView] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState({});

  // Calculation Logic
  const calculatePricing = useCallback(() => {
    const {
      bottleCost,
      currency,
      exchangeRate,
      exchangeBuffer,
      useCustomExchangeRate,
      customExchangeRate,
      casePackSize,
      diLogistics,
      tariff,
      statesideLogistics,
      supplierMargin,
      distributorMargin,
      distributorBtgMargin,
      retailerMargin,
    } = formData;

    const effectiveExchangeRate = currency === 'USD' ? 1 :
      useCustomExchangeRate ? customExchangeRate :
      exchangeRate * (1 + exchangeBuffer / 100);

    const bottleCostUSD = bottleCost * effectiveExchangeRate;
    const caseCost = bottleCostUSD * casePackSize;

    const supplierDiLaidInCost = caseCost;
    const supplierMarginAmount = supplierDiLaidInCost * (supplierMargin / 100);
    const supplierFobDi = supplierDiLaidInCost / (1 - supplierMargin / 100);

    const tariffAmount = caseCost * (tariff / 100);
    const supplierStatesideLaidInCost = caseCost + tariffAmount + diLogistics;
    const supplierSsFob = supplierStatesideLaidInCost / (1 - supplierMargin / 100);

    const distributorDiLaidInCost = (supplierFobDi * (1 + tariff / 100)) + diLogistics;
    const distributorStatesideLaidInCost = supplierSsFob + statesideLogistics;

    const distributorCaseWholesaleDi = distributorDiLaidInCost / (1 - distributorMargin / 100);
    const distributorBottleWholesaleDi = distributorCaseWholesaleDi / casePackSize;

    const distributorCaseWholesaleSs = distributorStatesideLaidInCost / (1 - distributorMargin / 100);
    const distributorBottleWholesaleSs = distributorCaseWholesaleSs / casePackSize;

    const distributorBtgPriceDi = (distributorDiLaidInCost / (1 - distributorBtgMargin / 100)) / casePackSize;
    const distributorBtgPriceSs = (distributorStatesideLaidInCost / (1 - distributorBtgMargin / 100)) / casePackSize;

    const srpDi = distributorBottleWholesaleDi / (1 - retailerMargin / 100);
    const srpSs = distributorBottleWholesaleSs / (1 - retailerMargin / 100);

    setCalculations({
      effectiveExchangeRate,
      bottleCostUSD,
      caseCost,
      supplierDiLaidInCost,
      supplierMarginAmount,
      supplierFobDi,
      tariffAmount,
      supplierStatesideLaidInCost,
      supplierSsFob,
      distributorDiLaidInCost,
      distributorStatesideLaidInCost,
      distributorCaseWholesaleDi,
      distributorBottleWholesaleDi,
      distributorCaseWholesaleSs,
      distributorBottleWholesaleSs,
      distributorBtgPriceDi,
      distributorBtgPriceSs,
      srpDi,
      srpSs,
    });
  }, [formData]);

  // Effects
  useEffect(() => {
    const timer = setTimeout(() => calculatePricing(), 300);
    return () => clearTimeout(timer);
  }, [formData, calculatePricing]);

  useEffect(() => {
    fetchCurrentExchangeRate();
  }, []);

  // Handlers
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    let newValue = value;
    let error = "";

    if (["supplierMargin", "distributorMargin", "distributorBtgMargin", "retailerMargin"].includes(name)) {
      const num = parseFloat(value);
      if (value !== "" && (num < 0 || num > 100)) error = "Must be 0-100";
      newValue = value === "" ? "" : num || 0;
    } else if (name === "bottleCost" && value !== "" && parseFloat(value) < 0) {
      error = "Cost cannot be negative";
      newValue = value === "" ? "" : parseFloat(value) || 0;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
    setFormData((prev) => ({
      ...prev,
      [name]: name === "wineName" ? value : newValue,
    }));
  }, []);

  const handleCurrencyChange = useCallback((e) => {
    setFormData((prev) => ({ ...prev, currency: e.target.value }));
  }, []);

  const handleSelectChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "bottleSize" ? value : parseInt(value, 10),
    }));
  }, []);

  const fetchCurrentExchangeRate = async () => {
    setIsExchangeRateLoading(true);
    setExchangeRateError(null);
    try {
      const response = await fetch('https://api.exchangerate.host/latest?base=EUR&symbols=USD');
      if (!response.ok) throw new Error("Failed to fetch exchange rate");
      const data = await response.json();
      if (data && data.rates && data.rates.USD) {
        setFormData((prev) => ({
          ...prev,
          exchangeRate: parseFloat(data.rates.USD.toFixed(4)),
        }));
      }
    } catch (error) {
      setExchangeRateError("Could not fetch exchange rate. Using default.");
      console.error('Error fetching exchange rate:', error);
    } finally {
      setIsExchangeRateLoading(false);
    }
  };

  const formatCurrency = (value, currency = formData.currency, decimals = 2) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value || 0);

  const handleSaveClick = () => {
    const savedData = {
      name: formData.wineName || 'Unnamed Calculation',
      timestamp: new Date().toISOString(),
      inputs: formData,
      results: calculations,
    };
    const savedCalcs = JSON.parse(localStorage.getItem('winePricingCalculations') || '[]');
    savedCalcs.push(savedData);
    localStorage.setItem('winePricingCalculations', JSON.stringify(savedCalcs));
    alert(`Calculation "${formData.wineName || 'Unnamed Calculation'}" saved successfully!`);
  };

  const handleExportClick = () => {
    const csvRows = [
      ['Wine Pricing Calculator - ' + (formData.wineName || 'Unnamed Calculation')],
      ['Generated on', new Date().toLocaleString()],
      [],
      ['Input Parameters'],
      ['Parameter', 'Value'],
      ['Wine Name', formData.wineName],
      ['Currency', formData.currency],
      ['Bottle Cost', formData.bottleCost],
      // Add more inputs as needed
      [],
      ['Calculation Results'],
      ['Direct Import Pricing'],
      ['Metric', 'Value'],
      ['SRP', calculations.srpDi ? calculations.srpDi.toFixed(2) : '0.00'],
      // Add more results as needed
    ];
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `wine-pricing-${formData.wineName || 'calculation'}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintClick = () => {
    const printContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="text-align: center;">Wine Pricing Calculator</h1>
        <h2>${formData.wineName || 'Unnamed Wine'} - Pricing Report</h2>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <!-- Simplified for brevity -->
      </div>
    `;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 bg-white rounded-lg shadow-lg">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Wine Pricing Calculator</h1>
        <div className="flex space-x-4 mt-4 md:mt-0">
          <button
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={handleSaveClick}
            type="button"
          >
            <Save className="w-4 h-4 mr-2" /> Save
          </button>
          <button
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            onClick={handleExportClick}
            type="button"
          >
            <Download className="w-4 h-4 mr-2" /> Export
          </button>
          <button
            className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            onClick={handlePrintClick}
            type="button"
          >
            <Printer className="w-4 h-4 mr-2" /> Print
          </button>
          <button
            className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            onClick={() => setFormData(DEFAULT_FORM_DATA)}
            type="button"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <InputPanel
          formData={formData}
          setFormData={setFormData}
          handleInputChange={handleInputChange}
          handleCurrencyChange={handleCurrencyChange}
          handleSelectChange={handleSelectChange}
          fetchCurrentExchangeRate={fetchCurrentExchangeRate}
          isExchangeRateLoading={isExchangeRateLoading}
          exchangeRateError={exchangeRateError}
          showAdvanced={showAdvanced}
          setShowAdvanced={setShowAdvanced}
          errors={errors}
        />

        <div className="md:col-span-2">
          <div className="bg-white mb-6">
            <div className="flex border-b border-gray-200 mb-4">
              {['all', 'supplier', 'distributor', 'retail'].map(view => (
                <button
                  key={view}
                  className={`px-4 py-2 text-sm font-medium ${displayView === view ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setDisplayView(view)}
                  type="button"
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)} View
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Direct Import Pricing</h3>
              {(displayView === 'all' || displayView === 'supplier') && (
                <div className="mb-4 border-b pb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Supplier Calculations</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">Per Bottle USD:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.bottleCostUSD || 0, 'USD')}</div>
                    <div className="text-gray-500">Case Cost:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.caseCost || 0, 'USD')}</div>
                    <div className="text-gray-500">DI Laid in Cost:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.supplierDiLaidInCost || 0, 'USD')}</div>
                    <div className="text-gray-500">Supplier FOB DI:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.supplierFobDi || 0, 'USD')}</div>
                  </div>
                </div>
              )}
              {(displayView === 'all' || displayView === 'distributor') && (
                <div className="mb-4 border-b pb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Distributor Calculations</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">DI Laid in Cost:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.distributorDiLaidInCost || 0, 'USD')}</div>
                    <div className="text-gray-500">Case Wholesale:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.distributorCaseWholesaleDi || 0, 'USD')}</div>
                    <div className="text-gray-500">Bottle Wholesale:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.distributorBottleWholesaleDi || 0, 'USD')}</div>
                    <div className="text-gray-500">BTG Price:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.distributorBtgPriceDi || 0, 'USD')}</div>
                  </div>
                </div>
              )}
              {(displayView === 'all' || displayView === 'retail') && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Retail Pricing</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">SRP:</div>
                    <div className="text-right font-medium text-lg text-blue-700">{formatCurrency(calculations.srpDi || 0, 'USD')}</div>
                    <div className="text-gray-500">BTG:</div>
                    <div className="text-right font-medium text-lg text-green-700">{formatCurrency(calculations.distributorBtgPriceDi || 0, 'USD')}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Stateside Inventory Pricing</h3>
              {(displayView === 'all' || displayView === 'supplier') && (
                <div className="mb-4 border-b pb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Supplier Calculations</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">Case Cost:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.caseCost || 0, 'USD')}</div>
                    <div className="text-gray-500">Tariff Amount:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.tariffAmount || 0, 'USD')}</div>
                    <div className="text-gray-500">DI Logistics:</div>
                    <div className="text-right font-medium">{formatCurrency(formData.diLogistics || 0, 'USD')}</div>
                    <div className="text-gray-500">SS Laid in Cost:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.supplierStatesideLaidInCost || 0, 'USD')}</div>
                    <div className="text-gray-500">SS FOB:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.supplierSsFob || 0, 'USD')}</div>
                  </div>
                </div>
              )}
              {(displayView === 'all' || displayView === 'distributor') && (
                <div className="mb-4 border-b pb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Distributor Calculations</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">SS Laid in Cost:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.distributorStatesideLaidInCost || 0, 'USD')}</div>
                    <div className="text-gray-500">Case Wholesale:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.distributorCaseWholesaleSs || 0, 'USD')}</div>
                    <div className="text-gray-500">Bottle Wholesale:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.distributorBottleWholesaleSs || 0, 'USD')}</div>
                    <div className="text-gray-500">BTG Price:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.distributorBtgPriceSs || 0, 'USD')}</div>
                  </div>
                </div>
              )}
              {(displayView === 'all' || displayView === 'retail') && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Retail Pricing</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">SRP:</div>
                    <div className="text-right font-medium text-lg text-blue-700">{formatCurrency(calculations.srpSs || 0, 'USD')}</div>
                    <div className="text-gray-500">BTG:</div>
                    <div className="text-right font-medium text-lg text-green-700">{formatCurrency(calculations.distributorBtgPriceSs || 0, 'USD')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WinePricingCalculator;