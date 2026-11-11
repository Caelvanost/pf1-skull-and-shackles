import { MODULE_ID } from "./ship-data.mjs";
import { CREW_WATCHES } from "./crew-roster-data.mjs";

export const CREW_WATCH_FLAG = "crewWatch";

const n = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const arr = (value) => Array.isArray(value)
  ? value
  : (value && typeof value === "object"
    ? Object.keys(value).sort((a, b) => Number(a) - Number(b)).map((key) => value[key])
    : []);

export const FATIGUE_LEVELS = Object.freeze({
  0: { label: "Reposé", className: "ok", combatModifier: 0 },
  1: { label: "Fatigué", className: "warning", combatModifier: -1 },
  2: { label: "Épuisé", className: "danger", combatModifier: -2 },
  3: { label: "Hors service", className: "danger", combatModifier: -4 }
});

export const WATCH_ROTATION_ORDER = Object.freeze(["day", "port", "dog", "starboard", "night"]);

export function fatigueInfo(points = 0) {
  const key = Math.max(0, Math.min(3, Math.floor(n(points))));
  return { points: key, ...FATIGUE_LEVELS[key] };
}

export function watchLabel(key = "none") {
  return CREW_WATCHES[key] ?? String(key || "—");
}

export function createMemberFatigue(actorUuid = "") {
  return {
    actorUuid: String(actorUuid ?? ""),
    points: 0,
    note: "",
    updatedAt: 0
  };
}

export function normalizeMemberFatigue(raw = {}) {
  const base = createMemberFatigue(raw.actorUuid);
  return {
    ...base,
    ...raw,
    actorUuid: String(raw.actorUuid ?? ""),
    points: Math.max(0, Math.min(3, Math.floor(n(raw.points)))) ,
    note: String(raw.note ?? ""),
    updatedAt: Math.max(0, Math.floor(n(raw.updatedAt)))
  };
}

export function defaultCrewWatchData() {
  return {
    day: 1,
    currentWatch: "day",
    generalFatigue: 0,
    memberFatigue: [],
    history: []
  };
}

export function normalizeCrewWatchData(raw = {}) {
  const base = defaultCrewWatchData();
  const currentWatch = CREW_WATCHES[raw.currentWatch] && raw.currentWatch !== "none" && raw.currentWatch !== "reserve"
    ? String(raw.currentWatch)
    : base.currentWatch;
  const seen = new Set();
  const memberFatigue = arr(raw.memberFatigue)
    .map(normalizeMemberFatigue)
    .filter((entry) => entry.actorUuid && !seen.has(entry.actorUuid) && seen.add(entry.actorUuid));
  const history = arr(raw.history).slice(-50).map((entry) => ({
    at: Math.max(0, Math.floor(n(entry?.at))),
    day: Math.max(1, Math.floor(n(entry?.day, 1))),
    watch: String(entry?.watch ?? currentWatch),
    type: String(entry?.type ?? "update"),
    label: String(entry?.label ?? "Mise à jour")
  }));
  return {
    ...base,
    ...raw,
    day: Math.max(1, Math.floor(n(raw.day, 1))),
    currentWatch,
    generalFatigue: Math.max(0, Math.min(3, Math.floor(n(raw.generalFatigue)))),
    memberFatigue,
    history
  };
}

export function getCrewWatchData(ship) {
  return normalizeCrewWatchData(ship?.getFlag?.(MODULE_ID, CREW_WATCH_FLAG) ?? {});
}

export async function setCrewWatchData(ship, data) {
  const normalized = normalizeCrewWatchData(data);
  await ship.setFlag(MODULE_ID, CREW_WATCH_FLAG, normalized);
  return normalized;
}

export function getMemberFatigue(data, actorUuid) {
  const normalized = normalizeCrewWatchData(data);
  return normalized.memberFatigue.find((entry) => entry.actorUuid === actorUuid) ?? createMemberFatigue(actorUuid);
}

export function setMemberFatigue(data, actorUuid, points, note = "") {
  const normalized = normalizeCrewWatchData(data);
  const uuid = String(actorUuid ?? "");
  let entry = normalized.memberFatigue.find((row) => row.actorUuid === uuid);
  if (!entry) {
    entry = createMemberFatigue(uuid);
    normalized.memberFatigue.push(entry);
  }
  entry.points = Math.max(0, Math.min(3, Math.floor(n(points))));
  entry.note = String(note ?? entry.note ?? "");
  entry.updatedAt = Date.now();
  return normalized;
}

export function crewCombatFatigueModifier(shipOrData) {
  const data = shipOrData?.getFlag ? getCrewWatchData(shipOrData) : normalizeCrewWatchData(shipOrData ?? {});
  return fatigueInfo(data.generalFatigue).combatModifier;
}

export function memberSurvivalFatigueModifier(shipOrData, actorUuid) {
  const data = shipOrData?.getFlag ? getCrewWatchData(shipOrData) : normalizeCrewWatchData(shipOrData ?? {});
  return fatigueInfo(getMemberFatigue(data, actorUuid).points).combatModifier;
}

export function activeRotation(rosterEntries = []) {
  const used = new Set((rosterEntries ?? []).map((entry) => String(entry?.watch ?? "none")));
  const sequence = WATCH_ROTATION_ORDER.filter((watch) => used.has(watch));
  if (sequence.length) return sequence;
  return ["day", "night"];
}

export function addWatchHistory(data, type, label) {
  const normalized = normalizeCrewWatchData(data);
  normalized.history.push({
    at: Date.now(),
    day: normalized.day,
    watch: normalized.currentWatch,
    type: String(type ?? "update"),
    label: String(label ?? "Mise à jour")
  });
  normalized.history = normalized.history.slice(-50);
  return normalized;
}
