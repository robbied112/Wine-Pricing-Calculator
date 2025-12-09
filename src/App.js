import React from 'react';
import './App.css';
import WinePricingCalculator from './components/WinePricingCalculator';

function App() {
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
        </header>

        <WinePricingCalculator />
      </div>
    </div>
  );
}

export default App;
