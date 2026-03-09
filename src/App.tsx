import { AppLayout } from './app/layout/AppLayout';
import { Card } from './components/ui/Card';
import { MarketSelector } from './features/pricing/components/MarketSelector';
import { MarketInputForm } from './features/pricing/components/MarketInputForm';
import { MarketWaterfall } from './features/pricing/components/MarketWaterfall';
import { MarketRecapPanel } from './features/recap/components/MarketRecapPanel';
import { MarketComparisonPanel } from './features/comparison/components/MarketComparisonPanel';
import { ExportPanel } from './features/export/components/ExportPanel';
import { AddToPortfolioPanel } from './features/portfolio/components/AddToPortfolioPanel';
import { MultiMarketOverview } from './features/overview/components/MultiMarketOverview';
import { AnalysisPanel } from './features/analysis/components/AnalysisPanel';
import { PortfolioView } from './features/portfolio/components/PortfolioView';
import { useMarketStore } from './features/pricing/state/useMarketStore';

function App() {
  const activeView = useMarketStore((s) => s.activeView);

  return (
    <AppLayout>
      {activeView === 'calculator' ? (
        <div className="space-y-6">
          {/* Market Selection */}
          <Card title="Select Your Market" kicker="Step 1">
            <MarketSelector />
          </Card>

          {/* Two-column layout: Inputs on left, Outputs on right */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left column: Inputs */}
            <div className="space-y-6">
              <Card title="Pricing Assumptions" kicker="Step 2">
                <MarketInputForm />
              </Card>

              <MarketComparisonPanel />
              <AddToPortfolioPanel />
            </div>

            {/* Right column: Outputs */}
            <div className="space-y-6">
              <MarketRecapPanel />
              <MarketWaterfall />
              <ExportPanel />
            </div>
          </div>

          {/* Full-width: Pricing Intelligence */}
          <AnalysisPanel />

          {/* Full-width: Multi-Market Overview */}
          <MultiMarketOverview />
        </div>
      ) : (
        <PortfolioView />
      )}
    </AppLayout>
  );
}

export default App;
