import { MODULE_ID } from "./ship-data.mjs";

export const DAILY_CYCLE_FLAG = "dailyCycle";

export const DAILY_PHASES = Object.freeze([
  { id: "dawn", label: "Aube & affectations", icon: "fa-solid fa-sun" },
  { id: "work", label: "Travail de jour", icon: "fa-solid fa-hammer" },
  { id: "blood", label: "Heure du sang", icon: "fa-solid fa-gavel" },
  { id: "evening", label: "Soirée & détente", icon: "fa-solid fa-masks-theater" },
  { id: "night", label: "Actions nocturnes", icon: "fa-solid fa-moon" },
  { id: "rest", label: "Repos & relève", icon: "fa-solid fa-bed" }
]);

const n = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const arr = (value) => Array.isArray(value)
  ? value
  : (value && typeof value === "object"
    ? Object.keys(value).sort((a, b) => Number(a) - Number(b)).map((key) => value[key])
    : []);

export function phaseInfo(id = "dawn") {
  return DAILY_PHASES.find((phase) => phase.id === id) ?? DAILY_PHASES[0];
}

export function defaultDailyCycleData() {
  return {
    day: 1,
    phase: "dawn",
    history: []
  };
}

export function normalizeDailyCycleData(raw = {}) {
  const base = defaultDailyCycleData();
  const phase = phaseInfo(raw.phase).id;
  const history = arr(raw.history).slice(-100).map((entry) => ({
    at: Math.max(0, Math.floor(n(entry?.at))),
    day: Math.max(1, Math.floor(n(entry?.day, 1))),
    phase: phaseInfo(entry?.phase).id,
    type: String(entry?.type ?? "note"),
    label: String(entry?.label ?? "")
  }));
  return {
    ...base,
    ...raw,
    day: Math.max(1, Math.floor(n(raw.day, 1))),
    phase,
    history
  };
}

export function getDailyCycleData(ship) {
  return normalizeDailyCycleData(ship?.getFlag?.(MODULE_ID, DAILY_CYCLE_FLAG) ?? {});
}

export async function setDailyCycleData(ship, data) {
  const normalized = normalizeDailyCycleData(data);
  await ship.setFlag(MODULE_ID, DAILY_CYCLE_FLAG, normalized);
  return normalized;
}

export function addDailyHistory(data, type, label) {
  const normalized = normalizeDailyCycleData(data);
  normalized.history.push({
    at: Date.now(),
    day: normalized.day,
    phase: normalized.phase,
    type: String(type ?? "note"),
    label: String(label ?? "")
  });
  normalized.history = normalized.history.slice(-100);
  return normalized;
}

export function nextDailyPhase(current = "dawn", direction = 1) {
  const index = Math.max(0, DAILY_PHASES.findIndex((phase) => phase.id === current));
  const next = (index + direction + DAILY_PHASES.length) % DAILY_PHASES.length;
  return {
    phase: DAILY_PHASES[next].id,
    wrappedForward: direction > 0 && next <= index,
    wrappedBackward: direction < 0 && next >= index
  };
}
