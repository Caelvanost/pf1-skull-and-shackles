import { MODULE_ID, getSSShipData } from "./ship-data.mjs";
import { getImprovementsData, deriveImprovementEffects } from "./ship-improvements-data.mjs";

export const VOYAGE_FLAG = "voyage";

export const DEFAULT_VOYAGE_DATA = Object.freeze({
  travel: {
    baseKmPerHour: 0,
    hoursPerDay: 24,
    distanceKm: 0,
    progressKm: 0,
    daysElapsed: 0,
    conditionPercent: 0,
    notes: ""
  },
  encounters: {
    tier: "low",
    chance: 0,
    checksPerDay: 0,
    lastCheck: 0,
    lastEncounterRoll: 0,
    lastEncounterText: ""
  },
  chase: {
    opponentUuid: "",
    ownRole: "pursuer",
    lastDays: 0,
    lastOwnWins: 0,
    lastOpponentWins: 0,
    lastOutcome: ""
  },
  navigation: {
    dc: 5,
    extraModifier: 0
  }
});

/**
 * Vitesses de voyage explicitement chiffrées dans les profils du Guide du Joueur.
 * Les autres profils restent volontairement manuels : le supplément renvoie au Manuel
 * des Joueurs ou au profil du navire sans donner ici une valeur universelle.
 */
export const LONG_DISTANCE_PROFILE_PRESETS = Object.freeze({
  boat: {
    label: "Canot",
    kmPerHour: 3,
    hoursPerDay: 10,
    kmPerDay: 30,
    propulsion: "muscles",
    source: "Guide du Joueur, profil Canot"
  },
  junk: {
    label: "Jonque",
    kmPerHour: 3,
    hoursPerDay: 24,
    kmPerDay: 72,
    propulsion: "wind",
    source: "Guide du Joueur, profil Jonque"
  }
});

const SEA_ENCOUNTERS = Object.freeze({
  low: Object.freeze([
    [1, 5, "1d4 hommes-poissons", "1/2", "Bestiaire p. 183"],
    [6, 11, "1 fuath", "1", "Bestiaire 3 p. 143"],
    [12, 16, "1d4 grindylows", "1", "Bestiaire 2 p. 157"],
    [17, 21, "1 pieuvre", "1", "Bestiaire p. 241"],
    [22, 27, "1d6 dauphins", "2", "Bestiaire p. 55"],
    [28, 32, "1d6 locathahs", "2", "Bestiaire 2 p. 188"],
    [33, 36, "1 adaro", "3", "Bestiaire 3 p. 7"],
    [37, 40, "1 bunyip", "3", "Bestiaire 2 p. 55"],
    [41, 44, "1 requin-garou", "3", "Guide des Chaînes p. 54"],
    [45, 51, "1d8 raies à aiguillon", "3", "Bestiaire 2 p. 237"],
    [52, 56, "1d4 griffes du récif", "3", "Bestiaire 2 p. 155"],
    [57, 62, "2d6 grindylows", "4", "Bestiaire 2 p. 157"],
    [63, 67, "1 guenaude marine", "4", "Bestiaire p. 176"],
    [68, 72, "1 cécaëlia", "5", "Bestiaire 3 p. 44"],
    [73, 78, "1d4 pirates draugr", "5", "Bestiaire 2 p. 119"],
    [79, 83, "1 murène géante", "5", "Bestiaire p. 16"],
    [84, 88, "1 globster", "5", "Bestiaire 3 p. 134"],
    [89, 92, "1d6 sahuagins", "5", "Bestiaire p. 251"],
    [93, 96, "1 nuée de méduses", "6", "Bestiaire 2 p. 196"],
    [97, 100, "1d8 requins", "6", "Bestiaire p. 248"]
  ]),
  intermediate: Object.freeze([
    [1, 5, "1d6 dauphins", "2", "Bestiaire p. 55"],
    [6, 9, "1 incutilis", "2", "Pathfinder 55"],
    [10, 13, "1 dragon des marées", "3", "Pathfinder 55"],
    [14, 18, "1d4 griffes du récif", "3", "Bestiaire 2 p. 155"],
    [19, 22, "1 léchi d’algues", "3", "Bestiaire 3 p. 175"],
    [23, 27, "1 capitaine draugr", "4", "Guide des Chaînes"],
    [28, 32, "1d4 tritons", "4", "Bestiaire 2 p. 276"],
    [33, 35, "1 kelpie", "4", "Bestiaire 2 p. 181"],
    [36, 39, "1 archélon", "5", "Bestiaire 3 p. 190"],
    [40, 46, "1d6 contrebandiers pirates", "5", "Guide des Chaînes"],
    [47, 50, "1 cécaëlia", "5", "Bestiaire 3 p. 44"],
    [51, 53, "1 murène géante", "5", "Bestiaire p. 16"],
    [54, 59, "1d6 requins-garous", "6", "Guide des Chaînes"],
    [60, 63, "1 anémone des forêts noires", "6", "Bestiaire 3 p. 12"],
    [64, 69, "1d6 adaros", "6", "Bestiaire 3 p. 7"],
    [70, 74, "1 fléau des mers", "6", "Guide des Chaînes"],
    [75, 78, "1 serpent de mer géant", "7", "Guide des Chaînes"],
    [79, 83, "1d6 poissons diables", "7", "Bestiaire 2 p. 219"],
    [84, 88, "1 crabe mangeur de requins", "7", "Bestiaire p. 51"],
    [89, 92, "1 pieuvre géante", "8", "Bestiaire p. 241"],
    [93, 97, "2d4 merrows d’eau de mer", "8", "Bestiaire 2 p. 198"],
    [98, 100, "1 jeune dragon de mer", "8", "Bestiaire 3 p. 100"]
  ]),
  high: Object.freeze([
    [1, 9, "1d8 méduses géantes", "11", "Bestiaire 2 p. 196"],
    [10, 14, "1 léviathan mécanique", "12", "Bestiaire 3 p. 61"],
    [15, 21, "1d4 ghawwas", "12", "Bestiaire 3 p. 90"],
    [22, 28, "2d8 merrows d’eau de mer", "12", "Bestiaire 2 p. 198"],
    [29, 34, "1 serpent de mer", "12", "Bestiaire p. 258"],
    [35, 42, "1 charybde", "13", "Bestiaire 2 p. 60"],
    [43, 49, "1d4 lukwatas", "13", "Bestiaire 3 p. 184"],
    [50, 56, "1d4 basilosaures", "14", "Bestiaire 3 p. 191"],
    [57, 62, "1 vieux dragon de saumure", "14", "Bestiaire 2 p. 108"],
    [63, 66, "1 grande baleine blanche", "14", "Bestiaire 2 p. 47"],
    [67, 71, "1d6 démons hézrous", "14", "Bestiaire p. 66"],
    [72, 76, "1d8 méduses saphir", "15", "Bestiaire 3 p. 189"],
    [77, 81, "1 bonze des mers", "15", "Bestiaire 3 p. 39"],
    [82, 86, "1d12 siyokoys", "15", "Bestiaire 3 p. 241"],
    [87, 91, "1 scylla", "16", "Bestiaire 2 p. 247"],
    [92, 95, "1 bakekujira", "17", "Skull & Shackles p. 476"],
    [96, 97, "1 kraken", "18", "Bestiaire p. 189"],
    [98, 99, "1 serpent des profondeurs", "19", "Bestiaire 3 p. 235"],
    [100, 100, "1 béhémoth thalassique", "20", "Bestiaire 3 p. 34"]
  ])
});

export const SEA_ENCOUNTER_TIERS = Object.freeze({
  low: { label: "Bas niveau", source: "Rencontres en mer de bas niveau" },
  intermediate: { label: "Niveau intermédiaire", source: "Rencontres océaniques de niveau intermédiaire" },
  high: { label: "Haut niveau", source: "Rencontres océaniques de haut niveau" }
});

function n(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizeVoyageData(data = {}) {
  const out = foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_VOYAGE_DATA), foundry.utils.deepClone(data ?? {}), {
    inplace: false,
    insertKeys: true,
    overwrite: true
  });
  out.travel.baseKmPerHour = Math.max(0, n(out.travel.baseKmPerHour));
  out.travel.hoursPerDay = Math.max(0, Math.min(24, n(out.travel.hoursPerDay, 24)));
  out.travel.distanceKm = Math.max(0, n(out.travel.distanceKm));
  out.travel.progressKm = Math.max(0, Math.min(out.travel.distanceKm || Infinity, n(out.travel.progressKm)));
  out.travel.daysElapsed = Math.max(0, Math.trunc(n(out.travel.daysElapsed)));
  out.travel.conditionPercent = Math.max(-100, n(out.travel.conditionPercent));
  out.travel.notes = String(out.travel.notes ?? "");
  if (!SEA_ENCOUNTER_TIERS[out.encounters.tier]) out.encounters.tier = "low";
  out.encounters.chance = Math.max(0, Math.min(100, n(out.encounters.chance, 0)));
  out.encounters.checksPerDay = Math.max(0, Math.min(24, Math.trunc(n(out.encounters.checksPerDay, 0))));
  out.encounters.lastCheck = Math.trunc(n(out.encounters.lastCheck));
  out.encounters.lastEncounterRoll = Math.trunc(n(out.encounters.lastEncounterRoll));
  out.encounters.lastEncounterText = String(out.encounters.lastEncounterText ?? "");
  out.chase.opponentUuid = String(out.chase.opponentUuid ?? "");
  out.chase.ownRole = out.chase.ownRole === "fugitive" ? "fugitive" : "pursuer";
  out.chase.lastDays = Math.max(0, Math.trunc(n(out.chase.lastDays)));
  out.chase.lastOwnWins = Math.max(0, Math.trunc(n(out.chase.lastOwnWins)));
  out.chase.lastOpponentWins = Math.max(0, Math.trunc(n(out.chase.lastOpponentWins)));
  out.chase.lastOutcome = String(out.chase.lastOutcome ?? "");
  out.navigation.dc = Math.max(0, Math.trunc(n(out.navigation.dc, 5)));
  out.navigation.extraModifier = Math.trunc(n(out.navigation.extraModifier));
  return out;
}

export function getVoyageData(actor) {
  return normalizeVoyageData(actor?.getFlag?.(MODULE_ID, VOYAGE_FLAG) ?? {});
}

export async function setVoyageData(actor, data) {
  const normalized = normalizeVoyageData(data);
  await actor.setFlag(MODULE_ID, VOYAGE_FLAG, normalized);
  return normalized;
}

export function getLongDistancePreset(actor) {
  const profileId = getSSShipData(actor)?.profileId ?? "";
  return LONG_DISTANCE_PROFILE_PRESETS[profileId] ?? null;
}

export function deriveTravel(actor, data = getVoyageData(actor)) {
  const improvements = deriveImprovementEffects(actor, getImprovementsData(actor));
  const conditionMultiplier = Math.max(0, 1 + n(data.travel.conditionPercent) / 100);
  const improvementMultiplier = Math.max(0, n(improvements.travelMultiplier, 1));
  const baseKmPerHour = Math.max(0, n(data.travel.baseKmPerHour));
  const effectiveKmPerHour = baseKmPerHour * improvementMultiplier * conditionMultiplier;
  const hoursPerDay = Math.max(0, n(data.travel.hoursPerDay));
  const kmPerDay = effectiveKmPerHour * hoursPerDay;
  const distanceKm = Math.max(0, n(data.travel.distanceKm));
  const progressKm = Math.max(0, Math.min(distanceKm || Infinity, n(data.travel.progressKm)));
  const remainingKm = Math.max(0, distanceKm - progressKm);
  const remainingHours = effectiveKmPerHour > 0 ? remainingKm / effectiveKmPerHour : 0;
  const remainingDays = kmPerDay > 0 ? remainingKm / kmPerDay : 0;
  return {
    baseKmPerHour,
    effectiveKmPerHour,
    hoursPerDay,
    kmPerDay,
    distanceKm,
    progressKm,
    remainingKm,
    remainingHours,
    remainingDays,
    improvementPercent: n(improvements.travelPercent) * 100,
    improvementMultiplier,
    conditionPercent: n(data.travel.conditionPercent),
    conditionMultiplier,
    complete: distanceKm > 0 && remainingKm <= 0.0001,
    improvements
  };
}

export function getSeaEncounter(tier, roll) {
  const table = SEA_ENCOUNTERS[tier] ?? SEA_ENCOUNTERS.low;
  const value = Math.max(1, Math.min(100, Math.trunc(n(roll, 1))));
  const row = table.find(([min, max]) => value >= min && value <= max) ?? table[table.length - 1];
  return {
    min: row[0],
    max: row[1],
    result: row[2],
    cr: row[3],
    source: row[4]
  };
}

export function getSeaEncounterTable(tier) {
  return (SEA_ENCOUNTERS[tier] ?? SEA_ENCOUNTERS.low).map(([min, max, result, cr, source]) => ({ min, max, result, cr, source }));
}
