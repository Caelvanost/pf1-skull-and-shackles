import { MODULE_ID } from "./ship-data.mjs";

export const SOURCE_LABEL = "Guide du Joueur Skull & Shackles";

const feet = (meters) => Math.round((Number(meters) / 0.3048) / 5) * 5;

/**
 * Profils officiels résumés du Guide du Joueur, p. 24-27.
 * Les descriptions de contexte ont volontairement été réduites aux données de jeu.
 */
export const SHIP_PROFILES = Object.freeze([
  {
    id: "sailingShip", name: "Bateau à voiles", sourcePage: 24, size: "col", navalSquares: 3,
    dimensions: "9 m × 27 m", cost: 10000, hp: 1620, hardness: 5, save: 6, ram: "8d8",
    speeds: { wind: 90, muscles: 0, current: 0, mixed: 90 }, acceleration: 30,
    navigation: "Profession (marin)", propulsionMode: "wind", propulsionLabel: "Vent ou courants", steering: "wheel",
    sails: { hp: 360, squares: 90, hardness: 0 }, oars: { hp: 0, count: 0, hardness: 5 },
    crew: 20, crewMinimumOverride: 0, passengers: 120, decks: 3, cargo: "150 tonnes",
    squares5ft: 108,
    notes: "Deux ou trois ponts selon le modèle. Jusqu’à 20 engins de siège G en bordée, ou 6 TG, plus des armes de proue/poupe."
  },
  {
    id: "warship", name: "Bateau de guerre", sourcePage: 24, size: "col", navalSquares: 4,
    dimensions: "6 m × 30 m", cost: 25000, hp: 1200, hardness: 10, save: 7, ram: "8d8",
    speeds: { wind: 30, muscles: 60, current: 0, mixed: 90 }, acceleration: 30,
    navigation: "Diplomatie/Intimidation (muscles) ou Profession (marin)", propulsionMode: "mixed", propulsionLabel: "Muscles, vent ou courants", steering: "rudder",
    sails: { hp: 320, squares: 40, hardness: 0 }, oars: { hp: 600, count: 60, hardness: 5 },
    crew: 80, crewMinimumOverride: 0, passengers: 160, decks: 2, cargo: "50 tonnes",
    squares5ft: 80,
    notes: "60 rames et voiles renforcées par magie. Utilisé pour les incursions et le transport de troupes."
  },
  {
    id: "boat", name: "Canot", sourcePage: 25, size: "lg", navalSquares: 1,
    dimensions: "3 m × 6 m", cost: 500, hp: 120, hardness: 5, save: 2, ram: "1d8",
    speeds: { wind: 30, muscles: 30, current: 0, mixed: 30 }, acceleration: 30,
    navigation: "Diplomatie/Intimidation (muscles) ou Profession (marin)", propulsionMode: "muscles", propulsionLabel: "Muscles, vent ou courants", steering: "oars",
    sails: { hp: 40, squares: 10, hardness: 0 }, oars: { hp: 60, count: 6, hardness: 5 },
    crew: 10, crewMinimumOverride: 4, passengers: 12, decks: 1, cargo: "2 tonnes",
    squares5ft: 8,
    notes: "Équipage : 4 à 10 rameurs. Maximum 16 créatures de taille M à bord. Ne transporte pas d’engin de siège."
  },
  {
    id: "rowboat", name: "Chaloupe", sourcePage: 25, size: "lg", navalSquares: 1,
    dimensions: "1,50 m × 3 m", cost: 50, hp: 60, hardness: 5, save: 1, ram: "1d8",
    speeds: { wind: 0, muscles: 30, current: 0, mixed: 30 }, acceleration: 30,
    navigation: "Diplomatie/Intimidation (muscles) ou Profession (marin)", propulsionMode: "muscles", propulsionLabel: "Muscles ou courants", steering: "oars",
    sails: { hp: 0, squares: 0, hardness: 0 }, oars: { hp: 20, count: 4, hardness: 5 },
    crew: 1, crewMinimumOverride: 1, passengers: 3, decks: 1, cargo: "500 kg",
    squares5ft: 2,
    notes: "2 à 4 rames. Maximum 4 créatures de taille M à bord. Ne transporte pas d’engin de siège."
  },
  {
    id: "longship", name: "Drakkar", sourcePage: 26, size: "col", navalSquares: 3,
    dimensions: "4,50 m × 22,50 m", cost: 10000, hp: 675, hardness: 5, save: 5, ram: "8d8",
    speeds: { wind: 60, muscles: 30, current: 0, mixed: 90 }, acceleration: 30,
    navigation: "Diplomatie/Intimidation (muscles) ou Profession (marin)", propulsionMode: "mixed", propulsionLabel: "Muscles, vent ou courants", steering: "rudder",
    sails: { hp: 120, squares: 30, hardness: 0 }, oars: { hp: 400, count: 40, hardness: 5 },
    crew: 50, crewMinimumOverride: 0, passengers: 100, decks: 1, cargo: "50 tonnes",
    squares5ft: 45,
    notes: "40 rames, un mât. Peut recevoir un engin de siège G à l’avant et un à l’arrière."
  },
  {
    id: "galley", name: "Galère", sourcePage: 26, size: "col", navalSquares: 4,
    dimensions: "6 m × 39 m", cost: 30000, hp: 1560, hardness: 5, save: 8, ram: "8d8",
    speeds: { wind: 60, muscles: 60, current: 0, mixed: 120 }, acceleration: 30,
    navigation: "Diplomatie/Intimidation (muscles) ou Profession (marin)", propulsionMode: "mixed", propulsionLabel: "Muscles, vent ou courants", steering: "rudder",
    sails: { hp: 320, squares: 80, hardness: 0 }, oars: { hp: 1400, count: 140, hardness: 5 },
    crew: 200, crewMinimumOverride: 0, passengers: 250, decks: 3, cargo: "150 tonnes",
    squares5ft: 104,
    notes: "140 rames, deux mâts. Les armes de flanc ne peuvent pas être utilisées lorsque la galère se déplace à la rame."
  },
  {
    id: "junk", name: "Jonque", sourcePage: 26, size: "col", navalSquares: 3,
    dimensions: "6 m × 22,50 m", cost: 15000, hp: 900, hardness: 5, save: 6, ram: "8d8",
    speeds: { wind: 90, muscles: 0, current: 0, mixed: 90 }, acceleration: 30,
    navigation: "Profession (marin)", propulsionMode: "wind", propulsionLabel: "Vent ou courants", steering: "rudder",
    sails: { hp: 360, squares: 90, hardness: 0 }, oars: { hp: 0, count: 0, hardness: 5 },
    crew: 10, crewMinimumOverride: 0, passengers: 100, decks: 2, cargo: "100 tonnes",
    squares5ft: 60,
    notes: "Trois mâts. Profil de grand navire à voiles au faible équipage."
  },
  {
    id: "keelboat", name: "Quillard", sourcePage: 27, size: "grg", navalSquares: 2,
    dimensions: "4,50 m × 15 m", cost: 3000, hp: 600, hardness: 5, save: 4, ram: "4d8",
    speeds: { wind: 30, muscles: 30, current: 0, mixed: 60 }, acceleration: 30,
    navigation: "Diplomatie/Intimidation (muscles) ou Profession (marin)", propulsionMode: "mixed", propulsionLabel: "Muscles, vent ou courants", steering: "rudder",
    sails: { hp: 80, squares: 20, hardness: 0 }, oars: { hp: 80, count: 8, hardness: 5 },
    crew: 15, crewMinimumOverride: 0, passengers: 100, decks: 1, cargo: "50 tonnes",
    squares5ft: 30,
    notes: "Navire de transport fluvial et côtier. Un engin de siège G peut être positionné à l’avant ou à l’arrière."
  },
  {
    id: "raft", name: "Radeau", sourcePage: 27, size: "lg", navalSquares: 1,
    dimensions: "3 m × 3 m", cost: 0, hp: 30, hardness: 5, save: 0, ram: "1d8",
    speeds: { wind: 0, muscles: 30, current: 0, mixed: 30 }, acceleration: 30,
    navigation: "Diplomatie/Intimidation (muscles) ou Profession (marin)", propulsionMode: "muscles", propulsionLabel: "Muscles ou courants", steering: "oars",
    sails: { hp: 0, squares: 0, hardness: 0 }, oars: { hp: 20, count: 2, hardness: 5 },
    crew: 1, crewMinimumOverride: 1, passengers: 3, decks: 1, cargo: "500 kg",
    squares5ft: 4,
    notes: "Le pilote est également rameur. Maximum 4 créatures de taille M. Aucun engin de siège."
  }
]);

export const PIRATE_WEAPONS = Object.freeze([
  { id: "pirateHook", name: "Crochet de pirate", category: "Courante, légère", price: "10 po", small: "1d3", medium: "1d4", crit: "×2", range: "—", weight: "500 g", damageType: "T", special: "Désarmement", sourcePage: 5 },
  { id: "bayonet", name: "Baïonnette", category: "Courante, deux mains", price: "5 po", small: "1d4", medium: "1d6", crit: "×2", range: "—", weight: "500 g", damageType: "P", special: "—", sourcePage: 5 },
  { id: "boardingPike", name: "Pique d’abordage", category: "Courante, deux mains", price: "8 po", small: "1d6", medium: "1d8", crit: "×3", range: "—", weight: "4,5 kg", damageType: "P", special: "Allonge, réception", sourcePage: 5 },
  { id: "boardingAxe", name: "Hache d’abordage", category: "Guerre, légère", price: "6 po", small: "1d4", medium: "1d6", crit: "×3", range: "—", weight: "1,5 kg", damageType: "P ou T", special: "—", sourcePage: 5 },
  { id: "catNineTails", name: "Chat à neuf queues", category: "Guerre, légère", price: "1 po", small: "1d3", medium: "1d4", crit: "×2", range: "—", weight: "500 g", damageType: "T", special: "Désarmement, non-létaux", sourcePage: 5 },
  { id: "cutlass", name: "Coutelas", category: "Guerre, une main", price: "15 po", small: "1d4", medium: "1d6", crit: "18–20/×2", range: "—", weight: "2 kg", damageType: "T", special: "—", sourcePage: 5 },
  { id: "harpoon", name: "Harpon", category: "Exotique, deux mains", price: "5 po", small: "1d6", medium: "1d8", crit: "×3", range: "3 m", weight: "8 kg", damageType: "P", special: "Lutte", sourcePage: 5 },
  { id: "grapplingHookWeapon", name: "Grappin", category: "Exotique, distance", price: "6 po", small: "1d4", medium: "1d6", crit: "×2", range: "3 m", weight: "7 kg", damageType: "P", special: "Lutte", sourcePage: 5 }
]);

export const CAMPAIGN_TRAITS = Object.freeze([
  { id: "ancientSites", name: "Explorateur de sites antiques", sourcePage: 4, mechanics: "+1 de trait à Connaissances (histoire) et Connaissances (folklore local) ; l’une devient compétence de classe ; gagne cyclope ou polyglotte comme langue supplémentaire." },
  { id: "barStoryteller", name: "Conteur au comptoir", sourcePage: 4, mechanics: "+1 de trait à Diplomatie et à une catégorie de Représentation ; l’une devient compétence de classe. 1/semaine, Connaissances (folklore local) ou Int DD 15 pour connaître une histoire pirate ; racontée à bord de l’Absinthe : +1 pour influencer ses PNJ." },
  { id: "besmarasBlessing", name: "Bénédiction de Besmara", sourcePage: 4, mechanics: "+1 de trait à Perception et Profession (marin). 1/semaine, relancer un test de Profession (marin) et garder le meilleur résultat ; l’utilisation est annoncée avant le résultat." },
  { id: "buccaneerBlood", name: "Sang de boucanier", sourcePage: 4, mechanics: "+1 de trait à Intimidation et Profession (marin), plus un unique +1 de trait aux valeurs d’Infamie et de Déshonneur." },
  { id: "dockBrawler", name: "Castagneur des quais", sourcePage: 5, mechanics: "+1 de trait aux dégâts infligés avec les coups-de-poing et les armes improvisées ; commence la campagne avec des coups-de-poing dissimulés." },
  { id: "plunderSeeker", name: "À l’affût du butin", sourcePage: 5, mechanics: "+1 de trait à Estimation et aux tests de Perception pour trouver objets secrets/cachés (portes et pièges compris) ; commence avec 50 po d’objets ordinaires grappillés." },
  { id: "ilizmagortiNative", name: "Natif d’Ilizmagorti", sourcePage: 5, mechanics: "+1 de trait à Psychologie, qui devient compétence de classe ; peut utiliser Connaissances (folklore local) non formée sur les pirates et les Chaînes." },
  { id: "pegLeg", name: "Jambe de bois", sourcePage: 5, mechanics: "Ignore les malus normalement causés par sa jambe de bois ; +1 de trait aux jets de Vigueur ; +1 de trait aux dégâts contre les requins et autres animaux de sous-type aquatique." },
  { id: "shipsSurgeon", name: "Chirurgien embarqué", sourcePage: 6, mechanics: "+1 de trait à Artisanat (constructions en bois) et Premiers secours ; Premiers secours devient compétence de classe ; commence avec une trousse de premiers secours pleine." },
  { id: "waterBlessed", name: "Béni des eaux", sourcePage: 6, mechanics: "+1 de trait à Natation, qui devient compétence de classe ; réduit de 1 les malus aux jets d’attaque lors des combats sous l’eau." }
]);

export const CRITICAL_WOUNDS = Object.freeze([
  { min: 1, max: 5, label: "Cicatrice superficielle", effect: "Ornementale." },
  { min: 6, max: 8, label: "Cicatrice modérée", effect: "+1 aux tests de compétence basés sur le Charisme pour la première cicatrice ; les suivantes de ce type deviennent importantes." },
  { min: 9, max: 10, label: "Cicatrice importante", effect: "−1 aux tests de compétence basés sur le Charisme ; au choix du MJ, +1 à Bluff/Diplomatie/Intimidation contre d’autres pirates." },
  { min: 11, max: 14, label: "Perte d’un doigt", effect: "−1 Dex par tranche de 3 doigts perdus." },
  { min: 15, max: 16, label: "Blessure impressionnante", effect: "−1 Con." },
  { min: 17, max: 17, label: "Perte d’un œil", effect: "−4 aux tests de Perception basés sur la vue." },
  { min: 18, max: 18, label: "Perte d’une jambe", effect: "Vitesse réduite de moitié ; charge impossible." },
  { min: 19, max: 19, label: "Perte d’une main", effect: "Impossible de manier des objets à deux mains." },
  { min: 20, max: 20, label: "Perte d’un bras", effect: "−1 For ; impossible de manier des objets à deux mains." }
]);

export function getShipProfile(profileId) {
  return SHIP_PROFILES.find((p) => p.id === profileId) ?? null;
}

export function formatGp(value) {
  const n = Number(value ?? 0);
  if (!n) return "—";
  return `${new Intl.NumberFormat(game?.i18n?.lang ?? "fr-FR").format(n)} po`;
}

export function profileToNativeUpdate(profile) {
  return {
    "system.traits.type": "sea",
    "system.traits.size": profile.size,
    "system.squares": profile.squares5ft,
    "system.material.base": "wood",
    "system.material.magicallyHardened": false,
    "system.attributes.hp.bonus": 0,
    "system.attributes.hp.offset": 0,
    "system.attributes.hardness.bonus": 0,
    "system.attributes.ac.normal.bonus": 0,
    "system.attributes.ac.touch.bonus": 0,
    "system.attributes.ac.stopped.bonus": 0,
    "system.attributes.savingThrows.save.base": profile.save,
    "system.crew.value": profile.crew,
    "system.crew.max": profile.crew,
    "system.crew.passengers": profile.passengers,
    "system.details.cost": profile.cost,
    "system.details.currentSpeed": 0,
    "system.details.maxSpeed": Math.max(...Object.values(profile.speeds ?? { mixed: 0 })),
    "system.details.acceleration": profile.acceleration,
    "system.details.decks": profile.decks,
    "system.details.drivingCheck": profile.navigation,
    "system.details.drivingDevice": profile.steering === "wheel" ? "Barre" : profile.steering === "rudder" ? "Gouvernail" : "Rames",
    "system.details.forwardFacing": "Proue",
    "system.details.propulsion": profile.propulsionLabel
  };
}

export function profileToSSData(profile, baseData = {}) {
  let combatDc = 20;
  let autoRam = true;
  try { combatDc = Number(game.settings.get(MODULE_ID, "navigationCombatDc") ?? 20); } catch {}
  try { autoRam = Boolean(game.settings.get(MODULE_ID, "autoApplyRamDamage")); } catch {}
  const data = foundry.utils.mergeObject(foundry.utils.deepClone(baseData), {
    profileId: profile.id,
    ramDamage: profile.ram,
    sails: { value: profile.sails.hp, max: profile.sails.hp, squares: profile.sails.squares, hardness: profile.sails.hardness },
    oars: { value: profile.oars.hp, max: profile.oars.hp, count: profile.oars.count, hardness: profile.oars.hardness },
    speeds: foundry.utils.deepClone(profile.speeds),
    crewMinimumOverride: profile.crewMinimumOverride,
    combat: { autoApplyRamDamage: autoRam },
    navigation: { propulsionMode: profile.propulsionMode, dc: combatDc, context: "combat" },
    steering: {
      type: profile.steering,
      value: profile.steering === "oars" ? Math.max(10, profile.oars.hp) : 25,
      max: profile.steering === "oars" ? Math.max(10, profile.oars.hp) : 25,
      hardness: 5,
      ac: profile.steering === "oars" ? 12 : 10,
      broken: false,
      destroyed: false
    }
  }, { inplace: false, insertKeys: true, overwrite: true });
  return data;
}

export async function applyShipProfile(actor, profileId, { resetCurrentHp = true } = {}) {
  const profile = getShipProfile(profileId);
  if (!profile) throw new Error(`Profil de navire inconnu : ${profileId}`);
  if (!actor || actor.type !== "vehicle") throw new Error("Le profil doit être appliqué à un Actor PF1 de type Vehicle.");

  await actor.update(profileToNativeUpdate(profile));

  // Ajuste le bonus de PV et de solidité pour coller exactement au profil publié,
  // sans supposer les formules internes de matériau de la version PF1 installée.
  const currentMax = Number(actor.system?.attributes?.hp?.max ?? 0);
  const currentBonus = Number(actor.system?.attributes?.hp?.bonus ?? 0);
  const hpDelta = profile.hp - currentMax;
  const currentHardness = Number(actor.system?.attributes?.hardness?.total ?? actor.system?.attributes?.hardness?.value ?? 0);
  const currentHardnessBonus = Number(actor.system?.attributes?.hardness?.bonus ?? 0);
  const hardDelta = profile.hardness - currentHardness;
  const corrections = {};
  if (Number.isFinite(hpDelta) && hpDelta !== 0) corrections["system.attributes.hp.bonus"] = currentBonus + hpDelta;
  if (Number.isFinite(hardDelta) && hardDelta !== 0) corrections["system.attributes.hardness.bonus"] = currentHardnessBonus + hardDelta;
  if (Object.keys(corrections).length) await actor.update(corrections);

  if (resetCurrentHp) {
    const finalMax = Number(actor.system?.attributes?.hp?.max ?? profile.hp);
    await actor.update({ "system.attributes.hp.value": finalMax });
  }

  const { getSSShipData, normalizeSSShipData } = await import("./ship-data.mjs");
  const existing = getSSShipData(actor);
  const ss = normalizeSSShipData(profileToSSData(profile, existing));
  await actor.setFlag(MODULE_ID, "ship", ss);

  // Si le navire possède déjà des améliorations S&S, recharge leur base depuis
  // le nouveau profil puis réapplique leurs effets. L'import dynamique évite une
  // dépendance circulaire au chargement des modules.
  if (actor.getFlag(MODULE_ID, "improvements")?.initialized) {
    try {
      const { rebaseImprovementsFromProfile } = await import("./ship-improvements-data.mjs");
      await rebaseImprovementsFromProfile(actor);
    } catch (error) {
      console.warn(`${MODULE_ID} | Impossible de réappliquer les améliorations après changement de profil`, error);
    }
  }

  return { actor, profile, ss: actor.getFlag(MODULE_ID, "ship") ?? ss };
}
