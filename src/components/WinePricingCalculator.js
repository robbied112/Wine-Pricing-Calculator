import React, { useState, useEffect, useCallback } from 'react';
import { Save, Download, Printer, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

// --- Constants ---
const DEFAULT_FORM_DATA = {
  calculationMode: 'forward', // 'forward' or 'reverse'
  wineName: '',
  currency: 'EUR', // Default to EUR as it requires exchange rate
  bottleCost: '',
  casePrice: '',
  casePackSize: 12,
  bottleSize: '750ml',
  exchangeRate: 1.10, // Default fallback
  exchangeBuffer: 5, // Default buffer %
  useCustomExchangeRate: false,
  customExchangeRate: '',
  diLogistics: 13, // USD per case
  tariff: 0, // Percentage
  statesideLogistics: 10, // USD per case
  supplierMargin: 30, // Percentage
  distributorMargin: 30, // Percentage
  distributorBtgMargin: 27, // Percentage
  retailerMargin: 33, // Percentage
  roundSrp: true, // Default to rounding SRP
  casesSold: '', // For GP calculation
  targetSrp: '', // For reverse calculation (USD)
};

const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

// --- Helper Functions ---

// Simple currency formatter (adapt as needed for locale/precision)
const formatCurrency = (value, currency = 'USD', maximumFractionDigits = 2) => {
  const number = Number(value);
  if (isNaN(number)) {
    return '$--.--'; // Or return an empty string or 'N/A'
  }
  try {
    return number.toLocaleString('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: maximumFractionDigits,
    });
  } catch (e) {
    // Fallback for invalid currency codes if needed, though USD/EUR should be fine
    return `$${number.toFixed(2)}`;
  }
};

// Function to safely create CSV cells (handles quotes and commas)
const escapeCsvCell = (cell) => {
    const stringValue = String(cell ?? ''); // Handle null/undefined
    // If the string contains a comma, double quote, or newline, wrap it in double quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        // Escape existing double quotes by doubling them
        const escapedString = stringValue.replace(/"/g, '""');
        return `"${escapedString}"`;
    }
    return stringValue; // Return as is if no special characters
};


// --- InputPanel Component ---
// (Keeping it within the same file for simplicity as it's tightly coupled)
const InputPanel = ({
  formData,
  handleInputChange, // Use the main handler passed from parent
  handleCurrencyChange,
  handleSelectChange,
  fetchCurrentExchangeRateWithCache,
  isExchangeRateLoading,
  exchangeRateError,
  showAdvanced,
  setShowAdvanced,
  errors
}) => {

  // No longer needed - logic moved to main handleInputChange
  // const handlePackOrBottleCostChange = (e) => { ... };

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100 print:hidden">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Input Parameters</h3>
      <div className="space-y-4">

        {/* Wine Name */}
        <div>
          <label htmlFor="wineName" className="block text-sm font-medium text-gray-700">Wine Name</label>
          <input
            type="text"
            id="wineName"
            name="wineName"
            value={formData.wineName}
            onChange={handleInputChange} // Use main handler
            placeholder="Enter wine name (optional)"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Calculation Mode */}
        <div>
          <label htmlFor="calculationMode" className="block text-sm font-medium text-gray-700">Calculation Mode</label>
          <select
            id="calculationMode"
            name="calculationMode"
            value={formData.calculationMode}
            onChange={handleSelectChange} // Use general select handler
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
          >
            <option value="forward">Forward (Cost to SRP)</option>
            <option value="reverse">Reverse (SRP to Cost)</option>
          </select>
        </div>

        {/* Supplier Cost Inputs */}
        {formData.calculationMode === 'forward' && (
          <div className="p-3 border rounded-md bg-gray-50">
             <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Cost ({formData.currency})</label>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="bottleCost" className="block text-xs font-medium text-gray-500">Bottle Cost</label>
                    <input
                        type="number"
                        id="bottleCost"
                        name="bottleCost"
                        value={formData.bottleCost}
                        onChange={handleInputChange} // Use main handler
                        placeholder="e.g., 5.00"
                        min="0"
                        step="0.01"
                        className={`mt-1 block w-full px-3 py-2 border ${errors.bottleCost ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
                </div>
                <div>
                     <label htmlFor="casePrice" className="block text-xs font-medium text-gray-500">Case Price</label>
                    <input
                        type="number"
                        id="casePrice"
                        name="casePrice"
                        value={formData.casePrice}
                        onChange={handleInputChange} // Use main handler
                        placeholder="e.g., 60.00"
                        min="0"
                        step="0.01"
                         className={`mt-1 block w-full px-3 py-2 border ${errors.casePrice ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
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
             <input
                 type="number"
                 id="targetSrp"
                 name="targetSrp"
                 value={formData.targetSrp}
                 onChange={handleInputChange} // Use main handler
                 placeholder="e.g., 19.99"
                 min="0"
                 step="0.01"
                 className={`mt-1 block w-full px-3 py-2 border ${errors.targetSrp ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
             />
             {errors.targetSrp && <p className="mt-1 text-xs text-red-600">{errors.targetSrp}</p>}
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
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                {/* Add other currencies if needed */}
            </select>
        </div>

        {/* Case Pack & Bottle Size */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="casePackSize" className="block text-sm font-medium text-gray-700">Case Pack</label>
            <select
                id="casePackSize"
                name="casePackSize"
                value={formData.casePackSize}
                onChange={handleSelectChange}
                 className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
            >
                <option value={1}>1</option>
                <option value={3}>3</option>
                <option value={6}>6</option>
                <option value={12}>12</option>
            </select>
          </div>
          <div>
            <label htmlFor="bottleSize" className="block text-sm font-medium text-gray-700">Bottle Size</label>
             <select
                id="bottleSize"
                name="bottleSize"
                value={formData.bottleSize}
                onChange={handleSelectChange}
                 className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
            >
                <option value="375ml">375ml</option>
                <option value="500ml">500ml</option>
                <option value="750ml">750ml</option>
                <option value="1000ml">1000ml (1L)</option>
                <option value="1500ml">1500ml (Magnum)</option>
            </select>
          </div>
        </div>

        {/* --- Exchange Rate Section (Conditional) --- */}
        {formData.currency === 'EUR' && (
          <div className="p-3 border rounded-md bg-gray-50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Exchange Rate (EUR to USD)</label>
              <button
                className="p-1 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => fetchCurrentExchangeRateWithCache(true)} // Force refresh on click
                title="Force refresh exchange rate (Uses API Credit)"
                disabled={isExchangeRateLoading || formData.useCustomExchangeRate}
                type="button"
                aria-label="Refresh Base Exchange Rate"
              >
                {isExchangeRateLoading ? <div className="w-3 h-3 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div> : <RefreshCw className="w-3 h-3"/>}
              </button>
            </div>

            {exchangeRateError && <p className="text-xs text-yellow-700 bg-yellow-100 p-1 rounded border border-yellow-200">Error: {exchangeRateError}. Using previous or default.</p>}

            <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Base Rate:</span>
                <input
                  type="number"
                  value={formData.exchangeRate?.toFixed(4) || ''}
                  readOnly // Make it read-only as it's fetched
                  className="mt-1 block w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm text-right"
                  aria-label="Fetched Exchange Rate"
                />
            </div>

             {/* Buffer or Custom Rate Toggle */}
            <div className="flex items-center space-x-2 mt-2">
                 <input
                    id="useCustomExchangeRate"
                    name="useCustomExchangeRate"
                    type="checkbox"
                    checked={formData.useCustomExchangeRate}
                    onChange={handleInputChange} // Standard checkbox handling
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                 />
                 <label htmlFor="useCustomExchangeRate" className="text-sm text-gray-600">Use Custom Rate</label>
            </div>

             {/* Conditional Inputs: Buffer or Custom Rate */}
            {formData.useCustomExchangeRate ? (
                 <div className="flex items-center space-x-2 mt-1">
                    <label htmlFor="customExchangeRate" className="text-sm text-gray-500 whitespace-nowrap">Custom Rate:</label>
                    <input
                      type="number"
                      id="customExchangeRate"
                      name="customExchangeRate"
                      value={formData.customExchangeRate}
                      onChange={handleInputChange} // Use main handler
                      min="0"
                      step="0.0001"
                      className={`mt-1 block w-24 px-2 py-1 border ${errors.customExchangeRate ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      placeholder="e.g., 1.1500"
                    />
                     {errors.customExchangeRate && <p className="mt-1 text-xs text-red-600">{errors.customExchangeRate}</p>}
                  </div>
            ) : (
                 <div className="flex items-center space-x-2 mt-1">
                     <label htmlFor="exchangeBuffer" className="text-sm text-gray-500 whitespace-nowrap">Buffer (%):</label>
                    <input
                      type="number"
                      id="exchangeBuffer"
                      name="exchangeBuffer"
                      value={formData.exchangeBuffer}
                      onChange={handleInputChange} // Use main handler
                      min="0"
                      max="100"
                      step="0.1"
                      className={`mt-1 block w-20 px-2 py-1 border ${errors.exchangeBuffer ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      placeholder="e.g., 5"
                    />
                     {errors.exchangeBuffer && <p className="mt-1 text-xs text-red-600">{errors.exchangeBuffer}</p>}
                 </div>
            )}
          </div>
        )}

        {/* --- Advanced Options Toggle --- */}
         <div className="mt-4">
             <button
                 type="button"
                 onClick={() => setShowAdvanced(!showAdvanced)}
                 className="flex items-center text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
             >
                 {showAdvanced ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                 {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
             </button>
         </div>

         {/* --- Advanced Options Section (Conditional) --- */}
        {showAdvanced && (
            <div className="p-3 border rounded-md bg-gray-50 space-y-3 mt-2">
                 <h4 className="text-sm font-medium text-gray-600 mb-2">Costs & Margins</h4>
                 {/* DI Logistics */}
                <div>
                    <label htmlFor="diLogistics" className="block text-xs font-medium text-gray-500">DI Logistics (USD/Case)</label>
                    <input
                        type="number" id="diLogistics" name="diLogistics" value={formData.diLogistics} onChange={handleInputChange}
                        min="0" step="0.01" placeholder="e.g., 13"
                        className={`mt-1 block w-full px-3 py-2 border ${errors.diLogistics ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
                         {errors.diLogistics && <p className="mt-1 text-xs text-red-600">{errors.diLogistics}</p>}
                </div>
                 {/* Tariff */}
                <div>
                     <label htmlFor="tariff" className="block text-xs font-medium text-gray-500">Tariff (%)</label>
                    <input
                        type="number" id="tariff" name="tariff" value={formData.tariff} onChange={handleInputChange}
                        min="0" max="200" step="0.1" placeholder="e.g., 0"
                        className={`mt-1 block w-full px-3 py-2 border ${errors.tariff ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
                         {errors.tariff && <p className="mt-1 text-xs text-red-600">{errors.tariff}</p>}
                </div>
                {/* Stateside Logistics */}
                <div>
                     <label htmlFor="statesideLogistics" className="block text-xs font-medium text-gray-500">Stateside Logistics (USD/Case)</label>
                    <input
                        type="number" id="statesideLogistics" name="statesideLogistics" value={formData.statesideLogistics} onChange={handleInputChange}
                        min="0" step="0.01" placeholder="e.g., 10"
                        className={`mt-1 block w-full px-3 py-2 border ${errors.statesideLogistics ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
                         {errors.statesideLogistics && <p className="mt-1 text-xs text-red-600">{errors.statesideLogistics}</p>}
                </div>
                 {/* Margins */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="supplierMargin" className="block text-xs font-medium text-gray-500">Supplier Margin (%)</label>
                        <input
                            type="number" id="supplierMargin" name="supplierMargin" value={formData.supplierMargin} onChange={handleInputChange}
                            min="0" max="100" step="0.1" placeholder="e.g., 30"
                            className={`mt-1 block w-full px-3 py-2 border ${errors.supplierMargin ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
                             {errors.supplierMargin && <p className="mt-1 text-xs text-red-600">{errors.supplierMargin}</p>}
                    </div>
                     <div>
                        <label htmlFor="distributorMargin" className="block text-xs font-medium text-gray-500">Distributor Margin (%)</label>
                        <input
                            type="number" id="distributorMargin" name="distributorMargin" value={formData.distributorMargin} onChange={handleInputChange}
                            min="0" max="100" step="0.1" placeholder="e.g., 30"
                            className={`mt-1 block w-full px-3 py-2 border ${errors.distributorMargin ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
                             {errors.distributorMargin && <p className="mt-1 text-xs text-red-600">{errors.distributorMargin}</p>}
                    </div>
                     <div>
                        <label htmlFor="distributorBtgMargin" className="block text-xs font-medium text-gray-500">Dist. BTG Margin (%)</label>
                        <input
                            type="number" id="distributorBtgMargin" name="distributorBtgMargin" value={formData.distributorBtgMargin} onChange={handleInputChange}
                            min="0" max="100" step="0.1" placeholder="e.g., 27"
                            className={`mt-1 block w-full px-3 py-2 border ${errors.distributorBtgMargin ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
                             {errors.distributorBtgMargin && <p className="mt-1 text-xs text-red-600">{errors.distributorBtgMargin}</p>}
                    </div>
                    <div>
                         <label htmlFor="retailerMargin" className="block text-xs font-medium text-gray-500">Retailer Margin (%)</label>
                        <input
                            type="number" id="retailerMargin" name="retailerMargin" value={formData.retailerMargin} onChange={handleInputChange}
                            min="0" max="100" step="0.1" placeholder="e.g., 33"
                            className={`mt-1 block w-full px-3 py-2 border ${errors.retailerMargin ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
                             {errors.retailerMargin && <p className="mt-1 text-xs text-red-600">{errors.retailerMargin}</p>}
                    </div>
                </div>
                {/* Round SRP Toggle */}
                <div className="flex items-center space-x-2">
                     <input
                        id="roundSrp"
                        name="roundSrp"
                        type="checkbox"
                        checked={formData.roundSrp}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                     />
                     <label htmlFor="roundSrp" className="text-sm text-gray-600">Round SRP to nearest .99?</label>
                </div>
                {/* Cases Sold for GP */}
                <div>
                     <label htmlFor="casesSold" className="block text-xs font-medium text-gray-500">Cases Sold (for GP Calc)</label>
                    <input
                        type="number" id="casesSold" name="casesSold" value={formData.casesSold} onChange={handleInputChange}
                        min="0" step="1" placeholder="e.g., 100"
                        className={`mt-1 block w-full px-3 py-2 border ${errors.casesSold ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
                         {errors.casesSold && <p className="mt-1 text-xs text-red-600">{errors.casesSold}</p>}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

// --- Main Calculator Component ---
const WinePricingCalculator = () => {
  const [formData, setFormData] = useState(() => {
        // Initialize with defaults, but try to get cached rate if available
        const cachedRate = localStorage.getItem('cachedRateEURUSD');
        const rate = cachedRate ? parseFloat(cachedRate) : DEFAULT_FORM_DATA.exchangeRate;
        return {
            ...DEFAULT_FORM_DATA,
            exchangeRate: rate,
            customExchangeRate: rate, // Default custom rate to cached/default rate
        };
    });
  const [calculations, setCalculations] = useState({});
  const [errors, setErrors] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [isExchangeRateLoading, setIsExchangeRateLoading] = useState(false);
  const [exchangeRateError, setExchangeRateError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showGrossProfit, setShowGrossProfit] = useState(false);

  // --- API Key Access ---
  // Ensure your API key is in a .env file at the root of your project:
  // REACT_APP_EXCHANGE_RATE_API_KEY=your_actual_api_key
  const apiKey = process.env.REACT_APP_EXCHANGE_RATE_API_KEY;

  // --- Exchange Rate Fetching with Cache ---
  const fetchCurrentExchangeRateWithCache = useCallback(async (forceRefresh = false) => {
    // Don't fetch if currency is USD
     if (formData.currency !== 'EUR') {
         setExchangeRateError(null); // Clear error if currency changed away from EUR
         return;
     }
    // Don't fetch if using custom rate unless force refreshing the BASE rate
    // (Force refresh should update the base even if custom is selected)
    // if (formData.useCustomExchangeRate && !forceRefresh) {
    //      setExchangeRateError(null); // Clear error if switching to custom
    //     return;
    // }

    const now = Date.now();
    const lastFetchTimeString = localStorage.getItem('lastFetchTime');
    const lastFetchTime = lastFetchTimeString ? parseInt(lastFetchTimeString, 10) : 0;
    const cachedRateString = localStorage.getItem('cachedRateEURUSD');

    // Use cache if available and not expired, unless forceRefresh is true
    if (!forceRefresh && cachedRateString && now - lastFetchTime < CACHE_DURATION_MS) {
      console.log("Using cached exchange rate.");
      const cachedRate = parseFloat(cachedRateString);
       if (!isNaN(cachedRate)) {
           // Update state if the cached rate differs from the current state rate
           if (cachedRate !== formData.exchangeRate) {
               setFormData(prev => ({ ...prev, exchangeRate: cachedRate }));
           }
           setExchangeRateError(null); // Clear any previous error
           return; // Exit early
       } else {
           console.warn("Invalid cached rate found.");
       }
    }

    // Proceed to fetch if no cache, cache expired, or forceRefresh
    setIsExchangeRateLoading(true);
    setExchangeRateError(null);
    console.log("Fetching fresh exchange rate...");

    if (!apiKey) {
        setExchangeRateError("API Key missing. Please configure .env file.");
        setIsExchangeRateLoading(false);
         console.error("API Key (REACT_APP_EXCHANGE_RATE_API_KEY) is not defined.");
         // Use default/previous rate as fallback
         const fallbackRate = cachedRateString ? parseFloat(cachedRateString) : DEFAULT_FORM_DATA.exchangeRate;
         setFormData(prev => ({
              ...prev,
              exchangeRate: fallbackRate
          }));
        return;
    }

    try {
      // Use the /live endpoint which requires 'access_key' and optionally 'source' and 'currencies'
      // NOTE: The free plan on exchangerate.host might NOT support 'source' or 'currencies' filtering.
      // It might always return EUR as base if your account is set to EUR.
      // Fetching all rates (default) and extracting EURUSD might be necessary.
      // const response = await fetch(`https://api.exchangerate.host/live?access_key=${apiKey}&source=EUR&currencies=USD`);
      const response = await fetch(`https://api.exchangerate.host/live?access_key=${apiKey}`); // Fetch default base (likely EUR)

      // Check if the response is ok (status in the range 200-299)
      if (!response.ok) {
           let errorMsg = `HTTP error! status: ${response.status}`;
           try {
               const errorData = await response.json();
               errorMsg += ` - ${errorData?.error?.info || response.statusText}`;
           } catch (e) { /* Ignore if response body is not JSON */ }
           throw new Error(errorMsg);
       }

      const data = await response.json();

      // Validate the response structure for /live endpoint
      // Adapt based on whether 'source'/'currencies' is supported or if you need to find USD rate from default EUR base
       if (data && data.success && data.quotes && data.quotes.USD !== undefined && data.base === 'EUR') {
          // If base is EUR and USD quote exists
          const rate = data.quotes.USD;
          console.log("Fetched Rate EUR to USD:", rate);

          // Update state and localStorage
          setFormData(prev => ({
              ...prev,
              exchangeRate: rate,
              // Also update custom rate if user wasn't actively using it, to keep it fresh
               customExchangeRate: prev.useCustomExchangeRate ? prev.customExchangeRate : rate
          }));
          localStorage.setItem('cachedRateEURUSD', rate.toString());
          localStorage.setItem('lastFetchTime', now.toString());
          setExchangeRateError(null); // Clear error on success

       } else if (data && data.success && data.quotes && data.quotes.EURUSD !== undefined) {
          // If API provided EURUSD directly (e.g., maybe base was USD or source/currency worked)
          const rate = data.quotes.EURUSD;
          console.log("Fetched Rate EUR to USD:", rate);
          setFormData(prev => ({
              ...prev,
              exchangeRate: rate,
              customExchangeRate: prev.useCustomExchangeRate ? prev.customExchangeRate : rate
          }));
          localStorage.setItem('cachedRateEURUSD', rate.toString());
          localStorage.setItem('lastFetchTime', now.toString());
          setExchangeRateError(null);

      } else {
           console.error("Invalid data structure received from API or EUR/USD quote missing:", data);
           // Provide more specific feedback based on API error if available
           const apiErrorInfo = data?.error?.info || 'Unexpected response format or missing quote.';
           throw new Error(`Could not parse rate: ${apiErrorInfo}`);
      }
    } catch (error) {
      console.error("Error fetching exchange rate:", error);
      setExchangeRateError(`Could not fetch rate: ${error.message}. Using previous or default.`);
      // Use cached rate as fallback if available, otherwise default
       const fallbackRate = cachedRateString ? parseFloat(cachedRateString) : DEFAULT_FORM_DATA.exchangeRate;
       setFormData(prev => ({ ...prev, exchangeRate: fallbackRate }));
    } finally {
      setIsExchangeRateLoading(false);
    }
  }, [apiKey, formData.currency, formData.exchangeRate]); // Added formData.exchangeRate dependency to handle cache update


  // --- Calculation Logic ---
  const calculatePricing = useCallback(() => {
    console.log("Calculating pricing with formData:", formData);
    setIsCalculating(true);
    // Clear calculation errors, keep input errors
    setErrors(prev => ({
      ...prev,
      calculation: null, // Clear specific calculation errors
      costInput: null,    // Clear combined cost error
      targetSrp: formData.calculationMode === 'reverse' && !parseFloat(formData.targetSrp) ? prev.targetSrp : null, // Keep targetSrp error if relevant
    }));

    // --- Input Parsing and Validation ---
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

    let effectiveExchangeRate;
    if (formData.currency === 'USD') {
      effectiveExchangeRate = 1; // 1:1 conversion
    } else if (formData.useCustomExchangeRate && !isNaN(customRate) && customRate > 0) {
        effectiveExchangeRate = customRate;
    } else if (!isNaN(fetchedRate) && fetchedRate > 0) {
        effectiveExchangeRate = fetchedRate * (1 + exchangeBuffer / 100);
    } else {
        // Fallback if fetched rate is somehow invalid and not using custom
        effectiveExchangeRate = DEFAULT_FORM_DATA.exchangeRate * (1 + (formData.exchangeBuffer || 0) / 100);
        setErrors(prev => ({ ...prev, calculation: "Valid exchange rate unavailable. Using default/fallback." }));
    }

    let baseBottleCostOriginal = null; // Supplier cost in original currency (for reverse calc)
    let baseCasePriceOriginal = null; // Supplier cost in original currency (for reverse calc)
    let caseCostUSD = 0; // This will be our starting point in USD

    // --- Determine Base Cost in USD ---
    if (formData.calculationMode === 'forward') {
      let baseCostOriginal = 0;
      if (bottleCost > 0 && casePrice > 0) {
           // Prioritize bottle cost if both are entered? Or use which was entered last? Let's use bottle cost.
           console.warn("Both bottle and case cost entered, using bottle cost.");
           baseCostOriginal = bottleCost * casePack;
      } else if (bottleCost > 0) {
        baseCostOriginal = bottleCost * casePack;
      } else if (casePrice > 0) {
        baseCostOriginal = casePrice;
      } else {
        // Only set error if calculation attempted (not on initial load)
        if (formData.bottleCost !== '' || formData.casePrice !== '') { // Check if user actually interacted
             setErrors(prev => ({ ...prev, costInput: `Enter valid ${formData.currency} Bottle Cost or Case Price.` }));
        }
        setIsCalculating(false);
        setCalculations({});
        return;
      }
      caseCostUSD = baseCostOriginal * effectiveExchangeRate;
      baseCasePriceOriginal = baseCostOriginal; // Store for potential display consistency
      baseBottleCostOriginal = baseCostOriginal / casePack;

    } else { // Reverse Mode
      if (targetSrp <= 0) {
        // Only set error if calculation attempted
         if (formData.targetSrp !== '') {
             setErrors(prev => ({ ...prev, targetSrp: "Enter valid Target SRP (USD)." }));
         }
        setIsCalculating(false);
        setCalculations({});
        return;
      }

      // Work backwards from SRP (USD) to find the equivalent Base Case Cost (USD)
      let distWholesaleBottleSS_USD;
      const retailerMarginFrac = retailerMarginPercent / 100;
      const distributorMarginFrac = distributorMarginPercent / 100;
      const supplierMarginFrac = supplierMarginPercent / 100;
      const tariffFrac = tariffPercent / 100;

      // Check for invalid margins that would cause division by zero or negative results
      if (retailerMarginFrac >= 1 || distributorMarginFrac >= 1 || supplierMarginFrac >= 1) {
          setErrors(prev => ({ ...prev, calculation: "Invalid margin(s) >= 100%. Cannot calculate." }));
          setIsCalculating(false);
          setCalculations({});
          return;
      }


      if (formData.roundSrp) {
          const roundedSrp = Math.floor(targetSrp) + 0.99;
           distWholesaleBottleSS_USD = roundedSrp * (1 - retailerMarginFrac);
      } else {
           distWholesaleBottleSS_USD = targetSrp * (1 - retailerMarginFrac);
      }

       const distCaseWholesaleSS_USD = distWholesaleBottleSS_USD * casePack;
       const distLaidInCostSS_USD = distCaseWholesaleSS_USD * (1 - distributorMarginFrac);
       const supplierFobSS_USD = distLaidInCostSS_USD - statesideLogistics;

       // Handle potential negative FOB if logistics > derived wholesale cost
        if (supplierFobSS_USD <= 0) {
            setErrors(prev => ({ ...prev, calculation: "Target SRP too low for specified logistics/margins (Negative FOB)." }));
            setIsCalculating(false);
            setCalculations({});
            return;
        }

       const supplierLaidInCostSS_USD = supplierFobSS_USD * (1 - supplierMarginFrac); // Cost before SS logistics added
       const supplierLaidInCostDI_USD = supplierLaidInCostSS_USD; // Supplier DI cost is same before DI logistics

       // Cost = LaidIn/(1+T%) -> caseCostUSD * (1 + tariffFrac) + diLogistics = supplierLaidInCostDI_USD
       caseCostUSD = (supplierLaidInCostDI_USD - diLogistics) / (1 + tariffFrac);

        // Validate calculated base cost
       if (caseCostUSD <= 0 || !isFinite(caseCostUSD)) {
           setErrors(prev => ({ ...prev, calculation: "Cannot derive a valid supplier cost. Check margins/SRP/costs." }));
           setIsCalculating(false);
           setCalculations({});
           return;
       }

       // Convert Base Case Cost (USD) back to original currency
        if (effectiveExchangeRate <= 0) {
             setErrors(prev => ({ ...prev, calculation: "Invalid effective exchange rate (<=0). Cannot derive original cost." }));
             setIsCalculating(false);
             setCalculations({});
             return;
        }
       baseCasePriceOriginal = caseCostUSD / effectiveExchangeRate;
       baseBottleCostOriginal = baseCasePriceOriginal / casePack;
    }


    // Validate Margins (prevent division by zero or negative margins) during forward calculation
    const marginCheck = (margin, name) => {
        if (isNaN(margin) || margin >= 100 || margin < 0) {
             console.error(`Invalid ${name}: ${margin}`);
            throw new Error(`Invalid ${name} (${margin}%). Must be between 0 and 99.99.`);
        }
        return margin / 100;
    };

    let tariffAmountUSD, supplierLaidInCostDI_USD, supplierFobDI_USD, distributorLaidInCostDI_USD;
    let distCaseWholesaleDI_USD, distBottleWholesaleDI_USD, distBtgPriceDI_USD, srpDi_USD;
    let supplierLaidInCostSS_USD, supplierFobSS_USD, distributorLaidInCostSS_USD;
    let distCaseWholesaleSS_USD, distBottleWholesaleSS_USD, distBtgPriceSS_USD, srpSs_USD;
    let originalDistCaseWholesaleDI_USD = null;
    let originalDistBottleWholesaleDI_USD = null;
    let originalDistCaseWholesaleSS_USD = null;
    let originalDistBottleWholesaleSS_USD = null;

    try {
        const supplierMargin = marginCheck(supplierMarginPercent, "Supplier Margin");
        const distributorMargin = marginCheck(distributorMarginPercent, "Distributor Margin");
        const distBtgMargin = marginCheck(distBtgMarginPercent, "Distributor BTG Margin");
        const retailerMargin = marginCheck(retailerMarginPercent, "Retailer Margin");

        // --- Forward Calculations (common part) ---
        tariffAmountUSD = caseCostUSD * (tariffPercent / 100);

        // --- Direct Import (DI) Calculations ---
        supplierLaidInCostDI_USD = caseCostUSD + tariffAmountUSD + diLogistics;
        supplierFobDI_USD = supplierLaidInCostDI_USD / (1 - supplierMargin);
        distributorLaidInCostDI_USD = supplierFobDI_USD; // Supplier FOB is Distributor Laid-In for DI
        distCaseWholesaleDI_USD = distributorLaidInCostDI_USD / (1 - distributorMargin);
        distBottleWholesaleDI_USD = distCaseWholesaleDI_USD / casePack;
        distBtgPriceDI_USD = distBottleWholesaleDI_USD / (1 - distBtgMargin); // BTG price from Whsl Bottle
        srpDi_USD = distBottleWholesaleDI_USD / (1 - retailerMargin);

        // --- Stateside (SS) Calculations ---
        supplierLaidInCostSS_USD = caseCostUSD + tariffAmountUSD + diLogistics; // Same starting point as DI Supp Laid In
        supplierFobSS_USD = supplierLaidInCostSS_USD / (1 - supplierMargin);
        distributorLaidInCostSS_USD = supplierFobSS_USD + statesideLogistics; // Add SS logistics
        distCaseWholesaleSS_USD = distributorLaidInCostSS_USD / (1 - distributorMargin);
        distBottleWholesaleSS_USD = distCaseWholesaleSS_USD / casePack;
        distBtgPriceSS_USD = distBottleWholesaleSS_USD / (1 - distBtgMargin); // BTG price from Whsl Bottle
        srpSs_USD = distBottleWholesaleSS_USD / (1 - retailerMargin);

        // --- Apply SRP Rounding (if enabled) ---
        if (formData.roundSrp) {
            // Store original values before rounding
            originalDistCaseWholesaleDI_USD = distCaseWholesaleDI_USD;
            originalDistBottleWholesaleDI_USD = distBottleWholesaleDI_USD;
            originalDistCaseWholesaleSS_USD = distCaseWholesaleSS_USD;
            originalDistBottleWholesaleSS_USD = distBottleWholesaleSS_USD;

            // Round SRPs
            const roundedSrpDi = Math.floor(srpDi_USD) + 0.99;
            const roundedSrpSs = Math.floor(srpSs_USD) + 0.99;

             // Recalculate backwards from rounded SRP to get adjusted wholesale prices
            distBottleWholesaleDI_USD = roundedSrpDi * (1 - retailerMargin);
            distCaseWholesaleDI_USD = distBottleWholesaleDI_USD * casePack;
            // Check distBtgMargin before division
            distBtgPriceDI_USD = distBtgMargin < 1 ? distBottleWholesaleDI_USD / (1 - distBtgMargin) : Infinity;

            distBottleWholesaleSS_USD = roundedSrpSs * (1 - retailerMargin);
            distCaseWholesaleSS_USD = distBottleWholesaleSS_USD * casePack;
            // Check distBtgMargin before division
            distBtgPriceSS_USD = distBtgMargin < 1 ? distBottleWholesaleSS_USD / (1 - distBtgMargin) : Infinity;

            // Update final SRPs to the rounded values
            srpDi_USD = roundedSrpDi;
            srpSs_USD = roundedSrpSs;
        }

         // --- Gross Profit Calculations (if casesSold > 0) ---
         let supplierGrossProfitDI = null;
         let distributorGrossProfitDI = null;
         let supplierGrossProfitSS = null;
         let distributorGrossProfitSS = null;

         if (casesSold > 0) {
             supplierGrossProfitDI = (supplierFobDI_USD - supplierLaidInCostDI_USD) * casesSold;
             distributorGrossProfitDI = (distCaseWholesaleDI_USD - distributorLaidInCostDI_USD) * casesSold;
             supplierGrossProfitSS = (supplierFobSS_USD - supplierLaidInCostSS_USD) * casesSold;
             distributorGrossProfitSS = (distCaseWholesaleSS_USD - distributorLaidInCostSS_USD) * casesSold;
         }

        // --- Set Results ---
        setCalculations({
            effectiveExchangeRate,
            caseCostUSD,
            tariffAmountUSD,
            // DI
            supplierLaidInCostDI_USD,
            supplierFobDI_USD,
            distributorLaidInCostDI_USD,
            distCaseWholesaleDI_USD,
            distBottleWholesaleDI_USD,
            distBtgPriceDI_USD,
            srpDi_USD,
            originalDistCaseWholesaleDI_USD, // Will be null if rounding is off
            originalDistBottleWholesaleDI_USD, // Will be null if rounding is off
            // SS
            supplierLaidInCostSS_USD,
            supplierFobSS_USD,
            distributorLaidInCostSS_USD,
            distCaseWholesaleSS_USD,
            distBottleWholesaleSS_USD,
            distBtgPriceSS_USD,
            srpSs_USD,
            originalDistCaseWholesaleSS_USD, // Will be null if rounding is off
            originalDistBottleWholesaleSS_USD, // Will be null if rounding is off
            // GP
            supplierGrossProfitDI,
            distributorGrossProfitDI,
            supplierGrossProfitSS,
            distributorGrossProfitSS,
            // Reverse Mode Specific
            baseBottleCostOriginal, // Original currency bottle cost derived
            baseCasePriceOriginal   // Original currency case price derived
        });

    } catch (error) {
        console.error("Calculation Error:", error);
        setErrors(prev => ({ ...prev, calculation: error.message }));
        setCalculations({}); // Clear results on error
    } finally {
        setIsCalculating(false);
    }
  }, [formData]); // Dependency: Recalculate whenever formData changes


  // --- Input Change Handler (Corrected for counterpart cost calculation) ---
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;
    let error = "";

    const numericFields = [
      "bottleCost", "casePrice", "targetSrp", "exchangeRate", "customExchangeRate",
      "exchangeBuffer", "diLogistics", "tariff", "statesideLogistics",
      "supplierMargin", "distributorMargin", "distributorBtgMargin", "retailerMargin",
      "casesSold"
    ];

    // Use a temporary object to hold updates for this change event
    let updates = { [name]: newValue };

    if (numericFields.includes(name)) {
      if (newValue !== "" ) {
        const num = parseFloat(newValue);
        if(isNaN(num)) {
          // If parsing fails, set error but keep the invalid input temporarily for user feedback
          error = "Invalid number";
          // updates[name] = formData[name] || ""; // Option: revert, but maybe confusing
        } else {
          // Basic range checks (more comprehensive checks in calculatePricing)
          if (["supplierMargin", "distributorMargin", "distributorBtgMargin", "retailerMargin"].includes(name) && (num < 0 || num >= 100)) { error = "Must be 0-99.99"; }
          else if (["bottleCost", "casePrice", "targetSrp", "diLogistics", "statesideLogistics", "casesSold", "exchangeRate", "customExchangeRate", "exchangeBuffer"].includes(name) && num < 0) { error = "Cannot be negative"; }
          else if (name === "tariff" && (num < 0 || num > 200)) { error = "Must be 0-200"; }
          else { error = ""; } // Clear error if it seems valid for now

          // --- Counterpart Calculation Logic ---
          const currentMode = formData.calculationMode; // Use previous state for checks
          const casePack = parseInt(formData.casePackSize, 10);
          if (currentMode === 'forward' && !isNaN(casePack) && casePack > 0 && !isNaN(num) && num >= 0) {
              if (name === 'bottleCost') {
                  const calculatedCasePrice = (num * casePack).toFixed(2);
                  updates.casePrice = calculatedCasePrice; // Add casePrice to updates
              } else if (name === 'casePrice') {
                  const calculatedBottleCost = (num / casePack).toFixed(4); // More precision for bottle cost derived
                  updates.bottleCost = calculatedBottleCost; // Add bottleCost to updates
              }
          }
          // --- End Counterpart Logic ---

          // Use the raw input value for the field being directly edited
          updates[name] = value;
        }
      } else { // Field was cleared
         error = "";
         // Clear counterpart if one is cleared in forward mode
         const currentMode = formData.calculationMode; // Use previous state
         if (currentMode === 'forward') {
              if (name === 'bottleCost') { updates.casePrice = ""; }
              else if (name === 'casePrice') { updates.bottleCost = ""; }
         }
      }
    }

    // Update errors state separately for the specific field
    setErrors((prev) => ({ ...prev, [name]: error }));

    // Update form data state using the 'updates' object
    setFormData((prev) => {
      let newState = { ...prev, ...updates }; // Apply all accumulated updates

      // Mode switch logic (clear other mode's primary input)
      if (name === 'calculationMode') {
        if (newValue === 'reverse') {
            newState.bottleCost = '';
            newState.casePrice = '';
            // Clear potentially irrelevant errors
            setErrors(e => ({...e, bottleCost: null, casePrice: null, costInput: null}));
        } else if (newValue === 'forward') {
            newState.targetSrp = '';
             // Clear potentially irrelevant errors
            setErrors(e => ({...e, targetSrp: null}));
        }
      }
      // If casePackSize changes in forward mode, recalc casePrice from bottleCost
      else if (name === 'casePackSize' && newState.calculationMode === 'forward') {
          const existingBottleCost = parseFloat(newState.bottleCost);
          const newCasePack = parseInt(newValue, 10); // Use updated case pack size from 'newValue'
          if (!isNaN(existingBottleCost) && existingBottleCost > 0 && !isNaN(newCasePack) && newCasePack > 0) {
              newState.casePrice = (existingBottleCost * newCasePack).toFixed(2);
          } else if (newState.bottleCost !== '') { // Only clear case price if bottle cost was not empty
              // If bottle cost isn't valid, clear case price to avoid inconsistency
              newState.casePrice = "";
          }
      }
      // Reset custom rate display if base rate changes and override is off
       if (name === 'exchangeRate' && !newState.useCustomExchangeRate) {
           const newRate = parseFloat(updates.exchangeRate); // Use the rate from updates
           newState.customExchangeRate = !isNaN(newRate) ? newRate.toFixed(4) : DEFAULT_FORM_DATA.customExchangeRate;
       }

      return newState;
    });

  }, [formData]); // Keep dependency on full formData to access other values like casePackSize, mode


  const handleSelectChange = useCallback((e) => {
    const { name, value } = e.target;
     // Parse casePackSize as integer
    const processedValue = name === 'casePackSize' ? parseInt(value, 10) : value;

    // Trigger handleInputChange logic for casePackSize to update counterpart cost
    if (name === 'casePackSize') {
        handleInputChange(e); // Simulate input change to trigger recalc
    } else {
        // For other selects, update directly
        setFormData(prev => ({
            ...prev,
            [name]: processedValue
        }));
    }
  }, [handleInputChange]); // Need handleInputChange as dependency

  const handleCurrencyChange = useCallback((e) => {
    const newCurrency = e.target.value;
    setFormData(prev => {
        const newState = { ...prev, currency: newCurrency };
        // Clear cost inputs when currency changes to avoid confusion
        newState.bottleCost = '';
        newState.casePrice = '';
        // Optionally reset custom rate toggle if desired when switching currency
        // newState.useCustomExchangeRate = false;
        return newState;
    });
    // Clear related errors
    setErrors(e => ({...e, bottleCost: null, casePrice: null, costInput: null}));

    // If switching TO EUR, trigger a rate fetch/cache check AFTER state update
    if (newCurrency === 'EUR') {
        // Use timeout to ensure state update is processed before fetch check
         setTimeout(() => fetchCurrentExchangeRateWithCache(false), 0);
    }
 }, [fetchCurrentExchangeRateWithCache]);


  // --- Effects ---

  // Initial Exchange Rate Fetch on Load (if currency is EUR)
  useEffect(() => {
    if (formData.currency === 'EUR' && !formData.useCustomExchangeRate) {
        fetchCurrentExchangeRateWithCache(false); // false = use cache if valid
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Trigger calculation when relevant formData changes (debounced slightly)
  useEffect(() => {
    // Debounce calculation to prevent rapid updates while typing
    const handler = setTimeout(() => {
      // Check if calculation is feasible before running
       if (formData.calculationMode === 'forward' && (formData.bottleCost || formData.casePrice)) {
          calculatePricing();
       } else if (formData.calculationMode === 'reverse' && formData.targetSrp) {
           calculatePricing();
       } else {
           // If primary inputs are missing, clear results but don't set calculation error yet
            setCalculations({});
            // Optional: Clear previous calculation error if inputs are now invalid/empty
            // setErrors(prev => ({...prev, calculation: null}));
       }
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(handler); // Clear timeout if formData changes again quickly
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
      formData.calculationMode, formData.bottleCost, formData.casePrice, formData.casePackSize,
      formData.currency, formData.exchangeRate, formData.exchangeBuffer, formData.useCustomExchangeRate, formData.customExchangeRate,
      formData.diLogistics, formData.tariff, formData.statesideLogistics,
      formData.supplierMargin, formData.distributorMargin, formData.distributorBtgMargin, formData.retailerMargin,
      formData.roundSrp, formData.targetSrp, formData.casesSold,
      calculatePricing // Include the callback itself
    ]);

  // --- Action Handlers (Save, Export, Print, Reset) ---

  const handleSaveClick = () => {
    if (isCalculating) {
        alert("Please wait for calculations to finish before saving.");
        return;
    }
    // Check if there are results to save
    if (!calculations || Object.keys(calculations).length === 0) {
       alert("No calculation results to save. Please enter inputs first.");
       return;
    }

    // Suggest a name based on wine name or timestamp
    const defaultName = formData.wineName || `Calculation ${new Date().toLocaleString()}`;
    const calculationName = prompt("Enter a name for this calculation:", defaultName);

    // Proceed only if user provides a name (didn't click cancel)
    if (calculationName) {
        const savedData = {
            id: Date.now(), // Simple unique ID using timestamp
            name: calculationName,
            timestamp: new Date().toISOString(),
            inputs: formData,
            results: calculations, // Save the raw calculated numbers
        };

        try {
            // Retrieve existing saves, defaulting to an empty array
            const existingSavesJson = localStorage.getItem('winePricingSaves');
            let existingSaves = [];
            if (existingSavesJson) {
                try {
                    existingSaves = JSON.parse(existingSavesJson);
                    // Ensure it's an array
                    if (!Array.isArray(existingSaves)) {
                        console.warn("Invalid data in localStorage 'winePricingSaves', resetting.");
                        existingSaves = [];
                    }
                } catch (parseError) {
                    console.error("Error parsing localStorage 'winePricingSaves':", parseError);
                    existingSaves = []; // Reset if parsing fails
                }
            }

            // Add the new save and store back to localStorage
            existingSaves.push(savedData);
            localStorage.setItem('winePricingSaves', JSON.stringify(existingSaves));
            alert(`Calculation "${savedData.name}" saved successfully!`);
        } catch (storageError) {
            console.error("Failed to save to localStorage:", storageError);
            alert('Failed to save calculation. Local storage might be full or unavailable.');
        }
    } else {
        alert("Save cancelled.");
    }
  };


  const handleExportClick = () => {
     if (isCalculating) {
        alert("Please wait for calculations to finish before exporting.");
        return;
     }
      if (!calculations || Object.keys(calculations).length === 0) {
        alert("No calculation results to export. Please enter inputs first.");
        return;
     }

     // Define CSV structure
     const csvRows = [
        // Header Info
        ['Wine Pricing Calculator Export'],
        ['Wine Name', formData.wineName || 'N/A'],
        ['Generated', new Date().toLocaleString()],
        [], // Blank row
        // Inputs Section
        ['Input Parameter', 'Value', 'Units'],
        ['Calculation Mode', formData.calculationMode, ''],
        ['Supplier Cost Currency', formData.currency, ''],
        ['Bottle Cost Input', formData.bottleCost || 'N/A', formData.currency],
        ['Case Price Input', formData.casePrice || 'N/A', formData.currency],
        ['Case Pack Size', formData.casePackSize, 'bottles'],
        ['Bottle Size', formData.bottleSize, ''],
        ['Target SRP (Reverse Mode)', formData.calculationMode === 'reverse' ? formData.targetSrp || 'N/A' : 'N/A', 'USD'],
        [], // Blank row
        ['Exchange Rate (EUR to USD)'],
        ['Base Rate Fetched/Set', calculations.effectiveExchangeRate ? (formData.exchangeRate?.toFixed(4) || 'N/A') : 'N/A', ''], // Show base rate from state
        ['Buffer', formData.useCustomExchangeRate ? 'N/A' : formData.exchangeBuffer, formData.useCustomExchangeRate ? '' : '%'],
        ['Custom Rate Used', formData.useCustomExchangeRate ? formData.customExchangeRate : 'N/A', ''],
        ['Effective Rate Applied', calculations.effectiveExchangeRate?.toFixed(4) || 'N/A', ''],
        [], // Blank row
        ['Costs & Margins'],
        ['DI Logistics', formData.diLogistics, 'USD/case'],
        ['Tariff', formData.tariff, '%'],
        ['Stateside Logistics', formData.statesideLogistics, 'USD/case'],
        ['Supplier Margin', formData.supplierMargin, '%'],
        ['Distributor Margin', formData.distributorMargin, '%'],
        ['Distributor BTG Margin', formData.distributorBtgMargin, '%'],
        ['Retailer Margin', formData.retailerMargin, '%'],
        ['Round SRP?', formData.roundSrp ? 'Yes' : 'No', ''],
        ['Cases Sold (for GP)', formData.casesSold || 'N/A', 'cases'],
        [], // Blank row

        // Derived Original Cost (Reverse Mode Only)
        ...(formData.calculationMode === 'reverse' ? [
            ['Derived Supplier Cost (Reverse Calc)'],
            ['Derived Bottle Cost', calculations.baseBottleCostOriginal?.toFixed(4) || 'N/A', formData.currency],
            ['Derived Case Price', calculations.baseCasePriceOriginal?.toFixed(4) || 'N/A', formData.currency],
            ['Equivalent Base Case Cost (USD)', formatCurrency(calculations.caseCostUSD), 'USD'],
            [], // Blank row
        ] : []),

        // Direct Import Results
        ['Direct Import Pricing (USD)'],
        ['Metric', 'Value'],
        ['Base Case Cost (USD)', formatCurrency(calculations.caseCostUSD)],
        ['Tariff Amount', formatCurrency(calculations.tariffAmountUSD)],
        ['Supp. Laid-In DI', formatCurrency(calculations.supplierLaidInCostDI_USD)],
        ['Supp. FOB DI', formatCurrency(calculations.supplierFobDI_USD)],
        ['Dist. Laid-In DI', formatCurrency(calculations.distributorLaidInCostDI_USD)],
        ['Dist. Whsl Case DI', formatCurrency(calculations.distCaseWholesaleDI_USD)],
        ['Dist. Whsl Bottle DI', formatCurrency(calculations.distBottleWholesaleDI_USD)],
        ['Dist. BTG Bottle DI', formatCurrency(calculations.distBtgPriceDI_USD)],
        ['SRP (DI)', formatCurrency(calculations.srpDi_USD)],
        ...(formData.roundSrp && calculations.originalDistCaseWholesaleDI_USD !== null ? [ // Check for null explicitly
            ['Original Whsl Case DI (Pre-Rounding)', formatCurrency(calculations.originalDistCaseWholesaleDI_USD)],
            ['Original Whsl Bottle DI (Pre-Rounding)', formatCurrency(calculations.originalDistBottleWholesaleDI_USD)],
        ] : []),
        [], // Blank row

        // Stateside Results
        ['Stateside Pricing (USD)'],
        ['Metric', 'Value'],
        ['Supp. Base Cost SS', formatCurrency(calculations.supplierLaidInCostSS_USD)], // Cost before SS Logistics
        ['Supp. FOB SS', formatCurrency(calculations.supplierFobSS_USD)],
        ['Dist. Laid-In SS', formatCurrency(calculations.distributorLaidInCostSS_USD)],
        ['Dist. Whsl Case SS', formatCurrency(calculations.distCaseWholesaleSS_USD)],
        ['Dist. Whsl Bottle SS', formatCurrency(calculations.distBottleWholesaleSS_USD)],
        ['Dist. BTG Bottle SS', formatCurrency(calculations.distBtgPriceSS_USD)],
        ['SRP (SS)', formatCurrency(calculations.srpSs_USD)],
         ...(formData.roundSrp && calculations.originalDistCaseWholesaleSS_USD !== null ? [ // Check for null explicitly
            ['Original Whsl Case SS (Pre-Rounding)', formatCurrency(calculations.originalDistCaseWholesaleSS_USD)],
            ['Original Whsl Bottle SS (Pre-Rounding)', formatCurrency(calculations.originalDistBottleWholesaleSS_USD)],
        ] : []),
        [], // Blank row

        // Gross Profit Results (if applicable)
        ...(formData.casesSold > 0 && calculations.supplierGrossProfitDI !== null ? [ // Check for null explicitly
            [`Gross Profit Analysis (@ ${formData.casesSold} cases)`],
            ['Metric', 'DI Value (USD)', 'SS Value (USD)'],
            ['Supplier GP', formatCurrency(calculations.supplierGrossProfitDI), formatCurrency(calculations.supplierGrossProfitSS)],
            ['Distributor GP', formatCurrency(calculations.distributorGrossProfitDI), formatCurrency(calculations.distributorGrossProfitSS)],
            [], // Blank row
        ] : []),
     ];

     // Convert array of arrays to CSV string with proper escaping
     const csvContent = csvRows.map(row => row.map(escapeCsvCell).join(',')).join('\n');

     // Create Blob and Download Link
     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     const safeWineName = (formData.wineName || 'calculation').replace(/[^a-z0-9]/gi, '_').toLowerCase();
     const fileName = `wine_pricing_${safeWineName}_${new Date().toISOString().split('T')[0]}.csv`;

     link.setAttribute('href', url);
     link.setAttribute('download', fileName);
     link.style.visibility = 'hidden';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     URL.revokeObjectURL(url); // Clean up
     console.log("Export generated:", fileName);

  };

  const handlePrintClick = () => {
     if (isCalculating) {
        alert("Please wait for calculations to finish before printing.");
        return;
     }
      if (!calculations || Object.keys(calculations).length === 0) {
        alert("No calculation results to print. Please enter inputs first.");
        return;
     }
      console.log("Triggering browser print...");
       window.print();
  };

  const handleResetClick = () => {
       if (window.confirm("Are you sure you want to reset all fields to default?")) {
          // Optionally clear specific cache items if desired
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
           // Re-check cache/fetch rate if resetting TO EUR
           if(DEFAULT_FORM_DATA.currency === 'EUR') {
                setTimeout(() => fetchCurrentExchangeRateWithCache(false), 50); // Trigger cache check
           }
      }
  };

  // --- Render ---
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 bg-white rounded-lg shadow-lg print:shadow-none">
       {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 border-b pb-4 print:hidden">
        <h1 className="text-2xl font-bold text-gray-800 mb-3 md:mb-0">Wine Pricing Calculator</h1>
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Updated Save Button */}
          <button
            title="Save Calculation Locally"
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            onClick={handleSaveClick}
            type="button"
            disabled={isCalculating || !calculations || Object.keys(calculations).length === 0 || Object.values(errors).some(e => e)} // Disable if calculating, no results, or errors exist
          >
            <Save className="w-4 h-4 mr-1" /> Save
          </button>
          {/* Updated Export Button */}
          <button
            title="Export Results as CSV"
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
            onClick={handleExportClick}
            type="button"
            disabled={isCalculating || !calculations || Object.keys(calculations).length === 0 || Object.values(errors).some(e => e)} // Disable if calculating, no results, or errors exist
          >
            <Download className="w-4 h-4 mr-1" /> Export
          </button>
          {/* Updated Print Button */}
          <button
            title="Print View"
            className="flex items-center px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 text-sm"
            onClick={handlePrintClick}
            type="button"
            disabled={isCalculating || !calculations || Object.keys(calculations).length === 0 || Object.values(errors).some(e => e)} // Disable if calculating, no results, or errors exist
          >
            <Printer className="w-4 h-4 mr-1" /> Print
          </button>
          <button
            title="Reset Fields"
            className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            onClick={handleResetClick}
            type="button"
          >
            Reset
          </button>
        </div>
      </div>

        {/* Print Header */}
        <div className="hidden print:block mb-4 border-b pb-2">
             <h1 className="text-xl font-bold text-gray-800">Wine Pricing Calculation</h1>
             {formData.wineName && <p className="text-lg font-semibold text-gray-700">{formData.wineName}</p>}
             <p className="text-sm text-gray-500">Generated: {new Date().toLocaleString()}</p>
        </div>

       {/* Main Layout Grid */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {/* Input Panel (Now defined above) */}
        <div className="print:hidden"> {/* Hide input panel on print */}
            <InputPanel
                formData={formData}
                handleInputChange={handleInputChange}
                handleCurrencyChange={handleCurrencyChange}
                handleSelectChange={handleSelectChange}
                fetchCurrentExchangeRateWithCache={fetchCurrentExchangeRateWithCache}
                isExchangeRateLoading={isExchangeRateLoading}
                exchangeRateError={exchangeRateError}
                showAdvanced={showAdvanced}
                setShowAdvanced={setShowAdvanced}
                errors={errors}
            />
        </div>

         {/* Results Panel Area */}
         {/* This section takes up full width on print */}
          <div className="md:col-span-2 print:col-span-3">
              {/* Status/Error Display */}
              {isCalculating && <div className="text-center text-blue-600 mb-4 p-3 bg-blue-50 rounded border border-blue-200 print:hidden">Calculating...</div>}
              {errors.calculation && !isCalculating && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-center flex items-center justify-center"> <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0"/> <span>{errors.calculation}</span> </div>
              )}
              {exchangeRateError && !isExchangeRateLoading && formData.currency === 'EUR' && (
                  <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-md text-center flex items-center justify-center print:hidden"> <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0"/> <span>Exchange Rate Error: {exchangeRateError}</span> </div>
              )}

              {/* Results Display */}
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
                  {/* Use print:grid-cols-2 to force two columns on print */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
                      {/* Direct Import Card */}
                       {/* Added print styles: shadow-none, border, border-gray-300 */}
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
                          {/* Hide rounding note on print */}
                          {formData.roundSrp && calculations.originalDistBottleWholesaleDI_USD !== null && Math.abs(calculations.distCaseWholesaleDI_USD - calculations.originalDistCaseWholesaleDI_USD) > 0.001 && (
                              <div className="text-xs text-gray-500 mt-2 italic border-t pt-1 print:hidden"> (Adj. from Whsl: {formatCurrency(calculations.originalDistBottleWholesaleDI_USD)} /btl) </div>
                          )}
                      </div>
                      {/* Stateside Card */}
                       {/* Added print styles: shadow-none, border, border-gray-300 */}
                      <div className="bg-white p-4 md:p-6 rounded-lg shadow border border-gray-100 print:shadow-none print:border print:border-gray-300">
                          <h3 className="text-lg font-semibold mb-4 text-gray-800">Stateside Inventory Pricing</h3>
                          <div className="space-y-2 text-sm">
                              <div className="flex justify-between"><span className="text-gray-500">Base Case Cost (USD):</span> <span className="font-medium">{formatCurrency(calculations.caseCostUSD)}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Tariff ({formData.tariff}%):</span> <span className="font-medium">{formatCurrency(calculations.tariffAmountUSD)}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">DI Logistics:</span> <span className="font-medium">{formatCurrency(formData.diLogistics)}</span></div>
                              <div className="flex justify-between border-t pt-1 mt-1"><span className="text-gray-600">Supp. Base Cost SS:</span> <span className="font-medium">{formatCurrency(calculations.supplierLaidInCostSS_USD)}</span></div>
                              <div className="flex justify-between"><span className="text-gray-600">Supp. FOB SS ({formData.supplierMargin}%):</span> <span className="font-medium">{formatCurrency(calculations.supplierFobSS_USD)}</span></div>
                              <div className="flex justify-between border-t pt-1 mt-1"><span className="text-gray-600">Dist. Laid-In SS:</span> <span className="font-medium">{formatCurrency(calculations.distributorLaidInCostSS_USD)}</span></div>
                              <div className="text-xs text-gray-500 text-right italic">(+ SS Logistics {formatCurrency(formData.statesideLogistics)})</div>
                              <div className="flex justify-between"><span className="text-gray-600">Dist. Whsl Case SS ({formData.distributorMargin}%):</span> <span className="font-medium">{formatCurrency(calculations.distCaseWholesaleSS_USD)}</span></div>
                              <div className="flex justify-between"><span className="text-gray-600">Dist. Whsl Bottle SS:</span> <span className="font-medium">{formatCurrency(calculations.distBottleWholesaleSS_USD)}</span></div>
                              <div className="flex justify-between"><span className="text-gray-600">Dist. BTG Bottle SS ({formData.distributorBtgMargin}%):</span> <span className="font-medium">{formatCurrency(calculations.distBtgPriceSS_USD)}</span></div>
                              <div className="flex justify-between border-t pt-2 mt-1"><span className="text-blue-700 font-semibold">SRP (SS, {formData.retailerMargin}%):</span> <span className="font-bold text-lg text-blue-700">{formatCurrency(calculations.srpSs_USD)}</span></div>
                          </div>
                          {/* Hide rounding note on print */}
                          {formData.roundSrp && calculations.originalDistBottleWholesaleSS_USD !== null && Math.abs(calculations.distCaseWholesaleSS_USD - calculations.originalDistCaseWholesaleSS_USD) > 0.001 && (
                              <div className="text-xs text-gray-500 mt-2 italic border-t pt-1 print:hidden"> (Adj. from Whsl: {formatCurrency(calculations.originalDistBottleWholesaleSS_USD)} /btl) </div>
                          )}
                           {/* Hide reverse mode match note on print */}
                           {/* Adjusted tolerance slightly for matching */}
                          {formData.calculationMode === 'reverse' && Math.abs(calculations.srpSs_USD - parseFloat(formData.targetSrp)) <= (formData.roundSrp ? 1.00 : 0.02) && (
                              <div className="text-xs text-green-600 text-right italic mt-1 font-medium print:hidden">(Matches Target SRP)</div>
                          )}
                      </div>
                  </div>

                  {/* Gross Profit Section */}
                   {/* Button hidden on print */}
                  <div className="mt-6 print:hidden">
                      <button
                      className="flex items-center text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setShowGrossProfit(!showGrossProfit)}
                      type="button"
                      disabled={!formData.casesSold || formData.casesSold <= 0 || !calculations.supplierGrossProfitDI}
                      >
                      {showGrossProfit ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                      {showGrossProfit ? 'Hide Gross Profit' : 'Show Gross Profit'}
                          {(!formData.casesSold || formData.casesSold <= 0) && <span className="text-xs ml-2 text-gray-400">(Enter Cases Sold {'>'} 0)</span>}
                      </button>
                  </div>
                   {/* GP section: show if toggled OR if printing */}
                   {/* Added print styles: shadow-none, border-none, mt-4, p-0 */}
                   {/* Check calculations.supplierGrossProfitDI for existence before showing */}
                  {(showGrossProfit || (typeof window !== 'undefined' && window.matchMedia('print').matches)) && formData.casesSold > 0 && calculations.supplierGrossProfitDI !== null && (
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
               {/* Hidden on print */}
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