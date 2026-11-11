import { MODULE_ID } from "./ship-data.mjs";
import { createSquadron, getFleetData, setFleetData, getFleetMaxSquadrons } from "./fleet-data.mjs";
import { getReputationData, setReputationData } from "./reputation-data.mjs";

export const FLEET_RECRUITMENT_FLAG = "fleetRecruitment";

export const MERCENARY_PORTS = Object.freeze([
  "Portnoyé", "Port-Enfer", "Ollo", "Port-Péril", "Quent"
]);

export const ALLIED_SQUADRONS = Object.freeze({
  merril: {
    label: "Merril Boistendre — Les Aigles de Drale",
    location: "Tête de bouc, île d’Herbefeu",
    name: "Les Aigles de Drale",
    shipType: "sailingShip",
    shipCount: 3,
    viceAdmiralName: "Merril Boistendre",
    viceAdmiralProfession: 12,
    viceAdmiralCha: 0,
    morale: 7,
    manualMorale: 2,
    note: "3 voiliers ; équipages particulièrement motivés."
  },
  pierce: {
    label: "Pierce Jerrel — Escadron de la Chance au jeu",
    location: "Port-Péril",
    name: "Escadron de la Chance au jeu",
    shipType: "longship",
    shipCount: 6,
    viceAdmiralName: "Pierce Jerrel",
    viceAdmiralProfession: 11,
    viceAdmiralCha: 3,
    morale: 3,
    manualMorale: 0,
    note: "6 drakkars ulfes gagnés au jeu."
  },
  sandara: {
    label: "Sandara Quinn — Escadron de Reine Bes",
    location: "Trône de Besmara, Reine Bes",
    name: "Escadron de Reine Bes",
    shipType: "warship",
    shipCount: 5,
    viceAdmiralName: "Sandara Quinn",
    viceAdmiralProfession: 14,
    viceAdmiralCha: 2,
    morale: 3,
    manualMorale: 0,
    note: "5 navires de guerre placés sous les ordres de Sandara."
  }
});

function n(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function defaultRecruitmentData() {
  return {
    day: 0,
    currentPort: "Port-Péril",
    recruiterUuid: "",
    recruiterSkill: "",
    manualModifier: 0,
    aidSuccesses: 0,
    mercenaryShipType: "sailingShip",
    pendingMercenary: null,
    ports: Object.fromEntries(MERCENARY_PORTS.map((p) => [p, { recruited: false, availableDay: 0, xpAwarded: false }])),
    allies: Object.fromEntries(Object.keys(ALLIED_SQUADRONS).map((k) => [k, { available: true, recruited: false, xpAwarded: false }])),
    goldSpent: 0,
    plunderSpent: 0,
    disreputeSpent: 0,
    storyXp: 0,
    log: []
  };
}

export function normalizeRecruitmentData(raw = {}) {
  const base = defaultRecruitmentData();
  const data = foundry.utils.mergeObject(base, foundry.utils.deepClone(raw ?? {}), { inplace: false, overwrite: true, insertKeys: true, insertValues: true });
  data.day = Math.max(0, Math.floor(n(data.day, 0)));
  data.currentPort = MERCENARY_PORTS.includes(data.currentPort) ? data.currentPort : "Port-Péril";
  data.manualModifier = n(data.manualModifier, 0);
  data.aidSuccesses = Math.max(0, Math.min(5, Math.floor(n(data.aidSuccesses, 0))));
  data.mercenaryShipType = ["sailingShip", "longship"].includes(data.mercenaryShipType) ? data.mercenaryShipType : "sailingShip";
  data.goldSpent = Math.max(0, n(data.goldSpent, 0));
  data.plunderSpent = Math.max(0, Math.floor(n(data.plunderSpent, 0)));
  data.disreputeSpent = Math.max(0, Math.floor(n(data.disreputeSpent, 0)));
  data.storyXp = Math.max(0, Math.floor(n(data.storyXp, 0)));
  data.log = Array.isArray(data.log) ? data.log.slice(-40) : [];
  for (const p of MERCENARY_PORTS) {
    data.ports[p] = { ...base.ports[p], ...(data.ports?.[p] ?? {}) };
    data.ports[p].availableDay = Math.max(0, Math.floor(n(data.ports[p].availableDay, 0)));
    data.ports[p].recruited = Boolean(data.ports[p].recruited);
    data.ports[p].xpAwarded = Boolean(data.ports[p].xpAwarded);
  }
  for (const k of Object.keys(ALLIED_SQUADRONS)) {
    data.allies[k] = { ...base.allies[k], ...(data.allies?.[k] ?? {}) };
    data.allies[k].available = data.allies[k].available !== false;
    data.allies[k].recruited = Boolean(data.allies[k].recruited);
    data.allies[k].xpAwarded = Boolean(data.allies[k].xpAwarded);
  }
  return data;
}

export function getRecruitmentData(actor) {
  return normalizeRecruitmentData(actor?.getFlag?.(MODULE_ID, FLEET_RECRUITMENT_FLAG) ?? {});
}

export async function setRecruitmentData(actor, data) {
  const normalized = normalizeRecruitmentData(data);
  await actor.setFlag(MODULE_ID, FLEET_RECRUITMENT_FLAG, normalized);
  return normalized;
}

export function addRecruitmentLog(data, text) {
  data.log = [...(data.log ?? []), { day: data.day, text: String(text) }].slice(-40);
}

export function canAddSquadron(actor) {
  const fleet = getFleetData(actor);
  return fleet.squadrons.length < getFleetMaxSquadrons(actor, fleet);
}

export async function addMercenarySquadron(actor, { shipType = "sailingShip" } = {}) {
  const fleet = getFleetData(actor);
  if (fleet.squadrons.length >= getFleetMaxSquadrons(actor, fleet)) throw new Error("La flotte a déjà atteint son nombre maximum d’escadrons.");
  const squad = createSquadron({ name: "Escadron mercenaire", shipType, shipCount: 3, morale: 3 });
  squad.viceAdmiralName = "Capitaine mercenaire";
  squad.viceAdmiralProfession = 10;
  squad.viceAdmiralCha = 0;
  squad.manualMorale = -2;
  squad.recruitmentType = "mercenary";
  fleet.squadrons.push(squad);
  await setFleetData(actor, fleet);
  return squad;
}

export async function addAlliedSquadron(actor, allyKey) {
  const profile = ALLIED_SQUADRONS[allyKey];
  if (!profile) throw new Error("Allié inconnu.");
  const fleet = getFleetData(actor);
  if (fleet.squadrons.length >= getFleetMaxSquadrons(actor, fleet)) throw new Error("La flotte a déjà atteint son nombre maximum d’escadrons.");
  const squad = createSquadron({ name: profile.name, shipType: profile.shipType, shipCount: profile.shipCount, morale: profile.morale });
  squad.viceAdmiralName = profile.viceAdmiralName;
  squad.viceAdmiralProfession = profile.viceAdmiralProfession;
  squad.viceAdmiralCha = profile.viceAdmiralCha;
  squad.manualMorale = profile.manualMorale;
  squad.recruitmentType = "ally";
  squad.recruitmentKey = allyKey;
  fleet.squadrons.push(squad);
  await setFleetData(actor, fleet);
  return squad;
}

export async function payMercenaryWithPlunder(actor, disreputeSpend = 0) {
  const rep = getReputationData(actor);
  const spendD = Math.max(0, Math.min(3, Math.floor(n(disreputeSpend, 0)), rep.disrepute));
  const cost = Math.max(25, 40 - (5 * spendD));
  if (rep.plunder < cost) throw new Error(`Butin insuffisant : ${cost} points requis.`);
  rep.plunder -= cost;
  rep.disrepute -= spendD;
  await setReputationData(actor, rep);
  return { cost, disrepute: spendD };
}
