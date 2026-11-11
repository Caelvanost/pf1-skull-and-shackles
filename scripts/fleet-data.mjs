import { MODULE_ID } from "./ship-data.mjs";
import { getReputationData } from "./reputation-data.mjs";

export const FLEET_FLAG = "fleet";
export const FLEET_BATTLE_FLAG = "fleetBattle";

export const SHIP_TYPES = Object.freeze({
  raft: { label: "Radeau", pr: 1 },
  rowboat: { label: "Canot", pr: 1 },
  launch: { label: "Chaloupe", pr: 1 },
  keelboat: { label: "Quillard", pr: 2 },
  junk: { label: "Jonque", pr: 3 },
  longship: { label: "Drakkar", pr: 3 },
  sailingShip: { label: "Voilier", pr: 3 },
  galley: { label: "Galère", pr: 4 },
  warship: { label: "Navire de guerre", pr: 4 },
  custom: { label: "Autre", pr: 1 }
});

export const FLEET_ADVANTAGES = Object.freeze({
  advancedTactics: {
    label: "Tactique évoluée",
    requirement: "Personnage important avec au moins 11 rangs dans au moins 5 compétences différentes.",
    description: "+2 VA à un escadron au début de la phase ; s'il inflige des dégâts, sa flotte assigne ces dégâts.",
    repeatable: false,
    phaseChoice: true
  },
  defensiveTactics: {
    label: "Tactique défensive",
    requirement: "Aucune.",
    description: "+2 VD à un escadron pendant la phase de bataille.",
    repeatable: true,
    phaseChoice: true
  },
  divineProtection: {
    label: "Protection divine",
    requirement: "Personnage important doté de canalisation d'énergie.",
    description: "Un escadron reçoit 1 dégât de moins par attaque ennemie pendant la phase.",
    repeatable: true,
    phaseChoice: true
  },
  loyalty: {
    label: "Loyauté",
    requirement: "Personnage important avec Charisme 15 ou plus.",
    description: "Quand un nouvel escadron est recruté, les escadrons précédents gagnent +2 aux tests de moral (non cumulatif).",
    repeatable: false
  },
  magicArtillery: {
    label: "Artillerie magique",
    requirement: "Personnage important capable de lancer des sorts de niveau 6 ou plus.",
    description: "+1 aux dégâts et aux tests de moral de tous les escadrons.",
    repeatable: false
  },
  largeFleet: {
    label: "Grand nombre",
    requirement: "Personnage important avec le don Prestige.",
    description: "+1 au nombre maximum d'escadrons.",
    repeatable: true
  },
  recklessManeuver: {
    label: "Manœuvre téméraire",
    requirement: "Aucune.",
    description: "+4 VA à un escadron pour le round, mais -2 VD jusqu'à ce qu'il agisse lors de la phase de bataille suivante.",
    repeatable: true,
    phaseChoice: true
  },
  ruthlessAdvance: {
    label: "Avance impitoyable",
    requirement: "Personnage important avec BBA +11 ou plus.",
    description: "+2 attaque et dégâts à un escadron pendant la phase ; son moral augmente de 1 au début de la phase.",
    repeatable: false,
    phaseChoice: true
  },
  rapidRepairs: {
    label: "Réparations rapides",
    requirement: "Personnage important capable de lancer au moins un sort de niveau 4.",
    description: "À la fin de la phase de bataille, retire 1d6 dégâts à des bateaux non coulés d'un même escadron.",
    repeatable: false
  },
  eagerToFight: {
    label: "Prompt à se battre",
    requirement: "Aucune.",
    description: "+4 aux tests de Profession (marin) de l'amiral pour l'initiative.",
    repeatable: true
  },
  vengeance: {
    label: "Vengeance",
    requirement: "Aucune.",
    description: "Quand le premier bateau allié coule, +2 aux attaques et tests de moral pour le reste de la phase.",
    repeatable: false
  }
});

function uid(prefix = "id") {
  try { return foundry.utils.randomID(); } catch { return `${prefix}-${Math.random().toString(36).slice(2, 10)}`; }
}

function n(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, n(value, min)));
}

function actorByUuid(uuid) {
  if (!uuid) return null;
  try { return fromUuidSync(uuid) ?? null; } catch { return null; }
}

export function getSailorSkill(actor) {
  if (!actor?.allSkills) return null;
  const skills = [];
  for (const id of actor.allSkills) {
    try {
      const sk = actor.getSkillInfo(id);
      const name = String(sk?.fullName ?? sk?.name ?? id);
      const mod = n(sk?.mod, 0);
      skills.push({ id, name, mod });
    } catch { /* ignore */ }
  }
  const exact = skills.find((s) => /profession\s*\(\s*marin\s*\)|m[eé]tier\s*\(\s*marin\s*\)|sailor/i.test(s.name));
  if (exact) return exact;
  const professions = skills.filter((s) => /profession|m[eé]tier/i.test(s.name));
  return professions.sort((a, b) => b.mod - a.mod)[0] ?? null;
}

export function getCharismaMod(actor) {
  if (!actor) return null;
  const candidates = [
    actor.system?.abilities?.cha?.mod,
    actor.system?.abilities?.cha?.totalMod,
    actor.system?.abilities?.cha?.value
  ];
  for (const value of candidates) {
    if (Number.isFinite(Number(value))) {
      const raw = Number(value);
      if (value === actor.system?.abilities?.cha?.value && raw > 5) return Math.floor((raw - 10) / 2);
      return raw;
    }
  }
  return null;
}

export function resolveOfficer(uuid, fallback = {}) {
  const actor = actorByUuid(uuid);
  const sailor = getSailorSkill(actor);
  const cha = getCharismaMod(actor);
  return {
    actor,
    uuid: uuid || "",
    name: actor?.name ?? fallback.name ?? "",
    profession: sailor?.mod ?? n(fallback.profession, 0),
    professionName: sailor?.name ?? "Profession (marin)",
    cha: cha ?? n(fallback.cha, 0)
  };
}

export function createShipRecord(pr = 1) {
  return { id: uid("ship"), damage: 0, status: "active", pr: Math.max(1, Math.floor(n(pr, 1))) };
}

export function createSquadron({ name = "Nouvel escadron", shipType = "sailingShip", shipCount = 1, morale = 3 } = {}) {
  const pr = SHIP_TYPES[shipType]?.pr ?? 1;
  const count = Math.max(1, Math.floor(n(shipCount, 1)));
  return {
    id: uid("squadron"),
    name,
    shipType,
    customShipName: "",
    customPr: pr,
    shipCount: count,
    viceAdmiralUuid: "",
    viceAdmiralName: "",
    viceAdmiralCha: 0,
    viceAdmiralProfession: 0,
    counterAdmiralImportant: false,
    morale: clamp(morale, 0, 10),
    loyaltyBonus: 0,
    manualLosses: 0,
    manualAttack: 0,
    manualDefense: 0,
    manualDamage: 0,
    manualMorale: 0,
    mutinied: false,
    recruitmentType: "manual",
    recruitmentKey: "",
    ships: Array.from({ length: count }, () => createShipRecord(pr))
  };
}

export function createImportantCharacter() {
  return { id: uid("important"), name: "", actorUuid: "", location: "flagship", advantage: "defensiveTactics", enabled: true };
}

export function defaultFleetData() {
  return {
    name: "Nouvelle flotte",
    homePort: "",
    flagshipName: "",
    npcFleet: false,
    manualInfamy: 0,
    useReputationInfamy: true,
    admiralUuid: "",
    admiralName: "",
    admiralCha: 0,
    admiralProfession: 0,
    admiralInitiativeManual: 0,
    squadrons: [],
    importantCharacters: []
  };
}

function objectToArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  return Object.keys(value).sort((a, b) => Number(a) - Number(b)).map((k) => value[k]);
}

function normalizeShip(ship, pr) {
  let status = ["active", "disabled", "sunk"].includes(ship?.status) ? ship.status : "active";
  const damage = clamp(ship?.damage, 0, pr);
  if (status === "active" && damage >= pr) status = "disabled";
  return {
    id: ship?.id || uid("ship"),
    damage,
    status,
    pr
  };
}

export function normalizeSquadron(raw = {}) {
  const shipType = SHIP_TYPES[raw.shipType] ? raw.shipType : "sailingShip";
  const pr = shipType === "custom" ? Math.max(1, Math.floor(n(raw.customPr, 1))) : SHIP_TYPES[shipType].pr;
  const count = Math.max(1, Math.floor(n(raw.shipCount, 1)));
  const oldShips = objectToArray(raw.ships);
  const ships = Array.from({ length: count }, (_, i) => normalizeShip(oldShips[i] ?? createShipRecord(pr), pr));
  return {
    id: raw.id || uid("squadron"),
    name: String(raw.name ?? "Escadron"),
    shipType,
    customShipName: String(raw.customShipName ?? ""),
    customPr: pr,
    shipCount: count,
    viceAdmiralUuid: String(raw.viceAdmiralUuid ?? ""),
    viceAdmiralName: String(raw.viceAdmiralName ?? ""),
    viceAdmiralCha: n(raw.viceAdmiralCha, 0),
    viceAdmiralProfession: n(raw.viceAdmiralProfession, 0),
    counterAdmiralImportant: Boolean(raw.counterAdmiralImportant),
    morale: clamp(raw.morale, 0, 10),
    loyaltyBonus: clamp(raw.loyaltyBonus, 0, 2),
    manualLosses: Math.max(0, Math.floor(n(raw.manualLosses, 0))),
    manualAttack: n(raw.manualAttack, 0),
    manualDefense: n(raw.manualDefense, 0),
    manualDamage: n(raw.manualDamage, 0),
    manualMorale: n(raw.manualMorale, 0),
    mutinied: Boolean(raw.mutinied),
    recruitmentType: String(raw.recruitmentType ?? "manual"),
    recruitmentKey: String(raw.recruitmentKey ?? ""),
    ships
  };
}

export function normalizeFleetData(raw = {}) {
  const base = defaultFleetData();
  const importantCharacters = objectToArray(raw.importantCharacters).map((c) => ({
    id: c?.id || uid("important"),
    name: String(c?.name ?? ""),
    actorUuid: String(c?.actorUuid ?? ""),
    location: String(c?.location ?? "flagship"),
    advantage: FLEET_ADVANTAGES[c?.advantage] ? c.advantage : "defensiveTactics",
    enabled: c?.enabled !== false
  }));
  return {
    ...base,
    ...raw,
    name: String(raw.name ?? base.name),
    homePort: String(raw.homePort ?? ""),
    flagshipName: String(raw.flagshipName ?? ""),
    npcFleet: Boolean(raw.npcFleet),
    manualInfamy: Math.max(0, Math.floor(n(raw.manualInfamy, 0))),
    useReputationInfamy: raw.useReputationInfamy !== false,
    admiralUuid: String(raw.admiralUuid ?? ""),
    admiralName: String(raw.admiralName ?? ""),
    admiralCha: n(raw.admiralCha, 0),
    admiralProfession: n(raw.admiralProfession, 0),
    admiralInitiativeManual: n(raw.admiralInitiativeManual, 0),
    squadrons: objectToArray(raw.squadrons).map(normalizeSquadron),
    importantCharacters
  };
}

export function getFleetData(actor) {
  return normalizeFleetData(actor?.getFlag(MODULE_ID, FLEET_FLAG) ?? {});
}

export async function setFleetData(actor, data) {
  const normalized = normalizeFleetData(data);
  await actor.setFlag(MODULE_ID, FLEET_FLAG, normalized);
  return normalized;
}

export function fleetExists(actor) {
  return Boolean(actor?.getFlag(MODULE_ID, FLEET_FLAG));
}

export function getFleetInfamy(actor, fleet) {
  if (fleet.npcFleet) return 0;
  if (fleet.useReputationInfamy) {
    try { return Math.max(0, Math.floor(n(getReputationData(actor)?.infamy, fleet.manualInfamy))); } catch { /* ignore */ }
  }
  return Math.max(0, Math.floor(n(fleet.manualInfamy, 0)));
}

export function getSquadronPr(squadron) {
  return squadron.shipType === "custom" ? Math.max(1, Math.floor(n(squadron.customPr, 1))) : (SHIP_TYPES[squadron.shipType]?.pr ?? 1);
}

export function activeImportantCharacters(fleet) {
  const liveSquadIds = new Set(fleet.squadrons.filter((s) => !isSquadronEliminated(s)).map((s) => s.id));
  return fleet.importantCharacters.filter((c) => {
    if (!c.enabled) return false;
    if (!c.location || c.location === "flagship") return true;
    const match = /^squadron:(.+)$/.exec(c.location);
    return !match || liveSquadIds.has(match[1]);
  });
}

export function getAdvantageCounts(fleet) {
  const counts = {};
  for (const key of Object.keys(FLEET_ADVANTAGES)) counts[key] = 0;
  for (const c of activeImportantCharacters(fleet)) counts[c.advantage] = (counts[c.advantage] ?? 0) + 1;
  for (const [key, adv] of Object.entries(FLEET_ADVANTAGES)) {
    if (!adv.repeatable) counts[key] = Math.min(1, counts[key] ?? 0);
  }
  return counts;
}

export function getAdmiralData(fleet) {
  return resolveOfficer(fleet.admiralUuid, { name: fleet.admiralName, profession: fleet.admiralProfession, cha: fleet.admiralCha });
}

export function getViceAdmiralData(squadron) {
  return resolveOfficer(squadron.viceAdmiralUuid, { name: squadron.viceAdmiralName, profession: squadron.viceAdmiralProfession, cha: squadron.viceAdmiralCha });
}

export function getFleetMaxSquadrons(actor, fleet) {
  const admiral = getAdmiralData(fleet);
  const advantages = getAdvantageCounts(fleet);
  const base = fleet.npcFleet ? 3 : Math.floor(getFleetInfamy(actor, fleet) / 10);
  return Math.max(0, base + admiral.cha + (advantages.largeFleet ?? 0));
}

export function getSquadronMaxShips(squadron) {
  return Math.max(0, 3 + getViceAdmiralData(squadron).cha);
}

export function getShipStatusCounts(squadron) {
  const counts = { active: 0, disabled: 0, sunk: 0 };
  for (const ship of squadron.ships ?? []) counts[ship.status] = (counts[ship.status] ?? 0) + 1;
  return counts;
}

export function isSquadronEliminated(squadron) {
  if (squadron.mutinied || Number(squadron.morale) <= 0) return true;
  return !(squadron.ships ?? []).some((ship) => ship.status === "active");
}

export function fleetLostSquadrons(fleet, exceptId = null) {
  return fleet.squadrons.filter((s) => s.id !== exceptId && isSquadronEliminated(s)).length;
}

export function deriveSquadron(actor, fleet, squadron) {
  const vice = getViceAdmiralData(squadron);
  const pr = getSquadronPr(squadron);
  const counts = getShipStatusCounts(squadron);
  const disabledAndSunkLosses = counts.disabled + counts.sunk;
  const losses = disabledAndSunkLosses + fleetLostSquadrons(fleet, squadron.id) + Math.max(0, n(squadron.manualLosses, 0));
  const important = Boolean(squadron.counterAdmiralImportant);
  const currentPr = (squadron.ships ?? []).reduce((sum, ship) => ship.status === "active" ? sum + Math.max(0, pr - n(ship.damage, 0)) : sum, 0);
  const maxPr = squadron.shipCount * pr;
  const attack = vice.profession + (important ? 2 : 0) + n(squadron.manualAttack, 0);
  const defense = 10 + vice.profession + n(squadron.manualDefense, 0);
  const damageBonus = counts.active + (important ? 2 : 0) + n(squadron.manualDamage, 0);
  const moraleBase = vice.cha + (important ? 2 : 0) + n(squadron.loyaltyBonus, 0) + n(squadron.manualMorale, 0);
  const moraleMod = moraleBase - losses;
  return {
    vice, pr, counts, losses, currentPr, maxPr, attack, defense, damageBonus, moraleBase, moraleMod,
    eliminated: isSquadronEliminated(squadron),
    maxShips: getSquadronMaxShips(squadron),
    overShipLimit: squadron.shipCount > getSquadronMaxShips(squadron)
  };
}

export function defaultBattleState(opponentUuid = "") {
  return {
    opponentUuid,
    round: 0,
    phase: "setup",
    initiativeWinner: "",
    initiativeA: null,
    initiativeB: null,
    actedA: [],
    actedB: [],
    selectionsA: {},
    selectionsB: {},
    rapidRepairsUsedA: false,
    rapidRepairsUsedB: false,
    vengeanceA: false,
    vengeanceB: false,
    log: []
  };
}

export function normalizeBattleState(raw = {}, opponentUuid = "") {
  const base = defaultBattleState(opponentUuid);
  return {
    ...base,
    ...raw,
    opponentUuid: String(raw.opponentUuid ?? opponentUuid ?? ""),
    round: Math.max(0, Math.floor(n(raw.round, 0))),
    phase: ["setup", "battle", "rout", "ended"].includes(raw.phase) ? raw.phase : "setup",
    actedA: Array.isArray(raw.actedA) ? raw.actedA : [],
    actedB: Array.isArray(raw.actedB) ? raw.actedB : [],
    selectionsA: raw.selectionsA && typeof raw.selectionsA === "object" ? raw.selectionsA : {},
    selectionsB: raw.selectionsB && typeof raw.selectionsB === "object" ? raw.selectionsB : {},
    rapidRepairsUsedA: Boolean(raw.rapidRepairsUsedA),
    rapidRepairsUsedB: Boolean(raw.rapidRepairsUsedB),
    vengeanceA: Boolean(raw.vengeanceA),
    vengeanceB: Boolean(raw.vengeanceB),
    log: Array.isArray(raw.log) ? raw.log.slice(-30) : []
  };
}

export function getBattleState(actor, opponentUuid = "") {
  const raw = actor?.getFlag(MODULE_ID, FLEET_BATTLE_FLAG) ?? {};
  if (opponentUuid && raw.opponentUuid && raw.opponentUuid !== opponentUuid) return defaultBattleState(opponentUuid);
  return normalizeBattleState(raw, opponentUuid);
}

export async function setBattleState(actor, state) {
  const normalized = normalizeBattleState(state, state.opponentUuid);
  await actor.setFlag(MODULE_ID, FLEET_BATTLE_FLAG, normalized);
  return normalized;
}

export function getFleetBattleStatus(fleet) {
  const surviving = fleet.squadrons.filter((s) => !isSquadronEliminated(s));
  return { surviving, defeated: surviving.length === 0 };
}

export function allocationOrder(squadron, aggressive = false) {
  const ships = squadron.ships ?? [];
  if (aggressive) {
    return [
      ...ships.filter((s) => s.status === "disabled"),
      ...ships.filter((s) => s.status === "active").sort((a, b) => b.damage - a.damage)
    ];
  }
  return [
    ...ships.filter((s) => s.status === "active").sort((a, b) => a.damage - b.damage),
    ...ships.filter((s) => s.status === "disabled")
  ];
}

/** Apply abstract fleet damage. Normal allocation spreads damage defensively; aggressive allocation concentrates it. */
export function applyFleetDamage(squadron, amount, { aggressive = false } = {}) {
  let remaining = Math.max(0, Math.floor(n(amount, 0)));
  const pr = getSquadronPr(squadron);
  const events = [];
  let sunkNow = 0;
  let disabledNow = 0;

  while (remaining > 0) {
    const order = allocationOrder(squadron, aggressive);
    if (!order.length) break;
    const ship = order[0];
    if (ship.status === "disabled") {
      ship.status = "sunk";
      remaining -= 1;
      sunkNow += 1;
      events.push("Un bateau hors de combat reçoit de nouveaux dégâts et coule.");
      continue;
    }
    const need = Math.max(1, pr - n(ship.damage, 0));
    const spend = aggressive ? Math.min(remaining, need) : 1;
    ship.damage = Math.min(pr, n(ship.damage, 0) + spend);
    remaining -= spend;
    if (ship.damage >= pr) {
      ship.status = "disabled";
      disabledNow += 1;
      events.push("Un bateau est mis hors de combat.");
    }
  }

  return { applied: Math.max(0, Math.floor(n(amount, 0))) - remaining, remaining, sunkNow, disabledNow, events };
}

export function repairFleetDamage(squadron, amount) {
  let remaining = Math.max(0, Math.floor(n(amount, 0)));
  let repaired = 0;
  const pr = getSquadronPr(squadron);
  const candidates = (squadron.ships ?? []).filter((s) => s.status !== "sunk" && s.damage > 0).sort((a, b) => {
    if (a.status !== b.status) return a.status === "disabled" ? -1 : 1;
    return b.damage - a.damage;
  });
  for (const ship of candidates) {
    if (remaining <= 0) break;
    const spend = Math.min(remaining, ship.damage);
    ship.damage -= spend;
    repaired += spend;
    remaining -= spend;
    if (ship.status === "disabled" && ship.damage < pr) ship.status = "active";
  }
  return { repaired, remaining };
}

export function fleetOfficerActors() {
  return game.actors.filter((a) => ["character", "npc"].includes(a.type)).sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
}
