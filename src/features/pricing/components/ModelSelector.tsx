import { usePricingStore } from '../state/usePricingStore';
import { SelectInput } from '@/components/ui/SelectInput';
import {
  TradeActor,
  type TradeActorType,
  type CounterpartyType,
  type InventoryContextType,
} from '@/engine/core/enums';
import {
  TRADE_ACTOR_LABELS,
  COUNTERPARTY_LABELS,
  INVENTORY_LABELS,
  ALLOWED_COUNTERPARTIES,
  ALLOWED_INVENTORY,
  MODEL_LABELS,
} from '@/engine/core/constants';
import { resolvePricingModelId } from '@/engine/core/resolver';

export function ModelSelector() {
  const { inputs, setWhoAmI, setSellingTo, setInventory } = usePricingStore();

  const counterparties = ALLOWED_COUNTERPARTIES[inputs.whoAmI] || [];
  const inventories = ALLOWED_INVENTORY[inputs.whoAmI] || [];

  const resolvedModel = resolvePricingModelId(inputs.whoAmI, inputs.sellingTo, inputs.inventory);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SelectInput
          label="Who are you?"
          value={inputs.whoAmI}
          onChange={(e) => setWhoAmI(e.target.value as TradeActorType)}
        >
          {Object.values(TradeActor).map((actor) => (
            <option key={actor} value={actor}>
              {TRADE_ACTOR_LABELS[actor]}
            </option>
          ))}
        </SelectInput>

        <SelectInput
          label="Selling to"
          value={inputs.sellingTo}
          onChange={(e) => setSellingTo(e.target.value as CounterpartyType)}
          disabled={counterparties.length === 0}
        >
          {counterparties.map((cp) => (
            <option key={cp} value={cp}>
              {COUNTERPARTY_LABELS[cp]}
            </option>
          ))}
        </SelectInput>

        <SelectInput
          label="Inventory location"
          value={inputs.inventory}
          onChange={(e) => setInventory(e.target.value as InventoryContextType)}
          disabled={inventories.length <= 1}
        >
          {inventories.map((inv) => (
            <option key={inv} value={inv}>
              {INVENTORY_LABELS[inv]}
            </option>
          ))}
        </SelectInput>
      </div>

      {resolvedModel && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Model:</span>
          <span className="font-medium text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full text-xs">
            {MODEL_LABELS[resolvedModel] || resolvedModel}
          </span>
        </div>
      )}
    </div>
  );
}
