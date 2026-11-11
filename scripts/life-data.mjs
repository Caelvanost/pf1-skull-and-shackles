import { MODULE_ID } from "./ship-data.mjs";

export const LIFE_FLAG = "lifeAboard";

const uid = () => {
  try { return foundry.utils.randomID(); } catch { return Math.random().toString(36).slice(2, 10); }
};
const n = (v, f = 0) => Number.isFinite(Number(v)) ? Number(v) : f;
const bool = (v) => Boolean(v);

export const ROLES = Object.freeze({
  rigger: { label: "Gabier" },
  swab: { label: "Moussaillon" },
  cook: { label: "Commis de cuisine" }
});

const S = (label, patterns, ability = null) => ({ type: "skill", label, patterns, ability });
const A = (label, ability) => ({ type: "ability", label, ability });

export const TASKS = Object.freeze({
  rigger: [
    { id: "rigger-1", roll: 1, name: "Réparation des gréements", checks: [
      { label: "Atteindre les gréements", dc: 10, alternatives: [S("Escalade", [/escalade/i, /climb/i], "str")] },
      { label: "Réparer les gréements", dc: 10, alternatives: [S("Profession (marin)", [/profession.*marin/i, /m[eé]tier.*marin/i, /sailor/i], "wis"), A("Dextérité", "dex")] }
    ] },
    { id: "rigger-2", roll: 2, name: "Les cordages", checks: [
      { label: "Hisser/réduire les voiles", dc: 10, alternatives: [S("Profession (marin)", [/profession.*marin/i, /sailor/i], "wis"), A("Dextérité", "dex")] },
      { label: "Endurance", dc: 10, fatigueOnly: true, alternatives: [A("Constitution", "con")] }
    ] },
    { id: "rigger-3", roll: 3, name: "Les gréements supérieurs", checks: [
      { label: "Escalade jusqu’aux gréements supérieurs", dc: 10, alternatives: [S("Escalade", [/escalade/i, /climb/i], "str")] },
      { label: "Entretien", dc: 10, alternatives: [S("Profession (marin)", [/profession.*marin/i, /sailor/i], "wis"), A("Dextérité", "dex")] }
    ] },
    { id: "rigger-4", roll: 4, name: "Les cordes", checks: [
      { label: "Gestion des cordes", dc: 10, alternatives: [S("Profession (marin)", [/profession.*marin/i, /sailor/i], "wis"), A("Dextérité", "dex")] }
    ] },
    { id: "rigger-5", roll: 5, name: "Le guet", checks: [
      { label: "Escalade jusqu’au nid-de-pie", dc: 10, alternatives: [S("Escalade", [/escalade/i, /climb/i], "str")] },
      { label: "Guet", dc: 10, alternatives: [S("Perception", [/perception/i], "wis")] }
    ] },
    { id: "rigger-6", roll: 6, name: "Gestion de la grand-voile", checks: [
      { label: "Grand-voile", dc: 10, alternatives: [S("Profession (marin)", [/profession.*marin/i, /sailor/i], "wis"), A("Force", "str")] },
      { label: "Endurance", dc: 10, fatigueOnly: true, alternatives: [A("Constitution", "con")] }
    ] }
  ],
  swab: [
    { id: "swab-1", roll: 1, name: "Entretien des cales", checks: [
      { label: "Nettoyage des cales", dc: 12, alternatives: [A("Force", "str")] },
      { label: "Endurance", dc: 10, fatigueOnly: true, alternatives: [A("Constitution", "con")] }
    ] },
    { id: "swab-2", roll: 2, name: "Chasse aux rats", checks: [
      { label: "Chasse à la vermine", dc: 10, alternatives: [S("Discrétion", [/discr[eé]tion/i, /stealth/i], "dex"), S("Survie", [/survie/i, /survival/i], "wis"), A("Dextérité", "dex")] }
    ] },
    { id: "swab-3", roll: 3, name: "Nettoyage des ponts", alwaysFatigued: true, checks: [
      { label: "Frotter les ponts", dc: 10, alternatives: [A("Force", "str"), A("Constitution", "con")] }
    ] },
    { id: "swab-4", roll: 4, name: "Halage et nouage des cordes", checks: [
      { label: "Cordages lourds", dc: 10, alternatives: [S("Profession (marin)", [/profession.*marin/i, /sailor/i], "wis"), A("Force", "str")] },
      { label: "Endurance", dc: 10, fatigueOnly: true, alternatives: [A("Constitution", "con")] }
    ] },
    { id: "swab-5", roll: 5, name: "Coursier", checks: [
      { label: "Courir les messages", dc: 10, alternatives: [S("Acrobaties", [/acrobat/i], "dex")] },
      { label: "Endurance", dc: 10, fatigueOnly: true, alternatives: [A("Constitution", "con")] }
    ], note: "Le don Course permet de réussir automatiquement cette tâche." },
    { id: "swab-6", roll: 6, name: "Réparations", checks: [
      { label: "Réparer voiles et cordes", dc: 10, alternatives: [S("Profession (marin)", [/profession.*marin/i, /sailor/i], "wis"), A("Dextérité", "dex")] }
    ] }
  ],
  cook: [
    { id: "cook-1", roll: 1, range: "1–2", name: "Cuisine", cookRange: [1, 2], checks: [
      { label: "Préparer le repas (seulement si Kroop est saoul)", dc: 10, onlyIfKroopDrunk: true, alternatives: [S("Profession (cuisinier)", [/profession.*cuisin/i, /cook/i], "wis"), A("Intelligence", "int")] }
    ], note: "Si Kroop est sobre, aucun test n’est requis." },
    { id: "cook-3", roll: 3, name: "Pêche", checks: [
      { label: "Pêcher le repas", dc: 10, alternatives: [S("Profession (pêcheur)", [/profession.*p[eê]ch/i, /fisher/i], "wis"), S("Survie", [/survie/i, /survival/i], "wis")] }
    ], failureNote: "En cas d’échec, affectation aux cales le lendemain." },
    { id: "cook-4", roll: 4, name: "Chasse aux tortues", checks: [
      { label: "Chasser les tortues", dc: 10, alternatives: [S("Profession (pêcheur)", [/profession.*p[eê]ch/i, /fisher/i], "wis"), S("Survie", [/survie/i, /survival/i], "wis")] }
    ], failureNote: "En cas d’échec, affectation aux cales le lendemain." },
    { id: "cook-5", roll: 5, name: "Épreuve d’endurance", extraRum: true, extraDayAction: true, checks: [], note: "Le commis boit une ration supplémentaire de rhum et gagne une action de bord diurne supplémentaire." },
    { id: "cook-6", roll: 6, name: "Occasion spéciale", checks: [
      { label: "Tuer et préparer le cochon", dc: 10, alternatives: [S("Profession (cuisinier)", [/profession.*cuisin/i, /cook/i], "wis"), S("Survie", [/survie/i, /survival/i], "wis")] },
      { label: "Préparer la carcasse si Kroop est saoul", dc: 15, onlyIfKroopDrunk: true, alternatives: [S("Profession (cuisinier)", [/profession.*cuisin/i, /cook/i], "wis"), A("Intelligence", "int")] }
    ] }
  ]
});

export const DAY_ACTIONS = Object.freeze({
  diligent: { label: "Travail assidu", taskMod: 4, description: "+4 à un test de la tâche journalière." },
  influence: { label: "Influence", description: "Tâche normale puis tentative d’influencer un PNJ." },
  sneak: { label: "Sournoiserie", description: "Tâche normale puis brève exploration sans risque d’être repéré." },
  store: { label: "Réserve", taskMod: -2, description: "−2 aux tests de tâche et visite de la réserve du quartier-maître." },
  shirk: { label: "Dérobade", taskMod: -2, description: "−2 aux tests de tâche, exploration et possibilité de faire 10 à un test, avec risque d’être découvert." }
});

export const NIGHT_ACTIONS = Object.freeze({
  rest: { label: "Repos", starred: false, description: "Dormir toute la nuit et récupérer automatiquement de la fatigue." },
  game: { label: "Jeu", starred: false, description: "Jouer ou parier sur un jeu de pirates." },
  entertain: { label: "Amusement", starred: false, description: "Faire un test de Représentation pour divertir l’équipage." },
  influence: { label: "Influence*", starred: true, description: "Tenter d’influencer un PNJ." },
  sneak: { label: "Sournoiserie*", starred: true, description: "Explorer une zone ; peut faire 20 à un test mais doit éviter d’être découvert." },
  larceny: { label: "Larcin*", starred: true, description: "Ouvrir une porte ou un casier verrouillé sans être découvert." }
});

export function createCrewMember() {
  return {
    id: uid(), actorUuid: "", role: "swab", taskId: "", taskRoll: 0,
    dayAction: "diligent", nightAction: "rest", extraNightChoice: "influence", extraNightActions: 0,
    manualTaskModifier: 0, friendlyHelp: false, fatigued: false, fatiguedNextDay: false,
    consecutiveTaskFailures: 0, refusalCount: 0, rumDumpOffenses: 0,
    rum: { drankToday: false, dumpedToday: false, chaBonus: 0, fatigueHours: 0, conDamage: 0, addictionFailed: false },
    lastTask: { passed: null, worstMargin: null, text: "" }, punishmentQueue: [],
    player: { taskRolledDay: 0, dayResolvedDay: 0, nightResolvedDay: 0, rumResolvedDay: 0 }
  };
}

export function defaultLifeData() {
  return {
    day: 1,
    absintheMode: true,
    absintheCrewThreshold: 20,
    taskDcManualModifier: 0,
    kroopDrunk: false,
    members: [],
    influenceHistory: {},
    influence: { influencerUuid: "", targetUuid: "", helperUuid: "", skillId: "", dc: 15, manualModifier: 0, currentAttitude: "indifférente", lastKey: "" },
    stealth: { actorUuid: "", skillId: "", dc: 15, manualModifier: 0 },
    punishment: { targetUuid: "", type: "rope", count: 1, attackBonus: 0, targetAc: 10, hours: 12, keelhauling: "slow" }
  };
}

function arrayify(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  return Object.keys(value).sort((a,b)=>Number(a)-Number(b)).map(k=>value[k]);
}

export function normalizeCrewMember(raw = {}) {
  const base = createCrewMember();
  const role = ROLES[raw.role] ? raw.role : base.role;
  const taskId = getTaskById(raw.taskId)?.id ?? "";
  return {
    ...base,
    ...raw,
    id: String(raw.id || base.id),
    actorUuid: String(raw.actorUuid ?? ""), role, taskId,
    taskRoll: Math.max(0, Math.min(6, Math.floor(n(raw.taskRoll, 0)))),
    manualTaskModifier: n(raw.manualTaskModifier, 0),
    friendlyHelp: bool(raw.friendlyHelp), fatigued: bool(raw.fatigued), fatiguedNextDay: bool(raw.fatiguedNextDay),
    consecutiveTaskFailures: Math.max(0, Math.floor(n(raw.consecutiveTaskFailures, 0))),
    refusalCount: Math.max(0, Math.floor(n(raw.refusalCount, 0))), rumDumpOffenses: Math.max(0, Math.floor(n(raw.rumDumpOffenses, 0))),
    rum: { ...base.rum, ...(raw.rum ?? {}), chaBonus: n(raw.rum?.chaBonus, 0), fatigueHours: n(raw.rum?.fatigueHours, 0), conDamage: n(raw.rum?.conDamage, 0), addictionFailed: bool(raw.rum?.addictionFailed) },
    lastTask: { ...base.lastTask, ...(raw.lastTask ?? {}) },
    punishmentQueue: arrayify(raw.punishmentQueue).map(String),
    player: { ...base.player, ...(raw.player ?? {}), taskRolledDay: Math.max(0, Math.floor(n(raw.player?.taskRolledDay, 0))), dayResolvedDay: Math.max(0, Math.floor(n(raw.player?.dayResolvedDay, 0))), nightResolvedDay: Math.max(0, Math.floor(n(raw.player?.nightResolvedDay, 0))), rumResolvedDay: Math.max(0, Math.floor(n(raw.player?.rumResolvedDay, 0))) },
    dayAction: DAY_ACTIONS[raw.dayAction] ? raw.dayAction : base.dayAction,
    nightAction: NIGHT_ACTIONS[raw.nightAction] ? raw.nightAction : base.nightAction,
    extraNightChoice: NIGHT_ACTIONS[raw.extraNightChoice]?.starred ? raw.extraNightChoice : "influence",
    extraNightActions: Math.max(0, Math.min(2, Math.floor(n(raw.extraNightActions, 0))))
  };
}

export function normalizeLifeData(raw = {}) {
  const base = defaultLifeData();
  return {
    ...base, ...raw,
    day: Math.max(1, Math.floor(n(raw.day, 1))), absintheMode: raw.absintheMode !== false,
    absintheCrewThreshold: Math.max(1, Math.floor(n(raw.absintheCrewThreshold, 20))),
    taskDcManualModifier: n(raw.taskDcManualModifier, 0), kroopDrunk: bool(raw.kroopDrunk),
    members: arrayify(raw.members).map(normalizeCrewMember),
    influenceHistory: raw.influenceHistory && typeof raw.influenceHistory === "object" ? raw.influenceHistory : {},
    influence: { ...base.influence, ...(raw.influence ?? {}), helperUuid: String(raw.influence?.helperUuid ?? ""), dc: Math.max(0, Math.floor(n(raw.influence?.dc, 15))), manualModifier: n(raw.influence?.manualModifier, 0) },
    stealth: { ...base.stealth, ...(raw.stealth ?? {}), dc: Math.max(0, Math.floor(n(raw.stealth?.dc, 15))), manualModifier: n(raw.stealth?.manualModifier, 0) },
    punishment: { ...base.punishment, ...(raw.punishment ?? {}), count: Math.max(1, Math.floor(n(raw.punishment?.count, 1))), attackBonus: n(raw.punishment?.attackBonus, 0), targetAc: n(raw.punishment?.targetAc, 10), hours: Math.max(1, Math.floor(n(raw.punishment?.hours, 12))) }
  };
}

export function getLifeData(ship) { return normalizeLifeData(ship.getFlag(MODULE_ID, LIFE_FLAG) ?? {}); }
export async function setLifeData(ship, data) { const normalized = normalizeLifeData(data); await ship.setFlag(MODULE_ID, LIFE_FLAG, normalized); return normalized; }
export function getTaskById(id) { for (const list of Object.values(TASKS)) { const found = list.find(t=>t.id===id); if (found) return found; } return null; }
export function getTaskByRoll(role, roll) { return (TASKS[role] ?? []).find(t => t.cookRange ? t.cookRange.includes(Number(roll)) : Number(t.roll) === Number(roll)) ?? null; }

export function actorByUuid(uuid) { if (!uuid) return null; try { return fromUuidSync(uuid) ?? null; } catch { return null; } }
export function listCrewActors() {
  return game.actors.filter(a => ["character","npc"].includes(a.type) && a.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED)).sort((a,b)=>a.name.localeCompare(b.name, game.i18n.lang));
}
export function abilityMod(actor, ability) { return n(actor?.system?.abilities?.[ability]?.mod ?? actor?.system?.abilities?.[ability]?.totalMod, 0); }
export function saveMod(actor, save) {
  const s = actor?.system?.attributes?.savingThrows?.[save] ?? actor?.system?.attributes?.saves?.[save] ?? {};
  return n(s.total ?? s.mod ?? s.value, 0);
}
export function listActorSkills(actor) {
  if (!actor) return [];
  const ids = actor.allSkills ? [...actor.allSkills] : Object.keys(actor.system?.skills ?? {});
  const out = [];
  for (const id of ids) {
    try {
      const sk = actor.getSkillInfo ? actor.getSkillInfo(id) : actor.system?.skills?.[id];
      const name = String(sk?.fullName ?? sk?.name ?? sk?.label ?? id);
      const mod = n(sk?.mod ?? sk?.total ?? sk?.value, 0);
      out.push({ id, name, mod });
    } catch { /* ignore */ }
  }
  return out.sort((a,b)=>a.name.localeCompare(b.name, game.i18n.lang));
}
export function findSkill(actor, patterns = []) {
  const skills = listActorSkills(actor);
  for (const re of patterns) { const found = skills.find(s=>re.test(s.name)); if (found) return found; }
  return null;
}
export function resolveAlternative(actor, alt) {
  if (alt.type === "ability") return { label: alt.label, mod: abilityMod(actor, alt.ability), source: alt.ability };
  const sk = findSkill(actor, alt.patterns ?? []);
  if (sk) return { label: sk.name, mod: sk.mod, source: sk.id };
  if (alt.ability) return { label: `${alt.label} (caractéristique)`, mod: abilityMod(actor, alt.ability), source: alt.ability };
  return { label: alt.label, mod: 0, source: "" };
}
export function bestAlternative(actor, alternatives = []) {
  return alternatives.map(a=>resolveAlternative(actor,a)).sort((a,b)=>b.mod-a.mod)[0] ?? { label:"Test", mod:0, source:"" };
}
export function getUnderstaffedTaskDcBonus(ship, life) {
  if (!life.absintheMode) return 0;
  const crew = n(ship.system?.crew?.value, 0);
  return crew < n(life.absintheCrewThreshold, 20) ? 2 : 0;
}
export function getTaskModifier(member) {
  return n(member.manualTaskModifier, 0) + n(DAY_ACTIONS[member.dayAction]?.taskMod, 0) + (member.friendlyHelp ? 2 : 0);
}
