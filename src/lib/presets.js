/**
 * @typedef {Object} Preset
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {Array<string>} lockedFields  // names of fields in inputs that should be locked
 * @property {Object} values               // partial inputs object to apply
 */

/** @type {Preset[]} */
export const PRESETS = [
  {
    id: 'eu-default',
    name: 'EU baseline',
    description: 'Standard 12-pack EU import at 15% tariff and typical margins.',
    lockedFields: [
      'currency',
      'casePack',
      'tariff',
      'exchangeBuffer',
      'diFreight',
      'statesideLogistics',
      'supplierMargin',
      'distributorMargin',
      'retailerMargin',
    ],
    values: {
      currency: 'EUR',
      casePack: 12,
      exchangeBuffer: 2,
      tariff: 15,
      diFreight: 13,
      statesideLogistics: 10,
      supplierMargin: 30,
      distributorMargin: 30,
      retailerMargin: 33,
    },
  },
  {
    id: 'promo-lower-margin',
    name: 'Promo / lower margin',
    description: 'Lowers supplier and distributor margins for aggressive pricing.',
    lockedFields: [
      'supplierMargin',
      'distributorMargin',
      'retailerMargin',
    ],
    values: {
      supplierMargin: 25,
      distributorMargin: 27,
      retailerMargin: 30,
    },
  },
];

/**
 * Apply a preset's values to the current inputs.
 * Does not mutate the original object.
 */
export function applyPresetToInputs(inputs, preset) {
  if (!preset) return inputs;
  return {
    ...inputs,
    ...preset.values,
  };
}

// LocalStorage key for user presets
export const USER_PRESETS_KEY = 'winePricingUserPresets';

/**
 * Load user presets from localStorage.
 * @returns {Preset[]}
 */
export function loadUserPresets() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(USER_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error('Failed to load user presets', e);
    return [];
  }
}

/**
 * Save user presets to localStorage.
 * @param {Preset[]} userPresets
 */
export function saveUserPresets(userPresets) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(userPresets));
  } catch (e) {
    console.error('Failed to save user presets', e);
  }
}

/**
 * Helper to combine built-in and user presets.
 * @param {Preset[]} userPresets
 * @returns {Preset[]}
 */
export function getAllPresets(userPresets = []) {
  return [...PRESETS, ...userPresets];
}
