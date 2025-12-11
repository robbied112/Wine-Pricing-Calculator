import React, { useState } from 'react';
import './App.css';
import WinePricingCalculator from './components/WinePricingCalculator';
import ExperimentalPricingV2 from './components/ExperimentalPricingV2';

function App() {
  const [view, setView] = useState('default'); // 'default' or 'experimental'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 text-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        <header className="text-center space-y-3">
          <p className="text-sm font-semibold tracking-widest text-amber-700 uppercase">
            Wine Pricing Studio
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
            Build confident, transparent pricing in minutes
          </h1>
          <p className="text-base md:text-lg text-slate-600 max-w-3xl mx-auto">
            Capture supplier costs, logistics, and margin expectations in one place. Compare direct-import
            and stateside scenarios, visualize bottle and case economics, and share a polished summary with
            your team.
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => setView('default')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'default' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              Default Calculator
            </button>
            <button
              onClick={() => setView('experimental')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'experimental' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              Experimental V2
            </button>
          </div>
        </header>

        {view === 'default' && <WinePricingCalculator />}
        {view === 'experimental' && <ExperimentalPricingV2 />}
      </div>
    </div>
  );
}

export default App;
