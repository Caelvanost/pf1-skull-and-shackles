import { MODULE_ID } from "./ship-data.mjs";
import { ENTERTAINMENT_FLAG, normalizeEntertainmentData } from "./entertainment-data.mjs";
import { LIFE_FLAG, normalizeLifeData } from "./life-data.mjs";
import { getSetting, SETTINGS } from "./settings.mjs";

export const MULTIPLAYER_AUDIT_FLAG = "multiplayerAudit";

const clone = (value) => foundry.utils.deepClone(value ?? {});
const arr = (value) => Array.isArray(value) ? value : [];
const n = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const uid = () => {
  try { return foundry.utils.randomID(); }
  catch { return Math.random().toString(36).slice(2, 12); }
};

export function defaultMultiplayerAudit() {
  return { revision: 0, history: [] };
}

export function normalizeMultiplayerAudit(raw = {}) {
  const base = defaultMultiplayerAudit();
  const limit = Math.max(20, Math.min(200, Math.floor(n(getSetting(SETTINGS.multiplayerHistoryLimit, 60), 60))));
  return {
    revision: Math.max(0, Math.floor(n(raw?.revision, 0))),
    history: arr(raw?.history).slice(-limit).map((entry) => ({
      id: String(entry?.id || uid()),
      requestId: String(entry?.requestId ?? ""),
      timestamp: Math.max(0, Math.floor(n(entry?.timestamp, Date.now()))),
      userId: String(entry?.userId ?? ""),
      userName: String(entry?.userName ?? ""),
      actorUuid: String(entry?.actorUuid ?? ""),
      actorName: String(entry?.actorName ?? ""),
      scope: ["entertainment", "life", "system"].includes(String(entry?.scope)) ? String(entry.scope) : "system",
      kind: String(entry?.kind ?? "action"),
      label: String(entry?.label ?? "Action multijoueur"),
      summary: String(entry?.summary ?? ""),
      before: clone(entry?.before),
      after: clone(entry?.after),
      undoneAt: Math.max(0, Math.floor(n(entry?.undoneAt, 0))),
      undoneBy: String(entry?.undoneBy ?? "")
    }))
  };
}

export function getMultiplayerAudit(ship) {
  return normalizeMultiplayerAudit(ship?.getFlag?.(MODULE_ID, MULTIPLAYER_AUDIT_FLAG) ?? {});
}

export async function setMultiplayerAudit(ship, audit) {
  const normalized = normalizeMultiplayerAudit(audit);
  await ship.setFlag(MODULE_ID, MULTIPLAYER_AUDIT_FLAG, normalized);
  return normalized;
}

export async function appendMultiplayerAudit(ship, entry = {}) {
  if (!ship) return null;
  const audit = getMultiplayerAudit(ship);
  const record = {
    id: uid(),
    requestId: String(entry.requestId ?? ""),
    timestamp: Date.now(),
    userId: String(entry.userId ?? ""),
    userName: String(entry.userName ?? ""),
    actorUuid: String(entry.actorUuid ?? ""),
    actorName: String(entry.actorName ?? ""),
    scope: ["entertainment", "life", "system"].includes(String(entry.scope)) ? String(entry.scope) : "system",
    kind: String(entry.kind ?? "action"),
    label: String(entry.label ?? "Action multijoueur"),
    summary: String(entry.summary ?? ""),
    before: clone(entry.before),
    after: clone(entry.after),
    undoneAt: 0,
    undoneBy: ""
  };
  audit.revision += 1;
  audit.history.push(record);
  await setMultiplayerAudit(ship, audit);
  return record;
}

function latestActiveIndexForScope(audit, scope) {
  for (let i = audit.history.length - 1; i >= 0; i--) {
    const row = audit.history[i];
    if (row.scope === scope && !row.undoneAt && row.kind !== "correction") return i;
  }
  return -1;
}

export function canUndoMultiplayerEntry(ship, entryId) {
  const audit = getMultiplayerAudit(ship);
  const index = audit.history.findIndex((row) => row.id === entryId);
  if (index < 0) return false;
  const row = audit.history[index];
  if (row.undoneAt || !["entertainment", "life"].includes(row.scope)) return false;
  return latestActiveIndexForScope(audit, row.scope) === index;
}

export async function undoMultiplayerEntry(ship, entryId) {
  if (!game.user?.isGM) throw new Error("Seul le MJ peut annuler une action multijoueur.");
  const audit = getMultiplayerAudit(ship);
  const index = audit.history.findIndex((row) => row.id === entryId);
  if (index < 0) throw new Error("Entrée d'historique introuvable.");
  const row = audit.history[index];
  if (row.undoneAt) throw new Error("Cette action a déjà été annulée.");
  if (latestActiveIndexForScope(audit, row.scope) !== index) throw new Error("Annule d'abord les actions plus récentes de ce même sous-système.");

  if (row.scope === "entertainment") {
    await ship.setFlag(MODULE_ID, ENTERTAINMENT_FLAG, normalizeEntertainmentData(row.before ?? {}));
  } else if (row.scope === "life") {
    await ship.setFlag(MODULE_ID, LIFE_FLAG, normalizeLifeData(row.before ?? {}));
  } else {
    throw new Error("Cette entrée ne peut pas être restaurée automatiquement.");
  }

  row.undoneAt = Date.now();
  row.undoneBy = game.user.id;
  audit.revision += 1;
  audit.history.push({
    id: uid(), requestId: "", timestamp: Date.now(), userId: game.user.id, userName: game.user.name,
    actorUuid: row.actorUuid, actorName: row.actorName, scope: "system", kind: "correction",
    label: `Correction MJ — ${row.label}`,
    summary: `Retour à l'état précédant l'action ${row.id}.`, before: {}, after: {}, undoneAt: 0, undoneBy: ""
  });
  await setMultiplayerAudit(ship, audit);
  return row;
}

export async function clearMultiplayerAudit(ship) {
  if (!game.user?.isGM) return;
  await setMultiplayerAudit(ship, defaultMultiplayerAudit());
}
