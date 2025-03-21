import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import WinePricingCalculator from './components/WinePricingCalculator';
import ReverseWinePricingCalculator from './components/ReverseWinePricingCalculator';

function App() {
  return (
    <Router>
      <div>
        <nav>
          <Link to="/">Forward Calculator</Link> | <Link to="/reverse">Reverse Calculator</Link>
        </nav>
        <Switch>
          <Route exact path="/" component={WinePricingCalculator} />
          <Route path="/reverse" component={ReverseWinePricingCalculator} />
        </Switch>
      </div>
    </Router>
  );
}