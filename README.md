# Wine Pricing Studio

Professional pricing and scenario modeling for the wine industry.

Wine Pricing Studio is a browser-based tool for building and comparing wine pricing across the full three-tier distribution chain. It supports domestic wineries, European importers, suppliers, distributors, and retailers — each with role-specific cost structures, margin calculations, and regulatory layers.

## Supported Business Models

| Model | Flow | Key Features |
|-------|------|-------------|
| **Classic Import (DI)** | Euro Winery → Importer → Distributor → Retail | FX conversion, importer margin, tariff on FOB, DI freight |
| **Imported Stateside (SS)** | Euro Winery → US Warehouse → Distributor → Retail | Tariff on base cost, stateside logistics |
| **Euro Direct to Retailer** | Euro Winery → Importer → Retail | Bypasses distributor tier |
| **Domestic Winery → Distributor** | US Winery → Distributor → Retail | No FX, no tariff, stateside logistics |
| **Domestic Self-Distribution** | US Winery → Retail | Winery sells direct to retailer |
| **Supplier → Distributor** | Supplier → Distributor → Retail | Supplier warehouse inventory |
| **Supplier → Retailer** | Supplier → Retail | Supplier direct to retail |
| **Distributor → Retailer** | Distributor → Retail | Single margin layer |

## Features

- **Role-aware inputs** — Field visibility adapts to your role (winery, importer, supplier, distributor, retailer). European roles see FX and tariff fields; domestic roles see stateside logistics.
- **Margin on selling price** — All margin calculations use `sellingPrice = cost / (1 - margin%)`, the industry standard for wine distribution.
- **Scenario comparison** — Toggle Scenario B to compare pricing side-by-side with color-coded deltas and percentage changes.
- **Stakeholder recaps** — Switch between Supplier, Importer, Distributor, and Retailer perspectives to see buy price, sell price, and gross profit for each actor.
- **Preset system** — Apply presets (EU Baseline, Aggressive Margin, 6-Pack Program, High Tariff, etc.) with locked fields to enforce assumptions. Unlock to override.
- **Input validation** — Warnings for zero cost basis, missing exchange rates, extreme margins, and unrealistic SRP.
- **Full cost waterfall** — Pricing Snapshot breaks down every layer: cost basis, import layer (FOB, tariff, DI freight), landed cost, distribution, and retail.

## Architecture

```
src/
├── engine/                  # Pure TypeScript pricing engine (zero UI dependencies)
│   ├── core/
│   │   ├── enums.ts         # TradeActor, Counterparty, InventoryContext, etc.
│   │   ├── types.ts         # PricingInputs, PricingResult, normalized output contract
│   │   ├── constants.ts     # Scenario table, field visibility, labels, defaults
│   │   ├── math.ts          # applyMarginOnSelling, actualMarginPercent
│   │   └── resolver.ts      # Scenario → model resolution
│   ├── calculators/         # 8 pricing calculators, each returning normalized PricingResult
│   ├── comparison/          # Scenario A vs B delta computation
│   ├── recap/               # Role-specific P&L summaries
│   ├── presets/             # Default preset definitions
│   └── __tests__/           # Vitest suite with spec-validated expected values
├── features/
│   ├── pricing/             # Model selector, input form, output waterfall, Zustand store
│   ├── comparison/          # Scenario B toggle and delta table
│   ├── recap/               # Stakeholder recap tab panel
│   └── presets/             # Preset dropdown with lock/unlock
├── components/ui/           # Reusable primitives (Card, NumberInput, SelectInput, SummaryRow)
├── app/layout/              # App shell with header and footer
└── lib/                     # Formatting utilities (money, percent, delta)
```

The engine is fully decoupled from React. Every calculator returns a `PricingResult` with the same normalized shape — bottle metrics, case metrics, margin metrics, and assumptions. This makes it straightforward to use the engine in a CLI, API, or testing context.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Tech Stack

- **React 19** + **TypeScript** — Type-safe component architecture
- **Vite** — Fast dev server and production builds
- **Tailwind CSS v4** — Utility-first styling with `@tailwindcss/vite` plugin
- **Zustand** — Lightweight state management with auto-recalculation
- **Vitest** — Fast unit testing with spec-validated assertions
- **Lucide React** — Clean icon set

## Pricing Math

All margin calculations use **margin on selling price** (not markup):

```
sellingPrice = cost / (1 - marginPercent / 100)
grossProfit  = sellingPrice - cost
```

For imported models, tariff calculation differs by inventory location:
- **DI (direct import)**: Tariff is applied to the importer FOB price (after importer margin)
- **SS (stateside)**: Tariff is applied to the base cost (before any margin)

## Testing

The test suite validates pricing math against worked examples from the pricing specification:

```bash
npm test          # Single run
npm run test:watch  # Watch mode
```

Tests cover all 8 calculator models, scenario resolution, and the normalized output contract.

## Roadmap

- Shelf-price rounding toggle ($X.99 / $X.95)
- Export pricing to PDF / CSV
- Persist scenarios to local storage
- Custom preset creation and sharing
- Multi-product comparison view
