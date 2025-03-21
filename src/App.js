// src/App.js
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import WinePricingCalculator from './components/WinePricingCalculator';
import ReverseWinePricingCalculator from './components/ReverseWinePricingCalculator';

function App() {
  return (
    <Router>
      <div>
        <nav className="p-4 bg-gray-100">
          <Link to="/" className="mr-4 text-blue-600 hover:underline">Forward Calculator</Link>
          <Link to="/reverse" className="text-blue-600 hover:underline">Reverse Calculator</Link>
        </nav>
        <Routes>
          <Route exact path="/" element={<WinePricingCalculator />} />
          <Route path="/reverse" element={<ReverseWinePricingCalculator />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;