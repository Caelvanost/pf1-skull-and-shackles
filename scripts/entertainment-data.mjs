import { MODULE_ID } from "./ship-data.mjs";
import { actorByUuid, listCrewActors, listActorSkills, abilityMod, saveMod } from "./life-data.mjs";

export const ENTERTAINMENT_FLAG = "pirateEntertainment";

const uid = () => {
  try { return foundry.utils.randomID(); } catch { return Math.random().toString(36).slice(2, 10); }
};
const n = (v, f = 0) => Number.isFinite(Number(v)) ? Number(v) : f;
const b = (v) => Boolean(v);
const arr = (v) => Array.isArray(v) ? v : (v && typeof v === "object" ? Object.values(v) : []);

export function createPigParticipant() {
  return { id: uid(), actorUuid: "", userId: "", manualModifier: 0, improvisedThrowOverride: false, lowRankNpc: false, lastTotal: null, lastRolledRound: 0 };
}

export function createDrinkParticipant() {
  return { id: uid(), actorUuid: "", userId: "", active: true, lowRankNpc: false, drinks: 0, conDamage: 0, failedAddictionSaves: 0, lastFortTotal: null, lastDc: 15, lastRolledRound: 0 };
}

export function defaultEntertainmentData() {
  return {
    performance: {
      actorUuid: "",
      skillId: "",
      manualModifier: 0,
      recoverySkillId: "",
      blocked: {},
      effects: {}
    },
    arm: {
      open: false,
      actorAUuid: "",
      actorBUuid: "",
      userAId: "",
      userBId: "",
      lastTotalA: null,
      lastTotalB: null,
      stake: 1,
      aLowRankNpc: false,
      bLowRankNpc: false,
      manualA: 0,
      manualB: 0
    },
    pig: {
      open: false,
      round: 1,
      stake: 1,
      participants: [createPigParticipant(), createPigParticipant()]
    },
    drinking: {
      open: false,
      stake: 1,
      round: 0,
      participants: [createDrinkParticipant(), createDrinkParticipant()]
    }
  };
}

function normalizePerformance(raw = {}) {
  const base = defaultEntertainmentData().performance;
  return {
    ...base,
    ...raw,
    manualModifier: n(raw.manualModifier, 0),
    blocked: raw.blocked && typeof raw.blocked === "object" ? raw.blocked : {},
    effects: raw.effects && typeof raw.effects === "object" ? raw.effects : {}
  };
}

function normalizeArm(raw = {}) {
  const base = defaultEntertainmentData().arm;
  return {
    ...base,
    ...raw,
    open: b(raw.open),
    stake: Math.max(1, n(raw.stake, 1)),
    userAId: String(raw.userAId ?? ""),
    userBId: String(raw.userBId ?? ""),
    lastTotalA: raw.lastTotalA === null || raw.lastTotalA === "" || raw.lastTotalA === undefined ? null : n(raw.lastTotalA, 0),
    lastTotalB: raw.lastTotalB === null || raw.lastTotalB === "" || raw.lastTotalB === undefined ? null : n(raw.lastTotalB, 0),
    aLowRankNpc: b(raw.aLowRankNpc),
    bLowRankNpc: b(raw.bLowRankNpc),
    manualA: n(raw.manualA, 0),
    manualB: n(raw.manualB, 0)
  };
}

function normalizePigParticipant(raw = {}) {
  const base = createPigParticipant();
  return {
    ...base,
    ...raw,
    id: String(raw.id || base.id),
    userId: String(raw.userId ?? ""),
    manualModifier: n(raw.manualModifier, 0),
    improvisedThrowOverride: b(raw.improvisedThrowOverride),
    lowRankNpc: b(raw.lowRankNpc),
    lastTotal: raw.lastTotal === null || raw.lastTotal === "" || raw.lastTotal === undefined ? null : n(raw.lastTotal, 0),
    lastRolledRound: Math.max(0, Math.floor(n(raw.lastRolledRound, 0)))
  };
}

function normalizeDrinkParticipant(raw = {}) {
  const base = createDrinkParticipant();
  return {
    ...base,
    ...raw,
    id: String(raw.id || base.id),
    userId: String(raw.userId ?? ""),
    active: raw.active !== false,
    lowRankNpc: b(raw.lowRankNpc),
    drinks: Math.max(0, Math.floor(n(raw.drinks, 0))),
    conDamage: Math.max(0, Math.floor(n(raw.conDamage, 0))),
    failedAddictionSaves: Math.max(0, Math.floor(n(raw.failedAddictionSaves, 0))),
    lastFortTotal: raw.lastFortTotal === null || raw.lastFortTotal === "" || raw.lastFortTotal === undefined ? null : n(raw.lastFortTotal, 0),
    lastDc: Math.max(15, Math.floor(n(raw.lastDc, 15))),
    lastRolledRound: Math.max(0, Math.floor(n(raw.lastRolledRound, 0)))
  };
}

export function normalizeEntertainmentData(raw = {}) {
  const base = defaultEntertainmentData();
  return {
    ...base,
    ...raw,
    performance: normalizePerformance(raw.performance ?? {}),
    arm: normalizeArm(raw.arm ?? {}),
    pig: {
      ...base.pig,
      ...(raw.pig ?? {}),
      open: b(raw.pig?.open),
      round: Math.max(1, Math.floor(n(raw.pig?.round, 1))),
      stake: Math.max(1, n(raw.pig?.stake, 1)),
      participants: arr(raw.pig?.participants).map(normalizePigParticipant)
    },
    drinking: {
      ...base.drinking,
      ...(raw.drinking ?? {}),
      open: b(raw.drinking?.open),
      stake: Math.max(1, n(raw.drinking?.stake, 1)),
      round: Math.max(0, Math.floor(n(raw.drinking?.round, 0))),
      participants: arr(raw.drinking?.participants).map(normalizeDrinkParticipant)
    }
  };
}

export function getEntertainmentData(ship) {
  return normalizeEntertainmentData(ship?.getFlag?.(MODULE_ID, ENTERTAINMENT_FLAG) ?? {});
}

export async function setEntertainmentData(ship, data) {
  const normalized = normalizeEntertainmentData(data);
  await ship.setFlag(MODULE_ID, ENTERTAINMENT_FLAG, normalized);
  return normalized;
}

export function crewActorChoices() { return listCrewActors(); }
export { actorByUuid, listActorSkills, abilityMod, saveMod };

export function performanceSkills(actor) {
  return listActorSkills(actor).filter(s => /repr[eé]sentation|perform/i.test(s.name)).sort((a,b)=>b.mod-a.mod);
}

export function recoverySkills(actor) {
  return listActorSkills(actor).filter(s => /bluff|intimid/i.test(s.name)).sort((a,b)=>b.mod-a.mod);
}

export function actorCmb(actor) {
  const raw = actor?.system?.attributes?.cmb ?? {};
  const direct = raw.total ?? raw.value ?? raw.mod;
  if (Number.isFinite(Number(direct))) return Number(direct);
  const bab = n(actor?.system?.attributes?.bab?.total ?? actor?.system?.attributes?.bab?.value, 0);
  return bab + abilityMod(actor, "str");
}

export function hasImprovisedThrow(actor) {
  if (!actor) return false;
  return (actor.items ?? []).some(i => /lancer\s+improvis[eé]|improvised\s+throw/i.test(String(i.name ?? "")));
}

export function worldTimeNow() {
  return n(game.time?.worldTime, Math.floor(Date.now() / 1000));
}

export function cleanupPerformanceState(data) {
  const now = worldTimeNow();
  const effects = { ...(data.performance?.effects ?? {}) };
  let changed = false;
  for (const [uuid, effect] of Object.entries(effects)) {
    if (n(effect?.expiresAt, 0) > 0 && n(effect.expiresAt, 0) <= now) {
      delete effects[uuid];
      changed = true;
    }
  }
  if (changed) data.performance.effects = effects;
  return changed;
}

export function getPerformanceEffect(ship, actorUuid) {
  const data = getEntertainmentData(ship);
  cleanupPerformanceState(data);
  const effect = data.performance.effects?.[actorUuid] ?? null;
  if (!effect) return null;
  if (n(effect.expiresAt, 0) <= worldTimeNow()) return null;
  return effect;
}

/**
 * Le texte donne +2 aux tests de compétence basés sur le Charisme quand le personnage
 * interagit avec l'un de ses auditeurs. Dans cette première automatisation, une
 * représentation réussie dans le contrôleur est considérée comme donnée à l'équipage
 * présent du navire ; le bonus est donc exposé aux autres contrôleurs rattachés à ce navire.
 */
export function getPerformanceCharismaBonus(ship, actorUuid) {
  return getPerformanceEffect(ship, actorUuid) ? 2 : 0;
}
