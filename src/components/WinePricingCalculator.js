import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, MinusCircle, Save, Download, Printer, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from 'lucide-react';

// Constants
const CURRENCIES = ['EUR', 'USD'];
const BOTTLE_SIZES = ['750ml', '375ml', '1.5L', '3L'];
const CASE_PACK_SIZES = [12, 6, 3, 1];
const DEFAULT_FORM_DATA = {
  calculationMode: 'forward', // 'forward' or 'reverse'
  wineName: '',
  currency: 'EUR',
  bottleCost: '', // Cost in selected currency
  casePrice: '', // Cost in selected currency
  // Use a plausible default, but rely on fetch/cache
  exchangeRate: parseFloat(localStorage.getItem('cachedRateEURUSD')) || 1.09,
  exchangeBuffer: 5, // Default buffer percentage
  useCustomExchangeRate: false,
  customExchangeRate: parseFloat(localStorage.getItem('cachedRateEURUSD')) || 1.09,
  targetSrp: '', // Target SRP for reverse calculation (in USD)
  casePackSize: 12,
  bottleSize: '750ml',
  diLogistics: 13, // Direct Import Logistics cost per case (USD)
  tariff: 0, // Tariff percentage
  statesideLogistics: 10, // Stateside Logistics cost per case (USD)
  supplierMargin: 30, // Supplier margin percentage
  distributorMargin: 30, // Distributor margin percentage (Off-Premise/DI)
  distributorBtgMargin: 27, // Distributor By-The-Glass margin percentage
  retailerMargin: 33, // Retailer margin percentage
  roundSrp: false, // Round SRP to nearest .99
  casesSold: '', // For Gross Profit calculation
};

const CALCULATION_TIMEOUT = 300; // ms delay before recalculating after input change
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

// Helper: Format Currency (Unchanged)
const formatCurrency = (value, currency = 'USD', decimals = 2) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
        return currency === 'USD' ? '$...' : `... ${currency}`;
    }
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(numericValue);
    } catch (error) {
        console.error("Currency formatting error:", error, "Value:", value, "Currency:", currency);
        return `${currency} ${numericValue.toFixed(decimals)}`;
    }
};

// Helper: Round to nearest .99 (Unchanged)
const roundToNearest99 = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return 0;
    const whole = Math.floor(num);
    const decimal = num - whole;
    return decimal < 0.40 ? Math.max(0, whole - 1 + 0.99) : whole + 0.99;
};

// Helper: Calculate SRP and apply rounding/adjustments (Unchanged)
const calculateSrpAndAdjustments = (wholesaleBottle, marginPercent, casePack, round) => {
    const numWholesaleBottle = parseFloat(wholesaleBottle);
    const margin = parseFloat(marginPercent) || 0;
    const numCasePack = parseInt(casePack, 10) || 1;

     if (isNaN(numWholesaleBottle)) {
        console.error("Invalid wholesaleBottle in calculateSrpAndAdjustments:", wholesaleBottle);
        return { srp: NaN, adjustedBottle: NaN, adjustedCase: NaN };
    }

    if (margin >= 100) {
        return { srp: Infinity, adjustedBottle: numWholesaleBottle, adjustedCase: numWholesaleBottle * numCasePack };
    }
    // SRP = Wholesale / (1 - Margin%)
    const initialSrp = numWholesaleBottle / (1 - margin / 100);
    let finalSrp = initialSrp;
    let adjustedBottle = numWholesaleBottle;
    let adjustedCase = adjustedBottle * numCasePack;

    if (round) {
        finalSrp = roundToNearest99(initialSrp);
        // Wholesale = SRP * (1 - Margin%)
        adjustedBottle = finalSrp * (1 - margin / 100);
        adjustedCase = adjustedBottle * numCasePack;
    }

    return {
        srp: finalSrp,
        adjustedBottle: adjustedBottle,
        adjustedCase: adjustedCase,
    };
};


// --- InputPanel Component (Updated Refresh Button Handler) ---
const InputPanel = ({
  formData,
  setFormData,
  handleInputChange,
  handleCurrencyChange,
  handleSelectChange,
  // Pass the modified fetch function
  fetchCurrentExchangeRateWithCache,
  isExchangeRateLoading,
  exchangeRateError,
  showAdvanced,
  setShowAdvanced,
  errors,
}) => {

  // Helper to calculate effective rate for display (Unchanged)
  const getEffectiveRate = () => {
    // ... (same as before)
    if (formData.currency === 'USD') return 'N/A';
    if (formData.useCustomExchangeRate) {
        const rate = parseFloat(formData.customExchangeRate);
        return !isNaN(rate) ? rate.toFixed(4) : 'Invalid';
    } else {
        const baseRate = parseFloat(formData.exchangeRate);
        const buffer = parseFloat(formData.exchangeBuffer) || 0;
        // Ensure baseRate is valid before calculating
        if (isNaN(baseRate)) return 'N/A';
        return (baseRate * (1 + buffer / 100)).toFixed(4);
    }
  };

  return (
    <div className="md:col-span-1 bg-gray-50 p-4 md:p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-6 text-gray-700">Input Parameters</h2>

        {/* ... (Wine Name, Calculation Mode, Target SRP - unchanged) ... */}
         {/* --- Wine Name --- */}
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="wineName">Wine Name</label>
            <input
            id="wineName"
            type="text"
            name="wineName"
            value={formData.wineName}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter wine name (optional)"
            />
        </div>

        {/* --- Calculation Mode Selector --- */}
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="calculationMode">Calculation Mode</label>
            <select
            id="calculationMode"
            name="calculationMode"
            value={formData.calculationMode}
            onChange={handleSelectChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
            <option value="forward">Forward (Cost to SRP)</option>
            <option value="reverse">Reverse (Target SRP to Cost)</option>
            </select>
        </div>

        {/* --- Target SRP (Conditional) --- */}
        {formData.calculationMode === 'reverse' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <label className="block text-sm font-medium text-blue-800 mb-1" htmlFor="targetSrp">Target SRP (USD)</label>
            <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-100 text-gray-600 text-sm">
                USD
                </span>
                <input
                id="targetSrp"
                type="number"
                name="targetSrp"
                value={formData.targetSrp}
                onChange={handleInputChange}
                className={`flex-1 p-2 border ${errors.targetSrp ? 'border-red-500' : 'border-gray-300'} rounded-r-md focus:ring-blue-500 focus:border-blue-500 min-w-0`}
                min="0"
                step="0.01"
                placeholder="Enter desired final SRP"
                />
            </div>
            {errors.targetSrp && <p className="text-red-500 text-xs mt-1">{errors.targetSrp}</p>}
            <p className="text-xs text-gray-500 mt-1">Enter the final Shelf Price (USD) you want to achieve.</p>
            </div>
        )}

        {/* --- Currency & Cost Inputs --- */}
        <div className={`mb-4 p-3 rounded-md border ${formData.calculationMode === 'forward' ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-100'}`}>
            <label className={`block text-sm font-medium mb-1 ${formData.calculationMode === 'forward' ? 'text-gray-700' : 'text-gray-500'}`}>Supplier Cost ({formData.currency})</label>
            <div className="flex mb-2">
            <select
                name="currency"
                value={formData.currency}
                onChange={handleCurrencyChange}
                className={`p-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-100 focus:ring-blue-500 focus:border-blue-500 w-[70px] ${formData.calculationMode === 'reverse' ? 'cursor-not-allowed opacity-70' : ''}`}
                disabled={formData.calculationMode === 'reverse'}
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
                disabled={formData.calculationMode === 'reverse'}
                className={`flex-1 p-2 border ${errors.bottleCost ? 'border-red-500' : 'border-gray-300'} focus:ring-blue-500 focus:border-blue-500 min-w-0 ${formData.calculationMode === 'reverse' ? 'bg-gray-200 cursor-not-allowed' : ''}`}
                min="0"
                step="0.01"
                placeholder={formData.calculationMode === 'reverse' ? '(Calculated)' : 'Bottle Cost'}
            />
            </div>
            <div className="flex">
            <span className={`inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-100 text-sm w-[70px] ${formData.calculationMode === 'reverse' ? 'text-gray-400' : 'text-gray-600'}`}>
                {formData.currency}
            </span>
            <input
                type="number"
                name="casePrice"
                value={formData.casePrice}
                onChange={handleInputChange}
                disabled={formData.calculationMode === 'reverse'}
                className={`flex-1 p-2 border ${errors.casePrice ? 'border-red-500' : 'border-gray-300'} rounded-r-md focus:ring-blue-500 focus:border-blue-500 min-w-0 ${formData.calculationMode === 'reverse' ? 'bg-gray-200 cursor-not-allowed' : ''}`}
                min="0"
                step="0.01"
                placeholder={formData.calculationMode === 'reverse' ? '(Calculated)' : `Case Price (${formData.casePackSize}pk)`}
            />
            </div>
            {(errors.bottleCost || errors.casePrice) && <p className="text-red-500 text-xs mt-1">{errors.bottleCost || errors.casePrice}</p>}
            {formData.calculationMode === 'forward' && <p className="text-xs text-gray-500 mt-1">Enter either bottle or case cost ({formData.currency}).</p>}
            {formData.calculationMode === 'reverse' && <p className="text-xs text-gray-500 mt-1">Supplier cost will be calculated based on Target SRP.</p>}
        </div>

        {/* --- Case/Bottle Size --- */}
        <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="casePackSize">Case Pack</label>
            <select
                id="casePackSize"
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
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="bottleSize">Bottle Size</label>
            <select
                id="bottleSize"
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

      {/* --- Exchange Rate Section --- */}
      <div className={`mb-4 p-3 rounded-md border ${formData.currency === 'EUR' ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-100'}`}>
         <label className={`block text-sm font-medium mb-2 ${formData.currency === 'EUR' ? 'text-gray-700' : 'text-gray-500'}`}>
             Exchange Rate (EUR to USD)
         </label>
         {formData.currency === 'EUR' ? (
             <>
                <div className="flex flex-col space-y-2">
                    {/* Base Rate + Refresh */}
                    <div className="flex items-center">
                         <span className="text-sm w-20">Base Rate:</span>
                         <input
                            type="number"
                            name="exchangeRate"
                            value={formData.exchangeRate}
                            onChange={handleInputChange}
                            className="w-24 p-1 border border-gray-300 rounded-md text-center focus:ring-blue-500 focus:border-blue-500 text-sm"
                            min="0"
                            step="0.0001"
                            disabled={isExchangeRateLoading || formData.useCustomExchangeRate}
                            aria-label="Base EUR to USD Exchange Rate"
                         />
                         <button
                            className="ml-2 p-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                            // --- FIX: Call fetch function with force=true ---
                            onClick={() => fetchCurrentExchangeRateWithCache(true)}
                            // --- ADD TITLE ATTRIBUTE ---
    title="Force refresh exchange rate (Uses API Credit)"
    // --- END ADDITION ---
                            disabled={isExchangeRateLoading || formData.useCustomExchangeRate}
                            type="button"
                            aria-label="Refresh Base Exchange Rate"
                         >
                            {isExchangeRateLoading ? '...' : <RefreshCw className="w-3 h-3"/>}
                         </button>
                     </div>

                    {/* ... (Buffer and Override controls - unchanged) ... */}
                     {/* Buffer */}
                     <div className="flex items-center">
                         <span className="text-sm w-20">Buffer (%):</span>
                          <div className="flex items-center">
                           <button
                             className={`p-1 bg-gray-200 rounded-md disabled:opacity-50 ${formData.useCustomExchangeRate ? 'cursor-not-allowed' : 'hover:bg-gray-300'}`}
                             onClick={() => setFormData((prev) => ({ ...prev, exchangeBuffer: Math.max(0, (parseFloat(prev.exchangeBuffer) || 0) - 1) }))}
                             disabled={formData.useCustomExchangeRate}
                             type="button" aria-label="Decrease exchange buffer"
                           > <MinusCircle className="w-4 h-4" /> </button>
                           <input
                             type="number"
                             name="exchangeBuffer"
                             value={formData.exchangeBuffer}
                             onChange={handleInputChange}
                             className="w-12 mx-1 p-1 border border-gray-300 rounded-md text-center focus:ring-blue-500 focus:border-blue-500 text-sm"
                             min="0" step="1"
                             disabled={formData.useCustomExchangeRate}
                             aria-label="Exchange Buffer Percentage"
                            />
                           <button
                             className={`p-1 bg-gray-200 rounded-md disabled:opacity-50 ${formData.useCustomExchangeRate ? 'cursor-not-allowed' : 'hover:bg-gray-300'}`}
                             onClick={() => setFormData((prev) => ({ ...prev, exchangeBuffer: (parseFloat(prev.exchangeBuffer) || 0) + 1 }))}
                             disabled={formData.useCustomExchangeRate}
                             type="button" aria-label="Increase exchange buffer"
                           > <PlusCircle className="w-4 h-4" /> </button>
                         </div>
                     </div>

                     {/* Override */}
                     <div className="flex items-center">
                         <input
                            type="checkbox"
                            id="useCustomRate"
                            name="useCustomExchangeRate"
                            checked={formData.useCustomExchangeRate}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                          />
                         <label htmlFor="useCustomRate" className="text-sm mr-2">Override:</label>
                         <input
                            type="number"
                            name="customExchangeRate"
                            value={formData.customExchangeRate}
                            onChange={handleInputChange}
                            className="w-20 p-1 border border-gray-300 rounded-md text-center focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                            min="0"
                            step="0.0001"
                            disabled={!formData.useCustomExchangeRate}
                            aria-label="Custom Override Exchange Rate"
                         />
                     </div>
                </div>

                 <div className="text-xs text-gray-600 mt-2">
                     Effective rate: <span className="font-medium">{getEffectiveRate()}</span>
                 </div>
                 {exchangeRateError && <p className="text-red-500 text-xs mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{exchangeRateError}</p>}
             </>
         ) : (
             <p className="text-sm text-gray-500">Not applicable for USD cost.</p>
         )}
      </div>


        {/* ... (Rounding, Advanced Toggle, Advanced Section - unchanged) ... */}
         {/* --- Round SRP Checkbox --- */}
        <div className="mb-4 flex items-center">
            <input
            type="checkbox"
            id="roundSrp"
            name="roundSrp"
            checked={formData.roundSrp}
            onChange={handleInputChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
            />
            <label htmlFor="roundSrp" className="text-sm text-gray-700">Round SRP to nearest .99</label>
        </div>

        {/* --- Advanced Options Toggle --- */}
        <div className="mb-4">
            <button
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
            onClick={() => setShowAdvanced(!showAdvanced)}
            type="button"
            >
            {showAdvanced ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
            </button>
        </div>

        {/* --- Advanced Options Section --- */}
        {showAdvanced && (
            <div className="border-t pt-4 mt-4">
            <h3 className="text-md font-semibold mb-4 text-gray-600">Advanced Costs & Margins</h3>
            <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="diLogistics">DI Logistics ($ / case)</label>
                    <input id="diLogistics" type="number" name="diLogistics" value={formData.diLogistics} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" min="0" step="0.01" />
                </div>
            <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="tariff">Tariff (%)</label>
                    <input id="tariff" type="number" name="tariff" value={formData.tariff} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" min="0" max="200" />
                </div>
            <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="statesideLogistics">Stateside Logistics ($ / case)</label>
                    <input id="statesideLogistics" type="number" name="statesideLogistics" value={formData.statesideLogistics} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" min="0" step="0.01" />
                </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="supplierMargin">Supplier Margin (%)</label>
                        <input id="supplierMargin" type="number" name="supplierMargin" value={formData.supplierMargin} onChange={handleInputChange} className={`w-full p-2 border ${errors.supplierMargin ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`} min="0" max="100" />
                        {errors.supplierMargin && <p className="text-red-500 text-xs mt-1">{errors.supplierMargin}</p>}
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="distributorMargin">Distributor Margin (%)</label>
                        <input id="distributorMargin" type="number" name="distributorMargin" value={formData.distributorMargin} onChange={handleInputChange} className={`w-full p-2 border ${errors.distributorMargin ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`} min="0" max="100" />
                        {errors.distributorMargin && <p className="text-red-500 text-xs mt-1">{errors.distributorMargin}</p>}
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="distributorBtgMargin">Dist BTG Margin (%)</label>
                        <input id="distributorBtgMargin" type="number" name="distributorBtgMargin" value={formData.distributorBtgMargin} onChange={handleInputChange} className={`w-full p-2 border ${errors.distributorBtgMargin ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`} min="0" max="100" />
                        {errors.distributorBtgMargin && <p className="text-red-500 text-xs mt-1">{errors.distributorBtgMargin}</p>}
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="retailerMargin">Retailer Margin (%)</label>
                        <input id="retailerMargin" type="number" name="retailerMargin" value={formData.retailerMargin} onChange={handleInputChange} className={`w-full p-2 border ${errors.retailerMargin ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`} min="0" max="100" />
                        {errors.retailerMargin && <p className="text-red-500 text-xs mt-1">{errors.retailerMargin}</p>}
                    </div>
            </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="casesSold">Cases Sold (for GP)</label>
                    <input id="casesSold" type="number" name="casesSold" value={formData.casesSold} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" min="0" step="1" placeholder="Optional"/>
                </div>
            </div>
        )}

    </div>
  );
};


// --- Main WinePricingCalculator Component ---
const WinePricingCalculator = () => {
  // State (Initialize rate from localStorage if available)
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [calculations, setCalculations] = useState({});
  const [errors, setErrors] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [isExchangeRateLoading, setIsExchangeRateLoading] = useState(false);
  const [exchangeRateError, setExchangeRateError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showGrossProfit, setShowGrossProfit] = useState(false);


  // --- Exchange Rate Fetching with Caching ---
  const fetchCurrentExchangeRateWithCache = useCallback(async (forceFetch = false) => {
      // Only fetch if currency is EUR
      if (formData.currency !== 'EUR') {
          // Ensure rate is 1.0 if not EUR
          if(formData.exchangeRate !== 1.0) setFormData(prev => ({ ...prev, exchangeRate: 1.0 }));
          setExchangeRateError(null);
          return;
      }

      const now = Date.now();
      const lastFetchTime = parseInt(localStorage.getItem('lastFetchTime') || '0', 10);
      const cachedRate = localStorage.getItem('cachedRateEURUSD');

      // Use cached rate if not forced and cache is still valid (less than 12 hours old)
      if (!forceFetch && cachedRate && (now - lastFetchTime < CACHE_DURATION)) {
          const rate = parseFloat(cachedRate);
          if (!isNaN(rate) && formData.exchangeRate !== rate) {
                setFormData(prev => ({ ...prev, exchangeRate: rate }));
                console.log("Using cached exchange rate:", rate);
          }
          setExchangeRateError(null); // Clear any previous error if using cache
          return;
      }

      // Proceed to fetch
      setIsExchangeRateLoading(true);
      setExchangeRateError(null);
      console.log(forceFetch ? "Forcing exchange rate fetch..." : "Cache expired or missing, fetching exchange rate...");

      try {
          const apiKey = process.env.REACT_APP_EXCHANGE_RATE_API_KEY;
          if (!apiKey) {
              throw new Error("API key configuration is missing.");
          }

          // --- FIX: Use /live endpoint and correct parameters ---
          const response = await fetch(`https://api.exchangerate.host/live?access_key=${apiKey}&source=EUR&currencies=USD`);
          // --- End Endpoint Fix ---

          if (!response.ok) throw new Error(`API Error (${response.status})`);
          const data = await response.json();

          // --- FIX: Parse response from /live endpoint (data.quotes.EURUSD) ---
          if (data?.success === true && data?.quotes?.EURUSD) {
              const rate = parseFloat(data.quotes.EURUSD.toFixed(4));
              setFormData((prev) => ({
                  ...prev,
                  exchangeRate: rate,
                  // Optionally update custom rate if it matches old fetched rate?
                  // customExchangeRate: prev.useCustomExchangeRate ? prev.customExchangeRate : rate,
              }));
              // --- Store successful fetch time and rate in localStorage ---
              localStorage.setItem('cachedRateEURUSD', rate.toString());
              localStorage.setItem('lastFetchTime', now.toString());
              console.log("Fetched and cached new exchange rate:", rate);
          } else {
              const apiErrorMsg = data?.error?.info || (data?.success === false ? "API returned success=false" : "Invalid data structure received");
              throw new Error(apiErrorMsg);
          }
          // --- End Response Parsing Fix ---

      } catch (error) {
          console.error('Error fetching exchange rate:', error);
          setExchangeRateError(`Could not fetch rate: ${error.message}. Using previous or default.`);
          // Don't update cache time on error, allow retry sooner
      } finally {
          setIsExchangeRateLoading(false);
      }
  }, [formData.currency, formData.exchangeRate]); // Depend on currency to re-evaluate if needed, and current rate for comparison


  // --- Other Handlers ---

  // Currency change NO LONGER auto-fetches, just sets state
  const handleCurrencyChange = useCallback((e) => {
     const newCurrency = e.target.value;
    setFormData((prev) => ({
        ...prev,
        currency: newCurrency,
        // Set rate to 1.0 if USD, otherwise keep current (fetched/cached/default)
        exchangeRate: newCurrency === 'USD' ? 1.0 : prev.exchangeRate || DEFAULT_FORM_DATA.exchangeRate,
        // Reset custom rate/buffer flags if switching to USD
        useCustomExchangeRate: newCurrency === 'USD' ? false : prev.useCustomExchangeRate,
        customExchangeRate: newCurrency === 'USD' ? 1.0 : prev.customExchangeRate || DEFAULT_FORM_DATA.customExchangeRate,
        exchangeBuffer: newCurrency === 'USD' ? 0 : prev.exchangeBuffer || DEFAULT_FORM_DATA.exchangeBuffer,
    }));
    // Clear error when switching currency
    setExchangeRateError(null);
    // NO automatic fetch here anymore
  }, []); // Removed fetchCurrentExchangeRateWithCache dependency


   // Input change handler (Unchanged logic, just ensure it uses correct state)
    const handleInputChange = useCallback((e) => {
        // ... (same logic as previous version) ...
        const { name, value, type, checked } = e.target;
        let newValue = type === 'checkbox' ? checked : value;
        let error = "";

        const numericFields = [
        "bottleCost", "casePrice", "targetSrp", "exchangeRate", "customExchangeRate",
        "exchangeBuffer", "diLogistics", "tariff", "statesideLogistics",
        "supplierMargin", "distributorMargin", "distributorBtgMargin", "retailerMargin",
        "casesSold"
        ];

        let updatedFields = { [name]: newValue };
        const currentMode = formData.calculationMode;
        const casePack = parseInt(formData.casePackSize, 10);

        if (numericFields.includes(name)) {
            if (newValue !== "" ) {
                const num = parseFloat(newValue);
                if(isNaN(num)) {
                    newValue = formData[name] || ""; // Revert
                    error = "Invalid number";
                    updatedFields[name] = newValue;
                } else {
                    // Range checks
                    if (["supplierMargin", "distributorMargin", "distributorBtgMargin", "retailerMargin"].includes(name) && (num < 0 || num >= 100)) { error = "Must be 0-99.99"; }
                    else if (["bottleCost", "casePrice", "targetSrp", "diLogistics", "statesideLogistics", "casesSold", "exchangeRate", "customExchangeRate", "exchangeBuffer"].includes(name) && num < 0) { error = "Cannot be negative"; }
                    else if (name === "tariff" && (num < 0 || num > 200)) { error = "Tariff must be 0-200"; }
                    else { error = ""; } // Clear error if within range

                    // Calculate counterpart value in Forward mode
                    if (currentMode === 'forward' && !isNaN(casePack) && casePack > 0) {
                        if (name === 'bottleCost' && !isNaN(num) && num >= 0) { // Check num >= 0
                            const calculatedCasePrice = (num * casePack).toFixed(2);
                            updatedFields.casePrice = calculatedCasePrice;
                        } else if (name === 'casePrice' && !isNaN(num) && num >= 0) { // Check num >= 0
                            const calculatedBottleCost = (num / casePack).toFixed(4);
                            updatedFields.bottleCost = calculatedBottleCost;
                        }
                    }
                    updatedFields[name] = value; // Keep raw value from input
                }
            } else { // Field was cleared
                error = "";
                // Clear counterpart if one is cleared in forward mode
                if (currentMode === 'forward') {
                    if (name === 'bottleCost') { updatedFields.casePrice = ""; }
                    else if (name === 'casePrice') { updatedFields.bottleCost = ""; }
                }
            }
        }

        setErrors((prev) => ({ ...prev, [name]: error }));

        setFormData((prev) => {
            let newState = { ...prev, ...updatedFields };

            // Mode switch or related input change logic
            if (prev.calculationMode === 'reverse' && (name === 'bottleCost' || name === 'casePrice')) {
                newState = { ...newState, targetSrp: '' };
            }
            else if (prev.calculationMode === 'forward' && name === 'targetSrp') {
                newState = { ...newState, bottleCost: '', casePrice: '' };
            }
            else if (name === 'calculationMode' && newValue === 'reverse') {
                newState = { ...newState, bottleCost: '', casePrice: '' };
            }
            else if (name === 'calculationMode' && newValue === 'forward') {
                newState = { ...newState, targetSrp: '' };
            }
            // Recalc case price if case pack changes in forward mode
            else if (name === 'casePackSize' && currentMode === 'forward') {
                const existingBottleCost = parseFloat(newState.bottleCost);
                const newCasePack = parseInt(newValue, 10); // Use newValue for casePackSize
                if (!isNaN(existingBottleCost) && !isNaN(newCasePack) && newCasePack > 0) {
                    newState.casePrice = (existingBottleCost * newCasePack).toFixed(2);
                } else {
                    newState.casePrice = "";
                }
            }
             // Update custom rate if base rate input changes AND override is OFF
             if (name === 'exchangeRate' && !newState.useCustomExchangeRate) {
                 newState.customExchangeRate = parseFloat(newValue) || DEFAULT_FORM_DATA.customExchangeRate;
             }
            return newState;
        });

    }, [formData]); // formData is needed


  // Select change handler (Unchanged)
  const handleSelectChange = useCallback((e) => {
    // ... (same logic as previous version) ...
    const { name, value } = e.target;
     let processedValue = value;
     if (name === 'casePackSize') {
         processedValue = parseInt(value, 10);
     }

     let updatedFormData = {
      ...formData,
      [name]: processedValue,
    };

    // Mode switch logic
     if (name === 'calculationMode' && value === 'reverse') {
         updatedFormData = { ...updatedFormData, bottleCost: '', casePrice: '' };
     }
     else if (name === 'calculationMode' && value === 'forward') {
          updatedFormData = { ...updatedFormData, targetSrp: '' };
     }
     // Recalc case price if case pack changes via select
     else if (name === 'casePackSize' && updatedFormData.calculationMode === 'forward') {
         const existingBottleCost = parseFloat(updatedFormData.bottleCost);
         const newCasePack = processedValue;
         if (!isNaN(existingBottleCost) && !isNaN(newCasePack) && newCasePack > 0) {
             updatedFormData.casePrice = (existingBottleCost * newCasePack).toFixed(2);
         } else {
             updatedFormData.casePrice = "";
         }
     }

    setFormData(updatedFormData);
  }, [formData]);


  // Calculation Logic (Unchanged, relies on formData.exchangeRate)
  const calculatePricing = useCallback(() => {
    // ... (same logic as previous version) ...
    setIsCalculating(true);
    setErrors(prev => ({ ...prev, calculation: undefined })); // Clear only calculation error
    setCalculations({});

    try {
        const {
            calculationMode, currency, bottleCost, casePrice, targetSrp,
            casePackSize, exchangeRate, exchangeBuffer, useCustomExchangeRate, customExchangeRate,
            diLogistics, tariff, statesideLogistics,
            supplierMargin, distributorMargin, distributorBtgMargin, retailerMargin,
            roundSrp, casesSold
        } = formData;

        // --- Input Validation & Parsing ---
        let formErrors = {};
        const numCasePack = parseInt(casePackSize, 10);
        if (isNaN(numCasePack) || numCasePack <= 0) throw new Error("Invalid Case Pack Size.");

        const numSupplierMargin = parseFloat(supplierMargin);
        const numDistMargin = parseFloat(distributorMargin);
        const numDistBtgMargin = parseFloat(distributorBtgMargin);
        const numRetailerMargin = parseFloat(retailerMargin);
        const numDiLogistics = parseFloat(diLogistics);
        const numTariff = parseFloat(tariff);
        const numStatesideLogistics = parseFloat(statesideLogistics);
        const numExchangeBuffer = parseFloat(exchangeBuffer);

        // Validate numbers and ranges
        if (isNaN(numSupplierMargin) || numSupplierMargin < 0 || numSupplierMargin >= 100) throw new Error("Supplier Margin must be 0-99.99");
        if (isNaN(numDistMargin) || numDistMargin < 0 || numDistMargin >= 100) throw new Error("Distributor Margin must be 0-99.99");
        if (isNaN(numDistBtgMargin) || numDistBtgMargin < 0 || numDistBtgMargin >= 100) throw new Error("Dist BTG Margin must be 0-99.99");
        if (isNaN(numRetailerMargin) || numRetailerMargin < 0 || numRetailerMargin >= 100) throw new Error("Retailer Margin must be 0-99.99");
        if (isNaN(numDiLogistics) || numDiLogistics < 0) formErrors.diLogistics = "Cannot be negative";
        if (isNaN(numTariff) || numTariff < 0) formErrors.tariff = "Cannot be negative";
        if (isNaN(numStatesideLogistics) || numStatesideLogistics < 0) formErrors.statesideLogistics = "Cannot be negative";
        if (isNaN(numExchangeBuffer) || numExchangeBuffer < 0) formErrors.exchangeBuffer = "Cannot be negative";

        let inputBottleCost = parseFloat(bottleCost);
        let inputCasePrice = parseFloat(casePrice);
        let inputTargetSrp = parseFloat(targetSrp);

        let baseBottleCostOriginal = null;
        let baseCasePriceOriginal = null;
        let caseCostUSD = 0;

        // --- EFFECTIVE EXCHANGE RATE ---
        const effectiveExchangeRate = currency === 'USD' ? 1.0 :
            (useCustomExchangeRate ? (parseFloat(customExchangeRate) || 1.0) :
            (parseFloat(exchangeRate) || 1.0) * (1 + (isNaN(numExchangeBuffer) ? 0 : numExchangeBuffer) / 100));

        if (isNaN(effectiveExchangeRate) || effectiveExchangeRate <= 0) {
             throw new Error("Effective exchange rate must be positive.");
        }
        // --- END EFFECTIVE EXCHANGE RATE ---


        // --- Mode-Specific Input Handling ---
        if (calculationMode === 'forward') {
             if (!isNaN(inputBottleCost) && inputBottleCost > 0) {
                 baseBottleCostOriginal = inputBottleCost;
                 baseCasePriceOriginal = inputBottleCost * numCasePack;
             } else if (!isNaN(inputCasePrice) && inputCasePrice > 0) {
                 baseCasePriceOriginal = inputCasePrice;
                 baseBottleCostOriginal = inputCasePrice / numCasePack;
             } else { throw new Error("Enter valid Bottle or Case Cost."); }

            if(isNaN(baseCasePriceOriginal) || baseCasePriceOriginal <= 0) { throw new Error("Invalid cost input."); }
            // Convert original currency cost to USD using effective rate
            caseCostUSD = baseCasePriceOriginal * effectiveExchangeRate;

        } else { // Reverse mode
            if (isNaN(inputTargetSrp) || inputTargetSrp <= 0) { throw new Error("Enter valid Target SRP."); }

            // Work backwards from Target SRP (USD)
             const wholesaleBottleUSD_SS = inputTargetSrp * (1 - numRetailerMargin / 100);
             if (isNaN(wholesaleBottleUSD_SS) || wholesaleBottleUSD_SS <= 0) throw new Error("Retailer margin yields non-positive wholesale.");
             const caseWholesaleUSD_SS = wholesaleBottleUSD_SS * numCasePack;

             const distributorSsLaidInCostUSD = caseWholesaleUSD_SS * (1 - numDistMargin / 100);
             if (isNaN(distributorSsLaidInCostUSD) || distributorSsLaidInCostUSD <= 0) throw new Error("Distributor margin yields non-positive laid-in cost.");

             const supplierSsFobUSD = distributorSsLaidInCostUSD - (isNaN(numStatesideLogistics)?0:numStatesideLogistics);
              if (isNaN(supplierSsFobUSD) || supplierSsFobUSD <= 0) throw new Error("Stateside logistics exceed distributor cost.");

             const supplierSsLaidInCostUSD = supplierSsFobUSD * (1 - numSupplierMargin / 100);
              if (isNaN(supplierSsLaidInCostUSD) || supplierSsLaidInCostUSD <= 0) throw new Error("Supplier margin yields non-positive SS laid-in cost.");

            const tariffFactor = 1 + (isNaN(numTariff)?0:numTariff) / 100;
            if (tariffFactor <= 0) throw new Error("Tariff cannot be -100% or less.")
            caseCostUSD = (supplierSsLaidInCostUSD - (isNaN(numDiLogistics)?0:numDiLogistics)) / tariffFactor;
            if (isNaN(caseCostUSD) || caseCostUSD <= 0) throw new Error("Logistics/Tariff yield non-positive base cost.");

            // Convert calculated Base USD cost back to original currency
            baseCasePriceOriginal = caseCostUSD / effectiveExchangeRate;
            baseBottleCostOriginal = baseCasePriceOriginal / numCasePack;
        }

        if (isNaN(caseCostUSD) || caseCostUSD <= 0) { throw new Error("Base USD cost is invalid."); }

        // --- COMMON CALCULATIONS ---
        const tariffAmountUSD = caseCostUSD * (isNaN(numTariff)?0:numTariff) / 100;
        const supplierLaidInCostDI_USD = caseCostUSD + tariffAmountUSD + (isNaN(numDiLogistics)?0:numDiLogistics);
        const supplierFobDI_USD = supplierLaidInCostDI_USD / (1 - numSupplierMargin / 100);
        // SS laid in cost before SS Logistics is the same as DI laid in cost
        const supplierLaidInCostSS_USD_pre_logistics = supplierLaidInCostDI_USD;
        // SS FOB is calculated from this pre-logistics cost
        const supplierFobSS_USD_recalc = supplierLaidInCostSS_USD_pre_logistics / (1 - numSupplierMargin / 100);

        if (!isFinite(supplierFobDI_USD) || !isFinite(supplierFobSS_USD_recalc)) throw new Error("Supplier Margin error.");

        const distributorLaidInCostDI_USD = supplierFobDI_USD;
        const distCaseWholesaleDI_USD = distributorLaidInCostDI_USD / (1 - numDistMargin / 100);
        const distBottleWholesaleDI_USD = distCaseWholesaleDI_USD / numCasePack;

        // Distributor Laid-In SS includes the Stateside Logistics cost
        const distributorLaidInCostSS_USD = supplierFobSS_USD_recalc + (isNaN(numStatesideLogistics)?0:numStatesideLogistics);
        const distCaseWholesaleSS_USD = distributorLaidInCostSS_USD / (1 - numDistMargin / 100);
        const distBottleWholesaleSS_USD = distCaseWholesaleSS_USD / numCasePack;

        const distBtgPriceDI_USD = (distributorLaidInCostDI_USD / (1 - numDistBtgMargin / 100)) / numCasePack;
        const distBtgPriceSS_USD = (distributorLaidInCostSS_USD / (1 - numDistBtgMargin / 100)) / numCasePack;

        if (!isFinite(distCaseWholesaleDI_USD) || !isFinite(distCaseWholesaleSS_USD) || !isFinite(distBtgPriceDI_USD) || !isFinite(distBtgPriceSS_USD)) throw new Error("Distributor Margin error.");

        const retailResultDI = calculateSrpAndAdjustments(distBottleWholesaleDI_USD, numRetailerMargin, numCasePack, roundSrp);
        const retailResultSS = calculateSrpAndAdjustments(distBottleWholesaleSS_USD, numRetailerMargin, numCasePack, roundSrp);

        if (!isFinite(retailResultDI.srp) || !isFinite(retailResultSS.srp)) throw new Error("Retailer Margin error.");

        const srpDi_USD = retailResultDI.srp;
        const srpSs_USD = retailResultSS.srp;
        const adjustedBottleWholesaleDI_USD = retailResultDI.adjustedBottle;
        const adjustedCaseWholesaleDI_USD = retailResultDI.adjustedCase;
        const adjustedBottleWholesaleSS_USD = retailResultSS.adjustedBottle;
        const adjustedCaseWholesaleSS_USD = retailResultSS.adjustedCase;

        const numCasesSold = parseFloat(casesSold) || 0;
        const supplierProfitPerCaseDI = supplierFobDI_USD - supplierLaidInCostDI_USD;
        const supplierProfitPerCaseSS = supplierFobSS_USD_recalc - supplierLaidInCostSS_USD_pre_logistics; // Profit based on cost before SS logistics
        const distributorProfitPerCaseDI = adjustedCaseWholesaleDI_USD - distributorLaidInCostDI_USD;
        const distributorProfitPerCaseSS = adjustedCaseWholesaleSS_USD - distributorLaidInCostSS_USD;

        const supplierGrossProfitDI = numCasesSold * supplierProfitPerCaseDI;
        const supplierGrossProfitSS = numCasesSold * supplierProfitPerCaseSS;
        const distributorGrossProfitDI = numCasesSold * distributorProfitPerCaseDI;
        const distributorGrossProfitSS = numCasesSold * distributorProfitPerCaseSS;

        setCalculations({
            baseBottleCostOriginal: baseBottleCostOriginal, baseCasePriceOriginal: baseCasePriceOriginal,
            caseCostUSD: caseCostUSD, effectiveExchangeRate: effectiveExchangeRate, tariffAmountUSD: tariffAmountUSD,
            supplierLaidInCostDI_USD: supplierLaidInCostDI_USD, supplierFobDI_USD: supplierFobDI_USD,
            // Use pre-logistics cost for SS supplier cost basis
            supplierLaidInCostSS_USD: supplierLaidInCostSS_USD_pre_logistics,
            supplierFobSS_USD: supplierFobSS_USD_recalc,
            distributorLaidInCostDI_USD: distributorLaidInCostDI_USD, distributorLaidInCostSS_USD: distributorLaidInCostSS_USD,
            distCaseWholesaleDI_USD: adjustedCaseWholesaleDI_USD, distBottleWholesaleDI_USD: adjustedBottleWholesaleDI_USD,
            distCaseWholesaleSS_USD: adjustedCaseWholesaleSS_USD, distBottleWholesaleSS_USD: adjustedBottleWholesaleSS_USD,
            distBtgPriceDI_USD: distBtgPriceDI_USD, distBtgPriceSS_USD: distBtgPriceSS_USD,
            srpDi_USD: srpDi_USD, srpSs_USD: srpSs_USD,
            supplierGrossProfitDI: supplierGrossProfitDI, supplierGrossProfitSS: supplierGrossProfitSS,
            distributorGrossProfitDI: distributorGrossProfitDI, distributorGrossProfitSS: distributorGrossProfitSS,
            originalDistCaseWholesaleDI_USD: distCaseWholesaleDI_USD, originalDistBottleWholesaleDI_USD: distBottleWholesaleDI_USD,
            originalDistCaseWholesaleSS_USD: distCaseWholesaleSS_USD, originalDistBottleWholesaleSS_USD: distBottleWholesaleSS_USD,
        });

        setErrors(formErrors); // Set any non-critical validation errors

    } catch (error) {
        console.error("Calculation Error:", error);
        const errorMessage = (error instanceof Error) ? error.message : "An unexpected error occurred.";
        setErrors(prev => ({ ...prev, calculation: errorMessage }));
        setCalculations({}); // Clear results on error
    } finally {
        setIsCalculating(false);
    }

  }, [formData]);


  // --- Effects ---

  // Fetch exchange rate on initial mount (will use cache if valid)
  useEffect(() => {
    fetchCurrentExchangeRateWithCache();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount


  // Recalculate prices when formData changes (debounced)
  useEffect(() => {
    // ... (same logic as previous version) ...
    const timer = setTimeout(() => {
        const costEntered = formData.bottleCost || formData.casePrice;
        const targetEntered = formData.targetSrp;
        const shouldCalculate =
            (formData.calculationMode === 'forward' && costEntered) ||
            (formData.calculationMode === 'reverse' && targetEntered);

        if (shouldCalculate) {
            calculatePricing();
        } else {
             setCalculations({});
             // Clear only calculation errors, keep input validation errors
             setErrors(prev => { const { calculation, ...rest } = prev; return rest; });
        }
    }, CALCULATION_TIMEOUT);
    return () => clearTimeout(timer);
  }, [formData, calculatePricing]);


  // --- Action Handlers (Unchanged) ---
  const handleSaveClick = () => { console.log("Save Clicked"); alert("Save NYI"); };
  const handleExportClick = () => { console.log("Export Clicked"); alert("Export NYI"); };
  const handlePrintClick = () => { window.print(); };
  const handleResetClick = () => {
      if (window.confirm("Reset all fields to default?")) {
          // Clear cache on reset? Maybe not, user might want latest rate still.
          // localStorage.removeItem('cachedRateEURUSD');
          // localStorage.removeItem('lastFetchTime');
          const cachedRate = parseFloat(localStorage.getItem('cachedRateEURUSD')) || DEFAULT_FORM_DATA.exchangeRate;
          setFormData({
              ...DEFAULT_FORM_DATA,
              exchangeRate: cachedRate, // Keep cached rate on reset
              customExchangeRate: cachedRate,
          });
          setCalculations({});
          setErrors({});
          setShowAdvanced(false);
          setShowGrossProfit(false);
          // Optionally trigger a fetch check (respecting cache) after reset if currency is EUR
          // This might be redundant if useEffect [] runs again, but ensures check happens
          if(DEFAULT_FORM_DATA.currency === 'EUR') {
               setTimeout(() => fetchCurrentExchangeRateWithCache(false), 50);
          }
      }
  };


  // --- Render ---
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 bg-white rounded-lg shadow-lg print:shadow-none">
       {/* ... (Header & Print Header - unchanged) ... */}
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 border-b pb-4 print:hidden">
            <h1 className="text-2xl font-bold text-gray-800 mb-3 md:mb-0">Wine Pricing Calculator</h1>
            <div className="flex flex-wrap gap-2">
            <button title="Save Calculation (Coming Soon)" className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm" onClick={handleSaveClick} type="button" disabled> <Save className="w-4 h-4 mr-1" /> Save </button>
            <button title="Export as CSV (Coming Soon)" className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm" onClick={handleExportClick} type="button" disabled> <Download className="w-4 h-4 mr-1" /> Export </button>
            <button title="Print View" className="flex items-center px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm" onClick={handlePrintClick} type="button"> <Printer className="w-4 h-4 mr-1" /> Print </button>
            <button title="Reset Fields" className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm" onClick={handleResetClick} type="button"> Reset </button>
            </div>
        </div>
        {/* Print Header */}
        <div className="hidden print:block mb-4 border-b pb-2">
            <h1 className="text-xl font-bold text-gray-800">Wine Pricing Calculation</h1>
            {formData.wineName && <p className="text-lg text-gray-600">{formData.wineName}</p>}
            <p className="text-sm text-gray-500">Date: {new Date().toLocaleDateString()}</p>
        </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {/* Input Panel (Pass the correct fetch function) */}
        <div className="print:hidden">
            <InputPanel
                formData={formData}
                setFormData={setFormData}
                handleInputChange={handleInputChange}
                handleCurrencyChange={handleCurrencyChange}
                handleSelectChange={handleSelectChange}
                // Pass the caching fetch function
                fetchCurrentExchangeRateWithCache={fetchCurrentExchangeRateWithCache}
                isExchangeRateLoading={isExchangeRateLoading}
                exchangeRateError={exchangeRateError}
                showAdvanced={showAdvanced}
                setShowAdvanced={setShowAdvanced}
                errors={errors}
            />
        </div>

        {/* Results Panel Area */}
        <div className="md:col-span-2 print:col-span-3">
          {/* Status/Error Display (Unchanged) */}
            {isCalculating && <div className="text-center text-blue-600 mb-4 p-3 bg-blue-50 rounded border border-blue-200 print:hidden">Calculating...</div>}
            {errors.calculation && !isCalculating && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-center flex items-center justify-center"> <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0"/> <span>{errors.calculation}</span> </div>
            )}
            {exchangeRateError && !isExchangeRateLoading && formData.currency === 'EUR' && (
                <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-md text-center flex items-center justify-center print:hidden"> <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0"/> <span>Exchange Rate Error: {exchangeRateError}</span> </div>
            )}

          {/* Results Display (Unchanged, relies on `calculations` state) */}
            {calculations && Object.keys(calculations).length > 0 && !isCalculating && !errors.calculation && (
                <>
                {/* Derived Cost Display (Reverse Mode Only) */}
                {formData.calculationMode === 'reverse' && calculations.baseBottleCostOriginal !== null && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-center shadow-sm">
                    <p className="text-sm text-green-800">
                        To achieve target SRP of <span className="font-semibold">{formatCurrency(formData.targetSrp, 'USD')}</span>,
                        required supplier cost is approx: <br className="sm:hidden"/>
                        <span className="font-bold text-base">{formatCurrency(calculations.baseBottleCostOriginal, formData.currency, 4)}</span> / btl OR&nbsp;
                        <span className="font-bold text-base">{formatCurrency(calculations.baseCasePriceOriginal, formData.currency, 4)}</span> / case
                        <span className="text-xs"> ({formData.currency})</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Equivalent to {formatCurrency(calculations.caseCostUSD, 'USD')} / case (USD Base Cost)</p>
                    </div>
                )}

                {/* DI and SS Pricing Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
                    {/* Direct Import Card */}
                    <div className="bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100 print:shadow-none print:border print:border-gray-300">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Direct Import Pricing</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Base Case Cost (USD):</span> <span className="font-medium">{formatCurrency(calculations.caseCostUSD)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Tariff ({formData.tariff}%):</span> <span className="font-medium">{formatCurrency(calculations.tariffAmountUSD)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">DI Logistics:</span> <span className="font-medium">{formatCurrency(formData.diLogistics)}</span></div>
                            <div className="flex justify-between border-t pt-1 mt-1"><span className="text-gray-600">Supp. Laid-In DI:</span> <span className="font-medium">{formatCurrency(calculations.supplierLaidInCostDI_USD)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Supp. FOB DI ({formData.supplierMargin}%):</span> <span className="font-medium">{formatCurrency(calculations.supplierFobDI_USD)}</span></div>
                            <div className="flex justify-between border-t pt-1 mt-1"><span className="text-gray-600">Dist. Laid-In DI:</span> <span className="font-medium">{formatCurrency(calculations.distributorLaidInCostDI_USD)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Dist. Whsl Case DI ({formData.distributorMargin}%):</span> <span className="font-medium">{formatCurrency(calculations.distCaseWholesaleDI_USD)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Dist. Whsl Bottle DI:</span> <span className="font-medium">{formatCurrency(calculations.distBottleWholesaleDI_USD)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Dist. BTG Bottle DI ({formData.distributorBtgMargin}%):</span> <span className="font-medium">{formatCurrency(calculations.distBtgPriceDI_USD)}</span></div>
                            <div className="flex justify-between border-t pt-2 mt-1"><span className="text-blue-700 font-semibold">SRP (DI, {formData.retailerMargin}%):</span> <span className="font-bold text-lg text-blue-700">{formatCurrency(calculations.srpDi_USD)}</span></div>
                        </div>
                        {formData.roundSrp && Math.abs(calculations.distCaseWholesaleDI_USD - calculations.originalDistCaseWholesaleDI_USD) > 0.001 && (
                            <div className="text-xs text-gray-500 mt-2 italic border-t pt-1 print:hidden"> (Adj. from Whsl: {formatCurrency(calculations.originalDistBottleWholesaleDI_USD)} /btl) </div>
                        )}
                    </div>
                    {/* Stateside Card */}
                    <div className="bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100 print:shadow-none print:border print:border-gray-300">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Stateside Inventory Pricing</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Base Case Cost (USD):</span> <span className="font-medium">{formatCurrency(calculations.caseCostUSD)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Tariff ({formData.tariff}%):</span> <span className="font-medium">{formatCurrency(calculations.tariffAmountUSD)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">DI Logistics:</span> <span className="font-medium">{formatCurrency(formData.diLogistics)}</span></div>
                            {/* Display Supplier Laid-In SS (pre-logistics) */}
                             <div className="flex justify-between border-t pt-1 mt-1"><span className="text-gray-600">Supp. Base Cost SS:</span> <span className="font-medium">{formatCurrency(calculations.supplierLaidInCostSS_USD)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Supp. FOB SS ({formData.supplierMargin}%):</span> <span className="font-medium">{formatCurrency(calculations.supplierFobSS_USD)}</span></div>
                            <div className="flex justify-between border-t pt-1 mt-1"><span className="text-gray-600">Dist. Laid-In SS:</span> <span className="font-medium">{formatCurrency(calculations.distributorLaidInCostSS_USD)}</span></div>
                            <div className="text-xs text-gray-500 text-right italic">(+ SS Logistics ${formData.statesideLogistics})</div>
                            <div className="flex justify-between"><span className="text-gray-600">Dist. Whsl Case SS ({formData.distributorMargin}%):</span> <span className="font-medium">{formatCurrency(calculations.distCaseWholesaleSS_USD)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Dist. Whsl Bottle SS:</span> <span className="font-medium">{formatCurrency(calculations.distBottleWholesaleSS_USD)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Dist. BTG Bottle SS ({formData.distributorBtgMargin}%):</span> <span className="font-medium">{formatCurrency(calculations.distBtgPriceSS_USD)}</span></div>
                            <div className="flex justify-between border-t pt-2 mt-1"><span className="text-blue-700 font-semibold">SRP (SS, {formData.retailerMargin}%):</span> <span className="font-bold text-lg text-blue-700">{formatCurrency(calculations.srpSs_USD)}</span></div>
                        </div>
                        {formData.roundSrp && Math.abs(calculations.distCaseWholesaleSS_USD - calculations.originalDistCaseWholesaleSS_USD) > 0.001 && (
                            <div className="text-xs text-gray-500 mt-2 italic border-t pt-1 print:hidden"> (Adj. from Whsl: {formatCurrency(calculations.originalDistBottleWholesaleSS_USD)} /btl) </div>
                        )}
                        {formData.calculationMode === 'reverse' && Math.abs(calculations.srpSs_USD - parseFloat(formData.targetSrp)) <= 0.015 && (
                            <div className="text-xs text-green-600 text-right italic mt-1 font-medium">(Matches Target SRP)</div>
                        )}
                    </div>
                </div>

                {/* Gross Profit Section */}
                <div className="mt-6 print:hidden">
                    <button
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setShowGrossProfit(!showGrossProfit)}
                    type="button"
                    disabled={!formData.casesSold || formData.casesSold <= 0}
                    >
                    {showGrossProfit ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                    {showGrossProfit ? 'Hide Gross Profit' : 'Show Gross Profit'}
                        {(!formData.casesSold || formData.casesSold <= 0) && <span className="text-xs ml-2 text-gray-400">(Enter Cases Sold > 0)</span>}
                    </button>
                </div>
                {(showGrossProfit || (typeof window !== 'undefined' && window.matchMedia('print').matches)) && formData.casesSold > 0 && calculations.supplierGrossProfitDI != null && (
                    <div className="bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100 mt-2 print:shadow-none print:border-none print:mt-4 print:p-0">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Gross Profit Analysis</h3>
                    <p className="text-sm text-gray-600 mb-3">Based on <span className="font-medium">{formData.casesSold}</span> cases sold.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div> <h4 className="font-medium mb-2 text-gray-700">Direct Import (DI)</h4> <div className="space-y-1"> <div className="flex justify-between"><span className="text-gray-500">Supplier GP:</span> <span className="font-medium">{formatCurrency(calculations.supplierGrossProfitDI)}</span></div> <div className="flex justify-between"><span className="text-gray-500">Distributor GP:</span> <span className="font-medium">{formatCurrency(calculations.distributorGrossProfitDI)}</span></div> </div> </div>
                            <div> <h4 className="font-medium mb-2 text-gray-700">Stateside (SS)</h4> <div className="space-y-1"> <div className="flex justify-between"><span className="text-gray-500">Supplier GP:</span> <span className="font-medium">{formatCurrency(calculations.supplierGrossProfitSS)}</span></div> <div className="flex justify-between"><span className="text-gray-500">Distributor GP:</span> <span className="font-medium">{formatCurrency(calculations.distributorGrossProfitSS)}</span></div> </div> </div>
                    </div>
                    </div>
                )}
                </>
            )}

          {/* Placeholder */}
          {!isCalculating && (!calculations || Object.keys(calculations).length === 0) && !errors.calculation && (
              <div className="text-center text-gray-500 mt-10 p-6 bg-gray-50 rounded-lg print:hidden">
                  <p>Enter parameters to see the pricing breakdown.</p>
                  <p className="text-xs mt-1">{formData.calculationMode === 'forward' ? 'Requires Bottle/Case Cost.' : 'Requires Target SRP.'}</p>
              </div>
          )}

        </div> {/* End Results Panel Area */}

      </div> {/* End Main Grid */}
    </div> // End Main Container
  );
};

export default WinePricingCalculator;