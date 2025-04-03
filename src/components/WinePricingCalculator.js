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
    // Allow formatting of 0 but return '--' for NaN or invalid numbers
    if (isNaN(number) && typeof value !== 'string' ) return '$--.--'; // Check if it's truly NaN
    if (value === null || value === undefined) return '$--.--';

    const actualNumber = isNaN(number) ? parseFloat(value) : number; // Try parsing if number conversion failed initially
    if(isNaN(actualNumber)) return '$--.--'; // Still NaN after parseFloat

    try {
        return actualNumber.toLocaleString('en-US', { style: 'currency', currency: currency, minimumFractionDigits: 2, maximumFractionDigits: maximumFractionDigits });
    } catch (e) { return `$${actualNumber.toFixed(2)}`; }
};


const escapeCsvCell = (cell) => {
    const stringValue = String(cell ?? ''); // Handle null/undefined -> empty string
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
    // Adjust rounding logic: if fraction is 0.40 or more, round up. Otherwise round down.
    return num - whole < 0.40 ? Math.max(0, whole - 1 + 0.99) : whole + 0.99;
};

// --- InputPanel Component (No changes needed here) ---
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

                      {/* --- Reverse Target Model Selector --- */}
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
                      {/* --- End Selector --- */}
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

  // --- Reverse Target Model State ---
  const [reverseTargetModel, setReverseTargetModel] = useState('SS'); // Default to 'SS'

  // --- API Key ---
  const oerAppId = process.env.REACT_APP_OER_APP_ID || 'YOUR_OER_APP_ID'; // Replace or use .env

  // --- Fetching Logic (Open Exchange Rates) ---
  const fetchRateFromOER = useCallback(async (forceRefresh = false) => {
    console.log(`>>> fetchRateFromOER called. Force: ${forceRefresh}, Currency: ${formData.currency}, Custom: ${formData.useCustomExchangeRate}`);

    // Skip if not EUR or if using custom rate (unless forced)
    if (formData.currency !== 'EUR' || (formData.useCustomExchangeRate && !forceRefresh)) {
      console.log(">>> SKIPPING OER fetch: Conditions not met.");
      setExchangeRateError(null);
      return;
    }

    const now = Date.now();
    const lastFetchTimeString = localStorage.getItem(CACHE_TIMESTAMP_KEY_OER);
    const lastFetchTime = lastFetchTimeString ? parseInt(lastFetchTimeString, 10) : 0;
    const cachedRateString = localStorage.getItem(CACHE_KEY_OER);

    // Check cache validity
    if (!forceRefresh && cachedRateString && now - lastFetchTime < CACHE_DURATION_MS) {
      const cachedRate = parseFloat(cachedRateString);
      if (!isNaN(cachedRate) && cachedRate > 0) {
        console.log(">>> Using cached OER rate:", cachedRate);
        setFormData(prev => ({ ...prev, exchangeRate: parseFloat(cachedRateString).toFixed(5) }));
        setExchangeRateError(null);
        return;
      }
    }

    console.log(">>> PROCEEDING TO FETCH from OpenExchangeRates (USD Base)...");
    setIsExchangeRateLoading(true);
    setExchangeRateError(null);

    // Check for valid App ID
    if (!oerAppId || oerAppId === 'YOUR_OER_APP_ID') {
      console.error("OpenExchangeRates App ID is missing or using placeholder.");
      setExchangeRateError("Config Error: App ID missing.");
      setIsExchangeRateLoading(false);
      const fallbackRate = cachedRateString ? parseFloat(cachedRateString).toFixed(5) : DEFAULT_EXCHANGE_RATE;
      setFormData(prev => ({ ...prev, exchangeRate: fallbackRate }));
      return;
    }

    try {
      const apiUrl = `https://openexchangerates.org/api/latest.json?app_id=${oerAppId}&symbols=EUR`;
      console.log(">>> Fetching URL:", apiUrl);

      const response = await fetch(apiUrl);
      const data = await response.json();
      console.log(">>> RAW OER RESPONSE (USD Base):", JSON.stringify(data, null, 2));

      if (!response.ok || data.error) {
        const errorDescription = data?.description || `HTTP error! status: ${response.status}`;
        throw new Error(errorDescription);
      }
      if (data.base !== 'USD' || !data.rates || typeof data.rates.EUR !== 'number') {
        throw new Error("Could not parse valid USD->EUR rate from OER API. Unexpected response format.");
      }

      const rateUSDtoEUR = data.rates.EUR;
      if (rateUSDtoEUR <= 0) {
        throw new Error("Received invalid rate (<= 0) from OER API.");
      }

      const rateEURUSD = 1 / rateUSDtoEUR;
      const formattedRate = rateEURUSD.toFixed(5);
      console.log(`>>> Fetched OER Rate: USD->EUR=${rateUSDtoEUR}, Calculated EUR->USD=${formattedRate}`);

      // Update state and cache
      setFormData(prev => ({
        ...prev,
        exchangeRate: formattedRate,
        customExchangeRate: prev.useCustomExchangeRate ? prev.customExchangeRate : formattedRate
      }));
      localStorage.setItem(CACHE_KEY_OER, formattedRate);
      localStorage.setItem(CACHE_TIMESTAMP_KEY_OER, now.toString());
      setExchangeRateError(null);

    } catch (error) {
      console.error("Error fetching/processing OER rate:", error);
      setExchangeRateError(`Could not fetch rate: ${error.message}. Using previous/default.`);
      const fallbackRate = cachedRateString ? parseFloat(cachedRateString).toFixed(5) : DEFAULT_EXCHANGE_RATE;
      setFormData(prev => ({ ...prev, exchangeRate: fallbackRate }));
    } finally {
      setIsExchangeRateLoading(false);
    }
  }, [oerAppId, formData.currency, formData.useCustomExchangeRate]); // Dependencies

  // --- Calculation Logic (UPDATED with Tariff Changes AND Scenario B DI Logic)---
  const calculatePricing = useCallback(() => {
    console.log("Calculating pricing with formData:", formData);
    console.log("Using reverseTargetModel:", reverseTargetModel);
    console.log("Applying DI Calculation: Scenario B"); // Indicate which logic is used

    setIsCalculating(true);
    // Clear calculation error, keep input validation errors
    setErrors(prev => ({ ...prev, calculation: null }));

    // --- Input Parsing ---
    const bottleCost = parseFloat(formData.bottleCost) || 0;
    const casePrice = parseFloat(formData.casePrice) || 0;
    const casePack = parseInt(formData.casePackSize, 10) || 12;
    const exchangeBuffer = parseFloat(formData.exchangeBuffer) || 0;
    const diLogistics = parseFloat(formData.diLogistics) || 0;
    const tariffPercent = parseFloat(formData.tariff) || 0;
    const statesideLogistics = parseFloat(formData.statesideLogistics) || 0;
    const supplierMarginPercent = parseFloat(formData.supplierMargin) || 0;
    const distributorMarginPercent = parseFloat(formData.distributorMargin) || 0;
    const distBtgMarginPercent = parseFloat(formData.distributorBtgMargin) || 0;
    const retailerMarginPercent = parseFloat(formData.retailerMargin) || 0;
    const casesSold = parseInt(formData.casesSold, 10) || 0;
    const targetSrp = parseFloat(formData.targetSrp) || 0;
    const customRate = parseFloat(formData.customExchangeRate);
    const fetchedRate = parseFloat(formData.exchangeRate);

    // --- Determine Effective Exchange Rate ---
    let effectiveExchangeRate;
    if (formData.currency === 'USD') {
        effectiveExchangeRate = 1;
    } else if (formData.useCustomExchangeRate) {
        if (!isNaN(customRate) && customRate > 0) {
            effectiveExchangeRate = customRate;
        } else {
            setErrors(prev => ({ ...prev, customExchangeRate: "Invalid Manual Rate", calculation: "Calculation stopped: Invalid Manual Rate." }));
            setIsCalculating(false); setCalculations({}); return;
        }
    } else {
        if (!isNaN(fetchedRate) && fetchedRate > 0) {
            effectiveExchangeRate = fetchedRate * (1 + exchangeBuffer / 100);
        } else {
            setErrors(prev => ({ ...prev, exchangeRate: "Invalid Fetched Rate", calculation: "Calculation stopped: Invalid Fetched Rate." }));
            setIsCalculating(false); setCalculations({}); return;
        }
    }
    if (isNaN(effectiveExchangeRate) || effectiveExchangeRate <= 0) {
        setErrors(prev => ({ ...prev, calculation: "Invalid effective exchange rate for calculation." }));
        setIsCalculating(false); setCalculations({}); return;
    }

    let baseBottleCostOriginal = null;
    let baseCasePriceOriginal = null;
    let caseCostUSD = 0; // Base cost in USD using effective rate

    try { // Wrap core calculation
      // --- Determine Base Costs (Forward/Reverse) ---
      if (formData.calculationMode === 'forward') {
          let baseCostOriginal = 0;
          if (bottleCost > 0) { baseCostOriginal = bottleCost * casePack; }
          else if (casePrice > 0) { baseCostOriginal = casePrice; }
          else {
              if (formData.bottleCost !== '' || formData.casePrice !== '') {
                  setErrors(prev => ({ ...prev, costInput: `Enter valid ${formData.currency} Bottle Cost or Case Price.` }));
              } else { setErrors(prev => ({ ...prev, costInput: null })); }
              setIsCalculating(false); setCalculations({}); return;
          }
          if(baseCostOriginal <= 0) throw new Error(`Invalid non-positive ${formData.currency} cost input.`);

          caseCostUSD = baseCostOriginal * effectiveExchangeRate;
          baseCasePriceOriginal = baseCostOriginal;
          baseBottleCostOriginal = baseCostOriginal / casePack;
      } else { // Reverse Mode
          if (targetSrp <= 0) {
              if (formData.targetSrp !== '') { setErrors(prev => ({ ...prev, targetSrp: "Enter valid Target SRP (USD > 0)." })); }
              else { setErrors(prev => ({ ...prev, targetSrp: null })); }
              setIsCalculating(false); setCalculations({}); return;
          }

          const marginCheckReverse = (margin, name) => {
             if (isNaN(margin) || margin < 0 || margin >= 100) throw new Error(`Invalid ${name} (${margin}%). Must be 0-99.99.`);
             return margin / 100;
          };
          const retailerMarginFrac = marginCheckReverse(retailerMarginPercent, "Retailer Margin");
          const distributorMarginFrac = marginCheckReverse(distributorMarginPercent, "Distributor Margin");
          const supplierMarginFrac = marginCheckReverse(supplierMarginPercent, "Supplier Margin");
          const tariffFrac = tariffPercent / 100;
          if (isNaN(tariffFrac) || tariffFrac < 0) throw new Error("Invalid Tariff percentage.");

          const effectiveSrp = formData.roundSrp ? roundToNearest99(targetSrp) : targetSrp;
          let distWholesaleBottle_USD = effectiveSrp * (1 - retailerMarginFrac);
          if (isNaN(distWholesaleBottle_USD) || distWholesaleBottle_USD <= 0) throw new Error("Retailer margin yields non-positive wholesale cost.");

          const distCaseWholesale_USD = distWholesaleBottle_USD * casePack;
          const distLaidInCostPreLogisticsAndTariff_USD = distCaseWholesale_USD * (1 - distributorMarginFrac);
          if (isNaN(distLaidInCostPreLogisticsAndTariff_USD) || distLaidInCostPreLogisticsAndTariff_USD <= 0) throw new Error("Distributor margin yields non-positive pre-cost laid-in value.");

          let supplierFob_USD; // FOB before logistics/tariff are added by distributor or supplier
          if (reverseTargetModel === 'SS') {
              const supplierFobSS_PreMargin_USD = distLaidInCostPreLogisticsAndTariff_USD - statesideLogistics;
               if (isNaN(supplierFobSS_PreMargin_USD) || supplierFobSS_PreMargin_USD <= 0) throw new Error('Stateside logistics cost exceeds distributor pre-cost value.');
               supplierFob_USD = supplierFobSS_PreMargin_USD * (1 - supplierMarginFrac);
              if (isNaN(supplierFob_USD) || supplierFob_USD <= 0) throw new Error('Supplier margin yields non-positive SS base FOB cost.');
          } else { // 'DI' Path (Scenario B reverse)
              // The distributor buys at supplier FOB, THEN adds tariff & logistics
              // So, the pre-logistics/tariff value IS the supplier FOB (DI)
              supplierFob_USD = distLaidInCostPreLogisticsAndTariff_USD * (1 - supplierMarginFrac);
              if (isNaN(supplierFob_USD) || supplierFob_USD <= 0) throw new Error('Supplier margin yields non-positive DI base FOB cost.');
          }

          // Reverse calculate caseCostUSD (which is now *derived* from FOB, before tariff/logistics are added conceptually in DI)
          // This requires careful thought depending on which model drives the target.
          // In Scenario B, FOB DI = caseCostUSD / (1-suppMargin). So caseCostUSD = FOB DI * (1-suppMargin)
          // In SS, FOB SS = (caseCostUSD + tariff + DI log) / (1-suppMargin). Needs more steps.

          // Let's recalculate based on the *derived* supplierFob_USD.
          if(reverseTargetModel === 'DI') {
             // From supplierFobDI_USD = caseCostUSD / (1 - supplierMarginFrac)
             caseCostUSD = supplierFob_USD / (1 / (1 - supplierMarginFrac)); // derivedFOB_USD is already post-margin
             if (isNaN(caseCostUSD)) throw new Error('Error deriving base USD cost from DI target.');
          } else { // SS
             // From supplierFobSS_USD = (caseCostUSD + supplierTariffPerCase + diLogistics) / (1 - supplierMarginFrac)
             // supplierFob_USD = (caseCostUSD * (1 + tariffFrac) + diLogistics) / (1 - supplierMarginFrac)
             const term1 = supplierFob_USD * (1 - supplierMarginFrac);
             const term2 = term1 - diLogistics;
             caseCostUSD = term2 / (1 + tariffFrac);
             if (isNaN(caseCostUSD)) throw new Error('Error deriving base USD cost from SS target.');
          }


          if (isNaN(caseCostUSD) || caseCostUSD < 0) { // Allow 0 cost result
              console.warn("Reverse calculation resulted in non-positive base USD cost.");
              caseCostUSD = 0; // Set to 0 if negative
          }

          if (effectiveExchangeRate <= 0) throw new Error('Cannot convert back: Invalid effective exchange rate (<=0).');
          baseCasePriceOriginal = caseCostUSD / effectiveExchangeRate;
          baseBottleCostOriginal = baseCasePriceOriginal / casePack;

          setFormData(prev => ({
              ...prev,
              bottleCost: baseBottleCostOriginal.toFixed(4),
              casePrice: baseCasePriceOriginal.toFixed(2)
          }));
      }

      // Ensure base prices are available for subsequent calculations
      if (baseCasePriceOriginal == null || isNaN(baseCasePriceOriginal) || baseBottleCostOriginal == null || isNaN(baseBottleCostOriginal)) {
          throw new Error("Could not determine base supplier cost in original currency.");
      }
       if (isNaN(caseCostUSD) || caseCostUSD < 0) { // Check final caseCostUSD (allow 0)
           console.warn("Base USD cost (effective rate) is invalid or negative after calculation mode logic.");
           caseCostUSD = 0; // Set to 0 if negative
       }


      // --- Common Calculations ---
      const marginCheck = (margin, name) => {
          if (isNaN(margin) || margin >= 100 || margin < 0) throw new Error(`Invalid ${name} (${margin}%). Must be 0-99.99.`);
          return margin / 100;
      };
      const supplierMargin = marginCheck(supplierMarginPercent, "Supplier Margin");
      const distributorMargin = marginCheck(distributorMarginPercent, "Distributor Margin");
      const distBtgMargin = marginCheck(distBtgMarginPercent, "Distributor BTG Margin");
      const retailerMargin = marginCheck(retailerMarginPercent, "Retailer Margin");
      const tariffFrac = tariffPercent / 100;
      if (isNaN(tariffFrac) || tariffFrac < 0) throw new Error("Invalid Tariff percentage.");


      // --- Calculate Supplier Tariff (based on caseCostUSD - includes buffer) ---
      // This tariff is considered part of the supplier's cost structure before selling FOB in Scenario B DI.
      const supplierTariffPerCase = caseCostUSD * tariffFrac;
      // --- END ---


       // --- SCENARIO B - Calculate NEW Supplier FOB DI (BEFORE Tariff/Logistics added) ---
       const supplierFobDI_USD = caseCostUSD / (1 - supplierMargin);
       if (!isFinite(supplierFobDI_USD)) {
           throw new Error("Calculation resulted in non-finite Supplier FOB DI due to supplier margin.");
       }
       // --- END SCENARIO B FOB DI ---


      // --- Calculate *Informational* Distributor Tariff (DI Model - SCENARIO B) ---
      // Base for this informational tariff is the new supplierFobDI_USD
      let distributorTariffBaseDI_USD = 0;
      let distributorTariffPerCaseDI = 0;
      if (tariffFrac > 0) { // Only calculate if there's a tariff
          // NEW BASE as per Proposal B
          distributorTariffBaseDI_USD = supplierFobDI_USD;

          // Only calculate tariff if base is positive and finite
          if (distributorTariffBaseDI_USD > 0 && isFinite(distributorTariffBaseDI_USD)) {
              distributorTariffPerCaseDI = distributorTariffBaseDI_USD * tariffFrac;
          } else if (!isFinite(distributorTariffBaseDI_USD)) {
               console.warn("Cannot calculate informational DI Tariff: Supplier FOB DI is non-finite.");
               distributorTariffPerCaseDI = NaN; // Or some indicator of error
          }
      }
      // --- END Informational Distributor Tariff ---


      // --- DI Calculations (Scenario B Logic) ---
      // Distributor buys at supplierFobDI_USD, then adds tariff and logistics
      const distributorLaidInCostDI_USD = supplierFobDI_USD + supplierTariffPerCase + diLogistics;
       if(distributorLaidInCostDI_USD < 0) { // Allow 0
         console.warn("Warning: Distributor DI Laid-In Cost (Scenario B) is negative.");
       }

      const distCaseWholesaleDI_USD = distributorLaidInCostDI_USD / (1 - distributorMargin);
      const distBottleWholesaleDI_USD = distCaseWholesaleDI_USD / casePack;
      const distLaidInCostDI_Bottle_USD = distributorLaidInCostDI_USD / casePack; // Use the new distributor laid-in cost
      if (isNaN(distLaidInCostDI_Bottle_USD) || distLaidInCostDI_Bottle_USD < 0) throw new Error("Invalid DI Laid-In Cost per bottle for BTG (Scenario B).");
      const distBtgPriceDI_USD = distLaidInCostDI_Bottle_USD / (1 - distBtgMargin); // Flows from updated laid-in


      // --- SS Calculations (Retain Original Logic Path Concept) ---
      // Base cost for SS Supplier includes tariff & DI logistics *before* margin
      const baseSupplierCostBeforeMarginSS_USD = caseCostUSD + supplierTariffPerCase + diLogistics;
       if(baseSupplierCostBeforeMarginSS_USD < 0) { // Allow 0
         console.warn("Warning: Base Supplier Cost Before Margin SS is negative.");
       }
      const supplierLaidInCostSS_USD = baseSupplierCostBeforeMarginSS_USD; // Supplier cost before margin for SS model
      const supplierFobSS_USD = supplierLaidInCostSS_USD / (1 - supplierMargin);
      const distributorLaidInCostSS_USD = supplierFobSS_USD + statesideLogistics;
       if(distributorLaidInCostSS_USD < 0) { // Allow 0
         console.warn("Warning: Distributor SS Laid-In Cost is negative.");
       }

      const distCaseWholesaleSS_USD = distributorLaidInCostSS_USD / (1 - distributorMargin);
      const distBottleWholesaleSS_USD = distCaseWholesaleSS_USD / casePack;
      const distLaidInCostSS_Bottle_USD = distributorLaidInCostSS_USD / casePack;
      if (isNaN(distLaidInCostSS_Bottle_USD) || distLaidInCostSS_Bottle_USD < 0) throw new Error("Invalid SS Laid-In Cost per bottle for BTG.");
      const distBtgPriceSS_USD = distLaidInCostSS_Bottle_USD / (1 - distBtgMargin);


      // Check intermediate values before SRP calculation
      const intermediateValues = [
          supplierFobDI_USD, // New DI FOB
          distributorLaidInCostDI_USD, // New DI Laid In
          distCaseWholesaleDI_USD, distBottleWholesaleDI_USD, distBtgPriceDI_USD, // DI chain
          supplierLaidInCostSS_USD, supplierFobSS_USD, distributorLaidInCostSS_USD, // SS Chain
          distCaseWholesaleSS_USD, distBottleWholesaleSS_USD, distBtgPriceSS_USD // SS chain
      ];
      if (intermediateValues.some(val => !isFinite(val))) {
            throw new Error("Calculation resulted in non-finite intermediate price due to margin(s) or calculation path.");
      }

      // --- SRP Calculation & Rounding ---
      let srpDi_USD = distBottleWholesaleDI_USD / (1 - retailerMargin); // Based on new DI chain
      let srpSs_USD = distBottleWholesaleSS_USD / (1 - retailerMargin); // Based on SS chain
      if (!isFinite(srpDi_USD) || !isFinite(srpSs_USD)) throw new Error("Retailer margin yields non-finite SRP.");

      let adjustedCaseWholesaleDI_USD = distCaseWholesaleDI_USD;
      let adjustedBottleWholesaleDI_USD = distBottleWholesaleDI_USD;
      let adjustedCaseWholesaleSS_USD = distCaseWholesaleSS_USD;
      let adjustedBottleWholesaleSS_USD = distBottleWholesaleSS_USD;
      let adjustedDistBtgPriceDI_USD = distBtgPriceDI_USD; // BTG not adjusted by SRP rounding
      let adjustedDistBtgPriceSS_USD = distBtgPriceSS_USD; // BTG not adjusted by SRP rounding
      let originalSrpDi_USD = srpDi_USD, originalSrpSs_USD = srpSs_USD;

      if (formData.roundSrp && formData.calculationMode === 'forward') {
          srpDi_USD = roundToNearest99(srpDi_USD);
          srpSs_USD = roundToNearest99(srpSs_USD);
          // Adjust wholesale based on rounded SRP
          adjustedBottleWholesaleDI_USD = srpDi_USD * (1 - retailerMargin);
          adjustedCaseWholesaleDI_USD = adjustedBottleWholesaleDI_USD * casePack;
          adjustedBottleWholesaleSS_USD = srpSs_USD * (1 - retailerMargin);
          adjustedCaseWholesaleSS_USD = adjustedBottleWholesaleSS_USD * casePack;
          // BTG prices remain based on unadjusted costs (distBtgPriceDI_USD, distBtgPriceSS_USD)
      } else if (formData.calculationMode === 'reverse') {
          if (reverseTargetModel === 'DI') {
              srpDi_USD = formData.roundSrp ? roundToNearest99(targetSrp) : targetSrp;
              // Recalculate SS SRP based on its chain, possibly rounding it too
              srpSs_USD = distBottleWholesaleSS_USD / (1 - retailerMargin); // Use the calculated SS wholesale
              if(formData.roundSrp) srpSs_USD = roundToNearest99(srpSs_USD);
               // Adjust DI wholesale based on target DI SRP
               adjustedBottleWholesaleDI_USD = srpDi_USD * (1 - retailerMargin);
               adjustedCaseWholesaleDI_USD = adjustedBottleWholesaleDI_USD * casePack;
          } else { // reverseTargetModel === 'SS'
              srpSs_USD = formData.roundSrp ? roundToNearest99(targetSrp) : targetSrp;
              // Recalculate DI SRP based on its chain, possibly rounding it too
              srpDi_USD = distBottleWholesaleDI_USD / (1 - retailerMargin); // Use the calculated DI wholesale
              if(formData.roundSrp) srpDi_USD = roundToNearest99(srpDi_USD);
              // Adjust SS wholesale based on target SS SRP
              adjustedBottleWholesaleSS_USD = srpSs_USD * (1 - retailerMargin);
              adjustedCaseWholesaleSS_USD = adjustedBottleWholesaleSS_USD * casePack;
          }
          // BTG prices remain based on unadjusted costs (distBtgPriceDI_USD, distBtgPriceSS_USD)
      }

      // --- Gross Profit & Total Tariffs ---
      let supplierGrossProfitDI = null, distributorGrossProfitDI = null;
      let supplierGrossProfitSS = null, distributorGrossProfitSS = null;
      let supplierTariffTotal = null;
      let distributorTariffTotalDI = null; // Informational

      if (casesSold > 0) {
          // DI GP (Scenario B): Supplier sells at FOB DI. Distributor buys at FOB DI, adds costs.
          // Supplier GP: FOB DI - Base Cost USD
          supplierGrossProfitDI = (supplierFobDI_USD - caseCostUSD) * casesSold;
          // Distributor GP: Wholesale DI - Distributor Laid In DI (which includes FOB DI + tariff + DI log)
          distributorGrossProfitDI = (adjustedCaseWholesaleDI_USD - distributorLaidInCostDI_USD) * casesSold;

          // SS GP (Original Logic): Supplier sells at FOB SS. Distributor buys at FOB SS, adds SS log.
          // Supplier GP: FOB SS - Supplier Laid In SS (Base Cost + Tariff + DI log)
          supplierGrossProfitSS = (supplierFobSS_USD - supplierLaidInCostSS_USD) * casesSold;
          // Distributor GP: Wholesale SS - Distributor Laid In SS (FOB SS + SS log)
          distributorGrossProfitSS = (adjustedCaseWholesaleSS_USD - distributorLaidInCostSS_USD) * casesSold;

          // Tariff Totals
          supplierTariffTotal = supplierTariffPerCase * casesSold;
          distributorTariffTotalDI = distributorTariffPerCaseDI * casesSold; // Informational total
      }

      // --- Prepare Results Object ---
      const results = {
          effectiveExchangeRate, caseCostUSD,
          // Tariff Values
          supplierTariffPerCase, distributorTariffPerCaseDI, // Note: distributorTariffPerCaseDI is informational (Scenario B)
          supplierTariffTotal, distributorTariffTotalDI,     // Note: distributorTariffTotalDI is informational (Scenario B)
          // DI Path (Scenario B)
          // supplierLaidInCostDI_USD: ???, // This concept doesn't exist cleanly in Scenario B's supplier perspective
          supplierFobDI_USD,
          distributorLaidInCostDI_USD,
          distCaseWholesaleDI_USD: adjustedCaseWholesaleDI_USD,
          distBottleWholesaleDI_USD: adjustedBottleWholesaleDI_USD,
          distBtgPriceDI_USD: adjustedDistBtgPriceDI_USD,
          srpDi_USD, originalSrpDi_USD,
          // SS Path (Original Logic)
          supplierLaidInCostSS_USD, // Base cost before supplier margin for SS
          supplierFobSS_USD,
          distributorLaidInCostSS_USD,
          distCaseWholesaleSS_USD: adjustedCaseWholesaleSS_USD,
          distBottleWholesaleSS_USD: adjustedBottleWholesaleSS_USD,
          distBtgPriceSS_USD: adjustedDistBtgPriceSS_USD,
          srpSs_USD, originalSrpSs_USD,
          // GP
          supplierGrossProfitDI, distributorGrossProfitDI,
          supplierGrossProfitSS, distributorGrossProfitSS,
          // Base Costs
          baseBottleCostOriginal, baseCasePriceOriginal,
          // Meta
          reverseTargetModelUsed: formData.calculationMode === 'reverse' ? reverseTargetModel : null
      };

       // Final check for non-finite values before setting results
       for (const key in results) {
           if (typeof results[key] === 'number' && !isFinite(results[key])) {
               throw new Error(`Calculation resulted in non-finite value for ${key}. Check margins and inputs.`);
           }
       }

      setCalculations(results);
      setErrors(prev => ({ ...prev, calculation: null })); // Clear calculation error

    } catch (error) {
      console.error("Calculation Error:", error);
      const errorMessage = (error instanceof Error) ? error.message : "An unexpected error occurred during calculation.";
      setErrors(prev => ({ ...prev, calculation: errorMessage }));
      setCalculations({}); // Clear results on error
    } finally {
      setIsCalculating(false);
    }
  }, [formData, reverseTargetModel]); // Dependencies

  // --- Input Change Handler ---
  const handleInputChange = useCallback((e) => {
      const { name, value, type, checked } = e.target;
      let newValue = type === 'checkbox' ? checked : value;
      let fieldError = "";

      const numericFields = [
          "bottleCost", "casePrice", "targetSrp", "exchangeRate", "customExchangeRate",
          "exchangeBuffer", "diLogistics", "tariff", "statesideLogistics",
          "supplierMargin", "distributorMargin", "distributorBtgMargin", "retailerMargin",
          "casesSold"
      ];

      let updates = { [name]: newValue };
      const currentMode = formData.calculationMode;
      const casePack = parseInt(formData.casePackSize, 10);

      // Validation and Counterpart Calculation
      if (numericFields.includes(name)) {
          if (newValue === "" || newValue === "-") {
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
                  // Range checks
                  if (["supplierMargin", "distributorMargin", "distributorBtgMargin", "retailerMargin"].includes(name) && (num < 0 || num >= 100)) { fieldError = "Must be 0-99.99"; }
                  else if (["bottleCost", "casePrice", "targetSrp", "diLogistics", "statesideLogistics", "casesSold", "exchangeRate", "customExchangeRate", "exchangeBuffer"].includes(name) && num < 0 && newValue !== "-") { fieldError = "Cannot be negative"; }
                  else if (name === "tariff" && (num < 0 || num > 200)) { fieldError = "Must be 0-200"; }
                  else { fieldError = ""; }

                  // Counterpart Calculation (Forward Mode)
                  if (currentMode === 'forward' && !isNaN(casePack) && casePack > 0 && !isNaN(num) && num >= 0) {
                      if (name === 'bottleCost') {
                          updates.casePrice = (num * casePack).toFixed(2);
                      } else if (name === 'casePrice') {
                          updates.bottleCost = (num / casePack).toFixed(4);
                      }
                  }
              }
          }
          // Prevent editing calculated costs in Reverse mode (still applies)
          if (currentMode === 'reverse' && (name === 'bottleCost' || name === 'casePrice')) {
            delete updates[name];
          }
      } else if (name === 'calculationMode') { // Handle mode switching
          if (newValue === 'reverse') {
              updates.bottleCost = ''; updates.casePrice = ''; updates.targetSrp = '';
          } else { // Switching to forward
              updates.targetSrp = '';
          }
          fieldError = "";
      } else { fieldError = ""; } // Clear errors for non-numeric or checkbox

      setFormData(prev => ({ ...prev, ...updates }));
      setErrors(prev => ({ ...prev, [name]: fieldError || null }));

  }, [formData.calculationMode, formData.casePackSize]); // Dependencies

  // --- Reverse Target Model Change Handler ---
  const handleReverseTargetChange = useCallback((e) => {
    console.log('Setting Reverse Target Model to:', e.target.value);
    setReverseTargetModel(e.target.value);
    setCalculations({});
    setErrors(prev => ({ ...prev, calculation: null }));
  }, []);

  // --- Other Handlers (Currency, Select, Custom Rate, Refresh) ---
  const handleCurrencyChange = useCallback((e) => {
    const newCurrency = e.target.value;
    setFormData(prev => ({ ...prev, currency: newCurrency }));
    if (newCurrency === 'EUR' && !formData.useCustomExchangeRate) {
        fetchRateFromOER(false);
    } else {
        setExchangeRateError(null);
    }
    setErrors(prev => ({ ...prev, calculation: null }));
  }, [fetchRateFromOER, formData.useCustomExchangeRate]);

  const handleSelectChange = useCallback((e) => {
    const { name, value } = e.target;
    let updates = { [name]: value };

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
        setCalculations({});
        if(value === 'forward') { updates.targetSrp = ''; }
        else { updates.bottleCost = ''; updates.casePrice = ''; updates.targetSrp = ''; }
        setErrors({});
    }

    setFormData(prev => ({ ...prev, ...updates }));
    if (name !== 'calculationMode') {
        setErrors(prev => ({ ...prev, calculation: null }));
    }
  }, [formData.calculationMode, formData.bottleCost, formData.casePrice]);

  const handleCustomRateToggle = useCallback((e) => {
      const useCustom = e.target.checked;
      setFormData(prev => {
          const newCustomRate = useCustom ? (prev.customExchangeRate || prev.exchangeRate) : prev.customExchangeRate;
          return { ...prev, useCustomExchangeRate: useCustom, customExchangeRate: newCustomRate };
      });
      if (!useCustom && formData.currency === 'EUR') {
        fetchRateFromOER(false);
      } else if (useCustom) {
        setExchangeRateError(null);
      }
      setErrors(prev => ({ ...prev, calculation: null, exchangeRate: null, customExchangeRate: null }));
  }, [fetchRateFromOER, formData.currency]);

  const handleRefreshRate = useCallback(() => {
      if (formData.currency === 'EUR' && !formData.useCustomExchangeRate) {
        fetchRateFromOER(true); // Force refresh
      } else {
          setExchangeRateError("Refresh only available for EUR currency when not using manual rate.");
          setTimeout(() => setExchangeRateError(null), 4000);
      }
  }, [fetchRateFromOER, formData.currency, formData.useCustomExchangeRate]);

  // --- Effects ---
  useEffect(() => { // Initial rate fetch
    if (formData.currency === 'EUR' && !formData.useCustomExchangeRate) {
        fetchRateFromOER(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculationTimeoutRef = useRef(null); // Debounced calculation trigger
  useEffect(() => {
    clearTimeout(calculationTimeoutRef.current);
    calculationTimeoutRef.current = setTimeout(() => {
        const hasCriticalError = Object.values(errors).some(error => error !== null && error !== "" && error !== "Calculation stopped: Invalid Manual Rate." && error !== "Calculation stopped: Invalid Fetched Rate."); // Ignore specific calc-stopping errors here as they are handled globally
        const isForwardReady = formData.calculationMode === 'forward' && (formData.bottleCost || formData.casePrice);
        const isReverseReady = formData.calculationMode === 'reverse' && formData.targetSrp;

        if (!hasCriticalError && (isForwardReady || isReverseReady) ) {
            calculatePricing();
        } else {
            console.log("Skipping calculation due to input errors or missing required input.");
            if(hasCriticalError || (!isForwardReady && !isReverseReady)) {
                 setCalculations({}); // Clear results if errors or insufficient input
                 // Keep calculation error if it was a stopping one
                 if (!errors.calculation?.startsWith("Calculation stopped:")) {
                     setErrors(prev => ({ ...prev, calculation: null }));
                 }
            }
        }
    }, CALCULATION_TIMEOUT);
    return () => clearTimeout(calculationTimeoutRef.current);
  }, [formData, errors, calculatePricing, reverseTargetModel]); // Recalculate if reverseTargetModel changes too

  // --- Reset Handler ---
  const handleReset = () => {
    console.log("Resetting form state...");
    setFormData(getInitialFormData());
    setCalculations({});
    setErrors({});
    setReverseTargetModel('SS');
    setShowAdvanced(false);
    setShowGrossProfit(false);
    setExchangeRateError(null);
    const initialData = getInitialFormData();
    if (initialData.currency === 'EUR' && !initialData.useCustomExchangeRate) {
        fetchRateFromOER(false);
    }
  };

  // --- Action Handlers (Save, Download, Print) ---
  const handleSave = () => { alert('Save functionality not yet implemented.'); };
  const handleDownload = () => { // UPDATED CSV Download with Scenario B in mind
    if (!calculations.srpDi_USD && !calculations.srpSs_USD) {
      alert("Please perform a calculation first.");
      return;
    }
    const headers = [
      "Parameter", "Value",
      "DI Parameter", "DI Value (USD - Scenario B)",
      "SS Parameter", "SS Value (USD - Original Logic)"
    ];
    const inputData = [ // Input section remains the same
      ["Wine Name", formData.wineName],
      ["Calculation Mode", formData.calculationMode],
      ["Supplier Currency", formData.currency],
      [`Bottle Cost (${formData.currency})`, formData.bottleCost],
      [`Case Price (${formData.currency})`, formData.casePrice],
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
      ["Reverse Target Model", formData.calculationMode === 'reverse' ? reverseTargetModel : "N/A"]
    ];

    // Calculation Data - separate tariffs first
      const calcTariffs = [
        ...(formData.tariff > 0 ? [
            ["Supplier Tariff / Case Cost (USD)", calculations.supplierTariffPerCase], // Based on caseCostUSD
            ["Distributor Tariff / Case Cost (DI, Info, USD)", calculations.distributorTariffPerCaseDI], // Info only, based on supplierFobDI_USD
            ...(formData.casesSold > 0 ? [
                ["Supplier Tariff Total Cost (USD)", calculations.supplierTariffTotal],
                ["Distributor Tariff Total Cost (DI, Info, USD)", calculations.distributorTariffTotalDI],
            ] : [])
        ] : [])
    ];

    const calcDataBase = [ // Base cost without tariff line item
        ["Base Case Cost (USD)", calculations.caseCostUSD], // Cost before any margins/tariffs/logistics usually
    ];
    const calcDataDI = [ // DI path (Scenario B)
      ...calcDataBase,
      // ["Supplier Laid-In DI (USD)", ...], // Concept less clear for supplier in Scen B
      ["Supplier FOB DI (USD)", calculations.supplierFobDI_USD], // Based only on caseCostUSD + margin
      ["Distributor Laid-In DI (USD)", calculations.distributorLaidInCostDI_USD], // FOB DI + Supp Tariff + DI Log
      ["Distributor Whsl Case DI (USD)", calculations.distCaseWholesaleDI_USD],
      ["Distributor Whsl Bottle DI (USD)", calculations.distBottleWholesaleDI_USD],
      ["Distributor BTG Bottle DI (USD)", calculations.distBtgPriceDI_USD],
      ["SRP DI (USD)", calculations.srpDi_USD],
      ...(calculations.supplierGrossProfitDI != null ? [["Supplier GP DI (USD)", calculations.supplierGrossProfitDI]] : []), // FOB DI - caseCostUSD
      ...(calculations.distributorGrossProfitDI != null ? [["Distributor GP DI (USD)", calculations.distributorGrossProfitDI]] : []), // Whsl DI - Dist LaidIn DI
    ];
    const calcDataSS = [ // SS path (Original Logic)
      ...calcDataBase,
      ["Supplier Laid-In SS (USD)", calculations.supplierLaidInCostSS_USD], // Base + Supp Tariff + DI Log
      ["Supplier FOB SS (USD)", calculations.supplierFobSS_USD], // Based on Laid-In SS + margin
      ["Distributor Laid-In SS (USD)", calculations.distributorLaidInCostSS_USD], // FOB SS + SS Log
      ["Distributor Whsl Case SS (USD)", calculations.distCaseWholesaleSS_USD],
      ["Distributor Whsl Bottle SS (USD)", calculations.distBottleWholesaleSS_USD],
      ["Distributor BTG Bottle SS (USD)", calculations.distBtgPriceSS_USD],
      ["SRP SS (USD)", calculations.srpSs_USD],
      ...(calculations.supplierGrossProfitSS != null ? [["Supplier GP SS (USD)", calculations.supplierGrossProfitSS]] : []), // FOB SS - Supp LaidIn SS
      ...(calculations.distributorGrossProfitSS != null ? [["Distributor GP SS (USD)", calculations.distributorGrossProfitSS]] : []), // Whsl SS - Dist LaidIn SS
    ];

    // Combine rows
    let combinedRows = [];
    // Input Rows
    inputData.forEach(inputRow => {
        combinedRows.push([inputRow[0], inputRow[1], "", "", "", ""]);
    });
    combinedRows.push(["---", "---", "---", "---", "---", "---"]); // Separator
    // Tariff Rows (Span across multiple columns for readability in CSV)
    calcTariffs.forEach(tariffRow => {
        combinedRows.push([tariffRow[0], tariffRow[1], "", "", "", ""]);
    });
    combinedRows.push(["---", "---", "---", "---", "---", "---"]); // Separator
     // Calculation Rows (DI/SS)
    const maxCalcRows = Math.max(calcDataDI.length, calcDataSS.length);
    for (let i = 0; i < maxCalcRows; i++) {
        const diRow = calcDataDI[i] || ["", ""];
        const ssRow = calcDataSS[i] || ["", ""];
        const formatValue = (val) => typeof val === 'number' ? val.toFixed(4) : val; // Format numbers nicely
        combinedRows.push([
            "", "", // Placeholder columns
            diRow[0], formatValue(diRow[1]),
            ssRow[0], formatValue(ssRow[1]),
        ]);
    }

    const csvContent = [
        headers.map(escapeCsvCell).join(','),
        ...combinedRows.map(row => row.map(escapeCsvCell).join(','))
    ].join('\n');

    // Download logic remains the same
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
  const hasCalculations = calculations && (calculations.srpDi_USD != null || calculations.srpSs_USD != null);

  return (
    <div className="container mx-auto p-4 max-w-6xl font-sans">
      {/* Header and Action Buttons */}
      <div className="flex justify-between items-center mb-4 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Wine Pricing Calculator</h1>
        <div className="flex space-x-2 mt-2 md:mt-0 print:hidden">
          <button onClick={handleReset} title="Reset Form" className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"><RotateCcw className="w-5 h-5" /></button>
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

      {/* Main Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Input Panel Column */}
        <div className="md:col-span-1">
          <InputPanel
            formData={formData} setFormData={setFormData} handleInputChange={handleInputChange}
            handleCurrencyChange={handleCurrencyChange} handleSelectChange={handleSelectChange}
            handleCustomRateToggle={handleCustomRateToggle} handleRefreshRate={handleRefreshRate}
            isExchangeRateLoading={isExchangeRateLoading} exchangeRateError={exchangeRateError}
            showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} errors={errors}
            reverseTargetModel={reverseTargetModel} handleReverseTargetChange={handleReverseTargetChange}
          />
        </div>

        {/* Results Panel Column */}
        <div className="md:col-span-2">
            {/* Loading Indicator */}
            {isCalculating && !hasCalculations && (
                <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg shadow border border-gray-100">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            )}
            {/* Initial Prompt / Error Placeholder */}
            {!isCalculating && !hasCalculations && (
                <div className="flex flex-col justify-center items-center h-64 bg-gray-50 rounded-lg shadow border border-gray-100 p-4 text-center">
                    {Object.values(errors).filter(e => e !== null && !e.startsWith("Calculation stopped:")).length > 0 ? ( // Show if input errors exist, but no calc error yet
                        <p className="text-red-600">Please correct the input errors to see results.</p>
                    ) : !errors.calculation ? ( // No errors, just waiting for input
                        <p className="text-gray-500">Enter cost or target SRP to see calculations.</p>
                    ) : null /* Calculation error handled globally */}
                    {(errors.exchangeRate || errors.customExchangeRate) && formData.currency === 'EUR' && (
                         <p className="text-yellow-700 text-sm mt-2">Note: Using default/previous exchange rate due to input error.</p>
                    )}
                </div>
            )}

          {/* --- Results Display Area --- */}
          {hasCalculations && (
            <div className="bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Calculation Results {isCalculating ? '(Recalculating...)' : ''}</h3>

              {/* Derived Cost Box (Reverse Mode) */}
              {formData.calculationMode === 'reverse' && calculations.baseBottleCostOriginal != null && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
                      <p className="font-semibold mb-1">Derived Supplier Cost ({formData.currency}) - Based on {reverseTargetModel} Target:</p>
                      <p className="flex justify-between">
                          <span>Calculated Bottle Cost:</span>
                          <span>{formatCurrency(calculations.baseBottleCostOriginal, formData.currency, 4)}</span>
                      </p>
                      <p className="flex justify-between">
                          <span>Calculated Case Cost:</span>
                          <span>{formatCurrency(calculations.baseCasePriceOriginal, formData.currency, 2)}</span>
                      </p>
                  </div>
              )}

              {/* Main DI/SS Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* DI Pricing Column */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-2 border-b pb-1">
                    Direct Import Pricing (Scenario B)
                    {formData.calculationMode === 'reverse' && reverseTargetModel === 'DI' && (
                      <span className="text-xs font-normal text-blue-600 ml-2">(Target Model)</span>
                    )}
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p className="flex justify-between"><span>Base Case Cost (USD):</span> <span>{formatCurrency(calculations.caseCostUSD)}</span></p>
                    <p className="flex justify-between font-semibold"><span>Supp. FOB DI ({formData.supplierMargin}%):</span> <span title="Based on Base Case Cost">{formatCurrency(calculations.supplierFobDI_USD)}</span></p>
                    <p className="flex justify-between"><span>Supplier Tariff:</span> <span className="text-gray-500 italic">(+{formatCurrency(calculations.supplierTariffPerCase)})</span></p>
                    <p className="flex justify-between"><span>DI Logistics:</span> <span className="text-gray-500 italic">(+{formatCurrency(formData.diLogistics)})</span></p>
                    <p className="flex justify-between"><span>Dist. Laid-In DI:</span> <span title={`Supp FOB DI + Supp Tariff + DI Log`}>{formatCurrency(calculations.distributorLaidInCostDI_USD)}</span></p>
                    <p className="flex justify-between font-semibold"><span>Dist. Whsl Case DI ({formData.distributorMargin}%):</span> <span>{formatCurrency(calculations.distCaseWholesaleDI_USD)}</span></p>
                    <p className="flex justify-between font-semibold"><span>Dist. Whsl Bottle DI:</span> <span>{formatCurrency(calculations.distBottleWholesaleDI_USD)}</span></p>
                    <p className="flex justify-between"><span>Dist. BTG Bottle DI ({formData.distributorBtgMargin}%):</span> <span>{formatCurrency(calculations.distBtgPriceDI_USD)}</span></p>
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
                      Stateside Inventory Pricing (Orig. Logic)
                      {formData.calculationMode === 'reverse' && reverseTargetModel === 'SS' && (
                        <span className="text-xs font-normal text-blue-600 ml-2">(Target Model)</span>
                      )}
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p className="flex justify-between"><span>Supp. Laid-In SS:</span> <span title={`Base(${formatCurrency(calculations.caseCostUSD)}) + Tariff(${formatCurrency(calculations.supplierTariffPerCase)}) + Log(${formatCurrency(formData.diLogistics)})`}>{formatCurrency(calculations.supplierLaidInCostSS_USD)}</span></p>
                      <p className="flex justify-between font-semibold"><span>Supp. FOB SS ({formData.supplierMargin}%):</span> <span>{formatCurrency(calculations.supplierFobSS_USD)}</span></p>
                      <p className="flex justify-between">
                          <span>Stateside Logistics:</span>
                          <span className="text-gray-500 italic font-normal">(+{formatCurrency(formData.statesideLogistics)})</span>
                      </p>
                      <p className="flex justify-between"><span>Dist. Laid-In SS:</span> <span>{formatCurrency(calculations.distributorLaidInCostSS_USD)}</span></p>
                      <p className="flex justify-between font-semibold"><span>Dist. Whsl Case SS ({formData.distributorMargin}%):</span> <span>{formatCurrency(calculations.distCaseWholesaleSS_USD)}</span></p>
                      <p className="flex justify-between font-semibold"><span>Dist. Whsl Bottle SS:</span> <span>{formatCurrency(calculations.distBottleWholesaleSS_USD)}</span></p>
                      <p className="flex justify-between"><span>Dist. BTG Bottle SS ({formData.distributorBtgMargin}%):</span> <span>{formatCurrency(calculations.distBtgPriceSS_USD)}</span></p>
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

              {/* --- Gross Profit & Tariff Analysis Section --- */}
              {hasCalculations && (formData.casesSold > 0 || formData.tariff > 0) && (
                  <div className="mt-6 pt-4 border-t">
                      <button type="button" onClick={() => setShowGrossProfit(!showGrossProfit)} className="flex items-center text-sm text-blue-600 hover:text-blue-800 focus:outline-none mb-2">
                          {showGrossProfit ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                          {formData.casesSold > 0 ? `Gross Profit & Tariff Analysis (${formData.casesSold} Cases)` : `Tariff Analysis`}
                      </button>
                      {showGrossProfit && (
                          <div className="space-y-4 text-sm bg-gray-50 p-4 rounded border">

                              {/* Tariff Cost Display */}
                              {formData.tariff > 0 && calculations.supplierTariffPerCase != null && ( // Check if tariff exists
                                <div className="space-y-1 pb-3 mb-3 border-b">
                                  <h5 className="font-medium text-gray-600 mb-1">Tariff Costs ({formData.tariff}%)</h5>
                                  {/* Supplier Perspective */}
                                  <p className="flex justify-between">
                                      <span>Supplier Tariff / Case Cost:</span>
                                      <span className="font-semibold" title="Based on Base Case Cost (USD)">{formatCurrency(calculations.supplierTariffPerCase)}</span>
                                  </p>
                                  {formData.casesSold > 0 && calculations.supplierTariffTotal != null && (
                                      <p className="flex justify-between pl-4 text-xs text-gray-500">
                                            <span>Supplier Tariff Total Cost:</span>
                                            <span>{formatCurrency(calculations.supplierTariffTotal)}</span>
                                      </p>
                                  )}
                                  {/* Distributor Perspective (DI Model - Informational) */}
                                  <p className="flex justify-between mt-2">
                                      <span>Distributor Tariff / Case Cost (DI, Info):</span>
                                      <span className="font-semibold" title="Informational: Based on Supplier FOB DI (Scenario B)">{formatCurrency(calculations.distributorTariffPerCaseDI)}</span>
                                  </p>
                                  {formData.casesSold > 0 && calculations.distributorTariffTotalDI != null && (
                                      <p className="flex justify-between pl-4 text-xs text-gray-500">
                                            <span>Distributor Tariff Total Cost (DI, Info):</span>
                                            <span>{formatCurrency(calculations.distributorTariffTotalDI)}</span>
                                      </p>
                                  )}
                                   <p className="text-xs text-gray-400 mt-1 italic">
                                      Note: 'Supplier Tariff' (based on Base Case Cost) is used in price buildup. 'Distributor Tariff' (based on FOB DI) shown for DI comparison (Scenario B).
                                   </p>
                                </div>
                              )}

                              {/* Gross Profit Display */}
                              {formData.casesSold > 0 && (
                                  <div>
                                    <h5 className="font-medium text-gray-600 mb-2">Gross Profit ({formData.casesSold} Cases)</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                      {/* DI GP */}
                                      <div>
                                          <h6 className="font-medium text-gray-500 mb-1">Direct Import GP (Scenario B)</h6>
                                          <p className="flex justify-between" title="Supplier FOB DI - Base Case Cost USD"><span>Supplier GP DI:</span> <span className="font-semibold">{formatCurrency(calculations.supplierGrossProfitDI)}</span></p>
                                          <p className="flex justify-between" title="Dist Whsl Case DI - Dist Laid-In DI"><span>Distributor GP DI:</span> <span className="font-semibold">{formatCurrency(calculations.distributorGrossProfitDI)}</span></p>
                                      </div>
                                      {/* SS GP */}
                                      <div>
                                          <h6 className="font-medium text-gray-500 mb-1">Stateside Inventory GP (Orig. Logic)</h6>
                                          <p className="flex justify-between" title="Supplier FOB SS - Supplier Laid-In SS"><span>Supplier GP SS:</span> <span className="font-semibold">{formatCurrency(calculations.supplierGrossProfitSS)}</span></p>
                                          <p className="flex justify-between" title="Dist Whsl Case SS - Dist Laid-In SS"><span>Distributor GP SS:</span> <span className="font-semibold">{formatCurrency(calculations.distributorGrossProfitSS)}</span></p>
                                      </div>
                                    </div>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              )}
            </div>
          )} {/* End Results Display Area */}
        </div> {/* End Results Panel Column */}
      </div> {/* End Main Layout Grid */}
    </div> /* End Container */
  );
};

export default WinePricingCalculator;