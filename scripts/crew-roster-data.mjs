import { MODULE_ID } from "./ship-data.mjs";

export const CREW_ROSTER_FLAG = "crewRoster";

const uid = () => {
  try { return foundry.utils.randomID(); }
  catch { return Math.random().toString(36).slice(2, 10); }
};

const arr = (value) => Array.isArray(value)
  ? value
  : (value && typeof value === "object"
    ? Object.keys(value).sort((a, b) => Number(a) - Number(b)).map((key) => value[key])
    : []);

export const CREW_WATCHES = Object.freeze({
  none: "—",
  port: "Bâbord",
  starboard: "Tribord",
  dog: "Quart du chien",
  day: "Quart de jour",
  night: "Quart de nuit",
  reserve: "Réserve"
});

export function createRosterEntry(actorUuid = "") {
  return {
    id: uid(),
    actorUuid: String(actorUuid ?? ""),
    duty: "",
    watch: "none",
    highlighted: false,
    notes: ""
  };
}

export function normalizeRosterEntry(raw = {}) {
  const base = createRosterEntry(raw.actorUuid);
  return {
    ...base,
    ...raw,
    id: String(raw.id || base.id),
    actorUuid: String(raw.actorUuid ?? ""),
    duty: String(raw.duty ?? ""),
    watch: CREW_WATCHES[raw.watch] ? String(raw.watch) : "none",
    highlighted: Boolean(raw.highlighted),
    notes: String(raw.notes ?? "")
  };
}

export function defaultCrewRosterData() {
  return { entries: [] };
}

export function normalizeCrewRosterData(raw = {}) {
  const entries = arr(raw.entries).map(normalizeRosterEntry).filter((entry) => entry.actorUuid);
  const seen = new Set();
  return {
    ...defaultCrewRosterData(),
    ...raw,
    entries: entries.filter((entry) => seen.has(entry.actorUuid) ? false : (seen.add(entry.actorUuid), true))
  };
}

export function getCrewRosterData(ship) {
  return normalizeCrewRosterData(ship?.getFlag?.(MODULE_ID, CREW_ROSTER_FLAG) ?? {});
}

export async function setCrewRosterData(ship, data) {
  const normalized = normalizeCrewRosterData(data);
  await ship.setFlag(MODULE_ID, CREW_ROSTER_FLAG, normalized);
  return normalized;
}

export function rosterEntryForActor(data, actorUuid) {
  return normalizeCrewRosterData(data).entries.find((entry) => entry.actorUuid === actorUuid) ?? null;
}