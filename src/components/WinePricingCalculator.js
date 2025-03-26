import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Download, Printer, RefreshCw, AlertCircle, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

// --- Constants ---
const CURRENCIES = ['EUR', 'USD'];
const BOTTLE_SIZES = ['750ml', '375ml', '500ml', '1L', '1.5L', '3L'];
const CASE_PACK_SIZES = [12, 6, 3, 1];

// Caching and API Settings
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_KEY_OER = 'cachedRateEURUSD_OER'; // Unique key for OpenExchangeRates cache
const CACHE_TIMESTAMP_KEY_OER = 'lastFetchTime_OER'; // Unique key
const DEFAULT_EXCHANGE_RATE = '1.0750'; // Default EUR to USD rate

const DEFAULT_FORM_DATA = {
  calculationMode: 'forward',
  wineName: '',
  currency: 'EUR',
  bottleCost: '',
  casePrice: '',
  casePackSize: 12,
  bottleSize: '750ml',
  exchangeRate: DEFAULT_EXCHANGE_RATE, // Start with default/cache
  exchangeBuffer: 5,
  useCustomExchangeRate: false,
  customExchangeRate: DEFAULT_EXCHANGE_RATE, // Default custom to default rate
  diLogistics: 13,
  tariff: 0,
  statesideLogistics: 10,
  supplierMargin: 30,
  distributorMargin: 30,
  distributorBtgMargin: 27, // Default BTG Margin
  retailerMargin: 33,
  roundSrp: true,
  casesSold: '',
  targetSrp: '',
};

const CALCULATION_TIMEOUT = 300;

// --- Helper Functions ---
const formatCurrency = (value, currency = 'USD', maximumFractionDigits = 2) => {
    const number = Number(value);
    if (isNaN(number)) return '$--.--';
    try {
        return number.toLocaleString('en-US', { style: 'currency', currency: currency, minimumFractionDigits: 2, maximumFractionDigits: maximumFractionDigits });
    } catch (e) { return `$${number.toFixed(2)}`; }
};

const escapeCsvCell = (cell) => {
    const stringValue = String(cell ?? '');
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        const escapedString = stringValue.replace(/"/g, '""');
        return `"${escapedString}"`;
    }
    return stringValue;
};

const roundToNearest99 = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return 0;
    const whole = Math.floor(num);
    return num - whole < 0.40 ? Math.max(0, whole - 1 + 0.99) : whole + 0.99;
};

// --- InputPanel Component (Updated with reverseTargetModel selector) ---
const InputPanel = ({
    formData, setFormData, handleInputChange, handleCurrencyChange, handleSelectChange,
    handleCustomRateToggle, handleRefreshRate,
    isExchangeRateLoading, exchangeRateError, showAdvanced, setShowAdvanced, errors,
    // --- NEW: Props for Reverse Target Model ---
    reverseTargetModel, handleReverseTargetChange
}) => {

    // Function to get the effective rate for display (no changes needed here)
    const getEffectiveRate = () => {
        if (formData.currency === 'USD') return 'N/A';
        const baseRate = parseFloat(formData.exchangeRate); // This comes from state, which fetchRate updates
        const buffer = parseFloat(formData.exchangeBuffer) || 0;
        const customRate = parseFloat(formData.customExchangeRate);

        if (formData.useCustomExchangeRate) {
            return !isNaN(customRate) ? customRate.toFixed(4) : 'Invalid';
        } else {
            // Buffer is applied only if NOT using custom rate
             return !isNaN(baseRate) ? (baseRate * (1 + buffer / 100)).toFixed(4) : 'Invalid Base';
        }
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100 print:hidden">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Input Parameters</h3>
            <div className="space-y-4">
                {/* Wine Name */}
                <div>
                    <label htmlFor="wineName" className="block text-sm font-medium text-gray-700">Wine Name</label>
                    <input type="text" id="wineName" name="wineName" value={formData.wineName} onChange={handleInputChange} placeholder="Enter wine name (optional)" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                </div>
                {/* Calculation Mode */}
                <div>
                    <label htmlFor="calculationMode" className="block text-sm font-medium text-gray-700">Calculation Mode</label>
                    <select id="calculationMode" name="calculationMode" value={formData.calculationMode} onChange={handleSelectChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white">
                        <option value="forward">Forward (Cost to SRP)</option>
                        <option value="reverse">Reverse (SRP to Cost)</option>
                    </select>
                </div>
                {/* Supplier Cost Inputs (Forward Mode) */}
                {formData.calculationMode === 'forward' && (
                    <div className="p-3 border rounded-md bg-gray-50">
                         <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Cost ({formData.currency})</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="bottleCost" className="block text-xs font-medium text-gray-500">Bottle Cost</label>
                                <input type="number" id="bottleCost" name="bottleCost" value={formData.bottleCost} onChange={handleInputChange} placeholder="e.g., 5.00" min="0" step="0.01" className={`mt-1 block w-full px-3 py-2 border ${errors.bottleCost || errors.costInput ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}/>
                            </div>
                            <div>
                                 <label htmlFor="casePrice" className="block text-xs font-medium text-gray-500">Case Price</label>
                                <input type="number" id="casePrice" name="casePrice" value={formData.casePrice} onChange={handleInputChange} placeholder="e.g., 60.00" min="0" step="0.01" className={`mt-1 block w-full px-3 py-2 border ${errors.casePrice || errors.costInput ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}/>
                            </div>
                        </div>
                         {errors.costInput && <p className="mt-1 text-xs text-red-600">{errors.costInput}</p>}
                         {!errors.costInput && <p className="mt-1 text-xs text-gray-500">Enter either bottle or case cost ({formData.currency}).</p>}
                    </div>
                )}
                {/* Target SRP Input (Reverse Mode) */}
                {formData.calculationMode === 'reverse' && (
                     <div className="p-3 border rounded-md bg-gray-50">
                       <label htmlFor="targetSrp" className="block text-sm font-medium text-gray-700">Target SRP (USD)</label>
                       <input type="number" id="targetSrp" name="targetSrp" value={formData.targetSrp} onChange={handleInputChange} placeholder="e.g., 19.99" min="0" step="0.01" className={`mt-1 block w-full px-3 py-2 border ${errors.targetSrp ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}/>
                       {errors.targetSrp && <p className="mt-1 text-xs text-red-600">{errors.targetSrp}</p>}
                       
                       {/* --- NEW: Reverse Target Model Selector --- */}
                       <div className="mt-2">
                         <label htmlFor="reverseTargetModel" className="block text-sm font-medium text-gray-700">Target SRP Applies To:</label>
                         <select
                           id="reverseTargetModel"
                           name="reverseTargetModel"
                           value={reverseTargetModel}
                           onChange={handleReverseTargetChange}
                           className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                         >
                           <option value="SS">Stateside Inventory (SS)</option>
                           <option value="DI">Direct Import (DI)</option>
                         </select>
                         <p className="mt-1 text-xs text-gray-500">Select which pricing model your target SRP is based on.</p>
                       </div>
                       {/* --- End NEW Selector --- */}
                     </div>
                )}
               {/* Currency Selection */}
                <div>
                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Supplier Cost Currency</label>
                    <select
                        id="currency"
                        name="currency"
                        value={formData.currency}
                        onChange={handleCurrencyChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                    >
                        {CURRENCIES.map((currencyCode) => (
                          <option key={currencyCode} value={currencyCode}>
                            {currencyCode}
                          </option>
                        ))}
                    </select>
                </div>
                {/* Case Pack & Bottle Size */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="casePackSize" className="block text-sm font-medium text-gray-700">Case Pack</label>
                        <select id="casePackSize" name="casePackSize" value={formData.casePackSize} onChange={handleSelectChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white">
                            {CASE_PACK_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="bottleSize" className="block text-sm font-medium text-gray-700">Bottle Size</label>
                        <select id="bottleSize" name="bottleSize" value={formData.bottleSize} onChange={handleSelectChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white">
                            {BOTTLE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </div>
                </div>
                {/* Exchange Rate Section */}
                {formData.currency === 'EUR' && (
                  <div className="p-3 border rounded-md bg-gray-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">Exchange Rate (EUR to USD)</label>
                      {!formData.useCustomExchangeRate && (
                        <button className="p-1 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleRefreshRate} title="Force refresh exchange rate (Uses API Credit)" disabled={isExchangeRateLoading} type="button" aria-label="Refresh Base Exchange Rate">
                          {isExchangeRateLoading ? <div className="w-3 h-3 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div> : <RefreshCw className="w-3 h-3"/>}
                        </button>
                      )}
                    </div>
                    {exchangeRateError && <p className="text-xs text-yellow-700 bg-yellow-100 p-1 rounded border border-yellow-200 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{exchangeRateError}</p>}
                    <div className="flex items-center space-x-2 pt-1">
                      <input id="useCustomExchangeRate" name="useCustomExchangeRate" type="checkbox" checked={formData.useCustomExchangeRate} onChange={handleCustomRateToggle} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"/>
                      <label htmlFor="useCustomExchangeRate" className="text-sm text-gray-600">Use Manual Rate</label>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <label htmlFor="exchangeRateInput" className="text-sm text-gray-500 w-24 whitespace-nowrap">
                        {formData.useCustomExchangeRate ? "Manual Rate:" : "Fetched Rate:"}
                      </label>
                      <input
                        type="number" id="exchangeRateInput"
                        name={formData.useCustomExchangeRate ? "customExchangeRate" : "exchangeRate"}
                        value={formData.useCustomExchangeRate ? formData.customExchangeRate : formData.exchangeRate} // Show correct value based on toggle
                        onChange={handleInputChange} min="0" step="0.0001"
                        className={`block w-28 px-2 py-1 border ${errors.exchangeRate || errors.customExchangeRate ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed`}
                        placeholder="e.g., 1.0750"
                        disabled={!formData.useCustomExchangeRate} // Enable only if custom is checked
                        aria-label={formData.useCustomExchangeRate ? "Custom Exchange Rate" : "Fetched Exchange Rate"}
                      />
                       {errors.exchangeRate && !formData.useCustomExchangeRate && <p className="mt-1 text-xs text-red-600">{errors.exchangeRate}</p>}
                       {errors.customExchangeRate && formData.useCustomExchangeRate && <p className="mt-1 text-xs text-red-600">{errors.customExchangeRate}</p>}
                    </div>
                    {/* Buffer Input */}
                    <div className="flex items-center space-x-2 mt-1">
                      <label htmlFor="exchangeBuffer" className="text-sm text-gray-500 w-24 whitespace-nowrap">Rate Buffer (%):</label>
                      <input type="number" id="exchangeBuffer" name="exchangeBuffer" value={formData.exchangeBuffer} onChange={handleInputChange} min="0" max="100" step="0.1" className={`block w-20 px-2 py-1 border ${errors.exchangeBuffer ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} placeholder="e.g., 5" aria-label="Exchange Rate Buffer"/>
                       {errors.exchangeBuffer && <p className="mt-1 text-xs text-red-600">{errors.exchangeBuffer}</p>}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        Effective Rate: {getEffectiveRate()} ( {formData.useCustomExchangeRate ? 'Manual' : `Workspaceed ${formData.exchangeRate} + ${formData.exchangeBuffer || 0}% buffer`})
                    </div>
                  </div>
                )}
                {/* Advanced Options Toggle */}
                 <div className="mt-4">
                     <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center text-sm text-blue-600 hover:text-blue-800 focus:outline-none">
                         {showAdvanced ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />} {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
                     </button>
                 </div>
                {/* Advanced Options Inputs */}
                {showAdvanced && (
                    <div className="p-3 border rounded-md bg-gray-50 space-y-3 mt-2">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Costs & Margins</h4>
                        <div>
                            <label htmlFor="diLogistics" className="block text-xs font-medium text-gray-500">DI Logistics (USD/Case)</label>
                            <input type="number" id="diLogistics" name="diLogistics" value={formData.diLogistics} onChange={handleInputChange} min="0" step="0.01" placeholder="e.g., 13" className={`mt-1 block w-full px-3 py-2 border ${errors.diLogistics ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} /> {errors.diLogistics && <p className="mt-1 text-xs text-red-600">{errors.diLogistics}</p>}
                        </div>
                        <div>
                            <label htmlFor="tariff" className="block text-xs font-medium text-gray-500">Tariff (%)</label>
                            <input type="number" id="tariff" name="tariff" value={formData.tariff} onChange={handleInputChange} min="0" max="200" step="0.1" placeholder="e.g., 0" className={`mt-1 block w-full px-3 py-2 border ${errors.tariff ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} /> {errors.tariff && <p className="mt-1 text-xs text-red-600">{errors.tariff}</p>}
                        </div>
                        <div>
                            <label htmlFor="statesideLogistics" className="block text-xs font-medium text-gray-500">Stateside Logistics (USD/Case)</label>
                            <input type="number" id="statesideLogistics" name="statesideLogistics" value={formData.statesideLogistics} onChange={handleInputChange} min="0" step="0.01" placeholder="e.g., 10" className={`mt-1 block w-full px-3 py-2 border ${errors.statesideLogistics ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} /> {errors.statesideLogistics && <p className="mt-1 text-xs text-red-600">{errors.statesideLogistics}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="supplierMargin" className="block text-xs font-medium text-gray-500">Supplier Margin (%)</label>
                                <input type="number" id="supplierMargin" name="supplierMargin" value={formData.supplierMargin} onChange={handleInputChange} min="0" max="100" step="0.1" placeholder="e.g., 30" className={`mt-1 block w-full px-3 py-2 border ${errors.supplierMargin ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} /> {errors.supplierMargin && <p className="mt-1 text-xs text-red-600">{errors.supplierMargin}</p>}
                            </div>
                            <div>
                                <label htmlFor="distributorMargin" className="block text-xs font-medium text-gray-500">Distributor Margin (%)</label>
                                <input type="number" id="distributorMargin" name="distributorMargin" value={formData.distributorMargin} onChange={handleInputChange} min="0" max="100" step="0.1" placeholder="e.g., 30" className={`mt-1 block w-full px-3 py-2 border ${errors.distributorMargin ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} /> {errors.distributorMargin && <p className="mt-1 text-xs text-red-600">{errors.distributorMargin}</p>}
                            </div>
                            <div>
                                <label htmlFor="distributorBtgMargin" className="block text-xs font-medium text-gray-500">Dist. BTG Margin (%)</label>
                                <input type="number" id="distributorBtgMargin" name="distributorBtgMargin" value={formData.distributorBtgMargin} onChange={handleInputChange} min="0" max="100" step="0.1" placeholder="e.g., 27" className={`mt-1 block w-full px-3 py-2 border ${errors.distributorBtgMargin ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} /> {errors.distributorBtgMargin && <p className="mt-1 text-xs text-red-600">{errors.distributorBtgMargin}</p>}
                            </div>
                            <div>
                                <label htmlFor="retailerMargin" className="block text-xs font-medium text-gray-500">Retailer Margin (%)</label>
                                <input type="number" id="retailerMargin" name="retailerMargin" value={formData.retailerMargin} onChange={handleInputChange} min="0" max="100" step="0.1" placeholder="e.g., 33" className={`mt-1 block w-full px-3 py-2 border ${errors.retailerMargin ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} /> {errors.retailerMargin && <p className="mt-1 text-xs text-red-600">{errors.retailerMargin}</p>}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input id="roundSrp" name="roundSrp" type="checkbox" checked={formData.roundSrp} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"/>
                            <label htmlFor="roundSrp" className="text-sm text-gray-600">Round SRP to nearest .99?</label>
                        </div>
                        <div>
                            <label htmlFor="casesSold" className="block text-xs font-medium text-gray-500">Cases Sold (for GP Calc)</label>
                            <input type="number" id="casesSold" name="casesSold" value={formData.casesSold} onChange={handleInputChange} min="0" step="1" placeholder="e.g., 100" className={`mt-1 block w-full px-3 py-2 border ${errors.casesSold ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} /> {errors.casesSold && <p className="mt-1 text-xs text-red-600">{errors.casesSold}</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- Main Calculator Component ---
const WinePricingCalculator = () => {
  // --- Helper Function for Initial Form Data ---
  // Calculates the initial state for the form, checking local storage for cached rates.
  const getInitialFormData = () => {
    const cachedRate = localStorage.getItem(CACHE_KEY_OER);
    const rate = cachedRate ? parseFloat(cachedRate).toFixed(5) : DEFAULT_EXCHANGE_RATE;
    console.log("getInitialFormData: Initial rate determined - ", rate, cachedRate ? "(from cache)" : "(default)");
    return {
        ...DEFAULT_FORM_DATA,
        exchangeRate: rate, // Overwrites default with cached/default
        customExchangeRate: rate, // Also set custom rate field initially
    };
  };
  // --- End Helper Function ---

  // State Initialization
  const [formData, setFormData] = useState(getInitialFormData);
  const [calculations, setCalculations] = useState({});
  const [errors, setErrors] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [isExchangeRateLoading, setIsExchangeRateLoading] = useState(false);
  const [exchangeRateError, setExchangeRateError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showGrossProfit, setShowGrossProfit] = useState(false);
  
  // --- NEW: Reverse Target Model State ---
  const [reverseTargetModel, setReverseTargetModel] = useState('SS'); // Default to 'SS'

  // --- API Key (Using OpenExchangeRates App ID) ---
  const oerAppId = process.env.REACT_APP_OER_APP_ID || 'YOUR_OER_APP_ID'; // Fallback for local dev if .env is not set

  // --- Fetching Logic (Open Exchange Rates - Adapted for Free Plan / USD Base) ---
  const fetchRateFromOER = useCallback(async (forceRefresh = false) => {
    console.log(`>>> fetchRateFromOER called. Force: ${forceRefresh}, Currency: ${formData.currency}, Custom: ${formData.useCustomExchangeRate}`);

    // Skip conditions remain the same
    if (formData.currency !== 'EUR' || (formData.useCustomExchangeRate && !forceRefresh)) {
      console.log(">>> SKIPPING OER fetch: Conditions not met.");
      setExchangeRateError(null);
      return;
    }

    const now = Date.now();
    const lastFetchTimeString = localStorage.getItem(CACHE_TIMESTAMP_KEY_OER);
    const lastFetchTime = lastFetchTimeString ? parseInt(lastFetchTimeString, 10) : 0;
    const cachedRateString = localStorage.getItem(CACHE_KEY_OER);

    // Cache check remains the same
    if (!forceRefresh && cachedRateString && now - lastFetchTime < CACHE_DURATION_MS) {
      const cachedRate = parseFloat(cachedRateString);
      if (!isNaN(cachedRate) && cachedRate > 0) {
        console.log(">>> Using cached OER rate:", cachedRate);
        setFormData(prev => ({ ...prev, exchangeRate: cachedRateString }));
        setExchangeRateError(null);
        return;
      }
    }

    console.log(">>> PROCEEDING TO FETCH from OpenExchangeRates (USD Base)...");
    setIsExchangeRateLoading(true);
    setExchangeRateError(null);

    if (!oerAppId || oerAppId === 'YOUR_OER_APP_ID') {
      console.error("OpenExchangeRates App ID is missing or using placeholder.");
      setExchangeRateError("Config Error: App ID missing.");
      setIsExchangeRateLoading(false);
      const fallbackRate = cachedRateString ? parseFloat(cachedRateString).toFixed(5) : DEFAULT_EXCHANGE_RATE;
      setFormData(prev => ({ ...prev, exchangeRate: fallbackRate }));
      return;
    }

    try {
      // --- FIX: Fetch latest rates (base USD is default) asking ONLY for EUR ---
      const apiUrl = `https://openexchangerates.org/api/latest.json?app_id=${oerAppId}&symbols=EUR`;
      console.log(">>> Fetching URL:", apiUrl);

      const response = await fetch(apiUrl);
      const data = await response.json();
      console.log(">>> RAW OER RESPONSE (USD Base):", JSON.stringify(data, null, 2));

      if (!response.ok || data.error) {
         const errorDescription = data?.description || `HTTP error! status: ${response.status}`;
         throw new Error(errorDescription);
      }

      // --- FIX: Parse USD->EUR rate and calculate EUR->USD rate ---
      // Ensure base is USD and EUR rate exists
      if (data.base !== 'USD' || !data.rates || typeof data.rates.EUR !== 'number') {
         throw new Error("Could not parse valid USD->EUR rate from OER API. Unexpected response format.");
      }

      const rateUSDtoEUR = data.rates.EUR;
      if (rateUSDtoEUR <= 0) {
        throw new Error("Received invalid rate (<= 0) from OER API.");
      }

      // Calculate the needed EUR -> USD rate
      const rateEURUSD = 1 / rateUSDtoEUR;
      const formattedRate = rateEURUSD.toFixed(5); // Store with sufficient precision
      // --- End Rate Calculation Fix ---

      console.log(`>>> Fetched OER Rate: USD->EUR=${rateUSDtoEUR}, Calculated EUR->USD=${formattedRate}`);

      // Update state and cache
      setFormData(prev => ({
        ...prev,
        exchangeRate: formattedRate, // Store the calculated EUR->USD rate
        customExchangeRate: prev.useCustomExchangeRate ? prev.customExchangeRate : formattedRate
      }));
      localStorage.setItem(CACHE_KEY_OER, formattedRate);
      localStorage.setItem(CACHE_TIMESTAMP_KEY_OER, now.toString());
      setExchangeRateError(null); // Clear errors on success

    } catch (error) {
      console.error("Error fetching/processing OER rate:", error);
      setExchangeRateError(`Could not fetch rate: ${error.message}. Using previous/default.`);
      // Fallback logic remains the same
      const fallbackRate = cachedRateString ? parseFloat(cachedRateString).toFixed(5) : DEFAULT_EXCHANGE_RATE;
      setFormData(prev => ({ ...prev, exchangeRate: fallbackRate }));
    } finally {
      setIsExchangeRateLoading(false);
    }
  }, [oerAppId, formData.currency, formData.useCustomExchangeRate]);

  // --- Calculation Logic ---
  const calculatePricing = useCallback(() => {
    console.log("Calculating pricing with formData:", formData);
    console.log("Using reverseTargetModel:", reverseTargetModel); // Log the reverse target model
    
    setIsCalculating(true);
    setErrors(prev => ({ // Clear only calculation-related errors
        calculation: null,
        costInput: prev.calculationMode === 'forward' && (!parseFloat(prev.bottleCost) && !parseFloat(prev.casePrice)) ? prev.costInput : null,
        targetSrp: prev.calculationMode === 'reverse' && !parseFloat(prev.targetSrp) ? prev.targetSrp : null,
        exchangeRate: prev.currency === 'EUR' && !prev.useCustomExchangeRate && (isNaN(parseFloat(prev.exchangeRate)) || parseFloat(prev.exchangeRate) <= 0) ? prev.exchangeRate : null,
        customExchangeRate: prev.currency === 'EUR' && prev.useCustomExchangeRate && (isNaN(parseFloat(prev.customExchangeRate)) || parseFloat(prev.customExchangeRate) <= 0) ? prev.customExchangeRate : null,
    }));

    // --- Input Parsing and Validation ---
    const bottleCost = parseFloat(formData.bottleCost) || 0;
    const casePrice = parseFloat(formData.casePrice) || 0;
    const casePack = parseInt(formData.casePackSize, 10) || 12;
    const exchangeBuffer = parseFloat(formData.exchangeBuffer) || 0; // Used only if not custom rate
    const diLogistics = parseFloat(formData.diLogistics) || 0;
    const tariffPercent = parseFloat(formData.tariff) || 0;
    const statesideLogistics = parseFloat(formData.statesideLogistics) || 0;
    const supplierMarginPercent = parseFloat(formData.supplierMargin) || 0;
    const distributorMarginPercent = parseFloat(formData.distributorMargin) || 0;
    const distBtgMarginPercent = parseFloat(formData.distributorBtgMargin) || 0; // BTG Margin %
    const retailerMarginPercent = parseFloat(formData.retailerMargin) || 0;
    const casesSold = parseInt(formData.casesSold, 10) || 0;
    const targetSrp = parseFloat(formData.targetSrp) || 0;
    const customRate = parseFloat(formData.customExchangeRate);
    const fetchedRate = parseFloat(formData.exchangeRate); // Holds the latest fetched rate

    let effectiveExchangeRate;
    if (formData.currency === 'USD') {
      effectiveExchangeRate = 1; // 1:1 conversion
    } else if (formData.useCustomExchangeRate) {
        if (!isNaN(customRate) && customRate > 0) {
            effectiveExchangeRate = customRate; // Use custom rate value directly
        } else {
             setErrors(prev => ({ ...prev, customExchangeRate: "Invalid Manual Rate" }));
             effectiveExchangeRate = parseFloat(DEFAULT_EXCHANGE_RATE); // Fallback
        }
    } else { // Using fetched rate
        if (!isNaN(fetchedRate) && fetchedRate > 0) {
            // Apply buffer ONLY if NOT using custom rate
            effectiveExchangeRate = fetchedRate * (1 + exchangeBuffer / 100);
        } else {
            setErrors(prev => ({ ...prev, exchangeRate: "Invalid Fetched Rate" }));
            // Fallback if fetched rate is somehow invalid
            effectiveExchangeRate = parseFloat(DEFAULT_EXCHANGE_RATE) * (1 + (formData.exchangeBuffer || 0) / 100);
        }
    }

     // Final check on effective rate before proceeding
     if (isNaN(effectiveExchangeRate) || effectiveExchangeRate <= 0) {
         setErrors(prev => ({ ...prev, calculation: "Invalid effective exchange rate for calculation." }));
         setIsCalculating(false);
         setCalculations({});
         return;
     }

    let baseBottleCostOriginal = null; // Supplier cost in original currency (for reverse calc)
    let baseCasePriceOriginal = null; // Supplier cost in original currency (for reverse calc)
    let caseCostUSD = 0; // This will be our starting point in USD

    // --- Determine Base Cost in USD ---
    try { // Wrap core calculation in try-catch
      if (formData.calculationMode === 'forward') {
        let baseCostOriginal = 0;
        if (bottleCost > 0) {
          baseCostOriginal = bottleCost * casePack;
        } else if (casePrice > 0) {
          baseCostOriginal = casePrice;
        } else {
          if (formData.bottleCost !== '' || formData.casePrice !== '') { // Only error if user tried to input something non-zero
               setErrors(prev => ({ ...prev, costInput: `Enter valid ${formData.currency} Bottle Cost or Case Price.` }));
           }
           // Stop calculation if no valid cost input
           setIsCalculating(false);
           setCalculations({});
           return;
        }
        // Ensure cost is positive before conversion
        if(baseCostOriginal <= 0) throw new Error(`Invalid non-positive ${formData.currency} cost input.`);

        caseCostUSD = baseCostOriginal * effectiveExchangeRate; // Convert to USD
        baseCasePriceOriginal = baseCostOriginal;
        baseBottleCostOriginal = baseCostOriginal / casePack;

      } else { // Reverse Mode
        if (targetSrp <= 0) {
           if (formData.targetSrp !== '') { setErrors(prev => ({ ...prev, targetSrp: "Enter valid Target SRP (USD > 0)." })); }
           setIsCalculating(false); setCalculations({}); return;
        }

        // Check Margins Immediately
        const marginCheck = (margin, name) => {
             if (isNaN(margin) || margin < 0 || margin >= 100) throw new Error(`Invalid ${name} (${margin}%). Must be 0-99.99.`);
             return margin / 100;
        };
        const retailerMarginFrac = marginCheck(retailerMarginPercent, "Retailer Margin");
        const distributorMarginFrac = marginCheck(distributorMarginPercent, "Distributor Margin");
        const supplierMarginFrac = marginCheck(supplierMarginPercent, "Supplier Margin");
        // NOTE: BTG Margin is not used in the reverse SRP -> Cost calculation path
        const tariffFrac = tariffPercent / 100;
        if (isNaN(tariffFrac) || tariffFrac < 0) throw new Error("Invalid Tariff percentage.");

        // --- Modified Reverse Calculation Branching Logic ---
        const effectiveSrp = formData.roundSrp ? roundToNearest99(targetSrp) : targetSrp;
        let distWholesaleBottle_USD = effectiveSrp * (1 - retailerMarginFrac);
        if (isNaN(distWholesaleBottle_USD) || distWholesaleBottle_USD <= 0) 
            throw new Error("Retailer margin yields non-positive wholesale cost.");

        const distCaseWholesale_USD = distWholesaleBottle_USD * casePack;
        const distLaidInCostPreSSLogistics_USD = distCaseWholesale_USD * (1 - distributorMarginFrac); // Cost before potential SS logistics
        if (isNaN(distLaidInCostPreSSLogistics_USD) || distLaidInCostPreSSLogistics_USD <= 0) 
            throw new Error("Distributor margin yields non-positive laid-in cost.");

        let supplierLaidInCost_Base; // This will hold the laid-in cost before DI logistics/tariff

        if (reverseTargetModel === 'SS') {
            // SS Path: Subtract SS Logistics before going back further
            console.log('Calculating reverse based on SS Target');
            const supplierFobSS_USD = distLaidInCostPreSSLogistics_USD - statesideLogistics;
            if (isNaN(supplierFobSS_USD) || supplierFobSS_USD <= 0)
                throw new Error('Stateside logistics cost exceeds distributor laid-in cost.');
                
            // Using your established multiplication logic for reverse supplier margin:
            supplierLaidInCost_Base = supplierFobSS_USD * (1 - supplierMarginFrac);
            if (isNaN(supplierLaidInCost_Base) || supplierLaidInCost_Base <= 0)
                throw new Error('Supplier margin yields non-positive SS laid-in cost.');
        } else {
            // 'DI' Path
            // DI Path: Use the pre-SS-logistics cost as FOB DI, then go back
            console.log('Calculating reverse based on DI Target');
            const supplierFobDI_USD = distLaidInCostPreSSLogistics_USD;
            // Using your established multiplication logic for reverse supplier margin:
            supplierLaidInCost_Base = supplierFobDI_USD * (1 - supplierMarginFrac);
            if (isNaN(supplierLaidInCost_Base) || supplierLaidInCost_Base <= 0)
                throw new Error('Supplier margin yields non-positive DI laid-in cost.');
        }

        // Now calculate base USD cost using the derived supplierLaidInCost_Base
        const tariffFactor = 1 + tariffFrac;
        if (tariffFactor <= 0) throw new Error('Tariff cannot be -100% or less.');
        
        caseCostUSD = (supplierLaidInCost_Base - diLogistics) / tariffFactor; // Subtract DI logistics and divide by tariff factor
        if (isNaN(caseCostUSD) || caseCostUSD <= 0)
            throw new Error('Logistics/Tariff/Margins yield non-positive base USD cost.');

        // Convert derived caseCostUSD back to original currency
        if (effectiveExchangeRate <= 0) throw new Error('Cannot convert back: Invalid effective exchange rate (<=0).');
        
        baseCasePriceOriginal = caseCostUSD / effectiveExchangeRate;
        baseBottleCostOriginal = baseCasePriceOriginal / casePack;
        // --- End Modified Reverse Calculation Branching Logic ---

        // Update non-editable cost fields in UI state for reverse mode display
         setFormData(prev => ({
             ...prev,
              bottleCost: baseBottleCostOriginal.toFixed(4), // Display calculated original cost
              casePrice: baseCasePriceOriginal.toFixed(2)
         }));
      }

       // --- Common Calculations (Forward & Post-Reverse) ---
       if (isNaN(caseCostUSD) || caseCostUSD <= 0) throw new Error("Base USD cost is invalid or non-positive.");

        const marginCheck = (margin, name) => {
             if (isNaN(margin) || margin >= 100 || margin < 0) throw new Error(`Invalid ${name} (${margin}%). Must be 0-99.99.`);
             return margin / 100;
         };

       // Re-validate margins here as they might be changed between mode switches
       const supplierMargin = marginCheck(supplierMarginPercent, "Supplier Margin");
       const distributorMargin = marginCheck(distributorMarginPercent, "Distributor Margin");
       const distBtgMargin = marginCheck(distBtgMarginPercent, "Distributor BTG Margin"); // Get BTG margin fraction
       const retailerMargin = marginCheck(retailerMarginPercent, "Retailer Margin");
       const tariffFrac = tariffPercent / 100;
       if (isNaN(tariffFrac) || tariffFrac < 0) throw new Error("Invalid Tariff percentage.");


       // --- DI Calculations ---
       const tariffAmountUSD = caseCostUSD * tariffFrac;
       const supplierLaidInCostDI_USD = caseCostUSD + tariffAmountUSD + diLogistics;
        if(supplierLaidInCostDI_USD <= 0) throw new Error("Supplier DI Laid-In Cost is non-positive.");

       const supplierFobDI_USD = supplierLaidInCostDI_USD / (1 - supplierMargin);
       const distributorLaidInCostDI_USD = supplierFobDI_USD; // Dist cost starts where Supp FOB ends

       // Regular Wholesale DI
       const distCaseWholesaleDI_USD = distributorLaidInCostDI_USD / (1 - distributorMargin);
       const distBottleWholesaleDI_USD = distCaseWholesaleDI_USD / casePack;

       // *** BTG Calculation FIX (DI) ***
       // Base BTG price on Distributor Laid-In Cost per bottle
       const distLaidInCostDI_Bottle_USD = distributorLaidInCostDI_USD / casePack;
       if (isNaN(distLaidInCostDI_Bottle_USD) || distLaidInCostDI_Bottle_USD < 0) throw new Error("Invalid DI Laid-In Cost per bottle.");
       const distBtgPriceDI_USD = distLaidInCostDI_Bottle_USD / (1 - distBtgMargin); // Apply BTG margin to bottle laid-in cost


       // --- SS Calculations ---
       const supplierLaidInCostSS_USD = supplierLaidInCostDI_USD; // Base cost before SS logistics is the same
       const supplierFobSS_USD = supplierLaidInCostSS_USD / (1 - supplierMargin); // Apply same margin
       const distributorLaidInCostSS_USD = supplierFobSS_USD + statesideLogistics; // Add SS logistics
        if(distributorLaidInCostSS_USD <= 0) throw new Error("Distributor SS Laid-In Cost is non-positive.");

       // Regular Wholesale SS
       const distCaseWholesaleSS_USD = distributorLaidInCostSS_USD / (1 - distributorMargin);
       const distBottleWholesaleSS_USD = distCaseWholesaleSS_USD / casePack;

       // *** BTG Calculation FIX (SS) ***
       // Base BTG price on Distributor Laid-In Cost per bottle (Stateside)
       const distLaidInCostSS_Bottle_USD = distributorLaidInCostSS_USD / casePack;
       if (isNaN(distLaidInCostSS_Bottle_USD) || distLaidInCostSS_Bottle_USD < 0) throw new Error("Invalid SS Laid-In Cost per bottle.");
       const distBtgPriceSS_USD = distLaidInCostSS_Bottle_USD / (1 - distBtgMargin); // Apply BTG margin to bottle laid-in cost


       // Check for division-by-zero in intermediate calculations (margins = 100%)
        if (![supplierFobDI_USD, supplierFobSS_USD, distCaseWholesaleDI_USD, distCaseWholesaleSS_USD, distBtgPriceDI_USD, distBtgPriceSS_USD].every(val => isFinite(val) && val >= 0)) {
             throw new Error("Calculation resulted in non-finite or negative intermediate price due to margin(s).");
        }

       // SRP Calculation
       let srpDi_USD = distBottleWholesaleDI_USD / (1 - retailerMargin);
       let srpSs_USD = distBottleWholesaleSS_USD / (1 - retailerMargin);

       // Store values before potential adjustment by rounding
       let adjustedCaseWholesaleDI_USD = distCaseWholesaleDI_USD;
       let adjustedBottleWholesaleDI_USD = distBottleWholesaleDI_USD;
       let adjustedCaseWholesaleSS_USD = distCaseWholesaleSS_USD;
       let adjustedBottleWholesaleSS_USD = distBottleWholesaleSS_USD;
       // BTG Prices are NOT adjusted by SRP rounding
       let adjustedDistBtgPriceDI_USD = distBtgPriceDI_USD;
       let adjustedDistBtgPriceSS_USD = distBtgPriceSS_USD;
       let originalSrpDi_USD = srpDi_USD, originalSrpSs_USD = srpSs_USD; // Store pre-rounding SRP

       if (formData.roundSrp && formData.calculationMode === 'forward') { // Only apply rounding effect forward
           srpDi_USD = roundToNearest99(srpDi_USD);
           srpSs_USD = roundToNearest99(srpSs_USD);

           // Recalculate *upstream regular wholesale* prices based on the rounded SRP
           adjustedBottleWholesaleDI_USD = srpDi_USD * (1 - retailerMargin);
           adjustedCaseWholesaleDI_USD = adjustedBottleWholesaleDI_USD * casePack;
           // *** BTG FIX: Do NOT recalculate BTG based on adjusted bottle wholesale ***
           // adjustedDistBtgPriceDI_USD = adjustedBottleWholesaleDI_USD / (1 - distBtgMargin); // REMOVED

           adjustedBottleWholesaleSS_USD = srpSs_USD * (1 - retailerMargin);
           adjustedCaseWholesaleSS_USD = adjustedBottleWholesaleSS_USD * casePack;
           // *** BTG FIX: Do NOT recalculate BTG based on adjusted bottle wholesale ***
           // adjustedDistBtgPriceSS_USD = adjustedBottleWholesaleSS_USD / (1 - distBtgMargin); // REMOVED
       } else if (formData.calculationMode === 'reverse') {
           // In reverse mode, the target SRP was the starting point.
           // We display the user's target SRP (or its rounded version if rounding enabled) as the result.
           srpDi_USD = formData.roundSrp ? roundToNearest99(targetSrp) : targetSrp; // Use targetSrp, potentially rounded
           srpSs_USD = formData.roundSrp ? roundToNearest99(targetSrp) : targetSrp; // Use targetSrp, potentially rounded
           // Note: The reverse calculation already factored in rounding if enabled.
           // We simply display the effective target SRP back.
           // The `adjustedWholesale` prices calculated *before* this block (based on the reverse calc flow) are correct.
       }

       // Gross Profit
       let supplierGrossProfitDI = null, distributorGrossProfitDI = null;
       let supplierGrossProfitSS = null, distributorGrossProfitSS = null;
       if (casesSold > 0) {
            supplierGrossProfitDI = (supplierFobDI_USD - supplierLaidInCostDI_USD) * casesSold;
            distributorGrossProfitDI = (adjustedCaseWholesaleDI_USD - distributorLaidInCostDI_USD) * casesSold; // Use adjusted wholesale for GP
            supplierGrossProfitSS = (supplierFobSS_USD - supplierLaidInCostSS_USD) * casesSold;
            distributorGrossProfitSS = (adjustedCaseWholesaleSS_USD - distributorLaidInCostSS_USD) * casesSold; // Use adjusted wholesale for GP
       }

       setCalculations({
           effectiveExchangeRate, caseCostUSD, tariffAmountUSD,
           supplierLaidInCostDI_USD, supplierFobDI_USD, distributorLaidInCostDI_USD,
           distCaseWholesaleDI_USD: adjustedCaseWholesaleDI_USD, distBottleWholesaleDI_USD: adjustedBottleWholesaleDI_USD,
           distBtgPriceDI_USD: adjustedDistBtgPriceDI_USD, srpDi_USD, originalSrpDi_USD,
           supplierLaidInCostSS_USD, supplierFobSS_USD, distributorLaidInCostSS_USD,
           distCaseWholesaleSS_USD: adjustedCaseWholesaleSS_USD, distBottleWholesaleSS_USD: adjustedBottleWholesaleSS_USD,
           distBtgPriceSS_USD: adjustedDistBtgPriceSS_USD, srpSs_USD, originalSrpSs_USD,
           supplierGrossProfitDI, distributorGrossProfitDI,
           supplierGrossProfitSS, distributorGrossProfitSS,
           baseBottleCostOriginal, baseCasePriceOriginal, // Include derived costs for reverse mode display
           reverseTargetModelUsed: formData.calculationMode === 'reverse' ? reverseTargetModel : null // Store which model was used
       });
       // Clear specific calculation error on success, keep input validation errors
       setErrors(prev => ({ ...prev, calculation: null }));

    } catch (error) {
       console.error("Calculation Error:", error);
       const errorMessage = (error instanceof Error) ? error.message : "An unexpected error occurred during calculation.";
       // Set calculation error, keep existing input errors
       setErrors(prev => ({ ...prev, calculation: errorMessage }));
       setCalculations({}); // Clear results on error
    } finally {
       setIsCalculating(false);
    }
  }, [formData, reverseTargetModel]); // Added reverseTargetModel to dependencies

  // --- Input Change Handler (Includes counterpart cost calc & basic validation) ---
  const handleInputChange = useCallback((e) => {
      const { name, value, type, checked } = e.target;
      let newValue = type === 'checkbox' ? checked : value;
      let fieldError = ""; // Error specific to this field

      const numericFields = [
          "bottleCost", "casePrice", "targetSrp", "exchangeRate", "customExchangeRate",
          "exchangeBuffer", "diLogistics", "tariff", "statesideLogistics",
          "supplierMargin", "distributorMargin", "distributorBtgMargin", "retailerMargin",
          "casesSold"
      ];

      let updates = { [name]: newValue };
      const currentMode = formData.calculationMode; // Use state from closure
      const casePack = parseInt(formData.casePackSize, 10);

      // Perform validation and counterpart calculation
      if (numericFields.includes(name)) {
          if (newValue === "" || newValue === "-") { // Allow empty or just negative sign temporarily
              fieldError = "";
              if (currentMode === 'forward') {
                   if (name === 'bottleCost') updates.casePrice = "";
                   else if (name === 'casePrice') updates.bottleCost = "";
              }
          } else {
              const num = parseFloat(newValue);
              if (isNaN(num)) {
                  fieldError = "Invalid number";
              } else {
                  // Basic range checks
                  if (["supplierMargin", "distributorMargin", "distributorBtgMargin", "retailerMargin"].includes(name) && (num < 0 || num >= 100)) { fieldError = "Must be 0-99.99"; }
                  else if (["bottleCost", "casePrice", "targetSrp", "diLogistics", "statesideLogistics", "casesSold", "exchangeRate", "customExchangeRate", "exchangeBuffer"].includes(name) && num < 0 && newValue !== "-") { fieldError = "Cannot be negative"; }
                  else if (name === "tariff" && (num < 0 || num > 200)) { fieldError = "Must be 0-200"; }
                  else { fieldError = ""; } // Clear error if it seems valid for now

                  // Counterpart Calculation Logic (only in forward mode, only if casePack is valid)
                  if (currentMode === 'forward' && !isNaN(casePack) && casePack > 0 && !isNaN(num) && num >= 0) {
                      if (name === 'bottleCost') {
                          updates.casePrice = (num * casePack).toFixed(2);
                      } else if (name === 'casePrice') {
                          updates.bottleCost = (num / casePack).toFixed(4);
                      }
                  }
              }
          }
          // Don't overwrite bottle/case cost in reverse mode during input
          if (currentMode === 'reverse' && (name === 'bottleCost' || name === 'casePrice')) {
             delete updates[name]; // Prevent direct user edit in reverse mode
             // Keep previous calculated value, maybe show a subtle indicator? For now, just prevent change.
             // fieldError = "Calculated in Reverse mode"; // Optionally set error/info
          }

      } else if (name === 'calculationMode' && newValue === 'reverse') {
          // When switching to reverse, clear the cost inputs as they will be calculated
          updates.bottleCost = '';
          updates.casePrice = '';
          updates.targetSrp = ''; // Also clear target SRP initially
          fieldError = ""; // No error on mode switch itself
      } else if (name === 'calculationMode' && newValue === 'forward') {
           // When switching to forward, clear target SRP
          updates.targetSrp = '';
          // Optionally clear cost inputs too if desired, or leave them
          // updates.bottleCost = '';
          // updates.casePrice = '';
          fieldError = ""; // No error on mode switch itself
      } else {
         fieldError = ""; // Clear errors for non-numeric fields or valid changes
      }

      setFormData(prev => ({ ...prev, ...updates }));

      // Update errors state: set or clear the error for the specific field
      setErrors(prev => ({
          ...prev,
          [name]: fieldError || null // Use null to clear the error if fieldError is empty
      }));

  }, [formData.calculationMode, formData.casePackSize]); // Dependencies

  // --- NEW: Handler for Reverse Target Model Change ---
  const handleReverseTargetChange = useCallback((e) => {
    console.log('Setting Reverse Target Model to:', e.target.value);
    setReverseTargetModel(e.target.value);
    // Setting the model potentially changes the required cost,
    // so we should clear previous calculation errors/results
    setCalculations({}); 
    setErrors(prev => ({ ...prev, calculation: null }));
  }, []); // No dependencies needed as it only calls setters
  // --- End NEW Handler ---

  // --- Other Handlers (Currency, Select, Custom Rate Toggle, Refresh) ---
  const handleCurrencyChange = useCallback((e) => {
   const newCurrency = e.target.value;
   setFormData(prev => ({ ...prev, currency: newCurrency }));
   // Fetch rate if switching TO EUR and not using custom
   if (newCurrency === 'EUR' && !formData.useCustomExchangeRate) {
      fetchRateFromOER(false); // Pass false, don't force unless refresh button is clicked
   } else {
      setExchangeRateError(null); // Clear API error if switching to USD
   }
   // Clear calculation error when currency changes
    setErrors(prev => ({ ...prev, calculation: null }));
  }, [fetchRateFromOER, formData.useCustomExchangeRate]); // Include fetchRate and custom setting

  const handleSelectChange = useCallback((e) => {
   const { name, value } = e.target;
   let updates = { [name]: value };

   // Recalculate counterpart cost if casePackSize changes in forward mode
   if (name === 'casePackSize' && formData.calculationMode === 'forward') {
       const newCasePack = parseInt(value, 10);
       const bottleCost = parseFloat(formData.bottleCost);
       const casePrice = parseFloat(formData.casePrice);

       if (!isNaN(newCasePack) && newCasePack > 0) {
            if (!isNaN(bottleCost) && bottleCost > 0) {
                 updates.casePrice = (bottleCost * newCasePack).toFixed(2);
            } else if (!isNaN(casePrice) && casePrice > 0) {
                 updates.bottleCost = (casePrice / newCasePack).toFixed(4);
            }
        }
   } else if (name === 'calculationMode') {
        // Clear results and specific inputs when mode changes
        setCalculations({});
        if(value === 'forward') {
            updates.targetSrp = '';
        } else { // value === 'reverse'
            updates.bottleCost = '';
            updates.casePrice = '';
        }
        setErrors({}); // Clear all errors on mode switch
   }

   setFormData(prev => ({ ...prev, ...updates }));
   // Clear calculation error when selects change (handled by mode switch logic too)
    if (name !== 'calculationMode') {
       setErrors(prev => ({ ...prev, calculation: null }));
    }
  }, [formData.calculationMode, formData.bottleCost, formData.casePrice]); // Add dependencies

  const handleCustomRateToggle = useCallback((e) => {
      const useCustom = e.target.checked;
      setFormData(prev => {
          // If switching TO custom, set customRate to current fetched rate initially
          // If switching OFF custom, ensure fetched rate is triggered if needed
          const newCustomRate = useCustom ? prev.exchangeRate : prev.customExchangeRate;
          return { ...prev, useCustomExchangeRate: useCustom, customExchangeRate: newCustomRate };
      });
      // If switching OFF custom and currency is EUR, trigger a fetch (respecting cache)
      if (!useCustom && formData.currency === 'EUR') {
         fetchRateFromOER(false); // Don't force
      } else if (useCustom) {
         setExchangeRateError(null); // Clear API error if switching to custom
      }
       // Clear calculation error when toggling custom rate
       setErrors(prev => ({ ...prev, calculation: null }));
  }, [fetchRateFromOER, formData.currency]); // Add dependencies

  const handleRefreshRate = useCallback(() => {
      console.log(">>> Manual Refresh Clicked");
      if (formData.currency === 'EUR' && !formData.useCustomExchangeRate) {
         fetchRateFromOER(true); // Force refresh = true
      } else {
           console.log(">>> Refresh skipped (Not EUR or using Custom)");
           setExchangeRateError("Refresh only available for EUR currency when not using manual rate.");
           setTimeout(() => setExchangeRateError(null), 4000); // Clear message after a delay
      }
  }, [fetchRateFromOER, formData.currency, formData.useCustomExchangeRate]); // Add dependencies

  // --- Effects ---
  // Initial rate fetch on mount if currency is EUR and not using custom
  useEffect(() => {
   if (formData.currency === 'EUR' && !formData.useCustomExchangeRate) {
      fetchRateFromOER(false); // Initial fetch, don't force
   }
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // Debounced calculation trigger
  const calculationTimeoutRef = useRef(null);
  useEffect(() => {
   clearTimeout(calculationTimeoutRef.current); // Clear previous timeout

   calculationTimeoutRef.current = setTimeout(() => {
       // Check for critical input errors before calculating
       const hasCriticalError = errors.bottleCost || errors.casePrice || errors.costInput || errors.targetSrp || errors.exchangeRate || errors.customExchangeRate || errors.exchangeBuffer || errors.diLogistics || errors.tariff || errors.statesideLogistics || errors.supplierMargin || errors.distributorMargin || errors.distributorBtgMargin || errors.retailerMargin || errors.casesSold;

       if (!hasCriticalError && ( (formData.calculationMode === 'forward' && (formData.bottleCost || formData.casePrice)) || (formData.calculationMode === 'reverse' && formData.targetSrp) ) ) {
           calculatePricing();
       } else {
           console.log("Skipping calculation due to input errors or missing required input:", errors);
           // Optionally clear old calculation results if input is now invalid or incomplete
            setCalculations({});
       }
   }, CALCULATION_TIMEOUT); // Delay calculation

   // Cleanup function to clear timeout if component unmounts or formData changes again
   return () => clearTimeout(calculationTimeoutRef.current);
  }, [formData, errors, calculatePricing, reverseTargetModel]); // Added reverseTargetModel to dependencies

  // --- NEW: Reset Handler ---
  const handleReset = () => {
    // Optional: Confirmation
    // if (!window.confirm("Are you sure you want to reset?")) { return; }
    console.log("Resetting form state...");
    setFormData(getInitialFormData()); // Re-use the helper!
    setCalculations({});              // Clear calculations
    setErrors({});                    // Clear all errors
    setReverseTargetModel('SS');      // Reset reverse target model
    setShowAdvanced(false);           // Reset UI state
    setShowGrossProfit(false);        // Reset UI state
    setExchangeRateError(null);       // Clear any API fetch error message
  };
  // --- End NEW Reset Handler ---

  // --- Action Handlers (Save, Download, Print) ---
  const handleSave = () => { alert('Save functionality not yet implemented.'); };
  const handleDownload = () => {
    if (!calculations.srpDi_USD && !calculations.srpSs_USD) {
       alert("Please perform a calculation first.");
       return;
    }
    // Header Row
    const headers = [
       "Parameter", "Value",
       "DI Parameter", "DI Value (USD)",
       "SS Parameter", "SS Value (USD)"
    ];
    // Input Data
    const inputData = [
       ["Wine Name", formData.wineName],
       ["Calculation Mode", formData.calculationMode],
       ["Supplier Currency", formData.currency],
       [`Bottle Cost (${formData.currency})`, formData.bottleCost], // Shows derived cost in reverse mode
       [`Case Price (${formData.currency})`, formData.casePrice],   // Shows derived cost in reverse mode
       ["Case Pack Size", formData.casePackSize],
       ["Bottle Size", formData.bottleSize],
       ["Exchange Rate Source", formData.useCustomExchangeRate ? "Manual" : "Fetched"],
       ["Base Exchange Rate", formData.useCustomExchangeRate ? "N/A" : formData.exchangeRate],
       ["Manual Exchange Rate", formData.useCustomExchangeRate ? formData.customExchangeRate : "N/A"],
       ["Exchange Buffer (%)", formData.exchangeBuffer],
       ["Effective Rate (EUR->USD)", calculations.effectiveExchangeRate?.toFixed(5) ?? 'N/A'],
       ["DI Logistics ($/Case)", formData.diLogistics],
       ["Tariff (%)", formData.tariff],
       ["Stateside Logistics ($/Case)", formData.statesideLogistics],
       ["Supplier Margin (%)", formData.supplierMargin],
       ["Distributor Margin (%)", formData.distributorMargin],
       ["Distributor BTG Margin (%)", formData.distributorBtgMargin],
       ["Retailer Margin (%)", formData.retailerMargin],
       ["Round SRP?", formData.roundSrp ? 'Yes' : 'No'],
       ["Cases Sold (for GP)", formData.casesSold || "N/A"],
       ["Target SRP (USD)", formData.calculationMode === 'reverse' ? formData.targetSrp : "N/A"],
       // Add reverseTargetModel info
       ["Reverse Target Model", formData.calculationMode === 'reverse' ? reverseTargetModel : "N/A"]
    ];
    // Calculation Data
    const calcDataBase = [
        ["Base Case Cost (USD)", calculations.caseCostUSD],
        ["Tariff Amount (USD)", calculations.tariffAmountUSD],
    ];
    const calcDataDI = [
       ...calcDataBase,
       ["Supplier Laid-In DI (USD)", calculations.supplierLaidInCostDI_USD],
       ["Supplier FOB DI (USD)", calculations.supplierFobDI_USD],
       ["Distributor Laid-In DI (USD)", calculations.distributorLaidInCostDI_USD],
       ["Distributor Whsl Case DI (USD)", calculations.distCaseWholesaleDI_USD],
       ["Distributor Whsl Bottle DI (USD)", calculations.distBottleWholesaleDI_USD],
       ["Distributor BTG Bottle DI (USD)", calculations.distBtgPriceDI_USD], // Updated BTG
       ["SRP DI (USD)", calculations.srpDi_USD],
       ...(calculations.supplierGrossProfitDI != null ? [["Supplier GP DI (USD)", calculations.supplierGrossProfitDI]] : []),
       ...(calculations.distributorGrossProfitDI != null ? [["Distributor GP DI (USD)", calculations.distributorGrossProfitDI]] : []),
    ];
    const calcDataSS = [
       ...calcDataBase, // Repeat base costs for alignment if needed, or handle differently
       ["Supplier Laid-In SS (USD)", calculations.supplierLaidInCostSS_USD], // Same as DI Laid-In
       ["Supplier FOB SS (USD)", calculations.supplierFobSS_USD],
       ["Distributor Laid-In SS (USD)", calculations.distributorLaidInCostSS_USD],
       ["Distributor Whsl Case SS (USD)", calculations.distCaseWholesaleSS_USD],
       ["Distributor Whsl Bottle SS (USD)", calculations.distBottleWholesaleSS_USD],
       ["Distributor BTG Bottle SS (USD)", calculations.distBtgPriceSS_USD], // Updated BTG
       ["SRP SS (USD)", calculations.srpSs_USD],
       ...(calculations.supplierGrossProfitSS != null ? [["Supplier GP SS (USD)", calculations.supplierGrossProfitSS]] : []),
       ...(calculations.distributorGrossProfitSS != null ? [["Distributor GP SS (USD)", calculations.distributorGrossProfitSS]] : []),
    ];
     // Combine rows, ensuring alignment
     const maxInputRows = inputData.length;
     const maxCalcRows = Math.max(calcDataDI.length, calcDataSS.length);
     let combinedRows = [];

     // Add Input Rows first, padded
     for (let i = 0; i < maxInputRows; i++) {
         const inputRow = inputData[i] || ["", ""];
         combinedRows.push([inputRow[0], inputRow[1], "", "", "", ""]);
     }
     // Add a separator row maybe?
     combinedRows.push(["---", "---", "---", "---", "---", "---"]);

     // Add Calculation Rows
     for (let i = 0; i < maxCalcRows; i++) {
         const diRow = calcDataDI[i] || ["", ""];
         const ssRow = calcDataSS[i] || ["", ""];
         // Format numbers as numbers for CSV where appropriate, else use formatted string
         const formatValue = (val) => typeof val === 'number' ? val.toFixed(4) : val;

         combinedRows.push([
             "", "", // No input parameter here
             diRow[0], formatValue(diRow[1]),
             ssRow[0], formatValue(ssRow[1]),
         ]);
     }

     const csvContent = [
         headers.map(escapeCsvCell).join(','),
         ...combinedRows.map(row => row.map(escapeCsvCell).join(','))
     ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const safeWineName = (formData.wineName || 'WinePricing').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('download', `${safeWineName}_pricing_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handlePrint = () => { window.print(); };

  // --- Render Logic ---
  const hasCalculations = calculations && (calculations.srpDi_USD != null || calculations.srpSs_USD != null); // Check if results exist

  return (
   <div className="container mx-auto p-4 max-w-6xl font-sans">
     <div className="flex justify-between items-center mb-4 flex-wrap">
       <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Wine Pricing Calculator</h1>
       <div className="flex space-x-2 mt-2 md:mt-0 print:hidden">
        {/* --- Reset Button --- */}
        <button onClick={handleReset} title="Reset Form" className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded">
            <RotateCcw className="w-5 h-5" />
        </button>
        {/* --- End Reset Button --- */}
         <button onClick={handleSave} title="Save Configuration (Not Implemented)" className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed" disabled><Save className="w-5 h-5" /></button>
         <button onClick={handleDownload} title="Download Results as CSV" className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed" disabled={!hasCalculations}><Download className="w-5 h-5" /></button>
         <button onClick={handlePrint} title="Print Page" className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"><Printer className="w-5 h-5" /></button>
       </div>
     </div>

      {/* Global Calculation Error Display */}
       {errors.calculation && (
         <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-md text-sm flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0"/>
            <span>Calculation Error: {errors.calculation}</span>
         </div>
       )}


     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
       {/* Input Panel */}
       <div className="md:col-span-1">
         <InputPanel
           formData={formData}
           setFormData={setFormData}
           handleInputChange={handleInputChange}
           handleCurrencyChange={handleCurrencyChange}
           handleSelectChange={handleSelectChange}
           handleCustomRateToggle={handleCustomRateToggle}
           handleRefreshRate={handleRefreshRate}
           isExchangeRateLoading={isExchangeRateLoading}
           exchangeRateError={exchangeRateError}
           showAdvanced={showAdvanced}
           setShowAdvanced={setShowAdvanced}
           errors={errors}
           // --- NEW: Props for Reverse Target Model ---
           reverseTargetModel={reverseTargetModel}
           handleReverseTargetChange={handleReverseTargetChange}
         />
       </div>

       {/* Results Panel */}
       <div className="md:col-span-2">
           {isCalculating && !hasCalculations && ( // Show loading only if no results yet and actively calculating
               <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg shadow border border-gray-100">
                   <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
               </div>
           )}

          {/* Initial Prompt / Error Prompt */}
          {!isCalculating && !hasCalculations && (
               <div className="flex flex-col justify-center items-center h-64 bg-gray-50 rounded-lg shadow border border-gray-100 p-4 text-center">
                   {errors.calculation || errors.costInput || errors.targetSrp ? (
                       <p className="text-red-600">Please correct the input errors to see results.</p>
                   ) : (
                       <p className="text-gray-500">Enter cost or target SRP to see calculations.</p>
                   )}
                   {(errors.exchangeRate || errors.customExchangeRate) && formData.currency === 'EUR' && (
                        <p className="text-yellow-700 text-sm mt-2">Note: Using default/previous exchange rate due to input error.</p>
                   )}
               </div>
          )}


         {/* Display Results Area (Show if calculations are done, even if loading indicator is briefly shown during recalc) */}
         {hasCalculations && (
           <div className="bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100">
             <h3 className="text-lg font-semibold mb-4 text-gray-800">Calculation Results {isCalculating ? '(Recalculating...)' : ''}</h3>

             {/* *** ADDED: Derived Cost Box for Reverse Mode *** */}
             {formData.calculationMode === 'reverse' && calculations.baseBottleCostOriginal != null && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
                    <p className="font-semibold mb-1">
                      Derived Supplier Cost ({formData.currency}) - Based on {reverseTargetModel} Target:
                    </p>
                    <p className="flex justify-between">
                        <span>Calculated Bottle Cost:</span>
                        {/* Use original currency and more precision for bottle cost */}
                        <span>{formatCurrency(calculations.baseBottleCostOriginal, formData.currency, 4)}</span>
                    </p>
                    <p className="flex justify-between">
                        <span>Calculated Case Cost:</span>
                        <span>{formatCurrency(calculations.baseCasePriceOriginal, formData.currency, 2)}</span>
                    </p>
                </div>
              )}


             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               {/* DI Pricing Column */}
               <div>
                 <h4 className="text-md font-medium text-gray-700 mb-2 border-b pb-1">
                   Direct Import Pricing
                   {formData.calculationMode === 'reverse' && reverseTargetModel === 'DI' && (
                     <span className="text-xs font-normal text-blue-600 ml-2">(Target Model)</span>
                   )}
                 </h4>
                 <div className="space-y-1 text-sm">
                   {/* --- Style Update: Plain --- */}
                   <p className="flex justify-between"><span>Base Case Cost (USD):</span> <span>{formatCurrency(calculations.caseCostUSD)}</span></p>
                   <p className="flex justify-between"><span>Tariff ({formData.tariff}%):</span> <span>{formatCurrency(calculations.tariffAmountUSD)}</span></p>
                   <p className="flex justify-between"><span>DI Logistics:</span> <span>{formatCurrency(formData.diLogistics)}</span></p>
                   <p className="flex justify-between"><span>Supp. Laid-In DI:</span> <span>{formatCurrency(calculations.supplierLaidInCostDI_USD)}</span></p>
                   {/* --- Style Update: Semi-Bold --- */}
                   <p className="flex justify-between font-semibold"><span>Supp. FOB DI ({formData.supplierMargin}%):</span> <span>{formatCurrency(calculations.supplierFobDI_USD)}</span></p>
                   {/* --- Style Update: Plain --- */}
                   <p className="flex justify-between"><span>Dist. Laid-In DI:</span> <span>{formatCurrency(calculations.distributorLaidInCostDI_USD)}</span></p>
                   {/* --- Style Update: Semi-Bold --- */}
                   <p className="flex justify-between font-semibold"><span>Dist. Whsl Case DI ({formData.distributorMargin}%):</span> <span>{formatCurrency(calculations.distCaseWholesaleDI_USD)}</span></p>
                   <p className="flex justify-between font-semibold"><span>Dist. Whsl Bottle DI:</span> <span>{formatCurrency(calculations.distBottleWholesaleDI_USD)}</span></p>
                   {/* --- Style Update: Plain (BTG calculation fixed, style plain) --- */}
                   <p className="flex justify-between"><span>Dist. BTG Bottle DI ({formData.distributorBtgMargin}%):</span> <span>{formatCurrency(calculations.distBtgPriceDI_USD)}</span></p>
                   {/* --- Style Update: Label Semi-Bold, Value Large/Bold/Blue --- */}
                   <p className="flex justify-between items-baseline mt-2">
                        <span className="font-semibold">SRP (DI, {formData.retailerMargin}%):</span>
                        <span className={`text-2xl font-bold ${formData.calculationMode === 'reverse' && reverseTargetModel === 'DI' ? 'text-blue-700' : 'text-blue-500'}`}>
                          {formatCurrency(calculations.srpDi_USD)}
                        </span>
                    </p>
                    {formData.roundSrp && calculations.originalSrpDi_USD && calculations.srpDi_USD !== calculations.originalSrpDi_USD && (
                         <p className="text-xs text-gray-500 text-right">(Rounded from {formatCurrency(calculations.originalSrpDi_USD)})</p>
                    )}
                 </div>
               </div>

               {/* SS Pricing Column */}
                <div>
                   <h4 className="text-md font-medium text-gray-700 mb-2 border-b pb-1">
                     Stateside Inventory Pricing
                     {formData.calculationMode === 'reverse' && reverseTargetModel === 'SS' && (
                       <span className="text-xs font-normal text-blue-600 ml-2">(Target Model)</span>
                     )}
                   </h4>
                  <div className="space-y-1 text-sm">
                    {/* --- Style Update: Plain --- */}
                    <p className="flex justify-between"><span>Supp. Base Cost SS:</span> <span>{formatCurrency(calculations.supplierLaidInCostSS_USD)}</span></p>
                    {/* --- Style Update: Semi-Bold --- */}
                    <p className="flex justify-between font-semibold"><span>Supp. FOB SS ({formData.supplierMargin}%):</span> <span>{formatCurrency(calculations.supplierFobSS_USD)}</span></p>
                    {/* --- Style Update: Special Note Styling --- */}
                    <p className="flex justify-between">
                        <span>Stateside Logistics:</span>
                        <span className="text-gray-500 italic font-normal">(+{formatCurrency(formData.statesideLogistics)})</span>
                    </p>
                    {/* --- Style Update: Plain --- */}
                    <p className="flex justify-between"><span>Dist. Laid-In SS:</span> <span>{formatCurrency(calculations.distributorLaidInCostSS_USD)}</span></p>
                    {/* --- Style Update: Semi-Bold --- */}
                    <p className="flex justify-between font-semibold"><span>Dist. Whsl Case SS ({formData.distributorMargin}%):</span> <span>{formatCurrency(calculations.distCaseWholesaleSS_USD)}</span></p>
                    <p className="flex justify-between font-semibold"><span>Dist. Whsl Bottle SS:</span> <span>{formatCurrency(calculations.distBottleWholesaleSS_USD)}</span></p>
                    {/* --- Style Update: Plain (BTG calculation fixed, style plain) --- */}
                    <p className="flex justify-between"><span>Dist. BTG Bottle SS ({formData.distributorBtgMargin}%):</span> <span>{formatCurrency(calculations.distBtgPriceSS_USD)}</span></p>
                     {/* --- Style Update: Label Semi-Bold, Value Large/Bold/Blue --- */}
                     <p className="flex justify-between items-baseline mt-2">
                        <span className="font-semibold">SRP (SS, {formData.retailerMargin}%):</span>
                        <span className={`text-2xl font-bold ${formData.calculationMode === 'reverse' && reverseTargetModel === 'SS' ? 'text-blue-700' : 'text-blue-500'}`}>
                          {formatCurrency(calculations.srpSs_USD)}
                        </span>
                    </p>
                     {formData.roundSrp && calculations.originalSrpSs_USD && calculations.srpSs_USD !== calculations.originalSrpSs_USD && (
                          <p className="text-xs text-gray-500 text-right">(Rounded from {formatCurrency(calculations.originalSrpSs_USD)})</p>
                     )}
                  </div>
                </div>
             </div>

             {/* Gross Profit Section (conditionally rendered) */}
             {hasCalculations && formData.casesSold > 0 && (
                  <div className="mt-6 pt-4 border-t">
                       <button type="button" onClick={() => setShowGrossProfit(!showGrossProfit)} className="flex items-center text-sm text-blue-600 hover:text-blue-800 focus:outline-none mb-2">
                          {showGrossProfit ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />} Gross Profit Analysis ({formData.casesSold} Cases)
                       </button>
                       {showGrossProfit && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm bg-gray-50 p-3 rounded border">
                              {/* DI GP */}
                              <div>
                                  <h5 className="font-medium text-gray-600 mb-1">Direct Import GP</h5>
                                  <p className="flex justify-between"><span>Supplier GP DI:</span> <span className="font-semibold">{formatCurrency(calculations.supplierGrossProfitDI)}</span></p>
                                  <p className="flex justify-between"><span>Distributor GP DI:</span> <span className="font-semibold">{formatCurrency(calculations.distributorGrossProfitDI)}</span></p>
                              </div>
                              {/* SS GP */}
                              <div>
                                  <h5 className="font-medium text-gray-600 mb-1">Stateside Inventory GP</h5>
                                  <p className="flex justify-between"><span>Supplier GP SS:</span> <span className="font-semibold">{formatCurrency(calculations.supplierGrossProfitSS)}</span></p>
                                  <p className="flex justify-between"><span>Distributor GP SS:</span> <span className="font-semibold">{formatCurrency(calculations.distributorGrossProfitSS)}</span></p>
                              </div>
                          </div>
                       )}
                  </div>
             )}
           </div>
         )}
       </div>
     </div>
   </div>
  );
};

export default WinePricingCalculator;