import { MODULE_ID } from "./ship-data.mjs";
import { findSkill } from "./life-data.mjs";

export const HAZARDS_FLAG = "hazards";

export const WEATHER_TYPES = Object.freeze({
  normal: { label: "Normal", min: 1, max: 55, dangerModifier: null, frequency: "—" },
  precipitation: { label: "Précipitations", min: 56, max: 65, dangerModifier: null, frequency: "—" },
  depression: { label: "Dépression tropicale", min: 66, max: 80, dangerModifier: -10, frequency: "1 / heure" },
  tropicalStorm: { label: "Tempête tropicale", min: 81, max: 93, dangerModifier: 0, frequency: "1 / heure" },
  severeStorm: { label: "Tempête tropicale sévère", min: 94, max: 97, dangerModifier: 10, frequency: "1 / 10 minutes" },
  hurricane: { label: "Ouragan", min: 98, max: 99, dangerModifier: 15, frequency: "1 / minute" },
  tornado: { label: "Tornade", min: 100, max: Infinity, dangerModifier: 15, frequency: "1 / round" }
});

export const EYE_MODIFIERS = Object.freeze({
  none: { label: "À plus de 500 km", modifier: 0 },
  "500": { label: "Dans un rayon de 500 km", modifier: 4 },
  "400": { label: "Dans un rayon de 400 km", modifier: 8 },
  "300": { label: "Dans un rayon de 300 km", modifier: 12 },
  "200": { label: "Dans un rayon de 200 km", modifier: 36 },
  "100": { label: "Dans un rayon de 100 km", modifier: 60 }
});

export const STORM_DANGERS = Object.freeze([
  { min: -Infinity, max: 20, key: "none", label: "Pas de danger" },
  { min: 21, max: 35, key: "slipperyDeck", label: "Pont glissant" },
  { min: 36, max: 40, key: "anchorDrift", label: "Ancre à la dérive" },
  { min: 41, max: 45, key: "jammedRudder", label: "Gouvernail bloqué" },
  { min: 46, max: 55, key: "violentWave", label: "Vague violente" },
  { min: 56, max: 60, key: "looseRope", label: "Cordage détaché" },
  { min: 61, max: 65, key: "windAgainstTide", label: "Le vent contre la marée" },
  { min: 66, max: 68, key: "tornSail", label: "Voile arrachée" },
  { min: 69, max: 71, key: "looseCargo", label: "Cargaison détachée" },
  { min: 72, max: 74, key: "manOverboard", label: "Homme à la mer" },
  { min: 75, max: 77, key: "damagedSupplies", label: "Provisions endommagées" },
  { min: 78, max: 80, key: "leak", label: "Voie d’eau" },
  { min: 81, max: 83, key: "lifeboatLost", label: "Canot emporté" },
  { min: 84, max: 86, key: "lightning", label: "Foudre" },
  { min: 87, max: 88, key: "brokenMast", label: "Mât brisé" },
  { min: 89, max: 90, key: "heel", label: "Navire couché sur le flanc" },
  { min: 91, max: 92, key: "bowSwamped", label: "Vague par la proue" },
  { min: 93, max: 94, key: "sternSwamped", label: "Vague par la poupe" },
  { min: 95, max: 99, key: "twoDangers", label: "Deux dangers simultanés" },
  { min: 100, max: Infinity, key: "majorBreach", label: "Importante voie d’eau" }
]);

export const REGATTA_STAGES = Object.freeze({
  D: {
    key: "D", name: "Départ", navDc: 25, navMax: 2,
    note: "Deux tests de navigation DD 25 pour sortir du peloton. Un échec de 5 ou plus provoque un accident d’éperonnage et retire 1 au score."
  },
  E: {
    key: "E", name: "Linceuls ensablés", navDc: 25, navMax: 3,
    note: "Quatre tests de Survie DD 25 (ou Perception avec éclaireur approprié) puis jusqu’à trois tests de navigation DD 25. Contourner l’étape : −5 au score."
  },
  F: {
    key: "F", name: "Récifs éventreurs", navDc: 25, navMax: 3,
    note: "Choix d’itinéraire Géographie DD 20, récifs non répertoriés, puis trois tests de navigation DD 25. Contourner tous les récifs : −7."
  },
  G: {
    key: "G", name: "Courant de Gozreh", navDc: 20, navMax: 3,
    note: "Trois tests Nature DD 25 ou Survie DD 30 : −1 par échec. Puis trois tests de navigation DD 20."
  },
  H: {
    key: "H", name: "Éclats d’Iris", navDc: 25, navMax: 2,
    note: "Le franchissement de l’Iris demande trois tests de navigation DD 25 ; deux tests de navigation DD 25 supplémentaires servent à améliorer le score."
  },
  I: {
    key: "I", name: "Au cœur de l’ouragan", navDc: 0, navMax: 5,
    note: "Le DD des tests de navigation au cœur de l’ouragan n’est pas chiffré dans le passage reproduit : saisis-le manuellement. En contournant l’ouragan, le DD est 20 et le score subit −10."
  },
  J: {
    key: "J", name: "Récif peau de requin / Atoll du pinacle", navDc: 25, navMax: 2,
    note: "Traversée complète : quatre tests de navigation DD 30, 8d8 dégâts par échec. Puis jusqu’à deux tests de navigation DD 25 pour le score."
  },
  K: {
    key: "K", name: "L’orage", navDc: 0, navMax: 0,
    note: "Rencontre spéciale de l’aventure. Le module n’invente pas de test de score qui n’est pas donné dans le texte."
  },
  L: {
    key: "L", name: "Dernière ligne droite", navDc: 20, navMax: 2,
    note: "Chaque round où le navire reste incontrôlé : −1 au score. Jusqu’à deux tests de navigation DD 20."
  },
  M: {
    key: "M", name: "Ligne d’arrivée", navDc: 0, navMax: 0,
    note: "Résultat final selon le score : ≤0, 1–10, ou 11+."
  }
});

export function defaultHazardsData() {
  return {
    weather: {
      eyeBand: "none",
      characterUuid: "",
      skillMode: "sailor",
      manualSkillModifier: 0,
      currentType: "normal",
      currentDetail: "",
      lastRaw: 0,
      lastEyeModifier: 0,
      lastSkillTotal: 0,
      lastFinal: 0
    },
    active: {
      rudderJammed: false,
      speedHalved: false,
      speedHalvedUntil: 0,
      grounded: false,
      majorBreach: false,
      anchored: false
    },
    reef: {
      observerUuid: "",
      manualPerceptionModifier: 0,
      currentIndex: 1,
      remaining: 5,
      lastPerceptionTotal: 0,
      lastSpotDistanceM: 0,
      manualAvoidDc: 0,
      averageSpeedM: 27,
      speedScoreApplied: false
    },
    regatta: {
      active: false,
      score: 0,
      stage: "D",
      navDcOverride: 0,
      navigationManualModifier: 0,
      aidCount: 0,
      goodWindsChart: false,
      jalhazarRudder: false,
      navChecksUsed: 0,
      skillActorUuid: "",
      skillMode: "survival",
      skillManualModifier: 0,
      skillDc: 25,
      skillFailPenalty: 1,
      skillSeverePenalty: 0,
      history: []
    }
  };
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeHazardsData(raw = {}) {
  const base = defaultHazardsData();
  const merged = foundry.utils.mergeObject(base, foundry.utils.deepClone(raw ?? {}), { inplace: false, insertKeys: true, overwrite: true });
  merged.weather.eyeBand = EYE_MODIFIERS[merged.weather.eyeBand] ? merged.weather.eyeBand : "none";
  merged.weather.characterUuid = String(merged.weather.characterUuid ?? "");
  merged.weather.skillMode = ["sailor", "survival"].includes(merged.weather.skillMode) ? merged.weather.skillMode : "sailor";
  merged.weather.manualSkillModifier = Math.trunc(num(merged.weather.manualSkillModifier));
  merged.weather.currentType = WEATHER_TYPES[merged.weather.currentType] ? merged.weather.currentType : "normal";
  merged.weather.currentDetail = String(merged.weather.currentDetail ?? "");
  for (const key of ["lastRaw", "lastEyeModifier", "lastSkillTotal", "lastFinal"]) merged.weather[key] = Math.trunc(num(merged.weather[key]));

  for (const key of ["rudderJammed", "speedHalved", "grounded", "majorBreach", "anchored"]) merged.active[key] = Boolean(merged.active[key]);
  merged.active.speedHalvedUntil = Math.max(0, num(merged.active.speedHalvedUntil));

  merged.reef.observerUuid = String(merged.reef.observerUuid ?? "");
  merged.reef.manualPerceptionModifier = Math.trunc(num(merged.reef.manualPerceptionModifier));
  merged.reef.currentIndex = Math.max(1, Math.trunc(num(merged.reef.currentIndex, 1)));
  merged.reef.remaining = Math.max(0, Math.trunc(num(merged.reef.remaining, 5)));
  merged.reef.lastPerceptionTotal = Math.trunc(num(merged.reef.lastPerceptionTotal));
  merged.reef.lastSpotDistanceM = Math.max(0, num(merged.reef.lastSpotDistanceM));
  merged.reef.manualAvoidDc = Math.max(0, Math.trunc(num(merged.reef.manualAvoidDc)));
  merged.reef.averageSpeedM = Math.max(0, num(merged.reef.averageSpeedM, 27));
  merged.reef.speedScoreApplied = Boolean(merged.reef.speedScoreApplied);

  merged.regatta.active = Boolean(merged.regatta.active);
  merged.regatta.score = Math.trunc(num(merged.regatta.score));
  merged.regatta.stage = REGATTA_STAGES[merged.regatta.stage] ? merged.regatta.stage : "D";
  merged.regatta.navDcOverride = Math.max(0, Math.trunc(num(merged.regatta.navDcOverride)));
  merged.regatta.navigationManualModifier = Math.trunc(num(merged.regatta.navigationManualModifier));
  merged.regatta.aidCount = Math.max(0, Math.min(3, Math.trunc(num(merged.regatta.aidCount))));
  merged.regatta.goodWindsChart = Boolean(merged.regatta.goodWindsChart);
  merged.regatta.jalhazarRudder = Boolean(merged.regatta.jalhazarRudder);
  merged.regatta.navChecksUsed = Math.max(0, Math.trunc(num(merged.regatta.navChecksUsed)));
  merged.regatta.skillActorUuid = String(merged.regatta.skillActorUuid ?? "");
  merged.regatta.skillMode = ["sailor", "survival", "nature", "geography", "local", "perception"].includes(merged.regatta.skillMode) ? merged.regatta.skillMode : "survival";
  merged.regatta.skillManualModifier = Math.trunc(num(merged.regatta.skillManualModifier));
  merged.regatta.skillDc = Math.max(0, Math.trunc(num(merged.regatta.skillDc, 25)));
  merged.regatta.skillFailPenalty = Math.max(0, Math.trunc(num(merged.regatta.skillFailPenalty, 1)));
  merged.regatta.skillSeverePenalty = Math.max(0, Math.trunc(num(merged.regatta.skillSeverePenalty)));
  merged.regatta.history = Array.isArray(merged.regatta.history) ? merged.regatta.history.slice(-50) : [];
  return merged;
}

export function getHazardsData(actor) {
  return normalizeHazardsData(actor?.getFlag(MODULE_ID, HAZARDS_FLAG) ?? {});
}

export async function setHazardsData(actor, data) {
  const normalized = normalizeHazardsData(data);
  await actor.setFlag(MODULE_ID, HAZARDS_FLAG, normalized);
  return normalized;
}

export function getWeatherByRoll(total) {
  const n = Number(total ?? 0);
  return Object.entries(WEATHER_TYPES).find(([, w]) => n >= w.min && n <= w.max)?.[0] ?? "tornado";
}

export function getStormDanger(total) {
  const n = Number(total ?? 0);
  return STORM_DANGERS.find((d) => n >= d.min && n <= d.max) ?? STORM_DANGERS[STORM_DANGERS.length - 1];
}

export function getRegattaStage(data) {
  return REGATTA_STAGES[data?.regatta?.stage] ?? REGATTA_STAGES.D;
}

export function raceScoreDelta(total, dc) {
  const diff = Number(total ?? 0) - Number(dc ?? 0);
  if (diff >= 5) return Math.floor(diff / 5);
  if (diff <= -5) return -Math.floor(Math.abs(diff) / 5);
  return 0;
}

export function getRaceOutcome(score) {
  const s = Number(score ?? 0);
  if (s <= 0) return { key: "behind", label: "Course non remportée directement", xp: 4800, infamy: 1, disrepute: 1 };
  if (s <= 10) return { key: "narrow", label: "Victoire de justesse", xp: 9600, infamy: 2, disrepute: 2 };
  return { key: "decisive", label: "Victoire haut la main", xp: 19200, infamy: 4, disrepute: 4 };
}

export function resolveWeatherSkill(actor, hazards) {
  if (!actor) return { actor: null, label: hazards.weather.skillMode === "survival" ? "Survie" : "Profession (marin)", mod: Number(hazards.weather.manualSkillModifier ?? 0) };
  const skill = hazards.weather.skillMode === "survival"
    ? findSkill(actor, [/survie/i, /survival/i])
    : findSkill(actor, [/profession.*marin/i, /marin/i, /sailor/i]);
  return {
    actor,
    label: skill?.name ?? (hazards.weather.skillMode === "survival" ? "Survie" : "Profession (marin)"),
    mod: Number(skill?.mod ?? hazards.weather.manualSkillModifier ?? 0),
    found: Boolean(skill)
  };
}

export function resolvePerceptionSkill(actor, hazards) {
  const skill = actor ? findSkill(actor, [/perception/i]) : null;
  return {
    actor,
    label: skill?.name ?? "Perception",
    mod: Number(skill?.mod ?? hazards.reef.manualPerceptionModifier ?? 0),
    found: Boolean(skill)
  };
}
