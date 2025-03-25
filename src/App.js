import React from 'react';
import './App.css';
import WinePricingCalculator from './components/WinePricingCalculator';
// REMOVE this line: import ReverseWinePricingCalculator from './components/ReverseWinePricingCalculator';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        {/* Remove any title specific to the reverse calc if needed */}
      </header>
      <main>
        <WinePricingCalculator />
        {/* Make sure this line is REMOVED: <ReverseWinePricingCalculator /> */}
      </main>
    </div>
  );
}

export default App;