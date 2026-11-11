import { MODULE_ID } from "./ship-data.mjs";

export const CREW_RELATIONS_FLAG = "crewRelations";

const uid = () => {
  try { return foundry.utils.randomID(); }
  catch { return Math.random().toString(36).slice(2, 10); }
};
const arr = (v) => Array.isArray(v) ? v : (v && typeof v === "object" ? Object.keys(v).sort((a,b)=>Number(a)-Number(b)).map(k=>v[k]) : []);

export const CREW_ATTITUDES = Object.freeze({
  hostile:     { label: "Hostile", order: 0, className: "danger", officialMutinySide: "opposition" },
  unfriendly:  { label: "Inamical", order: 1, className: "danger", officialMutinySide: "opposition" },
  indifferent: { label: "Indifférent", order: 2, className: "warning", officialMutinySide: "neutral" },
  friendly:    { label: "Amical", order: 3, className: "ok", officialMutinySide: "pcs" },
  helpful:     { label: "Serviable", order: 4, className: "ok", officialMutinySide: "pcs" }
});

export const MUTINY_SIDE_OVERRIDES = Object.freeze({
  auto: { label: "Selon l’attitude" },
  pcs: { label: "Avec les PJ" },
  neutral: { label: "Neutre" },
  opposition: { label: "Opposition" }
});

const LEGACY_ATTITUDE_MAP = Object.freeze({
  hostile: "hostile",
  inamicale: "unfriendly",
  inamical: "unfriendly",
  unfriendly: "unfriendly",
  "indifférente": "indifferent",
  indifferent: "indifferent",
  indifferente: "indifferent",
  amicale: "friendly",
  amical: "friendly",
  friendly: "friendly",
  serviable: "helpful",
  helpful: "helpful"
});

export function normalizeAttitude(value) {
  const raw = String(value ?? "indifferent").trim().toLowerCase();
  return CREW_ATTITUDES[raw] ? raw : (LEGACY_ATTITUDE_MAP[raw] ?? "indifferent");
}

export function createCrewRelation(actorUuid = "", attitude = "indifferent") {
  return {
    id: uid(),
    actorUuid: String(actorUuid ?? ""),
    attitude: normalizeAttitude(attitude),
    linkedPcUuid: "",
    mutinySide: "auto",
    notes: "",
    lastChangedAt: 0,
    lastChangedDay: 0
  };
}

export function normalizeCrewRelation(raw = {}) {
  const base = createCrewRelation(raw.actorUuid, raw.attitude);
  return {
    ...base,
    ...raw,
    id: String(raw.id || base.id),
    actorUuid: String(raw.actorUuid ?? ""),
    attitude: normalizeAttitude(raw.attitude),
    linkedPcUuid: String(raw.linkedPcUuid ?? ""),
    mutinySide: MUTINY_SIDE_OVERRIDES[raw.mutinySide] ? raw.mutinySide : "auto",
    notes: String(raw.notes ?? ""),
    lastChangedAt: Math.max(0, Math.floor(Number(raw.lastChangedAt) || 0)),
    lastChangedDay: Math.max(0, Math.floor(Number(raw.lastChangedDay) || 0))
  };
}

export function defaultCrewRelationsData() {
  return { entries: [], history: [] };
}

export function normalizeCrewRelationsData(raw = {}) {
  const base = defaultCrewRelationsData();
  const entries = arr(raw.entries).map(normalizeCrewRelation).filter(e => e.actorUuid);
  const seen = new Set();
  const unique = entries.filter(e => seen.has(e.actorUuid) ? false : (seen.add(e.actorUuid), true));
  const history = arr(raw.history).slice(-100).map(h => ({
    id: String(h?.id || uid()),
    at: Math.max(0, Math.floor(Number(h?.at) || Date.now())),
    day: Math.max(0, Math.floor(Number(h?.day) || 0)),
    actorUuid: String(h?.actorUuid ?? ""),
    actorName: String(h?.actorName ?? ""),
    from: normalizeAttitude(h?.from),
    to: normalizeAttitude(h?.to),
    source: String(h?.source ?? "MJ"),
    note: String(h?.note ?? "")
  }));
  return { ...base, ...raw, entries: unique, history };
}

export function getCrewRelationsData(ship) {
  return normalizeCrewRelationsData(ship?.getFlag?.(MODULE_ID, CREW_RELATIONS_FLAG) ?? {});
}

export async function setCrewRelationsData(ship, data) {
  const normalized = normalizeCrewRelationsData(data);
  await ship.setFlag(MODULE_ID, CREW_RELATIONS_FLAG, normalized);
  return normalized;
}

export function relationForActor(data, actorUuid) {
  if (!actorUuid) return null;
  const d = normalizeCrewRelationsData(data);
  return d.entries.find(e => e.actorUuid === actorUuid) ?? null;
}

export function attitudeInfo(value) {
  return CREW_ATTITUDES[normalizeAttitude(value)] ?? CREW_ATTITUDES.indifferent;
}

export function shiftAttitude(value, delta) {
  const keys = Object.keys(CREW_ATTITUDES).sort((a,b)=>CREW_ATTITUDES[a].order-CREW_ATTITUDES[b].order);
  const current = normalizeAttitude(value);
  const index = Math.max(0, keys.indexOf(current));
  const next = Math.max(0, Math.min(keys.length - 1, index + Math.trunc(Number(delta) || 0)));
  return keys[next];
}

export function mutinySideForRelation(entry) {
  const rel = normalizeCrewRelation(entry);
  if (rel.mutinySide !== "auto") return rel.mutinySide;
  return attitudeInfo(rel.attitude).officialMutinySide;
}

export function mutinyRoster(data) {
  const d = normalizeCrewRelationsData(data);
  const out = { pcs: [], neutral: [], opposition: [] };
  for (const entry of d.entries) out[mutinySideForRelation(entry)]?.push(entry);
  return out;
}

export function recordAttitudeChange(data, entry, { from, to, actorName = "", source = "MJ", note = "", day = 0 } = {}) {
  const d = normalizeCrewRelationsData(data);
  const target = d.entries.find(e => e.id === entry?.id || e.actorUuid === entry?.actorUuid);
  if (!target) return d;
  const a = normalizeAttitude(from ?? target.attitude);
  const b = normalizeAttitude(to ?? target.attitude);
  target.attitude = b;
  target.lastChangedAt = Date.now();
  target.lastChangedDay = Math.max(0, Math.floor(Number(day) || 0));
  d.history.push({ id: uid(), at: Date.now(), day: target.lastChangedDay, actorUuid: target.actorUuid, actorName, from: a, to: b, source, note });
  d.history = d.history.slice(-100);
  return d;
}
