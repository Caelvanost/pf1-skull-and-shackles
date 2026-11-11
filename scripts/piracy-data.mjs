import { MODULE_ID } from "./ship-data.mjs";
import { getShipProfile } from "./library-data.mjs";
import { getImprovementsData, deriveImprovementEffects } from "./ship-improvements-data.mjs";
import { getReputationData } from "./reputation-data.mjs";

export const PIRACY_FLAG = "piracy";

/**
 * Proies répétables de l'évènement 7 « Les loups de mer ».
 * Seules les informations directement utiles au sous-système sont conservées.
 */
export const PIRACY_PREY = Object.freeze([
  {
    id: "eltenBaide",
    name: "Eltén Baide",
    subtitle: "Bateau de pêche sargavien",
    profileId: "keelboat",
    fp: 4,
    captain: "Vesgal Falkrik",
    captainProfession: 11,
    captainSenseMotive: 5,
    crew: 15,
    minimumCrew: 15,
    soldiers: 1,
    hp: 600,
    hardness: 5,
    sailsHp: 80,
    oarsHp: 80,
    publishedAc: 17,
    publishedSave: 9,
    publishedCmb: 15,
    publishedCmd: 25,
    publishedRam: "4d8",
    weapons: "Aucun engin de siège indiqué.",
    cargoPlunder: 0,
    cargoGp: 50,
    cargoLabel: "Maquereaux et morues frais (50 po)",
    prizeBasePlunder: null,
    notes: "Petite proie marchande. La campagne ne chiffre pas sa valeur de revente comme prise : laisse le MJ renseigner une valeur si elle est capturée."
  },
  {
    id: "ventVeritable",
    name: "Ventvéritable",
    subtitle: "Barque d'Absalom",
    profileId: "sailingShip",
    fp: 5,
    captain: "Portia Runeplaie",
    captainProfession: 12,
    captainSenseMotive: 5,
    crew: 45,
    minimumCrew: 20,
    soldiers: 0,
    hp: 1620,
    hardness: 5,
    sailsHp: 480,
    publishedAc: 13,
    publishedSave: 11,
    publishedCmb: 19,
    publishedCmd: 29,
    publishedRam: "10d8",
    weapons: "1 catapulte standard (25 pierres).",
    cargoPlunder: 2,
    cargoGp: 0,
    cargoLabel: "2 points de Butin (produits manufacturés)",
    prizeBasePlunder: 5,
    notes: "Capacité de cargaison augmentée, éperon, voiles à déploiement rapide ; 120 cases de voilure sur quatre mâts."
  },
  {
    id: "kurstav",
    name: "Kurstav",
    subtitle: "Lugger du Consortium Aspis",
    profileId: "longship",
    fp: 6,
    captain: "Aspar Thardikor",
    captainProfession: 11,
    captainSenseMotive: 5,
    crew: 24,
    minimumCrew: 20,
    soldiers: 4,
    hp: 708,
    hardness: 7,
    sailsHp: 120,
    publishedAc: 13,
    publishedSave: 10,
    publishedCmb: 19,
    publishedCmd: 29,
    publishedRam: "8d8",
    weapons: "1 baliste légère (20 carreaux, proue) ; 1 catapulte légère (10 pierres, poupe).",
    cargoPlunder: 2,
    cargoGp: 0,
    cargoLabel: "2 points de Butin (armes et armures)",
    prizeBasePlunder: 5,
    notes: "Blindage/renforts de bois. Dans ce profil de rencontre, la propulsion indiquée est principalement à la voile."
  },
  {
    id: "reineDouairiere",
    name: "Reine Douairière",
    subtitle: "Caravelle chélaxienne",
    profileId: "sailingShip",
    fp: 7,
    captain: "Irius Trock",
    captainProfession: 11,
    captainSenseMotive: 5,
    crew: 34,
    minimumCrew: 20,
    soldiers: 4,
    hp: 1620,
    hardness: 7,
    sailsHp: 360,
    publishedAc: 13,
    publishedSave: 11,
    publishedCmb: 19,
    publishedCmd: 29,
    publishedRam: "8d8",
    weapons: "2 catapultes standards (30 pierres ; proue et poupe).",
    cargoPlunder: 3,
    cargoGp: 0,
    cargoLabel: "3 points de Butin (gemmes et grain)",
    prizeBasePlunder: 5,
    notes: "Coque renforcée."
  },
  {
    id: "sanbalot",
    name: "Sanbalot",
    subtitle: "Goélette rahadoumie",
    profileId: "sailingShip",
    fp: 7,
    captain: "Aisha Hamiyaz",
    captainProfession: 11,
    captainSenseMotive: 5,
    crew: 30,
    minimumCrew: 20,
    soldiers: 2,
    hp: 1620,
    hardness: 5,
    sailsHp: 240,
    publishedAc: 13,
    publishedSave: 11,
    publishedCmb: 19,
    publishedCmd: 29,
    publishedRam: "8d8",
    weapons: "2 balistes légères (20 carreaux ; poupe).",
    cargoPlunder: 2,
    cargoGp: 0,
    cargoLabel: "2 points de Butin (tissu, cuivre et sel)",
    prizeBasePlunder: 5,
    notes: "18 cases de voilure sur deux mâts ; présence d'une manticore domestiquée dans la rencontre publiée."
  }
]);

export function defaultPiracyData() {
  return {
    prey: {
      selectedId: PIRACY_PREY[0].id,
      linkedActorUuid: "",
      rolledId: "",
      cargoClaimed: false,
      shipSold: false,
      shipKept: false,
      refitPlanned: false,
      ownShipTookAttack: false,
      bluffManualModifier: 0,
      enemySenseMotive: 5,
      lastBluffOwn: null,
      lastBluffEnemy: null,
      lastBluffOutcome: ""
    },
    capture: {
      crewLosses: 0,
      recruiterUuid: "",
      recruiterSkillId: "",
      recruitManualModifier: 0,
      lastRecruitTotal: null,
      lastRecruits: 0,
      prizeOfficerUuid: "",
      prizeCrewAssigned: false,
      assignedCrew: 0,
      prizeBasePlunderManual: 0,
      salePort: "Baie-sanglante",
      lastSalePlunder: 0
    },
    prisoners: {
      healthy: 0,
      badlyWounded: 0,
      importantLevels: 0
    },
    ledger: {
      miscCargoGp: 0,
      notes: ""
    }
  };
}

export function normalizePiracyData(raw = {}) {
  const data = foundry.utils.mergeObject(defaultPiracyData(), foundry.utils.deepClone(raw ?? {}), {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true
  });
  if (!PIRACY_PREY.some((p) => p.id === data.prey.selectedId)) data.prey.selectedId = PIRACY_PREY[0].id;
  data.prey.linkedActorUuid = String(data.prey.linkedActorUuid ?? "");
  data.prey.rolledId = String(data.prey.rolledId ?? "");
  data.prey.cargoClaimed = Boolean(data.prey.cargoClaimed);
  data.prey.shipSold = Boolean(data.prey.shipSold);
  data.prey.shipKept = Boolean(data.prey.shipKept);
  data.prey.refitPlanned = Boolean(data.prey.refitPlanned);
  data.prey.ownShipTookAttack = Boolean(data.prey.ownShipTookAttack);
  data.prey.bluffManualModifier = Number(data.prey.bluffManualModifier ?? 0);
  data.prey.enemySenseMotive = Number(data.prey.enemySenseMotive ?? 5);
  data.capture.crewLosses = Math.max(0, Math.trunc(Number(data.capture.crewLosses ?? 0)));
  data.capture.recruiterUuid = String(data.capture.recruiterUuid ?? "");
  data.capture.recruiterSkillId = String(data.capture.recruiterSkillId ?? "");
  data.capture.recruitManualModifier = Number(data.capture.recruitManualModifier ?? 0);
  data.capture.prizeOfficerUuid = String(data.capture.prizeOfficerUuid ?? "");
  data.capture.prizeCrewAssigned = Boolean(data.capture.prizeCrewAssigned);
  data.capture.assignedCrew = Math.max(0, Math.trunc(Number(data.capture.assignedCrew ?? 0)));
  data.capture.prizeBasePlunderManual = Math.max(0, Math.trunc(Number(data.capture.prizeBasePlunderManual ?? 0)));
  data.capture.salePort = String(data.capture.salePort ?? "Baie-sanglante").trim();
  data.capture.lastSalePlunder = Math.max(0, Math.trunc(Number(data.capture.lastSalePlunder ?? 0)));
  data.prisoners.healthy = Math.max(0, Math.trunc(Number(data.prisoners.healthy ?? 0)));
  data.prisoners.badlyWounded = Math.max(0, Math.trunc(Number(data.prisoners.badlyWounded ?? 0)));
  data.prisoners.importantLevels = Math.max(0, Math.trunc(Number(data.prisoners.importantLevels ?? 0)));
  data.ledger.miscCargoGp = Math.max(0, Number(data.ledger.miscCargoGp ?? 0));
  data.ledger.notes = String(data.ledger.notes ?? "");
  return data;
}

export function getPiracyData(actor) {
  return normalizePiracyData(actor?.getFlag?.(MODULE_ID, PIRACY_FLAG) ?? {});
}

export async function setPiracyData(actor, data) {
  const clean = normalizePiracyData(data);
  await actor.setFlag(MODULE_ID, PIRACY_FLAG, clean);
  return clean;
}

export function getPrey(id) {
  return PIRACY_PREY.find((p) => p.id === id) ?? PIRACY_PREY[0];
}

function parseCargoTons(profile) {
  const match = String(profile?.cargo ?? "").match(/([\d,.]+)\s*tonne/i);
  return match ? Number(match[1].replace(",", ".")) : 0;
}

export function deriveCargoState(actor) {
  const rep = getReputationData(actor);
  const profileId = actor?.getFlag?.(MODULE_ID, "ship")?.profileId;
  const profile = getShipProfile(profileId);
  const baseCapacity = parseCargoTons(profile);
  let capacityTons = baseCapacity;
  let hiddenPlunderPoints = 0;
  try {
    const effects = deriveImprovementEffects(actor, getImprovementsData(actor));
    if (Number.isFinite(Number(effects.cargoTons))) capacityTons = Number(effects.cargoTons);
    hiddenPlunderPoints = Math.max(0, Number(effects.hiddenPlunderPoints ?? 0));
  } catch {}
  const usedTons = Math.max(0, Number(rep.plunder ?? 0)) * 10;
  const freeTons = Math.max(0, capacityTons - usedTons);
  return {
    plunder: Math.max(0, Number(rep.plunder ?? 0)),
    capacityTons,
    usedTons,
    freeTons,
    capacityPlunder: Math.floor(capacityTons / 10),
    freePlunder: Math.floor(freeTons / 10),
    hiddenPlunderPoints
  };
}

export function getPrizeSalePreview(prey, linkedActor, manualBase = 0) {
  const base = prey?.prizeBasePlunder ?? (Number(manualBase) > 0 ? Math.floor(Number(manualBase)) : 0);
  let damaged = false;
  if (linkedActor?.type === "vehicle") {
    const hp = linkedActor.system?.attributes?.hp ?? {};
    const max = Number(hp.max ?? 0);
    const value = Number(hp.value ?? max);
    damaged = max > 0 && value < max / 2;
  }
  const multiplier = damaged ? 0.25 : 0.5;
  return {
    base,
    known: base > 0,
    damaged,
    multiplier,
    salePlunder: base > 0 ? Math.floor(base * multiplier) : 0
  };
}

export function getPrisonerValue(data) {
  const p = data?.prisoners ?? {};
  const healthyGp = Math.max(0, Number(p.healthy ?? 0)) * 75;
  const woundedGp = Math.max(0, Number(p.badlyWounded ?? 0)) * 37.5;
  const ransomGp = Math.max(0, Number(p.importantLevels ?? 0)) * 50;
  return { healthyGp, woundedGp, ransomGp, totalGp: healthyGp + woundedGp + ransomGp };
}
