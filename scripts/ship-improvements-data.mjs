import { MODULE_ID, getSSShipData, normalizeSSShipData } from "./ship-data.mjs";
import { getShipProfile } from "./library-data.mjs";

export const IMPROVEMENTS_FLAG = "improvements";

export const SHIP_IMPROVEMENTS = Object.freeze([
  {
    id: "armor", name: "Blindage", sourcePage: 27, dc: 28, skill: "Artisanat (navires)", price: { type: "percent", value: 0.30 },
    summary: "+15% PV de coque, +4 solidité ; −15% cargaison ; −1 navigation ; vitesse de voyage −20%.", single: true
  },
  {
    id: "cargoExpansion", name: "Capacité de cargaison augmentée", sourcePage: 27, dc: 22, skill: "Artisanat (navires)", price: { type: "percent", value: 0.15 },
    summary: "+10% capacité de cargaison.", single: true
  },
  {
    id: "smugglingCompartment", name: "Compartiment de contrebande", sourcePage: 27, dc: 19, skill: "Artisanat (navires)", price: { type: "flat", value: 500 },
    summary: "500 po par compartiment de 1,50 m ; Perception DD 20 pour les trouver ; 2 compartiments dissimulent généralement 1 point de butin.", single: false
  },
  {
    id: "streamlinedHull", name: "Coque effilée", sourcePage: 27, dc: 22, skill: "Artisanat (navires)", price: { type: "percent", value: 0.15 },
    summary: "Largeur −20%, cargaison −10%, +2 navigation. Construction initiale uniquement.", single: true, constructionOnly: true
  },
  {
    id: "reinforcedHull", name: "Coque renforcée", sourcePage: 27, dc: 16, skill: "Artisanat (navires)", price: { type: "percent", value: 0.10 },
    summary: "+2 solidité de coque ; −10% cargaison.", single: true
  },
  {
    id: "magicHull", name: "Coque renforcée par magie", sourcePage: 27, dc: 15, skill: "Création d’objets merveilleux + Artisanat (navires)", price: { type: "shipSquares", value: 4500 },
    summary: "Double les PV et la solidité de la coque.", single: true, magic: true
  },
  {
    id: "magicSteering", name: "Dispositif de pilotage renforcé par magie", sourcePage: 27, dc: 15, skill: "Création d’objets merveilleux + Artisanat (navires)", price: { type: "flat", value: 1000 },
    summary: "Double les PV et la solidité de la barre ou du gouvernail.", single: true, magic: true
  },
  {
    id: "ram", name: "Éperon", sourcePage: 28, dc: 10, skill: "Artisanat (navires)", price: { type: "ramBySize" },
    summary: "+2d8 aux dégâts d’éperonnage ; ignore les dégâts de la première case d’un obstacle solide percuté.", single: true
  },
  {
    id: "figurehead", name: "Figure de proue", sourcePage: 28, dc: 10, skill: "Artisanat (constructions en bois) ou Artisanat (sculpture)", price: { type: "manualRange", min: 100, max: 1000, default: 500 },
    summary: "Modification décorative sans effet mécanique.", single: false
  },
  {
    id: "glassBottom", name: "Fond vitré", sourcePage: 28, dc: 19, skill: "Artisanat (travail du verre)", price: { type: "percent", value: 0.05 },
    summary: "Permet d’observer sous le navire ; le fond vitré a solidité 1, 3 PV, Briser DD 8.", single: true
  },
  {
    id: "movingDeck", name: "Pont mobile", sourcePage: 28, dc: 28, skill: "Artisanat (navires)", price: { type: "percent", value: 0.40 },
    summary: "Permet de modifier fortement la silhouette du navire ; Perception DD 20 pour repérer rails, pivots et leviers secrets.", single: true
  },
  {
    id: "extraQuarters", name: "Quartiers supplémentaires pour l’équipage", sourcePage: 28, dc: 22, skill: "Artisanat (navires)", price: { type: "percent", value: 0.20 },
    summary: "+10% passagers ; −10% cargaison.", single: true
  },
  {
    id: "extendedKeel", name: "Quille rallongée", sourcePage: 28, dc: 19, skill: "Artisanat (navires)", price: { type: "percent", value: 0.10 },
    summary: "Longueur +10% ; +1 navigation ; cargaison inchangée. Construction initiale uniquement.", single: true, constructionOnly: true
  },
  {
    id: "magicOars", name: "Rames renforcées par magie", sourcePage: 28, dc: 15, skill: "Création d’objets merveilleux + Artisanat (constructions en bois) ou Artisanat (navires)", price: { type: "oars", value: 100 },
    summary: "Double les PV et la solidité des rames.", single: true, magic: true
  },
  {
    id: "woodReinforcements", name: "Renforts en bois", sourcePage: 28, dc: 25, skill: "Artisanat (navires)", price: { type: "percent", value: 0.20 },
    summary: "+5% PV de coque, +2 solidité ; −10% cargaison ; vitesse de voyage −10%.", single: true
  },
  {
    id: "hiddenGunport", name: "Sabord dissimulé", sourcePage: 28, dc: 16, skill: "Artisanat (navires)", price: { type: "flat", value: 100 },
    summary: "100 po par sabord ; Perception DD 15 ; chaque sabord retire 5 tonnes de cargaison, en plus de l’espace de l’arme.", single: false
  },
  {
    id: "enlargedRudder", name: "Safran élargi", sourcePage: 28, dc: 16, skill: "Artisanat (navires)", price: { type: "flat", value: 500 },
    summary: "+1 aux tests de navigation.", single: true
  },
  {
    id: "quickDeploySails", name: "Voiles à déploiement rapide", sourcePage: 28, dc: 25, skill: "Artisanat (voiles) ou Connaissances (ingénierie)", price: { type: "percent", value: 0.10 },
    summary: "Les manœuvres sur les voiles prennent deux fois moins de temps ; +1 navigation.", single: true
  },
  {
    id: "silkSails", name: "Voiles de soie", sourcePage: 29, dc: 16, skill: "Artisanat (voiles)", price: { type: "percent", value: 0.15 },
    summary: "+1 aux tests opposés pour prendre l’ascendant ; vitesse de voyage +10%.", single: true
  },
  {
    id: "magicSails", name: "Voiles renforcées par magie", sourcePage: 29, dc: 15, skill: "Création d’objets merveilleux + Artisanat (voiles)", price: { type: "sailSquares", value: 500 },
    summary: "Double les PV et la solidité des voiles.", single: true, magic: true
  }
]);

const BY_ID = new Map(SHIP_IMPROVEMENTS.map((i) => [i.id, i]));

export const DEFAULT_IMPROVEMENTS_DATA = Object.freeze({
  initialized: false,
  constructionMode: false,
  selectedId: "armor",
  builderUuid: "",
  builderSkillId: "",
  manualModifier: 0,
  manualPrice: 500,
  spentGp: 0,
  builderHistory: [],
  base: {
    costGp: 0,
    hullHp: 0,
    hardness: 0,
    cargoTons: 0,
    passengers: 0,
    lengthM: 0,
    widthM: 0,
    sailsHp: 0,
    sailsHardness: 0,
    oarsHp: 0,
    oarsHardness: 5,
    steeringHp: 25,
    steeringHardness: 5,
    shipSquares: 0,
    sailSquares: 0,
    oarCount: 0
  },
  installed: {},
  failedBuilders: {}
});

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseDimensions(text = "") {
  const nums = String(text).replace(/,/g, ".").match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length < 2) return { widthM: 0, lengthM: 0 };
  return { widthM: Math.min(nums[0], nums[1]), lengthM: Math.max(nums[0], nums[1]) };
}

function parseCargoTons(text = "") {
  const normalized = String(text).replace(/,/g, ".").toLowerCase();
  const n = Number(normalized.match(/\d+(?:\.\d+)?/)?.[0] ?? 0);
  if (!Number.isFinite(n)) return 0;
  if (normalized.includes("kg")) return n / 1000;
  return n;
}

export function getImprovementDefinition(id) {
  return BY_ID.get(id) ?? null;
}

export function getImprovementsData(actor) {
  const raw = actor?.getFlag?.(MODULE_ID, IMPROVEMENTS_FLAG) ?? {};
  return normalizeImprovementsData(raw, actor);
}

export function normalizeImprovementsData(raw = {}, actor = null) {
  const clean = foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_IMPROVEMENTS_DATA), foundry.utils.deepClone(raw ?? {}), {
    inplace: false, insertKeys: true, overwrite: true
  });
  clean.initialized = Boolean(clean.initialized);
  clean.constructionMode = Boolean(clean.constructionMode);
  clean.selectedId = getImprovementDefinition(String(clean.selectedId ?? "")) ? String(clean.selectedId) : "armor";
  clean.builderUuid = String(clean.builderUuid ?? "");
  clean.builderSkillId = String(clean.builderSkillId ?? "");
  clean.manualModifier = Math.trunc(num(clean.manualModifier));
  clean.manualPrice = Math.max(0, num(clean.manualPrice, 500));
  clean.spentGp = Math.max(0, num(clean.spentGp));
  clean.builderHistory = Array.isArray(clean.builderHistory) ? [...new Set(clean.builderHistory.map(String).filter(Boolean))] : [];
  clean.base ??= {};
  for (const key of Object.keys(DEFAULT_IMPROVEMENTS_DATA.base)) clean.base[key] = Math.max(0, num(clean.base[key]));
  clean.installed ??= {};
  for (const [id, entry] of Object.entries(clean.installed)) {
    const def = getImprovementDefinition(id);
    if (!def) { delete clean.installed[id]; continue; }
    const e = typeof entry === "object" && entry ? entry : { quantity: num(entry) };
    clean.installed[id] = {
      quantity: Math.max(0, Math.trunc(num(e.quantity, 0))),
      builderUuid: String(e.builderUuid ?? ""),
      builderName: String(e.builderName ?? ""),
      legacy: Boolean(e.legacy),
      installedAt: Math.max(0, num(e.installedAt))
    };
    if (!clean.installed[id].quantity) delete clean.installed[id];
  }
  clean.failedBuilders ??= {};
  for (const [id, list] of Object.entries(clean.failedBuilders)) {
    clean.failedBuilders[id] = Array.isArray(list) ? [...new Set(list.map(String).filter(Boolean))] : [];
  }
  return clean;
}

export function makeBaseSnapshot(actor) {
  const ss = getSSShipData(actor);
  const profile = getShipProfile(ss.profileId);
  const dims = profile ? parseDimensions(profile.dimensions) : { widthM: 0, lengthM: 0 };
  const hp = actor.system?.attributes?.hp ?? {};
  const hardness = actor.system?.attributes?.hardness ?? {};
  return {
    costGp: Math.max(0, num(profile?.cost, actor.system?.details?.cost ?? 0)),
    hullHp: Math.max(0, num(profile?.hp, hp.max ?? 0)),
    hardness: Math.max(0, num(profile?.hardness, hardness.total ?? hardness.value ?? 0)),
    cargoTons: Math.max(0, profile ? parseCargoTons(profile.cargo) : 0),
    passengers: Math.max(0, num(profile?.passengers, actor.system?.crew?.passengers ?? 0)),
    lengthM: Math.max(0, dims.lengthM),
    widthM: Math.max(0, dims.widthM),
    sailsHp: Math.max(0, num(profile?.sails?.hp, ss.sails?.max ?? 0)),
    sailsHardness: Math.max(0, num(profile?.sails?.hardness, ss.sails?.hardness ?? 0)),
    oarsHp: Math.max(0, num(profile?.oars?.hp, ss.oars?.max ?? 0)),
    oarsHardness: Math.max(0, num(profile?.oars?.hardness, ss.oars?.hardness ?? 5)),
    steeringHp: Math.max(0, num(ss.steering?.max, 25)),
    steeringHardness: Math.max(0, num(ss.steering?.hardness, 5)),
    shipSquares: Math.max(0, num(profile?.squares5ft, actor.system?.squares ?? 0)),
    sailSquares: Math.max(0, num(profile?.sails?.squares, ss.sails?.squares ?? 0)),
    oarCount: Math.max(0, num(profile?.oars?.count, ss.oars?.count ?? 0))
  };
}

export async function ensureImprovementsInitialized(actor) {
  let data = getImprovementsData(actor);
  if (data.initialized) return data;
  data.base = makeBaseSnapshot(actor);
  data.initialized = true;
  const ss = getSSShipData(actor);

  // Le profil publié du bateau de guerre inclut déjà une voilure renforcée
  // par magie (320 PV). Pour conserver un calcul réversible, on enregistre
  // l'amélioration comme installation intrinsèque et on ramène sa base à la
  // valeur non traitée avant de recalculer le ×2.
  if (ss.profileId === "warship" && !data.installed.magicSails) {
    data.base.sailsHp = Math.max(0, Number(data.base.sailsHp ?? 0) / 2);
    data.installed.magicSails = { quantity: 1, builderUuid: "", builderName: "Profil Bateau de guerre", legacy: true, installedAt: Date.now() };
  }

  if (ss.combat?.ramEquipped && !data.installed.ram) {
    data.installed.ram = { quantity: 1, builderUuid: "", builderName: "Migration v1.4", legacy: true, installedAt: Date.now() };
  }
  await actor.setFlag(MODULE_ID, IMPROVEMENTS_FLAG, data);
  return data;
}

export function installedQuantity(data, id) {
  return Math.max(0, Math.trunc(num(data?.installed?.[id]?.quantity)));
}

export function isInstalled(data, id) {
  return installedQuantity(data, id) > 0;
}

export function getInstallationPrice(def, data, actor, { manualPrice = null } = {}) {
  if (!def) return 0;
  const base = data.base ?? makeBaseSnapshot(actor);
  const p = def.price ?? { type: "flat", value: 0 };
  switch (p.type) {
    case "percent": return Math.max(0, base.costGp * num(p.value));
    case "flat": return Math.max(0, num(p.value));
    case "shipSquares": return Math.max(0, base.shipSquares * num(p.value));
    case "sailSquares": return Math.max(0, base.sailSquares * num(p.value));
    case "oars": return Math.max(0, base.oarCount * num(p.value));
    case "ramBySize": {
      const size = String(actor.system?.traits?.size ?? "");
      return ({ lg: 50, huge: 100, grg: 300, col: 1000 })[size] ?? ({ L: 50, H: 100, G: 300, C: 1000 })[size] ?? 1000;
    }
    case "manualRange": return Math.max(num(p.min), Math.min(num(p.max), num(manualPrice ?? data.manualPrice, p.default)));
    default: return 0;
  }
}

export function getBuilderPenalty(data, builderUuid) {
  if (!builderUuid) return 0;
  const history = Array.isArray(data.builderHistory) ? data.builderHistory : [];
  const differentBuilderAlreadyWorked = history.some((uuid) => uuid && uuid !== builderUuid)
    || Object.values(data.installed ?? {}).some((e) => e?.quantity > 0 && e.builderUuid && e.builderUuid !== builderUuid);
  return differentBuilderAlreadyWorked ? 2 : 0;
}

export function deriveImprovementEffects(actor, data = getImprovementsData(actor)) {
  const base = data.base ?? makeBaseSnapshot(actor);
  const q = (id) => installedQuantity(data, id);
  const has = (id) => q(id) > 0;

  const hullPercent = (has("armor") ? 0.15 : 0) + (has("woodReinforcements") ? 0.05 : 0);
  const hullBeforeMagic = base.hullHp * (1 + hullPercent);
  const hullHp = Math.round(hullBeforeMagic * (has("magicHull") ? 2 : 1));
  const hardnessBeforeMagic = base.hardness + (has("armor") ? 4 : 0) + (has("reinforcedHull") ? 2 : 0) + (has("woodReinforcements") ? 2 : 0);
  const hardness = hardnessBeforeMagic * (has("magicHull") ? 2 : 1);

  let cargoPercent = 0;
  if (has("armor")) cargoPercent -= 0.15;
  if (has("cargoExpansion")) cargoPercent += 0.10;
  if (has("streamlinedHull")) cargoPercent -= 0.10;
  if (has("reinforcedHull")) cargoPercent -= 0.10;
  if (has("extraQuarters")) cargoPercent -= 0.10;
  if (has("woodReinforcements")) cargoPercent -= 0.10;
  const cargoTons = Math.max(0, base.cargoTons * (1 + cargoPercent) - (q("hiddenGunport") * 5));

  let navigationBonus = 0;
  if (has("armor")) navigationBonus -= 1;
  if (has("streamlinedHull")) navigationBonus += 2;
  if (has("extendedKeel")) navigationBonus += 1;
  if (has("enlargedRudder")) navigationBonus += 1;
  if (has("quickDeploySails")) navigationBonus += 1;
  const advantageBonus = has("silkSails") ? 1 : 0;

  const travelPercent = (has("armor") ? -0.20 : 0) + (has("woodReinforcements") ? -0.10 : 0) + (has("silkSails") ? 0.10 : 0);

  return {
    hullHp,
    hardness,
    cargoTons,
    cargoPercent,
    passengers: Math.round(base.passengers * (has("extraQuarters") ? 1.10 : 1)),
    lengthM: base.lengthM * (has("extendedKeel") ? 1.10 : 1),
    widthM: base.widthM * (has("streamlinedHull") ? 0.80 : 1),
    navigationBonus,
    advantageBonus,
    travelPercent,
    travelMultiplier: Math.max(0, 1 + travelPercent),
    sailsHp: base.sailsHp * (has("magicSails") ? 2 : 1),
    sailsHardness: base.sailsHardness * (has("magicSails") ? 2 : 1),
    oarsHp: base.oarsHp * (has("magicOars") ? 2 : 1),
    oarsHardness: base.oarsHardness * (has("magicOars") ? 2 : 1),
    steeringHp: base.steeringHp * (has("magicSteering") ? 2 : 1),
    steeringHardness: base.steeringHardness * (has("magicSteering") ? 2 : 1),
    ramEquipped: has("ram"),
    hiddenGunports: q("hiddenGunport"),
    smugglingCompartments: q("smugglingCompartment"),
    hiddenPlunderPoints: Math.floor(q("smugglingCompartment") / 2),
    figureheads: q("figurehead"),
    glassBottom: has("glassBottom"),
    movingDeck: has("movingDeck"),
    quickDeploySails: has("quickDeploySails"),
    silkSails: has("silkSails"),
    magicHull: has("magicHull"),
    magicSails: has("magicSails"),
    magicOars: has("magicOars"),
    magicSteering: has("magicSteering"),
    count: Object.values(data.installed ?? {}).reduce((sum, e) => sum + Math.max(0, num(e?.quantity)), 0)
  };
}

function preserveDamage(oldValue, oldMax, newMax) {
  const missing = Math.max(0, num(oldMax) - num(oldValue));
  return Math.max(0, Math.min(newMax, newMax - missing));
}

export async function syncImprovementEffects(actor, data = getImprovementsData(actor), { announce = false } = {}) {
  data = normalizeImprovementsData(data, actor);
  if (!data.initialized) data = await ensureImprovementsInitialized(actor);
  const effects = deriveImprovementEffects(actor, data);
  const ss = getSSShipData(actor);

  const hp = actor.system?.attributes?.hp ?? {};
  const currentHpMax = num(hp.max);
  const currentHpValue = num(hp.value, currentHpMax);
  const currentHpBonus = num(hp.bonus);
  const hard = actor.system?.attributes?.hardness ?? {};
  const currentHardness = num(hard.total ?? hard.value);
  const currentHardnessBonus = num(hard.bonus);
  const actorUpdate = {};
  if (effects.hullHp && effects.hullHp !== currentHpMax) {
    actorUpdate["system.attributes.hp.bonus"] = currentHpBonus + (effects.hullHp - currentHpMax);
    actorUpdate["system.attributes.hp.value"] = preserveDamage(currentHpValue, currentHpMax, effects.hullHp);
  }
  if (effects.hardness !== currentHardness) actorUpdate["system.attributes.hardness.bonus"] = currentHardnessBonus + (effects.hardness - currentHardness);
  if (effects.passengers !== num(actor.system?.crew?.passengers)) actorUpdate["system.crew.passengers"] = effects.passengers;
  if (Object.keys(actorUpdate).length) await actor.update(actorUpdate);

  const nextSS = normalizeSSShipData(foundry.utils.deepClone(ss));
  nextSS.sails.value = preserveDamage(ss.sails?.value, ss.sails?.max, effects.sailsHp);
  nextSS.sails.max = effects.sailsHp;
  nextSS.sails.hardness = effects.sailsHardness;
  nextSS.oars.value = preserveDamage(ss.oars?.value, ss.oars?.max, effects.oarsHp);
  nextSS.oars.max = effects.oarsHp;
  nextSS.oars.hardness = effects.oarsHardness;
  nextSS.steering.value = preserveDamage(ss.steering?.value, ss.steering?.max, effects.steeringHp);
  nextSS.steering.max = effects.steeringHp;
  nextSS.steering.hardness = effects.steeringHardness;
  if (effects.ramEquipped) nextSS.combat.ramEquipped = true;
  await actor.setFlag(MODULE_ID, "ship", nextSS);
  await actor.setFlag(MODULE_ID, IMPROVEMENTS_FLAG, data);

  if (announce) ui.notifications.info(`Améliorations de ${actor.name} recalculées.`);
  return { data, effects, ss: nextSS };
}

export async function rebaseImprovementsFromProfile(actor) {
  let data = getImprovementsData(actor);
  if (!data.initialized) return null;
  data.base = makeBaseSnapshot(actor);
  const ss = getSSShipData(actor);
  const intrinsicMagicSails = data.installed?.magicSails?.legacy && data.installed?.magicSails?.builderName === "Profil Bateau de guerre";
  if (ss.profileId === "warship") {
    if (!data.installed.magicSails) {
      data.installed.magicSails = { quantity: 1, builderUuid: "", builderName: "Profil Bateau de guerre", legacy: true, installedAt: Date.now() };
    }
    if (data.installed.magicSails?.builderName === "Profil Bateau de guerre") data.base.sailsHp = Math.max(0, Number(data.base.sailsHp ?? 0) / 2);
  } else if (intrinsicMagicSails) {
    delete data.installed.magicSails;
  }
  await actor.setFlag(MODULE_ID, IMPROVEMENTS_FLAG, data);
  return syncImprovementEffects(actor, data);
}
