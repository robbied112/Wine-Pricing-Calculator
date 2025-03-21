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
  casePrice: '',
  casePackSize: 12,
  bottleSize: '750ml',
  diLogistics: 13,
  tariff: 0,
  statesideLogistics: 10,
  supplierMargin: 30,
  distributorMargin: 30,
  distributorBtgMargin: 27,
  retailerMargin: 33,
  roundSrp: false,
  casesSold: '',
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
        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        placeholder="Enter wine name"
      />
    </div>

    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Case Pack Size</label>
        <select
          name="casePackSize"
          value={formData.casePackSize}
          onChange={handleSelectChange}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          {BOTTLE_SIZES.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Case Price</label>
        <div className="flex">
          <select
            name="currency"
            value={formData.currency}
            onChange={handleCurrencyChange}
            className="w-14 p-2 border border-gray-300 rounded-l-md bg-gray-100 focus:ring-blue-500 focus:border-blue-500"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
          <input
            type="number"
            name="casePrice"
            value={formData.casePrice}
            onChange={handleInputChange}
            className="flex-1 p-2 border border-gray-300 rounded-r-md focus:ring-blue-500 focus:border-blue-500 min-w-0"
            min="0"
            step="0.01"
            placeholder="Enter case price"
          />
        </div>
        {errors.casePrice && <p className="text-red-500 text-xs mt-1">{errors.casePrice}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bottle Cost</label>
        <div className="flex">
          <input
            type="number"
            name="bottleCost"
            value={formData.bottleCost}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 min-w-0"
            min="0"
            step="0.01"
            placeholder="Enter bottle cost"
          />
        </div>
        {errors.bottleCost && <p className="text-red-500 text-xs mt-1">{errors.bottleCost}</p>}
      </div>
    </div>

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Exchange Rate</label>
      <div className="flex flex-col">
        <div className="flex items-center mb-2">
          <span className="text-sm mr-2">Base Rate:</span>
          <input
            type="number"
            name="exchangeRate"
            value={formData.exchangeRate}
            onChange={handleInputChange}
            className="w-24 p-2 border border-gray-300 rounded-md text-center focus:ring-blue-500 focus:border-blue-500"
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
                className="w-12 mx-1 p-1 border border-gray-300 rounded-md text-center focus:ring-blue-500 focus:border-blue-500"
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
            className="w-20 p-1 border border-gray-300 rounded-md text-center focus:ring-blue-500 focus:border-blue-500"
            min="0"
            step="0.0001"
            disabled={formData.currency === 'USD' || !formData.useCustomExchangeRate}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {formData.currency === 'EUR'
            ? `Effective rate: ${
                formData.useCustomExchangeRate
                  ? parseFloat(formData.customExchangeRate).toFixed(4)
                  : (formData.exchangeRate * (1 + formData.exchangeBuffer / 100)).toFixed(4)
              }`
            : 'N/A'}
        </div>
        {exchangeRateError && <p className="text-red-500 text-xs mt-1">{exchangeRateError}</p>}
      </div>
    </div>

    <div className="mb-4 flex items-center">
      <input
        type="checkbox"
        id="roundSrp"
        checked={formData.roundSrp}
        onChange={(e) => setFormData((prev) => ({ ...prev, roundSrp: e.target.checked }))}
        className="mr-2"
      />
      <label htmlFor="roundSrp" className="text-sm">Round SRP to nearest .99</label>
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
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              min="0"
              max="100"
            />
            {errors.distributorMargin && <p className="text-red-500 text-xs mt-1">{errors.distributorMargin}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Dist BTG Margin (%)</label>
            <input
              type="number"
              name="distributorBtgMargin"
              value={formData.distributorBtgMargin}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              min="0"
              max="100"
            />
            {errors.retailerMargin && <p className="text-red-500 text-xs mt-1">{errors.retailerMargin}</p>}
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Cases Sold (for Gross Profit)</label>
          <input
            type="number"
            name="casesSold"
            value={formData.casesSold}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            min="0"
            step="1"
            placeholder="Enter number of cases sold"
          />
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showGrossProfit, setShowGrossProfit] = useState(false);
  const [errors, setErrors] = useState({});
  const [lastEdited, setLastEdited] = useState(null);

  // Calculation Logic
  const calculatePricing = useCallback(() => {
    const {
      bottleCost,
      casePrice,
      casePackSize,
      currency,
      exchangeRate,
      exchangeBuffer,
      useCustomExchangeRate,
      customExchangeRate,
      diLogistics,
      tariff,
      statesideLogistics,
      supplierMargin,
      distributorMargin,
      distributorBtgMargin,
      retailerMargin,
      roundSrp,
      casesSold,
    } = formData;

    let bottleCostUSD, caseCostUSD;
    const effectiveExchangeRate = currency === 'USD' ? 1 :
      useCustomExchangeRate ? parseFloat(customExchangeRate) :
      parseFloat(exchangeRate) * (1 + parseFloat(exchangeBuffer) / 100);

    if (bottleCost !== '' && casePrice === '') {
      bottleCostUSD = parseFloat(bottleCost) * effectiveExchangeRate;
      caseCostUSD = (bottleCostUSD * casePackSize).toFixed(2);
    } else if (casePrice !== '' && bottleCost === '') {
      caseCostUSD = (parseFloat(casePrice) * effectiveExchangeRate).toFixed(2);
      bottleCostUSD = (caseCostUSD / casePackSize).toFixed(2);
    } else {
      bottleCostUSD = bottleCost !== '' ? (parseFloat(bottleCost) * effectiveExchangeRate).toFixed(2) : 0;
      caseCostUSD = casePrice !== '' ? (parseFloat(casePrice) * effectiveExchangeRate).toFixed(2) : (bottleCostUSD * casePackSize).toFixed(2);
    }

    const supplierDiLaidInCost = parseFloat(caseCostUSD);
    const supplierMarginAmount = (supplierDiLaidInCost * (supplierMargin / 100)).toFixed(2);
    const supplierFobDi = (supplierDiLaidInCost / (1 - supplierMargin / 100)).toFixed(2);

    const tariffAmount = (caseCostUSD * (tariff / 100)).toFixed(2);
    const supplierStatesideLaidInCost = (parseFloat(caseCostUSD) + parseFloat(tariffAmount) + parseFloat(diLogistics)).toFixed(2);
    const supplierSsFob = (supplierStatesideLaidInCost / (1 - supplierMargin / 100)).toFixed(2);

    const distributorDiLaidInCost = (parseFloat(supplierFobDi) * (1 + tariff / 100) + parseFloat(diLogistics)).toFixed(2);
    const distributorStatesideLaidInCost = (parseFloat(supplierSsFob) + parseFloat(statesideLogistics)).toFixed(2);

    const distributorCaseWholesaleDi = (distributorDiLaidInCost / (1 - distributorMargin / 100)).toFixed(2);
    const distributorBottleWholesaleDi = (distributorCaseWholesaleDi / casePackSize).toFixed(2);

    const distributorCaseWholesaleSs = (distributorStatesideLaidInCost / (1 - distributorMargin / 100)).toFixed(2);
    const distributorBottleWholesaleSs = (distributorCaseWholesaleSs / casePackSize).toFixed(2);

    const distributorBtgPriceDi = ((distributorDiLaidInCost / (1 - distributorBtgMargin / 100)) / casePackSize).toFixed(2);
    const distributorBtgPriceSs = ((distributorStatesideLaidInCost / (1 - distributorBtgMargin / 100)) / casePackSize).toFixed(2);

    let srpDi = (distributorBottleWholesaleDi / (1 - retailerMargin / 100)).toFixed(2);
    let srpSs = (distributorBottleWholesaleSs / (1 - retailerMargin / 100)).toFixed(2);

    let adjustedCaseWholesaleDi = distributorCaseWholesaleDi;
    let adjustedBottleWholesaleDi = distributorBottleWholesaleDi;
    let adjustedCaseWholesaleSs = distributorCaseWholesaleSs;
    let adjustedBottleWholesaleSs = distributorBottleWholesaleSs;

    if (roundSrp) {
      srpDi = roundToNearest99(srpDi);
      srpSs = roundToNearest99(srpSs);
      adjustedBottleWholesaleDi = (srpDi * (1 - retailerMargin / 100)).toFixed(2);
      adjustedCaseWholesaleDi = (adjustedBottleWholesaleDi * casePackSize).toFixed(2);
      adjustedBottleWholesaleSs = (srpSs * (1 - retailerMargin / 100)).toFixed(2);
      adjustedCaseWholesaleSs = (adjustedBottleWholesaleSs * casePackSize).toFixed(2);
    }

    // Gross Profit Calculations
    const cases = parseFloat(casesSold) || 0;
    const supplierGrossProfitDi = (cases * (parseFloat(supplierFobDi) - parseFloat(supplierDiLaidInCost))).toFixed(2);
    const supplierGrossProfitSs = (cases * (parseFloat(supplierSsFob) - parseFloat(supplierStatesideLaidInCost))).toFixed(2);
    const distributorGrossProfitDi = (cases * (parseFloat(distributorCaseWholesaleDi) - parseFloat(distributorDiLaidInCost))).toFixed(2);
    const distributorGrossProfitSs = (cases * (parseFloat(distributorCaseWholesaleSs) - parseFloat(distributorStatesideLaidInCost))).toFixed(2);

    setCalculations({
      effectiveExchangeRate,
      bottleCostUSD,
      caseCostUSD,
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
      adjustedCaseWholesaleDi,
      adjustedBottleWholesaleDi,
      adjustedCaseWholesaleSs,
      adjustedBottleWholesaleSs,
      supplierGrossProfitDi,
      supplierGrossProfitSs,
      distributorGrossProfitDi,
      distributorGrossProfitSs,
    });
  }, [formData]);

  // Fixed rounding to nearest .99
  const roundToNearest99 = (value) => {
    const whole = Math.floor(value);
    const decimal = value - whole;
    return decimal < 0.40 ? whole - 1 + 0.99 : whole + 0.99;
  };

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
    } else if (["bottleCost", "casePrice"].includes(name) && value !== "" && parseFloat(value) < 0) {
      error = "Cost cannot be negative";
      newValue = value === "" ? "" : parseFloat(value) || 0;
    } else if (["exchangeRate", "customExchangeRate", "exchangeBuffer", "diLogistics", "tariff", "statesideLogistics", "casesSold"].includes(name)) {
      newValue = value === "" ? "" : parseFloat(value) || 0;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
    setFormData((prev) => {
      const newData = { ...prev, [name]: name === "wineName" ? value : newValue };
      if (name === "bottleCost" && value !== "") {
        newData.casePrice = (parseFloat(value) * prev.casePackSize).toFixed(2) || "";
        setLastEdited('bottleCost');
      } else if (name === "casePrice" && value !== "") {
        newData.bottleCost = (parseFloat(value) / prev.casePackSize).toFixed(2) || "";
        setLastEdited('casePrice');
      }
      return newData;
    });
  }, []);

  const handleCurrencyChange = useCallback((e) => {
    setFormData((prev) => ({ ...prev, currency: e.target.value }));
  }, []);

  const handleSelectChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: name === "bottleSize" ? value : parseInt(value, 10) };
      if (name === "casePackSize") {
        const newPackSize = parseInt(value, 10);
        if (lastEdited === 'bottleCost' && prev.bottleCost !== "") {
          newData.casePrice = (parseFloat(prev.bottleCost) * newPackSize).toFixed(2) || "";
        } else if (lastEdited === 'casePrice' && prev.casePrice !== "") {
          newData.bottleCost = (parseFloat(prev.casePrice) / newPackSize).toFixed(2) || "";
        }
      }
      return newData;
    });
  }, [lastEdited]);

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
      ['Case Price', formData.casePrice],
      ['Bottle Cost', formData.bottleCost],
      ['Cases Sold', formData.casesSold],
      [],
      ['Direct Import Pricing - Supplier Calculations'],
      ['Metric', 'Value'],
      ['Per Bottle USD', calculations.bottleCostUSD ? calculations.bottleCostUSD : '0.00'],
      ['Case Cost', calculations.caseCostUSD ? calculations.caseCostUSD : '0.00'],
      ['DI Laid in Cost', calculations.supplierDiLaidInCost ? calculations.supplierDiLaidInCost : '0.00'],
      ['Supplier FOB DI', calculations.supplierFobDi ? calculations.supplierFobDi : '0.00'],
      ['Distributor DI Laid in Cost', calculations.distributorDiLaidInCost ? calculations.distributorDiLaidInCost : '0.00'],
      ['Distributor Case Wholesale', calculations.distributorCaseWholesaleDi ? calculations.distributorCaseWholesaleDi : '0.00'],
      ['Distributor Bottle Wholesale', calculations.distributorBottleWholesaleDi ? calculations.distributorBottleWholesaleDi : '0.00'],
      ['Distributor BTG Price', calculations.distributorBtgPriceDi ? calculations.distributorBtgPriceDi : '0.00'],
      ['SRP', calculations.srpDi ? calculations.srpDi : '0.00'],
      ['Supplier Gross Profit (DI)', calculations.supplierGrossProfitDi ? calculations.supplierGrossProfitDi : '0.00'],
      ['Distributor Gross Profit (DI)', calculations.distributorGrossProfitDi ? calculations.distributorGrossProfitDi : '0.00'],
      [],
      ['Stateside Inventory Pricing - Supplier Calculations'],
      ['Metric', 'Value'],
      ['Case Cost', calculations.caseCostUSD ? calculations.caseCostUSD : '0.00'],
      ['Tariff Amount', calculations.tariffAmount ? calculations.tariffAmount : '0.00'],
      ['DI Logistics', formData.diLogistics ? formData.diLogistics.toFixed(2) : '0.00'],
      ['SS Laid in Cost', calculations.supplierStatesideLaidInCost ? calculations.supplierStatesideLaidInCost : '0.00'],
      ['Supplier FOB SS', calculations.supplierSsFob ? calculations.supplierSsFob : '0.00'],
      ['Distributor SS Laid in Cost', calculations.distributorStatesideLaidInCost ? calculations.distributorStatesideLaidInCost : '0.00'],
      ['Distributor Case Wholesale', calculations.distributorCaseWholesaleSs ? calculations.distributorCaseWholesaleSs : '0.00'],
      ['Distributor Bottle Wholesale', calculations.distributorBottleWholesaleSs ? calculations.distributorBottleWholesaleSs : '0.00'],
      ['Distributor BTG Price', calculations.distributorBtgPriceSs ? calculations.distributorBtgPriceSs : '0.00'],
      ['SRP', calculations.srpSs ? calculations.srpSs : '0.00'],
      ['Supplier Gross Profit (SS)', calculations.supplierGrossProfitSs ? calculations.supplierGrossProfitSs : '0.00'],
      ['Distributor Gross Profit (SS)', calculations.distributorGrossProfitSs ? calculations.distributorGrossProfitSs : '0.00'],
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Direct Import Pricing</h3>
              <div className="mb-4 border-b pb-4">
                <h4 className="text-sm font-medium text-gray-600 mb-3">Supplier Calculations</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Per Bottle USD:</div>
                  <div className="text-right font-medium">{formatCurrency(calculations.bottleCostUSD || 0, 'USD')}</div>
                  <div className="text-gray-500">Case Cost:</div>
                  <div className="text-right font-medium">{formatCurrency(calculations.caseCostUSD || 0, 'USD')}</div>
                  <div className="text-gray-500">DI Laid in Cost:</div>
                  <div className="text-right font-medium">{formatCurrency(calculations.supplierDiLaidInCost || 0, 'USD')}</div>
                  <div className="text-gray-500">Supplier FOB DI:</div>
                  <div className="text-right font-medium">{formatCurrency(calculations.supplierFobDi || 0, 'USD')}</div>
                  <div className="text-gray-500">Distributor DI Laid in Cost:</div>
                  <div className="text-right font-medium">{formatCurrency(calculations.distributorDiLaidInCost || 0, 'USD')}</div>
                  <div className="text-gray-500">Distributor Case Wholesale:</div>
                  <div className="text-right font-medium">{formatCurrency(calculations.distributorCaseWholesaleDi || 0, 'USD')}</div>
                  <div className="text-gray-500">Distributor Bottle Wholesale:</div>
                  <div className="text-right font-medium">{formatCurrency(calculations.distributorBottleWholesaleDi || 0, 'USD')}</div>
                  <div className="text-gray-500">Distributor BTG Price:</div>
                  <div className="text-right font-medium">{formatCurrency(calculations.distributorBtgPriceDi || 0, 'USD')}</div>
                  <div className="text-gray-500">SRP:</div>
                  <div className="text-right font-medium text-lg text-blue-700">{formatCurrency(calculations.srpDi || 0, 'USD')}</div>
                </div>
                {formData.roundSrp && (
                  <div className="text-xs text-gray-500 mt-1">
                    Adjusted Case Wholesale: {formatCurrency(calculations.adjustedCaseWholesaleDi || 0, 'USD')}<br />
                    Adjusted Bottle Wholesale: {formatCurrency(calculations.adjustedBottleWholesaleDi || 0, 'USD')}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Stateside Inventory Pricing</h3>
              <div className="mb-4 border-b pb-4">
                <h4 className="text-sm font-medium text-gray-600 mb-3">Supplier Calculations</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Case Cost:</div>
                  <div className="text-right font-medium">{formatCurrency(calculations.caseCostUSD || 0, 'USD')}</div>
                  <div className="text-gray-500">Tariff Amount:</div>
                  <div className="text-right font-medium">{formatCurrency(calculations.tariffAmount || 0, 'USD')}</div>
                  <div className="text-gray-500">DI Logistics:</div>
                  <div className="text-right font-medium">{formatCurrency(formData.diLogistics || 0, 'USD')}</div>
                  <div className="text-gray-500">SS Laid in Cost:</div>
                  <div className="text-right font-medium">{formatCurrency(calculations.supplierStatesideLaidInCost || 0, 'USD')}</div>
                  <div className="text-gray-500">Supplier FOB SS:</div>
                  <div className="text-right font-medium">{formatCurrency(calculations.supplierSsFob || 0, 'USD')}</div>
                  <div className="text-gray-500">Distributor SS Laid in Cost:</div>
                  <div className="text-right font-medium">{formatCurrency(calculations.distributorStatesideLaidInCost || 0, 'USD')}</div>
                  <div className="text-gray-500">Distributor Case Wholesale:</div>
                  <div className="text-right font-medium">{formatCurrency(calculations.distributorCaseWholesaleSs || 0, 'USD')}</div>
                  <div className="text-gray-500">Distributor Bottle Wholesale:</div>
                  <div className="text-right font-medium">{formatCurrency(calculations.distributorBottleWholesaleSs || 0, 'USD')}</div>
                  <div className="text-gray-500">Distributor BTG Price:</div>
                  <div className="text-right font-medium">{formatCurrency(calculations.distributorBtgPriceSs || 0, 'USD')}</div>
                  <div className="text-gray-500">SRP:</div>
                  <div className="text-right font-medium text-lg text-blue-700">{formatCurrency(calculations.srpSs || 0, 'USD')}</div>
                </div>
                {formData.roundSrp && (
                  <div className="text-xs text-gray-500 mt-1">
                    Adjusted Case Wholesale: {formatCurrency(calculations.adjustedCaseWholesaleSs || 0, 'USD')}<br />
                    Adjusted Bottle Wholesale: {formatCurrency(calculations.adjustedBottleWholesaleSs || 0, 'USD')}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              className="flex items-center text-sm text-blue-600"
              onClick={() => setShowGrossProfit(!showGrossProfit)}
              type="button"
            >
              {showGrossProfit ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              {showGrossProfit ? 'Hide Gross Profit' : 'Show Gross Profit'}
            </button>
          </div>

          {showGrossProfit && (
            <div className="bg-white p-6 rounded-lg shadow border border-gray-100 mt-2">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Gross Profit</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Cases Sold:</div>
                <div className="text-right font-medium">{formData.casesSold || 0}</div>
                <div className="text-gray-500">Supplier Gross Profit (DI):</div>
                <div className="text-right font-medium">{formatCurrency(calculations.supplierGrossProfitDi || 0, 'USD')}</div>
                <div className="text-gray-500">Distributor Gross Profit (DI):</div>
                <div className="text-right font-medium">{formatCurrency(calculations.distributorGrossProfitDi || 0, 'USD')}</div>
                <div className="text-gray-500">Supplier Gross Profit (SS):</div>
                <div className="text-right font-medium">{formatCurrency(calculations.supplierGrossProfitSs || 0, 'USD')}</div>
                <div className="text-gray-500">Distributor Gross Profit (SS):</div>
                <div className="text-right font-medium">{formatCurrency(calculations.distributorGrossProfitSs || 0, 'USD')}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WinePricingCalculator;