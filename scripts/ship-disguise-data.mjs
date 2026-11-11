import { MODULE_ID } from "./ship-data.mjs";

export const DISGUISE_FLAG = "shipDisguise";

function n(v, f = 0) { const x = Number(v); return Number.isFinite(x) ? x : f; }

export function defaultDisguiseData(actor = null) {
  const cost = Math.max(0, n(actor?.system?.details?.cost, 0));
  return {
    originalName: actor?.name ?? "",
    currentIdentity: actor?.name ?? "",
    proposedName: actor?.name ?? "",
    flagDescription: "",
    appearanceNotes: "",
    purchasePrice: cost,
    attitude: "friendly",
    hiddenCompartments: 0,
    builderModifier: 14,
    durationDays: 0,
    baseCost: 0,
    compartmentCost: 0,
    totalCost: 0,
    status: "none",
    lastCraftTotal: null,
    recognitionDc: 20,
    financing: {
      enabled: false,
      negotiated: false,
      repaymentPercent: 150,
      paid: 0,
      diplomacyModifier: 0,
      paymentAmount: 0
    },
    history: []
  };
}

export function normalizeDisguiseData(actor, raw = {}) {
  const base = defaultDisguiseData(actor);
  const data = foundry.utils.mergeObject(base, foundry.utils.deepClone(raw ?? {}), { inplace: false, overwrite: true, insertKeys: true, insertValues: true });
  data.originalName ||= actor?.name ?? "";
  data.currentIdentity ||= actor?.name ?? "";
  data.proposedName ||= data.currentIdentity;
  data.purchasePrice = Math.max(0, n(data.purchasePrice, n(actor?.system?.details?.cost, 0)));
  data.hiddenCompartments = Math.max(0, Math.floor(n(data.hiddenCompartments, 0)));
  data.builderModifier = n(data.builderModifier, 14);
  data.durationDays = Math.max(0, Math.floor(n(data.durationDays, 0)));
  data.attitude = ["friendly", "indifferent"].includes(data.attitude) ? data.attitude : "friendly";
  data.status = ["none", "planned", "working", "complete", "failed"].includes(data.status) ? data.status : "none";
  data.lastCraftTotal = data.lastCraftTotal === null || data.lastCraftTotal === undefined ? null : n(data.lastCraftTotal);
  data.recognitionDc = 20;
  data.financing = { ...base.financing, ...(data.financing ?? {}) };
  data.financing.repaymentPercent = data.financing.negotiated ? 133 : 150;
  data.financing.paid = Math.max(0, n(data.financing.paid, 0));
  data.financing.diplomacyModifier = n(data.financing.diplomacyModifier, 0);
  data.financing.paymentAmount = Math.max(0, n(data.financing.paymentAmount, 0));
  data.history = Array.isArray(data.history) ? data.history.slice(-30) : [];
  const surcharge = data.attitude === "indifferent" ? 1.10 : 1;
  data.baseCost = Math.round(data.purchasePrice * 0.20 * surcharge);
  data.compartmentCost = Math.round(data.hiddenCompartments * 500 * surcharge);
  data.totalCost = data.baseCost + data.compartmentCost;
  return data;
}

export function getDisguiseData(actor) {
  return normalizeDisguiseData(actor, actor?.getFlag?.(MODULE_ID, DISGUISE_FLAG) ?? {});
}

export async function setDisguiseData(actor, data) {
  const normalized = normalizeDisguiseData(actor, data);
  await actor.setFlag(MODULE_ID, DISGUISE_FLAG, normalized);
  return normalized;
}

export function addDisguiseHistory(data, entry) {
  data.history = [...(data.history ?? []), { timestamp: Date.now(), ...entry }].slice(-30);
}
