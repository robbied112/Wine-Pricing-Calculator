import React, { useState, useEffect } from 'react';
import { PlusCircle, MinusCircle, Save, Download, Printer, ChevronDown, ChevronUp } from 'lucide-react';

const WinePricingCalculator = () => {
  // State for form inputs
  const [formData, setFormData] = useState({
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
  });

  // State for calculated values
  const [calculations, setCalculations] = useState({});
  const [isExchangeRateLoading, setIsExchangeRateLoading] = useState(false);

  // State for display options
  const [displayView, setDisplayView] = useState('all'); // all, supplier, distributor, retail
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Calculate all pricing values
  const calculatePricing = () => {
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
    
    // Calculate effective exchange rate with buffer or use custom rate
    const effectiveExchangeRate = currency === 'USD' ? 1 : 
      useCustomExchangeRate ? customExchangeRate : 
      exchangeRate * (1 + exchangeBuffer / 100);
    
    // Convert bottle cost to USD
    const bottleCostUSD = bottleCost * effectiveExchangeRate;
    
    // Calculate case cost
    const caseCost = bottleCostUSD * casePackSize;
    
    // Supplier calculations
    const supplierDiLaidInCost = caseCost;
    const supplierMarginAmount = supplierDiLaidInCost * (supplierMargin / 100);
    const supplierFobDi = supplierDiLaidInCost / (1 - supplierMargin / 100);
    
    const tariffAmount = caseCost * (tariff / 100);
    const supplierStatesideLaidInCost = caseCost + tariffAmount + diLogistics;
    const supplierSsFob = supplierStatesideLaidInCost / (1 - supplierMargin / 100);
    
    // Distributor calculations
    const distributorDiLaidInCost = (supplierFobDi * (1 + tariff / 100)) + diLogistics;
    const distributorStatesideLaidInCost = supplierSsFob + statesideLogistics;
    
    // Wholesale pricing
    const distributorCaseWholesaleDi = distributorDiLaidInCost / (1 - distributorMargin / 100);
    const distributorBottleWholesaleDi = distributorCaseWholesaleDi / casePackSize;
    
    const distributorCaseWholesaleSs = distributorStatesideLaidInCost / (1 - distributorMargin / 100);
    const distributorBottleWholesaleSs = distributorCaseWholesaleSs / casePackSize;
    
    // BTG pricing
    const distributorBtgPriceDi = (distributorDiLaidInCost / (1 - distributorBtgMargin / 100)) / casePackSize;
    const distributorBtgPriceSs = (distributorStatesideLaidInCost / (1 - distributorBtgMargin / 100)) / casePackSize;
    
    // SRP
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
  };
  
  // Effect to update calculations whenever form data changes
  useEffect(() => {
    calculatePricing();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

 // Add a useEffect to fetch the exchange rate when the component mounts
 useEffect(() => {
  fetchCurrentExchangeRate();
 }, []);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'wineName' ? value : value === '' ? '' : parseFloat(value) || 0,
    });
  };

  // Add this function to fetch the current EUR to USD exchange rate
const fetchCurrentExchangeRate = async () => {
  setIsExchangeRateLoading(true);
  try {
    const response = await fetch('https://api.exchangerate.host/latest?base=EUR&symbols=USD');
    const data = await response.json();
    
    if (data && data.rates && data.rates.USD) {
      setFormData(prevData => ({
        ...prevData,
        exchangeRate: parseFloat(data.rates.USD.toFixed(4))
      }));
    }
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    // Keep using the default rate in case of error
  } finally {
    setIsExchangeRateLoading(false);
  }
};

  // Handle currency change
  const handleCurrencyChange = (e) => {
    setFormData({
      ...formData,
      currency: e.target.value,
    });
  };
  
  // Handle select changes
  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'bottleSize' ? value : parseInt(value, 10),
    });
  };
  
  // Format currency for display
  const formatCurrency = (value, decimals = 2) => {
    return `$${value.toFixed(decimals)}`;
  };
  
  const handleSaveClick = () => {
    // Create data to save
    const savedData = {
      name: formData.wineName || 'Unnamed Calculation',
      timestamp: new Date().toISOString(),
      inputs: formData,
      results: calculations
    };
    
    // Save to localStorage
    const savedCalcs = JSON.parse(localStorage.getItem('winePricingCalculations') || '[]');
    savedCalcs.push(savedData);
    localStorage.setItem('winePricingCalculations', JSON.stringify(savedCalcs));
    
    alert(`Calculation "${formData.wineName || 'Unnamed Calculation'}" saved successfully!`);
  };
  
  const handleExportClick = () => {
    // Create CSV content
    const csvRows = [];
    
    // Helper function to format numbers to 2 decimal places
    const formatNumber = (num) => {
      return typeof num === 'number' ? num.toFixed(2) : num;
    };
    
    // Add headers
    csvRows.push(['Wine Pricing Calculator - ' + (formData.wineName || 'Unnamed Calculation')]);
    csvRows.push(['Generated on', new Date().toLocaleString()]);
    csvRows.push([]);
    
    // Input parameters
    csvRows.push(['Input Parameters']);
    csvRows.push(['Parameter', 'Value']);
    csvRows.push(['Wine Name', formData.wineName]);
    csvRows.push(['Currency', formData.currency]);
    csvRows.push(['Bottle Cost', formatNumber(formData.bottleCost)]);
    csvRows.push(['Exchange Rate Buffer (%)', formatNumber(formData.exchangeBuffer)]);
    csvRows.push(['Case Pack Size', formData.casePackSize]);
    csvRows.push(['Bottle Size', formData.bottleSize]);
    csvRows.push(['DI Logistics ($)', formatNumber(formData.diLogistics)]);
    csvRows.push(['Tariff (%)', formatNumber(formData.tariff)]);
    csvRows.push(['Stateside Logistics ($)', formatNumber(formData.statesideLogistics)]);
    csvRows.push(['Supplier Margin (%)', formatNumber(formData.supplierMargin)]);
    csvRows.push(['Distributor Margin (%)', formatNumber(formData.distributorMargin)]);
    csvRows.push(['Distributor BTG Margin (%)', formatNumber(formData.distributorBtgMargin)]);
    csvRows.push(['Retailer Margin (%)', formatNumber(formData.retailerMargin)]);
    csvRows.push([]);
    
    // Results
    csvRows.push(['Calculation Results']);
    csvRows.push(['Direct Import Pricing']);
    csvRows.push(['Metric', 'Value']);
    csvRows.push(['Bottle Cost (USD)', formatNumber(calculations.bottleCostUSD)]);
    csvRows.push(['Case Cost', formatNumber(calculations.caseCost)]);
    csvRows.push(['Supplier DI Laid in Cost', formatNumber(calculations.supplierDiLaidInCost)]);
    csvRows.push(['Supplier FOB DI', formatNumber(calculations.supplierFobDi)]);
    csvRows.push(['Distributor DI Laid in Cost', formatNumber(calculations.distributorDiLaidInCost)]);
    csvRows.push(['Distributor Case Wholesale', formatNumber(calculations.distributorCaseWholesaleDi)]);
    csvRows.push(['Distributor Bottle Wholesale', formatNumber(calculations.distributorBottleWholesaleDi)]);
    csvRows.push(['Distributor BTG Price', formatNumber(calculations.distributorBtgPriceDi)]);
    csvRows.push(['SRP', formatNumber(calculations.srpDi)]);
    csvRows.push([]);
    
    csvRows.push(['Stateside Inventory Pricing']);
    csvRows.push(['Metric', 'Value']);
    csvRows.push(['Tariff Amount', formatNumber(calculations.tariffAmount)]);
    csvRows.push(['Supplier SS Laid in Cost', formatNumber(calculations.supplierStatesideLaidInCost)]);
    csvRows.push(['Supplier SS FOB', formatNumber(calculations.supplierSsFob)]);
    csvRows.push(['Distributor SS Laid in Cost', formatNumber(calculations.distributorStatesideLaidInCost)]);
    csvRows.push(['Distributor Case Wholesale', formatNumber(calculations.distributorCaseWholesaleSs)]);
    csvRows.push(['Distributor Bottle Wholesale', formatNumber(calculations.distributorBottleWholesaleSs)]);
    csvRows.push(['Distributor BTG Price', formatNumber(calculations.distributorBtgPriceSs)]);
    csvRows.push(['SRP', formatNumber(calculations.srpSs)]);
    
    // Convert to CSV string
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `wine-pricing-${formData.wineName || 'calculation'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handlePrintClick = () => {
    // Store the current body innerHTML
    const originalContent = document.body.innerHTML;
    
    // Create a print-friendly version
    const printContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="text-align: center; margin-bottom: 30px;">Wine Pricing Calculator</h1>
        <h2>${formData.wineName || 'Unnamed Wine'} - Pricing Report</h2>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        
        <h3 style="margin-top: 30px;">Input Parameters</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <tr style="background-color: #f2f2f2;">
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Parameter</th>
            <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">Value</th>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Currency</td>
            <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${formData.currency}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Bottle Cost</td>
            <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${formData.bottleCost}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Case Pack Size</td>
            <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${formData.casePackSize}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Bottle Size</td>
            <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${formData.bottleSize}</td>
          </tr>
        </table>
        
        <div style="display: flex; justify-content: space-between;">
          <div style="width: 48%;">
            <h3>Direct Import Pricing</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <tr style="background-color: #f2f2f2;">
                <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Metric</th>
                <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">Value</th>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">SRP</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #ddd; font-weight: bold;">${(calculations.srpDi || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">BTG Price</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #ddd; font-weight: bold;">${(calculations.distributorBtgPriceDi || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Bottle Wholesale</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${(calculations.distributorBottleWholesaleDi || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Case Wholesale</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${(calculations.distributorCaseWholesaleDi || 0).toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <div style="width: 48%;">
            <h3>Stateside Inventory Pricing</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <tr style="background-color: #f2f2f2;">
                <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Metric</th>
                <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">Value</th>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">SRP</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #ddd; font-weight: bold;">${(calculations.srpSs || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">BTG Price</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #ddd; font-weight: bold;">${(calculations.distributorBtgPriceSs || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Bottle Wholesale</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${(calculations.distributorBottleWholesaleSs || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Case Wholesale</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${(calculations.distributorCaseWholesaleSs || 0).toFixed(2)}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    `;
    
    // Replace the body content with our print version
    document.body.innerHTML = printContent;
    
    // Print the document
    window.print();
    
    // Restore original content
    document.body.innerHTML = originalContent;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Wine Pricing Calculator</h1>
        <div className="flex space-x-4 mt-4 md:mt-0">
          <button 
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={handleSaveClick}
            type="button"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </button>
          <button 
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            onClick={handleExportClick}
            type="button"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button 
            className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            onClick={handlePrintClick}
            type="button"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
        </div>
      </div>
      
      {/* Main Calculator Interface */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Input Panel */}
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
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
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
                        onClick={() => setFormData({...formData, exchangeBuffer: Math.max(0, formData.exchangeBuffer - 1)})}
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
                        onClick={() => setFormData({...formData, exchangeBuffer: formData.exchangeBuffer + 1})}
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
                    onChange={(e) => setFormData({...formData, useCustomExchangeRate: e.target.checked})}
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
                  {formData.currency === 'EUR' ? 
                    `Effective rate: ${formData.useCustomExchangeRate ? 
                      formData.customExchangeRate.toFixed(4) : 
                      (formData.exchangeRate * (1 + formData.exchangeBuffer / 100)).toFixed(4)}` : 
                    'N/A'}
                </div>
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
                <option value="12">12</option>
                <option value="6">6</option>
                <option value="3">3</option>
                <option value="1">1</option>
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
                <option value="750ml">750ml</option>
                <option value="375ml">375ml</option>
                <option value="1.5L">1.5L</option>
                <option value="3L">3L</option>
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
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Results Panel */}
        <div className="md:col-span-2">
          <div className="bg-white mb-6">
            <div className="flex border-b border-gray-200 mb-4">
              <button 
                className={`px-4 py-2 text-sm font-medium ${displayView === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setDisplayView('all')}
                type="button"
              >
                All
              </button>
              <button 
                className={`px-4 py-2 text-sm font-medium ${displayView === 'supplier' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setDisplayView('supplier')}
                type="button"
              >
                Supplier View
              </button>
              <button 
                className={`px-4 py-2 text-sm font-medium ${displayView === 'distributor' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setDisplayView('distributor')}
                type="button"
              >
                Distributor View
              </button>
              <button 
                className={`px-4 py-2 text-sm font-medium ${displayView === 'retail' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setDisplayView('retail')}
                type="button"
              >
                Retail View
              </button>
            </div>
          </div>
          
          {/* Results content varies based on selected view */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* DI Pricing Card */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Direct Import Pricing</h3>
              
              {(displayView === 'all' || displayView === 'supplier') && (
                <div className="mb-4 border-b pb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Supplier Calculations</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">Per Bottle USD:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.bottleCostUSD || 0)}</div>
                    
                    <div className="text-gray-500">Case Cost:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.caseCost || 0)}</div>
                    
                    <div className="text-gray-500">DI Laid in Cost:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.supplierDiLaidInCost || 0)}</div>
                    
                    <div className="text-gray-500">Supplier FOB DI:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.supplierFobDi || 0)}</div>
                  </div>
                </div>
              )}
              
              {(displayView === 'all' || displayView === 'distributor') && (
                <div className="mb-4 border-b pb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Distributor Calculations</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">DI Laid in Cost:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.distributorDiLaidInCost || 0)}</div>
                    
                    <div className="text-gray-500">Case Wholesale:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.distributorCaseWholesaleDi || 0)}</div>
                    
                    <div className="text-gray-500">Bottle Wholesale:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.distributorBottleWholesaleDi || 0)}</div>
                    
                    <div className="text-gray-500">BTG Price:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.distributorBtgPriceDi || 0)}</div>
                  </div>
                </div>
              )}
              
              {(displayView === 'all' || displayView === 'retail') && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Retail Pricing</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">SRP:</div>
                    <div className="text-right font-medium text-lg text-blue-700">{formatCurrency(calculations.srpDi || 0)}</div>
                    
                    <div className="text-gray-500">BTG:</div>
                    <div className="text-right font-medium text-lg text-green-700">{formatCurrency(calculations.distributorBtgPriceDi || 0)}</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Stateside Pricing Card */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Stateside Inventory Pricing</h3>
              
              {(displayView === 'all' || displayView === 'supplier') && (
                <div className="mb-4 border-b pb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Supplier Calculations</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">Case Cost:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.caseCost || 0)}</div>
                    
                    <div className="text-gray-500">Tariff Amount:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.tariffAmount || 0)}</div>
                    
                    <div className="text-gray-500">DI Logistics:</div>
                    <div className="text-right font-medium">{formatCurrency(formData.diLogistics || 0)}</div>
                    
                    <div className="text-gray-500">SS Laid in Cost:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.supplierStatesideLaidInCost || 0)}</div>
                    
                    <div className="text-gray-500">SS FOB:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.supplierSsFob || 0)}</div>
                  </div>
                </div>
              )}
              
              {(displayView === 'all' || displayView === 'distributor') && (
                <div className="mb-4 border-b pb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Distributor Calculations</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">SS Laid in Cost:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.distributorStatesideLaidInCost || 0)}</div>
                    
                    <div className="text-gray-500">Case Wholesale:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.distributorCaseWholesaleSs || 0)}</div>
                    
                    <div className="text-gray-500">Bottle Wholesale:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.distributorBottleWholesaleSs || 0)}</div>
                    
                    <div className="text-gray-500">BTG Price:</div>
                    <div className="text-right font-medium">{formatCurrency(calculations.distributorBtgPriceSs || 0)}</div>
                  </div>
                </div>
              )}
              
              {(displayView === 'all' || displayView === 'retail') && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Retail Pricing</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">SRP:</div>
                    <div className="text-right font-medium text-lg text-blue-700">{formatCurrency(calculations.srpSs || 0)}</div>
                    
                    <div className="text-gray-500">BTG:</div>
                    <div className="text-right font-medium text-lg text-green-700">{formatCurrency(calculations.distributorBtgPriceSs || 0)}</div>
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