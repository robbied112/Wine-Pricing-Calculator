import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MarketConfig, MarketPricingInputs, MarketPricingResult } from '@/engine/markets/types';
import { MARKET_CONFIGS, getMarketConfig } from '@/engine/markets/configs';
import { calculateMarketPricing, makeDefaultMarketInputs } from '@/engine/markets/genericCalculator';
import { fetchLiveRates, getRateForMarket, type LiveRatesResult } from '@/engine/fx/fetchRates';
import type { PortfolioWine, WhatIfOverrides, WhatIfResult } from '@/features/portfolio/types';
import { DEFAULT_WHAT_IF_OVERRIDES } from '@/features/portfolio/types';
import { calculateWhatIf } from '@/features/portfolio/lib/whatIf';

// ---- Store interface ----

interface MarketStore {
  // Navigation
  activeView: 'calculator' | 'portfolio';

  // Market selection
  markets: MarketConfig[];
  activeMarketId: string;
  activeMarket: MarketConfig;

  // Cost input mode (UI preference — engine always uses per-bottle)
  costInputMode: 'bottle' | 'case';

  // Scenario A (baseline)
  inputs: MarketPricingInputs;
  result: MarketPricingResult | null;

  // Scenario B (comparison)
  scenarioBEnabled: boolean;
  scenarioBLabel: string;
  scenarioBInputs: MarketPricingInputs;
  scenarioBResult: MarketPricingResult | null;

  // Recap
  activeRecapLayer: string;

  // Per-market input memory (auto-saved when switching markets)
  marketInputMemory: Record<string, MarketPricingInputs>;

  // Portfolio
  portfolio: PortfolioWine[];
  editingWineId: string | null;

  // What-If
  whatIfOverrides: WhatIfOverrides;
  whatIfResults: WhatIfResult[] | null;
  whatIfActive: boolean;

  // Live FX rates
  liveRates: LiveRatesResult | null;
  ratesFetching: boolean;

  // Navigation actions
  setActiveView: (view: 'calculator' | 'portfolio') => void;

  // Calculator actions
  setCostInputMode: (mode: 'bottle' | 'case') => void;
  setMarket: (marketId: string) => void;
  setInput: <K extends keyof MarketPricingInputs>(field: K, value: MarketPricingInputs[K]) => void;
  setMargin: (layerId: string, value: number) => void;
  setTax: (taxId: string, value: number) => void;
  setLogistics: (logId: string, value: number) => void;
  toggleLayer: (layerId: string) => void;
  setPathway: (pathwayId: string) => void;
  setActiveRecapLayer: (layerId: string) => void;
  resetToDefaults: () => void;

  // Scenario B
  toggleScenarioB: () => void;
  setScenarioBLabel: (label: string) => void;
  setScenarioBMargin: (layerId: string, value: number) => void;
  setScenarioBTax: (taxId: string, value: number) => void;
  setScenarioBLogistics: (logId: string, value: number) => void;
  setScenarioBInput: <K extends keyof MarketPricingInputs>(field: K, value: MarketPricingInputs[K]) => void;

  // Portfolio
  addToPortfolio: (name: string, producer: string, notes?: string) => void;
  updatePortfolioWine: (id: string, updates: Partial<Pick<PortfolioWine, 'name' | 'producer' | 'notes'>>) => void;
  removeFromPortfolio: (id: string) => void;
  loadWineIntoCalculator: (id: string) => void;
  saveCalculatorToWine: (id: string) => void;

  // What-If
  setWhatIfOverride: <K extends keyof WhatIfOverrides>(field: K, value: WhatIfOverrides[K]) => void;
  applyWhatIf: () => void;
  clearWhatIf: () => void;

  // Live FX rates
  fetchRates: (force?: boolean) => Promise<void>;
  applyLiveRate: () => void;
}

// ---- Defaults ----

const defaultMarket = MARKET_CONFIGS[0];
const defaultInputs = makeDefaultMarketInputs(defaultMarket);

// ---- Store creation with persistence ----

export const useMarketStore = create<MarketStore>()(
  persist(
    (set, get) => ({
      activeView: 'calculator' as const,

      markets: MARKET_CONFIGS,
      activeMarketId: defaultMarket.id,
      activeMarket: defaultMarket,

      costInputMode: 'bottle' as const,

      inputs: defaultInputs,
      result: calculateMarketPricing(defaultMarket, defaultInputs),

      scenarioBEnabled: false,
      scenarioBLabel: 'Scenario B',
      scenarioBInputs: { ...defaultInputs },
      scenarioBResult: null,

      activeRecapLayer: defaultMarket.chain[0]?.id || '',

      marketInputMemory: {},

      portfolio: [],
      editingWineId: null,

      whatIfOverrides: { ...DEFAULT_WHAT_IF_OVERRIDES },
      whatIfResults: null,
      whatIfActive: false,

      liveRates: null,
      ratesFetching: false,

      // ---- Navigation ----

      setActiveView: (view) => set({ activeView: view }),

      setCostInputMode: (mode) => set({ costInputMode: mode }),

      // ---- Market switching with memory ----

      setMarket: (marketId) => {
        const market = getMarketConfig(marketId);
        if (!market) return;
        const { activeMarketId, inputs: currentInputs, marketInputMemory, liveRates } = get();

        // Save current market's inputs to memory before switching
        const updatedMemory = { ...marketInputMemory, [activeMarketId]: currentInputs };

        // Restore from memory or use defaults for the new market
        const inputs = updatedMemory[marketId]
          ? { ...updatedMemory[marketId] }
          : makeDefaultMarketInputs(market);

        // Auto-apply live exchange rate if available
        if (liveRates && market.currency.needsConversion) {
          const liveRate = getRateForMarket(market, liveRates.rates);
          if (liveRate !== null) {
            inputs.exchangeRate = liveRate;
          }
        }

        const result = calculateMarketPricing(market, inputs);
        set({
          activeMarketId: marketId,
          activeMarket: market,
          inputs,
          result,
          scenarioBEnabled: false,
          scenarioBInputs: { ...inputs },
          scenarioBResult: null,
          activeRecapLayer: market.chain[0]?.id || '',
          marketInputMemory: updatedMemory,
          editingWineId: null,
        });
      },

      // ---- Input setters (auto-recalculate) ----

      setInput: (field, value) => {
        const { activeMarket, inputs, scenarioBEnabled, scenarioBInputs } = get();
        const newInputs = { ...inputs, [field]: value };
        const result = calculateMarketPricing(activeMarket, newInputs);
        let scenarioBResult = get().scenarioBResult;
        if (scenarioBEnabled) {
          scenarioBResult = calculateMarketPricing(activeMarket, scenarioBInputs);
        }
        set({ inputs: newInputs, result, scenarioBResult });
      },

      setMargin: (layerId, value) => {
        const { activeMarket, inputs, scenarioBEnabled, scenarioBInputs } = get();
        const newInputs = { ...inputs, margins: { ...inputs.margins, [layerId]: value } };
        const result = calculateMarketPricing(activeMarket, newInputs);
        let scenarioBResult = get().scenarioBResult;
        if (scenarioBEnabled) {
          scenarioBResult = calculateMarketPricing(activeMarket, scenarioBInputs);
        }
        set({ inputs: newInputs, result, scenarioBResult });
      },

      setTax: (taxId, value) => {
        const { activeMarket, inputs, scenarioBEnabled, scenarioBInputs } = get();
        const newInputs = { ...inputs, taxes: { ...inputs.taxes, [taxId]: value } };
        const result = calculateMarketPricing(activeMarket, newInputs);
        let scenarioBResult = get().scenarioBResult;
        if (scenarioBEnabled) {
          scenarioBResult = calculateMarketPricing(activeMarket, scenarioBInputs);
        }
        set({ inputs: newInputs, result, scenarioBResult });
      },

      setLogistics: (logId, value) => {
        const { activeMarket, inputs, scenarioBEnabled, scenarioBInputs } = get();
        const newInputs = { ...inputs, logistics: { ...inputs.logistics, [logId]: value } };
        const result = calculateMarketPricing(activeMarket, newInputs);
        let scenarioBResult = get().scenarioBResult;
        if (scenarioBEnabled) {
          scenarioBResult = calculateMarketPricing(activeMarket, scenarioBInputs);
        }
        set({ inputs: newInputs, result, scenarioBResult });
      },

      toggleLayer: (layerId) => {
        const { activeMarket, inputs } = get();
        const active = new Set(inputs.activeLayers);
        if (active.has(layerId)) {
          active.delete(layerId);
        } else {
          active.add(layerId);
        }
        const newInputs = { ...inputs, activeLayers: Array.from(active) };
        const result = calculateMarketPricing(activeMarket, newInputs);
        set({ inputs: newInputs, result });
      },

      setPathway: (pathwayId) => {
        const { activeMarket, inputs, scenarioBEnabled, scenarioBInputs } = get();
        const newInputs = { ...inputs, pathway: pathwayId };
        const result = calculateMarketPricing(activeMarket, newInputs);
        let scenarioBResult = get().scenarioBResult;
        if (scenarioBEnabled) {
          scenarioBResult = calculateMarketPricing(activeMarket, scenarioBInputs);
        }
        set({ inputs: newInputs, result, scenarioBResult });
      },

      setActiveRecapLayer: (layerId) => set({ activeRecapLayer: layerId }),

      resetToDefaults: () => {
        const { activeMarket, marketInputMemory, activeMarketId } = get();
        const inputs = makeDefaultMarketInputs(activeMarket);
        const result = calculateMarketPricing(activeMarket, inputs);
        const updatedMemory = { ...marketInputMemory };
        delete updatedMemory[activeMarketId];
        set({
          inputs,
          result,
          scenarioBEnabled: false,
          scenarioBInputs: { ...inputs },
          scenarioBResult: null,
          marketInputMemory: updatedMemory,
          editingWineId: null,
        });
      },

      // ---- Scenario B ----

      toggleScenarioB: () => {
        const { scenarioBEnabled, inputs, activeMarket } = get();
        if (!scenarioBEnabled) {
          const scenarioBInputs = JSON.parse(JSON.stringify(inputs));
          const scenarioBResult = calculateMarketPricing(activeMarket, scenarioBInputs);
          set({ scenarioBEnabled: true, scenarioBInputs, scenarioBResult });
        } else {
          set({ scenarioBEnabled: false, scenarioBResult: null });
        }
      },

      setScenarioBLabel: (label) => set({ scenarioBLabel: label }),

      setScenarioBMargin: (layerId, value) => {
        const { activeMarket, scenarioBInputs } = get();
        const newInputs = { ...scenarioBInputs, margins: { ...scenarioBInputs.margins, [layerId]: value } };
        const result = calculateMarketPricing(activeMarket, newInputs);
        set({ scenarioBInputs: newInputs, scenarioBResult: result });
      },

      setScenarioBTax: (taxId, value) => {
        const { activeMarket, scenarioBInputs } = get();
        const newInputs = { ...scenarioBInputs, taxes: { ...scenarioBInputs.taxes, [taxId]: value } };
        const result = calculateMarketPricing(activeMarket, newInputs);
        set({ scenarioBInputs: newInputs, scenarioBResult: result });
      },

      setScenarioBLogistics: (logId, value) => {
        const { activeMarket, scenarioBInputs } = get();
        const newInputs = { ...scenarioBInputs, logistics: { ...scenarioBInputs.logistics, [logId]: value } };
        const result = calculateMarketPricing(activeMarket, newInputs);
        set({ scenarioBInputs: newInputs, scenarioBResult: result });
      },

      setScenarioBInput: (field, value) => {
        const { activeMarket, scenarioBInputs } = get();
        const newInputs = { ...scenarioBInputs, [field]: value };
        const result = calculateMarketPricing(activeMarket, newInputs);
        set({ scenarioBInputs: newInputs, scenarioBResult: result });
      },

      // ---- Portfolio ----

      addToPortfolio: (name, producer, notes = '') => {
        const { activeMarketId, activeMarket, inputs, result, portfolio } = get();
        const wine: PortfolioWine = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name,
          producer,
          notes,
          marketId: activeMarketId,
          inputs: JSON.parse(JSON.stringify(inputs)),
          cachedSrpBottle: result?.summary.srpBottle || 0,
          cachedWholesaleCase: result?.summary.wholesaleCase || 0,
          cachedLandedCase: result?.summary.landedCase || 0,
          cachedCurrencySymbol: activeMarket.currency.symbol,
          cachedMarketName: activeMarket.name,
          cachedMarketFlag: activeMarket.flag,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set({ portfolio: [wine, ...portfolio] });
      },

      updatePortfolioWine: (id, updates) => {
        const { portfolio } = get();
        set({
          portfolio: portfolio.map((w) =>
            w.id === id ? { ...w, ...updates, updatedAt: Date.now() } : w,
          ),
        });
      },

      removeFromPortfolio: (id) => {
        const { portfolio, editingWineId } = get();
        set({
          portfolio: portfolio.filter((w) => w.id !== id),
          editingWineId: editingWineId === id ? null : editingWineId,
        });
      },

      loadWineIntoCalculator: (id) => {
        const { portfolio } = get();
        const wine = portfolio.find((w) => w.id === id);
        if (!wine) return;

        const market = getMarketConfig(wine.marketId);
        if (!market) return;

        const inputs = JSON.parse(JSON.stringify(wine.inputs));
        const result = calculateMarketPricing(market, inputs);
        set({
          activeView: 'calculator',
          activeMarketId: wine.marketId,
          activeMarket: market,
          inputs,
          result,
          scenarioBEnabled: false,
          scenarioBResult: null,
          activeRecapLayer: market.chain[0]?.id || '',
          editingWineId: id,
        });
      },

      saveCalculatorToWine: (id) => {
        const { portfolio, activeMarketId, activeMarket, inputs, result } = get();
        set({
          portfolio: portfolio.map((w) =>
            w.id === id
              ? {
                  ...w,
                  marketId: activeMarketId,
                  inputs: JSON.parse(JSON.stringify(inputs)),
                  cachedSrpBottle: result?.summary.srpBottle || 0,
                  cachedWholesaleCase: result?.summary.wholesaleCase || 0,
                  cachedLandedCase: result?.summary.landedCase || 0,
                  cachedCurrencySymbol: activeMarket.currency.symbol,
                  cachedMarketName: activeMarket.name,
                  cachedMarketFlag: activeMarket.flag,
                  updatedAt: Date.now(),
                }
              : w,
          ),
        });
      },

      // ---- What-If ----

      setWhatIfOverride: (field, value) => {
        set({ whatIfOverrides: { ...get().whatIfOverrides, [field]: value } });
      },

      applyWhatIf: () => {
        const { portfolio, whatIfOverrides } = get();
        const results = calculateWhatIf(portfolio, whatIfOverrides);
        set({ whatIfResults: results, whatIfActive: true });
      },

      clearWhatIf: () => {
        set({
          whatIfOverrides: { ...DEFAULT_WHAT_IF_OVERRIDES },
          whatIfResults: null,
          whatIfActive: false,
        });
      },

      // ---- Live FX rates ----

      fetchRates: async (force = false) => {
        set({ ratesFetching: true });
        try {
          const result = await fetchLiveRates(force);
          if (result) {
            set({ liveRates: result, ratesFetching: false });
            // Auto-apply to current market
            get().applyLiveRate();
          } else {
            set({ ratesFetching: false });
          }
        } catch {
          set({ ratesFetching: false });
        }
      },

      applyLiveRate: () => {
        const { activeMarket, inputs, liveRates } = get();
        if (!liveRates || !activeMarket.currency.needsConversion) return;

        const liveRate = getRateForMarket(activeMarket, liveRates.rates);
        if (liveRate === null) return;

        const newInputs = { ...inputs, exchangeRate: liveRate };
        const result = calculateMarketPricing(activeMarket, newInputs);
        set({ inputs: newInputs, result });
      },
    }),
    {
      name: 'wine-pricing-studio',
      version: 3, // v3: Portfolio replaces savedScenarios
      partialize: (state) => ({
        activeMarketId: state.activeMarketId,
        inputs: state.inputs,
        marketInputMemory: state.marketInputMemory,
        costInputMode: state.costInputMode,
        activeView: state.activeView,
        portfolio: state.portfolio,
        editingWineId: state.editingWineId,
      }),
      migrate: (persisted, version) => {
        const old = persisted as Record<string, unknown>;
        if (version < 2) {
          // v1 → v2: logistics IDs changed, pathway field added
          const marketId = (old.activeMarketId as string) || 'us-import';
          const market = getMarketConfig(marketId) || MARKET_CONFIGS[0];
          const freshInputs = makeDefaultMarketInputs(market);
          old.inputs = freshInputs;
          old.marketInputMemory = {};
        }
        if (version < 3) {
          // v2 → v3: Convert savedScenarios to portfolio
          interface OldScenario {
            id: string;
            name: string;
            marketId: string;
            marketName: string;
            marketFlag: string;
            inputs: MarketPricingInputs;
            srpBottle: number;
            currencySymbol: string;
            createdAt: number;
          }
          const savedScenarios = (old.savedScenarios as OldScenario[]) || [];
          const portfolio: PortfolioWine[] = savedScenarios.map((s) => ({
            id: s.id,
            name: s.name,
            producer: '',
            notes: '',
            marketId: s.marketId,
            inputs: s.inputs,
            cachedSrpBottle: s.srpBottle,
            cachedWholesaleCase: 0,
            cachedLandedCase: 0,
            cachedCurrencySymbol: s.currencySymbol,
            cachedMarketName: s.marketName,
            cachedMarketFlag: s.marketFlag,
            createdAt: s.createdAt,
            updatedAt: s.createdAt,
          }));
          old.portfolio = portfolio;
          old.activeView = 'calculator';
          old.editingWineId = null;
          delete old.savedScenarios;
        }
        return old;
      },
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<MarketStore>) };
        if (merged.activeMarketId) {
          const market = getMarketConfig(merged.activeMarketId) || MARKET_CONFIGS[0];
          merged.activeMarket = market;
          // Ensure pathway is set for markets that define pathways
          if (market.pathways && !merged.inputs.pathway) {
            merged.inputs = {
              ...merged.inputs,
              pathway: market.pathways.find((p) => p.default)?.id ?? market.pathways[0]?.id,
            };
          }
          merged.result = calculateMarketPricing(market, merged.inputs);
          merged.activeRecapLayer = market.chain[0]?.id || '';
        }
        // Recalculate cached values for migrated portfolio wines
        if (merged.portfolio) {
          merged.portfolio = merged.portfolio.map((wine) => {
            if (wine.cachedWholesaleCase === 0 && wine.cachedSrpBottle > 0) {
              const wineMarket = getMarketConfig(wine.marketId);
              if (wineMarket) {
                const result = calculateMarketPricing(wineMarket, wine.inputs);
                return {
                  ...wine,
                  cachedSrpBottle: result.summary.srpBottle,
                  cachedWholesaleCase: result.summary.wholesaleCase,
                  cachedLandedCase: result.summary.landedCase,
                };
              }
            }
            return wine;
          });
        }
        // Reset transient what-if state
        merged.whatIfOverrides = { ...DEFAULT_WHAT_IF_OVERRIDES };
        merged.whatIfResults = null;
        merged.whatIfActive = false;
        return merged;
      },
      onRehydrateStorage: () => {
        return () => {
          // Always fetch live FX rates on app startup
          setTimeout(() => useMarketStore.getState().fetchRates(), 100);
        };
      },
    },
  ),
);
