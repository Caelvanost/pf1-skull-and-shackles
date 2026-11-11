import { MODULE_ID } from "./ship-data.mjs";

export const REPUTATION_FLAG = "reputation";

export const INFAMY_THRESHOLDS = Object.freeze([
  { key: "unknown", min: 0, title: "Inconnu", grade: null, gradeLabel: "Aucune", favoredPorts: 0 },
  { key: "shameful", min: 10, title: "Honteux", grade: "shameful", gradeLabel: "Honteuses", favoredPorts: 1 },
  { key: "contemptible", min: 20, title: "Méprisable", grade: "contemptible", gradeLabel: "Méprisables", favoredPorts: 1 },
  { key: "infamous", min: 30, title: "Infâme", grade: "infamous", gradeLabel: "Infâmes", favoredPorts: 2 },
  { key: "disgusting", min: 40, title: "Répugnant", grade: "disgusting", gradeLabel: "Répugnantes", favoredPorts: 2 },
  { key: "vile", min: 55, title: "Vil", grade: "vile", gradeLabel: "Viles", favoredPorts: 3 }
]);

export const COMMUNITY_SIZES = Object.freeze({
  locality: { label: "Lieu-dit", basePercent: 10, stepDc: 5, stepPercent: 5, maxPercent: 20, maxDc: 20 },
  hamlet: { label: "Hameau", basePercent: 20, stepDc: 5, stepPercent: 5, maxPercent: 30, maxDc: 20 },
  village: { label: "Village", basePercent: 30, stepDc: 5, stepPercent: 5, maxPercent: 40, maxDc: 20 },
  smallTown: { label: "Petit bourg", basePercent: 40, stepDc: 5, stepPercent: 5, maxPercent: 60, maxDc: 30 },
  largeTown: { label: "Gros bourg", basePercent: 60, stepDc: 5, stepPercent: 5, maxPercent: 80, maxDc: 30 },
  smallCity: { label: "Petite ville", basePercent: 80, stepDc: 10, stepPercent: 5, maxPercent: 90, maxDc: 30 },
  largeCity: { label: "Grande ville", basePercent: 90, stepDc: 10, stepPercent: 10, maxPercent: 120, maxDc: 40 },
  metropolis: { label: "Métropole", basePercent: 100, stepDc: 10, stepPercent: 10, maxPercent: 140, maxDc: 50 }
});

const G = Object.freeze({
  shameful: { min: 10, label: "Honteuses" },
  contemptible: { min: 20, label: "Méprisables" },
  infamous: { min: 30, label: "Infâmes" },
  disgusting: { min: 40, label: "Répugnantes" },
  vile: { min: 55, label: "Viles" }
});

export const IMPOSITIONS = Object.freeze([
  { id: "yesSir", grade: "shameful", cost: 2, name: "Oui, m’sieur !", description: "Pendant 1 heure, l’équipage accomplit en moitié moins de temps les tâches ordinaires de préparation, d’entretien ou de réparation. Ne s’applique ni en combat ni aux exploits complexes." },
  { id: "atYourOrders", grade: "shameful", cost: 5, name: "À vos ordres, capitaine !", description: "Par une action simple à bord, un PJ peut lancer nappe de brouillard, héroïsme, réparation intégrale, extinction des feux ou vent de murmures, avec un NLS égal à son niveau." },
  { id: "walkThePlank", grade: "shameful", cost: 5, name: "La planche, la planche !", description: "Sacrifier un membre d’équipage ou prisonnier : +2 à tous les tests de compétence OU +2 à tous les jets d’attaque des PJ et de l’équipage à bord jusqu’au lendemain ou jusqu’au départ du capitaine. Si la victime revient à la vie : malus de -2 pendant 1 journée." },
  { id: "upDogs", grade: "shameful", cost: 10, name: "Debout, bande de chiens !", description: "Une fois par semaine, tous les PJ et alliés sur le pont bénéficient de soins légers comme lancés par un prêtre de niveau égal au NMG." },

  { id: "fullAhead", grade: "contemptible", cost: 5, name: "En avant toute !", description: "Double la vitesse du navire pendant 1 journée." },
  { id: "damnIt", grade: "contemptible", cost: 5, name: "Mille sabords !", description: "Une fois par semaine, à bord, les PJ et l’équipage peuvent relancer l’initiative ou faire un jet d’initiative pendant un round de surprise." },
  { id: "besmaraGrace", grade: "contemptible", cost: 10, name: "Par la grâce de Besmara !", description: "Par une action simple à bord, un PJ peut lancer corde animée, contrôle de l’eau, délivrance des malédictions, guérison des maladies ou respiration aquatique, NLS égal à son niveau." },
  { id: "deadTellNoTales", grade: "contemptible", cost: 10, name: "Les morts ne cafardent pas !", description: "À bord, les PJ peuvent confirmer automatiquement un coup critique." },

  { id: "nonNegotiable", grade: "infamous", cost: 5, name: "Non négociable !", description: "Vendre jusqu’à 5 points de butin en une journée à 50 % de leur valeur, quel que soit le maximum local, sans test de compétence." },
  { id: "codeHonor", grade: "infamous", cost: 5, name: "Sur l’honneur du code !", description: "+4 aux tests de compétence basés sur le Charisme des PJ et de l’équipage contre d’autres pirates pendant 24 heures." },
  { id: "watchWinds", grade: "infamous", cost: 10, name: "Matez-moi ces vents !", description: "Par une action simple à bord, un PJ peut lancer appel de la foudre, contrôle des vents, mirage ou télékinésie, NLS égal à son niveau." },
  { id: "fishHere", grade: "infamous", cost: 10, name: "Par ici, la poiscaille !", description: "Convoque 1d4 requins par seuil d’Infamie atteint autour du navire. Ils ne sont pas contrôlés par les PJ et attaquent les créatures à la mer." },

  { id: "braveRun", grade: "disgusting", cost: 5, name: "Courage, fuyons !", description: "Une fois par jour, téléporte le navire de 30 m dans n’importe quelle direction." },
  { id: "takeIt", grade: "disgusting", cost: 10, name: "Tu prends et si t’aimes pas, c’est pareil !", description: "Vendre jusqu’à 5 points de butin en une journée à 100 % de leur valeur, quel que soit le maximum local, sans test de compétence." },
  { id: "watchWaves", grade: "disgusting", cost: 10, name: "Matez-moi ces vagues !", description: "Par une action simple à bord, un PJ peut lancer contrôle du climat, festin des héros, localisation suprême ou vagues d’épuisement, NLS égal à son niveau." },
  { id: "widowsScar", grade: "disgusting", cost: 20, name: "La balafre de la veuve !", description: "Désigne un ennemi : les PJ et l’équipage gagnent +2 aux jets d’attaque et de dégâts contre lui pendant 1 semaine. La cible sait qui l’a maudite ; délivrance des malédictions met fin à l’effet." },

  { id: "fasterFurther", grade: "vile", cost: 10, name: "Plus vite, plus loin !", description: "Multiplie par quatre la vitesse du navire pendant 1 journée." },
  { id: "seaHungry", grade: "vile", cost: 15, name: "La mer a faim !", description: "Un PJ à bord peut lancer nuée d’élémentaires, tempête vengeresse ou tourbillon avec un NLS de 17." },
  { id: "diveDive", grade: "vile", cost: 20, name: "Plongez, plongez, plongez !", description: "Le navire s’immerge jusqu’à 1 heure, se déplace sous l’eau à vitesse normale et reste dans une bulle d’air respirable, sans subir les effets néfastes de l’eau." },
  { id: "callSerpent", grade: "vile", cost: 25, name: "Appelez le Serpent !", description: "Un serpent de mer contrôlé par les PJ vient aider le navire pendant 10 minutes." }
]);

export function defaultReputationData() {
  let infamyDcBase = 5;
  try { infamyDcBase = Number(game.settings.get(MODULE_ID, "infamyDcBase") ?? 5); } catch {}
  return {
    plunder: 0,
    infamy: 0,
    disrepute: 0,
    averagePartyLevel: 1,
    infamyDcBase,
    currentPort: "",
    storytellerUuid: "",
    storytellerSkill: "",
    infamyManualModifier: 0,
    infamyPlunderSpend: 0,
    ports: {},
    favoredPorts: ["", "", ""],
    sale: {
      communitySize: "smallTown",
      merchantUuid: "",
      skill: "",
      manualModifier: 0,
      lastOfferPercent: 0,
      lastOfferGp: 0,
      lastCheckTotal: null,
      lastPort: "",
      lastCommunitySize: ""
    }
  };
}

export function normalizeReputationData(data = {}) {
  const d = foundry.utils.mergeObject(defaultReputationData(), foundry.utils.deepClone(data ?? {}), {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true
  });
  d.plunder = Math.max(0, Math.floor(Number(d.plunder ?? 0)));
  d.infamy = Math.max(0, Math.floor(Number(d.infamy ?? 0)));
  d.averagePartyLevel = Math.max(1, Number(d.averagePartyLevel ?? 1));
  d.infamyDcBase = Math.max(0, Math.floor(Number(d.infamyDcBase ?? 5)));
  const cap = getInfamyCap(d.averagePartyLevel);
  d.infamy = Math.min(d.infamy, cap);
  d.disrepute = Math.max(0, Math.min(Math.floor(Number(d.disrepute ?? 0)), d.infamy));
  d.currentPort = String(d.currentPort ?? "").trim();
  d.storytellerUuid = String(d.storytellerUuid ?? "");
  d.storytellerSkill = String(d.storytellerSkill ?? "");
  d.infamyManualModifier = Number(d.infamyManualModifier ?? 0);
  d.infamyPlunderSpend = Math.max(0, Math.floor(Number(d.infamyPlunderSpend ?? 0)));
  d.ports = (d.ports && typeof d.ports === "object" && !Array.isArray(d.ports)) ? d.ports : {};
  d.favoredPorts = Array.from({ length: 3 }, (_, i) => String(d.favoredPorts?.[i] ?? "").trim());
  d.sale.communitySize = COMMUNITY_SIZES[d.sale.communitySize] ? d.sale.communitySize : "smallTown";
  d.sale.merchantUuid = String(d.sale.merchantUuid ?? "");
  d.sale.skill = String(d.sale.skill ?? "");
  d.sale.manualModifier = Number(d.sale.manualModifier ?? 0);
  d.sale.lastOfferPercent = Math.max(0, Number(d.sale.lastOfferPercent ?? 0));
  d.sale.lastOfferGp = Math.max(0, Number(d.sale.lastOfferGp ?? 0));
  d.sale.lastCheckTotal = d.sale.lastCheckTotal === null || d.sale.lastCheckTotal === "" ? null : Number(d.sale.lastCheckTotal);
  d.sale.lastPort = String(d.sale.lastPort ?? "");
  d.sale.lastCommunitySize = String(d.sale.lastCommunitySize ?? "");
  return d;
}

export function getReputationData(actor) {
  return normalizeReputationData(actor?.getFlag?.(MODULE_ID, REPUTATION_FLAG) ?? {});
}

export async function setReputationData(actor, data) {
  const normalized = normalizeReputationData(data);
  await actor.setFlag(MODULE_ID, REPUTATION_FLAG, normalized);
  return normalized;
}

export function getInfamyCap(averagePartyLevel) {
  return Math.max(0, Math.floor(Number(averagePartyLevel ?? 0) * 4));
}

export function getInfamyTier(infamy) {
  const value = Math.max(0, Number(infamy ?? 0));
  return [...INFAMY_THRESHOLDS].reverse().find((t) => value >= t.min) ?? INFAMY_THRESHOLDS[0];
}

export function getNextInfamyTier(infamy) {
  const value = Math.max(0, Number(infamy ?? 0));
  return INFAMY_THRESHOLDS.find((t) => t.min > value) ?? null;
}

export function getTierIndex(infamy) {
  return INFAMY_THRESHOLDS.findIndex((t) => t.key === getInfamyTier(infamy).key);
}

export function getInfamyDC(rep) {
  return Math.floor(Number(rep.infamyDcBase ?? 5) + (2 * Number(rep.averagePartyLevel ?? 1)));
}

export function normalizePortKey(name) {
  return String(name ?? "").trim().toLocaleLowerCase(game?.i18n?.lang ?? "fr").replace(/\s+/g, " ");
}

export function getPortProgress(rep, portName = rep.currentPort) {
  const name = String(portName ?? "").trim();
  if (!name) return { name: "", earned: 0, tierKey: getInfamyTier(rep.infamy).key };
  const key = normalizePortKey(name);
  const currentTierKey = getInfamyTier(rep.infamy).key;
  const stored = rep.ports?.[key] ?? {};
  const tierKey = String(stored.tierKey ?? currentTierKey);
  const earned = tierKey === currentTierKey ? Math.max(0, Math.min(5, Number(stored.earned ?? 0))) : 0;
  return { name: stored.name || name, earned, tierKey: currentTierKey };
}

export function getFavoredPortBonus(rep, portName = rep.currentPort) {
  const key = normalizePortKey(portName);
  if (!key) return 0;
  const tier = getInfamyTier(rep.infamy);
  const allowed = tier.favoredPorts ?? 0;
  if (!allowed) return 0;
  const matches = rep.favoredPorts
    .map((name, index) => ({ key: normalizePortKey(name), index }))
    .filter((entry) => entry.key && entry.key === key && entry.index < allowed);
  if (!matches.length) return 0;
  const index = matches[0].index;
  // À 10 : premier port +2. À 30 : premier +4, second +2. À 55 : +6/+4/+2.
  if (tier.key === "vile") return [6, 4, 2][index] ?? 0;
  if (["infamous", "disgusting"].includes(tier.key)) return [4, 2, 0][index] ?? 0;
  return index === 0 ? 2 : 0;
}

export function getCharacterSkillData(actor, skillId) {
  if (!actor || !skillId) return null;
  try {
    const skill = actor.getSkillInfo(skillId);
    return {
      id: skillId,
      name: skill.fullName ?? skill.name ?? skillId,
      mod: Number(skill.mod ?? 0)
    };
  } catch {
    return null;
  }
}

export function listActorSkills(actor, { infamyOnly = false, saleOnly = false } = {}) {
  if (!actor?.allSkills) return [];
  const entries = actor.allSkills.map((id) => getCharacterSkillData(actor, id)).filter(Boolean);
  const infamyRx = /(bluff|intimid|repr[eé]sentation|perform)/i;
  const saleRx = /(bluff|diplom|intimid|profession|m[eé]tier|merchant|marchand)/i;
  const filtered = infamyOnly ? entries.filter((s) => infamyRx.test(s.name)) : saleOnly ? entries.filter((s) => saleRx.test(s.name)) : entries;
  return filtered.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
}

export function getSaleOfferPercent(communityKey, checkTotal) {
  const community = COMMUNITY_SIZES[communityKey] ?? COMMUNITY_SIZES.smallTown;
  let pct = community.basePercent;
  const total = Number(checkTotal ?? 0);
  if (total > 10) {
    const steps = Math.floor((total - 10) / community.stepDc);
    pct += Math.max(0, steps) * community.stepPercent;
  }
  return Math.min(community.maxPercent, pct);
}

export function getSaleTierBonus(infamy) {
  return Number(infamy ?? 0) >= 40 ? 5 : 0;
}

export function getImpositionGrade(grade) {
  return G[grade] ?? null;
}

export function getEffectiveImpositionCost(imposition, infamy) {
  const value = Math.max(0, Number(infamy ?? 0));
  let cost = Math.max(0, Math.floor(Number(imposition.cost ?? 0)));
  if (value >= 55 && imposition.grade === "shameful") return 0;
  if (value >= 55 && imposition.grade === "infamous") cost = Math.floor(cost / 2);
  if (value >= 40 && imposition.grade === "contemptible") cost = Math.floor(cost / 2);
  if (value >= 30 && imposition.grade === "shameful") cost = Math.floor(cost / 2);
  return Math.max(0, cost);
}

export function canAccessImposition(imposition, infamy) {
  const grade = getImpositionGrade(imposition.grade);
  return Boolean(grade && Number(infamy ?? 0) >= grade.min);
}

export function getImpositionById(id) {
  return IMPOSITIONS.find((i) => i.id === id) ?? null;
}
