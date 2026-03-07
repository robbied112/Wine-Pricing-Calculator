import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MarketConfig, MarketPricingInputs, MarketPricingResult } from '@/engine/markets/types';
import { MARKET_CONFIGS, getMarketConfig } from '@/engine/markets/configs';
import { calculateMarketPricing, makeDefaultMarketInputs } from '@/engine/markets/genericCalculator';
import { fetchLiveRates, getRateForMarket, type LiveRatesResult } from '@/engine/fx/fetchRates';

// ---- Saved Scenario type ----

export interface SavedScenario {
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

// ---- Store interface ----

interface MarketStore {
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

  // Saved scenarios
  savedScenarios: SavedScenario[];

  // Live FX rates
  liveRates: LiveRatesResult | null;
  ratesFetching: boolean;

  // Actions
  setCostInputMode: (mode: 'bottle' | 'case') => void;
  setMarket: (marketId: string) => void;
  setInput: <K extends keyof MarketPricingInputs>(field: K, value: MarketPricingInputs[K]) => void;
  setMargin: (layerId: string, value: number) => void;
  setTax: (taxId: string, value: number) => void;
  setLogistics: (logId: string, value: number) => void;
  toggleLayer: (layerId: string) => void;
  setActiveRecapLayer: (layerId: string) => void;
  resetToDefaults: () => void;

  // Scenario B
  toggleScenarioB: () => void;
  setScenarioBLabel: (label: string) => void;
  setScenarioBMargin: (layerId: string, value: number) => void;
  setScenarioBTax: (taxId: string, value: number) => void;
  setScenarioBLogistics: (logId: string, value: number) => void;
  setScenarioBInput: <K extends keyof MarketPricingInputs>(field: K, value: MarketPricingInputs[K]) => void;

  // Saved scenarios
  saveScenario: (name: string) => void;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => void;

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
      savedScenarios: [],

      liveRates: null,
      ratesFetching: false,

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

      // ---- Saved scenarios ----

      saveScenario: (name) => {
        const { activeMarketId, activeMarket, inputs, result, savedScenarios } = get();
        const scenario: SavedScenario = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name,
          marketId: activeMarketId,
          marketName: activeMarket.name,
          marketFlag: activeMarket.flag,
          inputs: JSON.parse(JSON.stringify(inputs)),
          srpBottle: result?.summary.srpBottle || 0,
          currencySymbol: activeMarket.currency.symbol,
          createdAt: Date.now(),
        };
        set({ savedScenarios: [scenario, ...savedScenarios] });
      },

      loadScenario: (id) => {
        const { savedScenarios } = get();
        const scenario = savedScenarios.find((s) => s.id === id);
        if (!scenario) return;

        const market = getMarketConfig(scenario.marketId);
        if (!market) return;

        const result = calculateMarketPricing(market, scenario.inputs);
        set({
          activeMarketId: scenario.marketId,
          activeMarket: market,
          inputs: { ...scenario.inputs },
          result,
          scenarioBEnabled: false,
          scenarioBResult: null,
          activeRecapLayer: market.chain[0]?.id || '',
        });
      },

      deleteScenario: (id) => {
        const { savedScenarios } = get();
        set({ savedScenarios: savedScenarios.filter((s) => s.id !== id) });
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
      version: 1,
      partialize: (state) => ({
        activeMarketId: state.activeMarketId,
        inputs: state.inputs,
        marketInputMemory: state.marketInputMemory,
        savedScenarios: state.savedScenarios,
        costInputMode: state.costInputMode,
      }),
      // Resolve activeMarket immediately from persisted ID so the first
      // render already has the correct currency symbols / config.
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<MarketStore>) };
        if (merged.activeMarketId) {
          const market = getMarketConfig(merged.activeMarketId) || MARKET_CONFIGS[0];
          merged.activeMarket = market;
          merged.result = calculateMarketPricing(market, merged.inputs);
          merged.activeRecapLayer = market.chain[0]?.id || '';
        }
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
