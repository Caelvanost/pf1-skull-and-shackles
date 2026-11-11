import { MODULE_ID } from "./ship-data.mjs";

export const SIEGE_FLAG = "siege";

export const SIEGE_SIDES = Object.freeze({
  port: "Bâbord",
  starboard: "Tribord",
  bow: "Proue",
  stern: "Poupe",
  center: "Plateforme centrale"
});

export const SIEGE_COMPONENTS = Object.freeze({
  structure: "Structure / coque",
  sails: "Voiles et gréement",
  oars: "Rames",
  steering: "Dispositif de pilotage"
});

export const SIEGE_WEAPONS = Object.freeze({
  lightBallista: {
    id: "lightBallista", name: "Baliste légère", size: "G", mode: "direct", price: 500,
    damage: "3d8", critThreshold: 19, critMultiplier: 2, rangeFt: 120, minRangeFt: 0,
    damageType: "P", crew: 1, aimActions: 0, loadActions: 2, hardness: 5, hp: 50,
    aimDc: 0, normalAmmoName: "Carreau", normalAmmoCost: 10, normalAmmoWeightKg: 5
  },
  lightCatapult: {
    id: "lightCatapult", name: "Catapulte légère", size: "G", mode: "indirect", price: 550,
    damage: "4d6", critThreshold: 20, critMultiplier: 2, rangeFt: 150, minRangeFt: 50,
    damageType: "C", crew: 2, aimActions: 2, loadActions: 3, hardness: 5, hp: 50,
    aimDc: 15, normalAmmoName: "Pierre", normalAmmoCost: 10, normalAmmoWeightKg: 25
  },
  heavyBallista: {
    id: "heavyBallista", name: "Baliste lourde", size: "TG", mode: "direct", price: 800,
    damage: "4d8", critThreshold: 19, critMultiplier: 2, rangeFt: 180, minRangeFt: 0,
    damageType: "P", crew: 3, aimActions: 2, loadActions: 3, hardness: 5, hp: 100,
    aimDc: 0, normalAmmoName: "Carreau", normalAmmoCost: 30, normalAmmoWeightKg: 10
  },
  fireDrake: {
    id: "fireDrake", name: "Drake de feu", size: "TG", mode: "area", price: 4000,
    damage: "6d6", critThreshold: 21, critMultiplier: 1, rangeFt: 60, minRangeFt: 0,
    damageType: "feu", crew: 3, aimActions: 2, loadActions: 5, hardness: 10, hp: 70,
    aimDc: 15, normalAmmoName: "Réservoir de feu grégeois", normalAmmoCost: 200, normalAmmoWeightKg: 10
  },
  standardCatapult: {
    id: "standardCatapult", name: "Catapulte standard", size: "TG", mode: "indirect", price: 800,
    damage: "6d6", critThreshold: 20, critMultiplier: 2, rangeFt: 200, minRangeFt: 100,
    damageType: "C", crew: 3, aimActions: 2, loadActions: 3, hardness: 5, hp: 100,
    aimDc: 20, normalAmmoName: "Pierre", normalAmmoCost: 15, normalAmmoWeightKg: 37.5
  },
  arrowOnager: {
    id: "arrowOnager", name: "Onagre à flèches", size: "TG", mode: "indirect", price: 1000,
    damage: "3d8", critThreshold: 20, critMultiplier: 3, rangeFt: 100, minRangeFt: 50,
    damageType: "P", crew: 3, aimActions: 2, loadActions: 3, hardness: 5, hp: 100,
    // Le Guide du joueur reproduit les caractéristiques de l'onagre mais ne donne pas son DD de visée.
    // On le laisse donc explicitement à saisir au lieu d'inventer une valeur.
    aimDc: 0, normalAmmoName: "Volée de flèches", normalAmmoCost: 20, normalAmmoWeightKg: 5
  }
});

export const SIEGE_AMMUNITION = Object.freeze({
  normal: { id: "normal", name: "Munition normale", compatible: ["*"] },
  diseasedBundle: { id: "diseasedBundle", name: "Ballot pestiféré", compatible: ["lightCatapult", "standardCatapult"], price: 80, weightKg: 10 },
  greekFire: { id: "greekFire", name: "Feu grégeois", compatible: ["lightBallista", "heavyBallista", "lightCatapult", "standardCatapult"], price: 200, weightKg: 5 },
  smoke: { id: "smoke", name: "Fumée", compatible: ["lightCatapult", "standardCatapult"], price: 250, weightKg: 10 },
  liquidIce: { id: "liquidIce", name: "Glace liquide", compatible: ["lightCatapult", "standardCatapult"], price: 400, weightKg: 10 },
  chainShot: { id: "chainShot", name: "Tir de chaîne", compatible: ["lightCatapult", "standardCatapult"], price: 50, weightKg: 15 }
});

export const DEFAULT_SIEGE_DATA = Object.freeze({
  addModelId: "lightBallista",
  targetComponent: "structure",
  distanceFt: 120,
  autoApplyDamage: true,
  broadsideSide: "port",
  broadsideModelId: "lightBallista",
  weapons: []
});

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeWeapon(raw = {}) {
  const model = SIEGE_WEAPONS[raw.modelId] ?? SIEGE_WEAPONS.lightBallista;
  const ammunitionId = SIEGE_AMMUNITION[raw.ammunitionId] ? raw.ammunitionId : "normal";
  return {
    id: String(raw.id || foundry.utils.randomID()),
    modelId: model.id,
    customName: String(raw.customName ?? ""),
    side: SIEGE_SIDES[raw.side] ? raw.side : "port",
    crewAssigned: Math.max(0, Math.trunc(number(raw.crewAssigned, model.crew))),
    loadProgress: Math.max(0, Math.trunc(number(raw.loadProgress))),
    aimProgress: Math.max(0, Math.trunc(number(raw.aimProgress))),
    hp: Math.max(0, number(raw.hp, model.hp)),
    maxHp: Math.max(1, number(raw.maxHp, model.hp)),
    hardness: Math.max(0, number(raw.hardness, model.hardness)),
    broken: Boolean(raw.broken),
    sabotaged: Boolean(raw.sabotaged),
    proficient: raw.proficient !== false,
    siegeEngineer: Boolean(raw.siegeEngineer),
    directModifier: Math.trunc(number(raw.directModifier)),
    indirectModifier: Math.trunc(number(raw.indirectModifier)),
    sizePenalty: Math.min(0, Math.trunc(number(raw.sizePenalty))),
    enhancementBonus: Math.trunc(number(raw.enhancementBonus)),
    aimDc: Math.max(0, Math.trunc(number(raw.aimDc, model.aimDc))),
    noLineOfSight: Boolean(raw.noLineOfSight),
    successiveMode: ["none", "visibleMiss", "spotterMiss", "afterHit"].includes(raw.successiveMode) ? raw.successiveMode : "none",
    successiveCount: Math.max(0, Math.trunc(number(raw.successiveCount))),
    ammunitionId,
    ammunitionCount: Math.max(0, Math.trunc(number(raw.ammunitionCount, 20))),
    repairModifier: Math.trunc(number(raw.repairModifier))
  };
}

export function normalizeSiegeData(raw = {}) {
  const clean = foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_SIEGE_DATA), foundry.utils.deepClone(raw ?? {}), {
    inplace: false, insertKeys: true, overwrite: true
  });
  clean.addModelId = SIEGE_WEAPONS[clean.addModelId] ? clean.addModelId : "lightBallista";
  clean.targetComponent = SIEGE_COMPONENTS[clean.targetComponent] ? clean.targetComponent : "structure";
  clean.distanceFt = Math.max(0, number(clean.distanceFt, 120));
  clean.autoApplyDamage = Boolean(clean.autoApplyDamage);
  clean.broadsideSide = SIEGE_SIDES[clean.broadsideSide] ? clean.broadsideSide : "port";
  clean.broadsideModelId = SIEGE_WEAPONS[clean.broadsideModelId] ? clean.broadsideModelId : "lightBallista";
  const values = Array.isArray(clean.weapons) ? clean.weapons : Object.values(clean.weapons ?? {});
  clean.weapons = values.map(normalizeWeapon);
  return clean;
}

export function getSiegeData(actor) {
  return normalizeSiegeData(actor?.getFlag(MODULE_ID, SIEGE_FLAG) ?? {});
}

export async function setSiegeData(actor, data) {
  return actor.setFlag(MODULE_ID, SIEGE_FLAG, normalizeSiegeData(data));
}

export function getWeaponModel(weapon) {
  return SIEGE_WEAPONS[weapon?.modelId] ?? SIEGE_WEAPONS.lightBallista;
}

export function weaponIsBroken(weapon) {
  return Boolean(weapon?.broken || weapon?.sabotaged || Number(weapon?.hp ?? 0) <= Number(weapon?.maxHp ?? 1) / 2);
}

export function effectiveAimActions(weapon) {
  const model = getWeaponModel(weapon);
  const base = Math.max(0, Number(model.aimActions ?? 0));
  if (!base) return 0;
  return Number(weapon.crewAssigned ?? 0) < Number(model.crew ?? 1) ? base * 2 : base;
}

export function compatibleAmmo(modelId) {
  return Object.values(SIEGE_AMMUNITION).filter((ammo) => ammo.compatible.includes("*") || ammo.compatible.includes(modelId));
}

export function rangePenalty(distanceFt, model) {
  const range = Math.max(1, Number(model.rangeFt ?? 0));
  if (!range) return 0;
  const increments = Math.max(1, Math.ceil(Math.max(0, Number(distanceFt ?? 0)) / range));
  return -2 * Math.max(0, increments - 1);
}

export function indirectConditionModifier(weapon) {
  let mod = weapon.noLineOfSight ? -6 : 0;
  const count = Math.max(0, Number(weapon.successiveCount ?? 0));
  if (weapon.successiveMode === "visibleMiss") mod += Math.min(10, count * 2);
  else if (weapon.successiveMode === "spotterMiss") mod += Math.min(5, count);
  else if (weapon.successiveMode === "afterHit") mod += 10;
  return mod;
}

export function averageDamage(formula) {
  const match = String(formula ?? "").trim().match(/^(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?$/i);
  if (!match) return null;
  const dice = Number(match[1]);
  const faces = Number(match[2]);
  const flat = match[4] ? Number(match[4]) * (match[3] === "-" ? -1 : 1) : 0;
  return dice * (faces + 1) / 2 + flat;
}
