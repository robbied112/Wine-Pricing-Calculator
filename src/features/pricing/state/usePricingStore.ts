import { create } from 'zustand';
import type { PricingInputs, PricingResult, Preset, ComparisonResult } from '@/engine/core/types';
import type { TradeActorType, CounterpartyType, InventoryContextType, RecapActorType } from '@/engine/core/enums';
import { TradeActor, Counterparty, InventoryContext, RecapActor } from '@/engine/core/enums';
import { ALLOWED_COUNTERPARTIES, ALLOWED_INVENTORY, DEFAULT_INPUTS } from '@/engine/core/constants';
import { calculatePricing } from '@/engine/calculators';
import { compareScenarios } from '@/engine/comparison/compareScenarios';
import { DEFAULT_PRESETS } from '@/engine/presets/defaultPresets';

function makeDefaultInputs(
  whoAmI: TradeActorType = TradeActor.EuroWinery,
  sellingTo?: CounterpartyType,
  inventory?: InventoryContextType,
): PricingInputs {
  const defaults = DEFAULT_INPUTS[whoAmI] || {};
  const counterparties = ALLOWED_COUNTERPARTIES[whoAmI];
  const inventories = ALLOWED_INVENTORY[whoAmI];

  return {
    whoAmI,
    sellingTo: sellingTo || counterparties[0] || Counterparty.Distributor,
    inventory: inventory || inventories[0] || InventoryContext.Euro_FOB_Winery,
    exCellarBottle: 5,
    casePack: 12,
    exchangeRate: 1.08,
    exchangeBuffer: 0,
    diFreightPerCase: 0,
    tariffPercent: 0,
    statesideLogisticsPerCase: 0,
    importerMarginPercent: 0,
    distributorMarginPercent: 0,
    retailerMarginPercent: 33,
    ...defaults,
  };
}

interface PricingStore {
  // Scenario A (baseline)
  inputs: PricingInputs;
  result: PricingResult | null;

  // Scenario B (comparison)
  scenarioBEnabled: boolean;
  scenarioBLabel: string;
  scenarioBInputs: PricingInputs;
  scenarioBResult: PricingResult | null;
  comparison: ComparisonResult | null;

  // Recap
  recapActor: RecapActorType;

  // Presets
  activePresetId: string | null;
  presets: Preset[];
  overrideUnlocked: boolean;

  // Actions
  setField: (field: keyof PricingInputs, value: PricingInputs[keyof PricingInputs]) => void;
  setWhoAmI: (actor: TradeActorType) => void;
  setSellingTo: (counter: CounterpartyType) => void;
  setInventory: (inventory: InventoryContextType) => void;
  setRecapActor: (actor: RecapActorType) => void;

  // Scenario B
  toggleScenarioB: () => void;
  setScenarioBLabel: (label: string) => void;
  setScenarioBField: (field: keyof PricingInputs, value: PricingInputs[keyof PricingInputs]) => void;

  // Presets
  applyPreset: (presetId: string) => void;
  setOverrideUnlocked: (unlocked: boolean) => void;

  // Recalculate
  recalculate: () => void;
}

export const usePricingStore = create<PricingStore>((set, get) => ({
  inputs: makeDefaultInputs(),
  result: null,

  scenarioBEnabled: false,
  scenarioBLabel: 'Scenario B',
  scenarioBInputs: makeDefaultInputs(),
  scenarioBResult: null,
  comparison: null,

  recapActor: RecapActor.Distributor,

  activePresetId: 'eu-baseline',
  presets: DEFAULT_PRESETS,
  overrideUnlocked: false,

  setField: (field, value) => {
    set((state) => {
      const inputs = { ...state.inputs, [field]: value };
      const result = calculatePricing(inputs);
      let comparison = state.comparison;
      if (state.scenarioBEnabled && state.scenarioBResult) {
        const scenarioBResult = calculatePricing(state.scenarioBInputs);
        comparison = compareScenarios(result, scenarioBResult);
      }
      return { inputs, result, comparison };
    });
  },

  setWhoAmI: (actor) => {
    set(() => {
      const inputs = makeDefaultInputs(actor);
      const result = calculatePricing(inputs);
      return {
        inputs,
        result,
        scenarioBInputs: { ...inputs },
        scenarioBResult: null,
        comparison: null,
        activePresetId: null,
      };
    });
  },

  setSellingTo: (counter) => {
    set((state) => {
      const inputs = { ...state.inputs, sellingTo: counter };
      const result = calculatePricing(inputs);
      return { inputs, result, comparison: null };
    });
  },

  setInventory: (inventory) => {
    set((state) => {
      const inputs = { ...state.inputs, inventory };
      const result = calculatePricing(inputs);
      return { inputs, result, comparison: null };
    });
  },

  setRecapActor: (actor) => set({ recapActor: actor }),

  toggleScenarioB: () => {
    set((state) => {
      const enabled = !state.scenarioBEnabled;
      if (enabled) {
        const scenarioBInputs = { ...state.inputs };
        const scenarioBResult = calculatePricing(scenarioBInputs);
        const comparison = state.result ? compareScenarios(state.result, scenarioBResult) : null;
        return { scenarioBEnabled: true, scenarioBInputs, scenarioBResult, comparison };
      }
      return { scenarioBEnabled: false, scenarioBResult: null, comparison: null };
    });
  },

  setScenarioBLabel: (label) => set({ scenarioBLabel: label }),

  setScenarioBField: (field, value) => {
    set((state) => {
      const scenarioBInputs = { ...state.scenarioBInputs, [field]: value };
      const scenarioBResult = calculatePricing(scenarioBInputs);
      const comparison = state.result ? compareScenarios(state.result, scenarioBResult) : null;
      return { scenarioBInputs, scenarioBResult, comparison };
    });
  },

  applyPreset: (presetId) => {
    const preset = get().presets.find((p) => p.id === presetId);
    if (!preset) return;
    set((state) => {
      const inputs = { ...state.inputs, ...preset.values };
      const result = calculatePricing(inputs);
      return { inputs, result, activePresetId: presetId, overrideUnlocked: false };
    });
  },

  setOverrideUnlocked: (unlocked) => set({ overrideUnlocked: unlocked }),

  recalculate: () => {
    set((state) => {
      const result = calculatePricing(state.inputs);
      let scenarioBResult = state.scenarioBResult;
      let comparison = state.comparison;
      if (state.scenarioBEnabled) {
        scenarioBResult = calculatePricing(state.scenarioBInputs);
        comparison = compareScenarios(result, scenarioBResult);
      }
      return { result, scenarioBResult, comparison };
    });
  },
}));

// Initialize on load
usePricingStore.getState().recalculate();
