import {
  MODULE_ID,
  getSSShipData,
  deriveShipState,
  getNavigationBreakdown,
  getTurnPenalty
} from "./ship-data.mjs";
import { listCrewActors, findSkill } from "./life-data.mjs";
import { applyComponentDamage } from "./ship-damage.mjs";
import {
  WEATHER_TYPES,
  EYE_MODIFIERS,
  REGATTA_STAGES,
  getHazardsData,
  setHazardsData,
  normalizeHazardsData,
  getWeatherByRoll,
  getStormDanger,
  getRegattaStage,
  raceScoreDelta,
  getRaceOutcome,
  resolveWeatherSkill,
  resolvePerceptionSkill
} from "./hazards-data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const esc = foundry.utils.escapeHTML;

function actorByUuid(uuid) {
  if (!uuid) return null;
  try { return fromUuidSync(uuid) ?? null; } catch { return null; }
}

function signed(n) {
  const value = Number(n ?? 0);
  return `${value >= 0 ? "+" : ""}${value}`;
}

function speedFeetToMeters(feet) {
  // Pathfinder VF assimile 30 ft à 9 m : 1 ft = 0,3 m pour ces règles tactiques.
  return Math.max(0, Number(feet ?? 0)) * 0.3;
}

async function post(actor, title, body, icon = "fa-triangle-exclamation") {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid ${icon}"></i> ${esc(title)}</h3>${body}</div>`
  });
}

async function evalRoll(formula) {
  return new Roll(formula).evaluate();
}

function skillForMode(actor, mode, manual = 0) {
  const patterns = {
    sailor: [/profession.*marin/i, /marin/i, /sailor/i],
    survival: [/survie/i, /survival/i],
    nature: [/connaissances.*nature/i, /knowledge.*nature/i, /^nature$/i],
    geography: [/g[eé]ographie/i, /geography/i],
    local: [/folklore.*local/i, /knowledge.*local/i, /local/i],
    perception: [/perception/i]
  };
  const skill = actor ? findSkill(actor, patterns[mode] ?? []) : null;
  const labels = { sailor: "Profession (marin)", survival: "Survie", nature: "Connaissances (nature)", geography: "Connaissances (géographie)", local: "Connaissances (folklore local)", perception: "Perception" };
  return { label: skill?.name ?? labels[mode] ?? "Test", mod: Number(skill?.mod ?? manual ?? 0), found: Boolean(skill) };
}

function stormEffectText(key, detail = {}) {
  switch (key) {
    case "none": return "<p>L’équipage évite tout danger.</p>";
    case "slipperyDeck": return `<p>Le pont est glissant pendant <strong>${detail.rounds ?? "1d4"} round(s)</strong>. Acrobaties DD 10 pour se déplacer sans tomber à terre.</p>`;
    case "anchorDrift": return "<p>Si le navire est ancré, il dérive de 30 m dans une direction aléatoire en 1 round et n’est plus considéré comme ancré. Sinon, traitez ce résultat comme <em>Pont glissant</em>.</p>";
    case "jammedRudder": return "<p>Le gouvernail est bloqué : <strong>−10 aux tests de Profession (marin)</strong> jusqu’à un test d’Artisanat (constructions en bois) DD 15 ou une solution magique équivalente.</p>";
    case "violentWave": return "<p>Toutes les créatures sur le pont : Réflexes DD 15 ou à terre.</p>";
    case "looseRope": return "<p>Une ligne aléatoire de 6 m sur le pont est fouettée par un cordage : Réflexes DD 13 ou <strong>2d6 dégâts non létaux</strong>.</p>";
    case "windAgainstTide": return "<p>La vitesse du navire est réduite de moitié pendant <strong>1 heure</strong>.</p>";
    case "tornSail": return "<p>Une voile est arrachée. Si les voiles étaient baissées ou arrisées, utilisez à la place <em>Cordage détaché</em>. La table ne donne pas ici une quantité universelle de PV à retirer : l’avarie reste à appliquer selon la voilure concernée.</p>";
    case "looseCargo": return "<p>Une cargaison se détache : les créatures dans une zone aléatoire de 6 m subissent <strong>3d6 dégâts</strong>, Réflexes DD 15 pour moitié.</p>";
    case "manOverboard": return "<p><strong>1d3 créatures</strong> proches du bord risquent de passer par-dessus bord ; appliquez les jets de Réflexes indiqués par la table.</p>";
    case "damagedSupplies": return `<p><strong>${detail.weeks ?? "1d4"} semaine(s)</strong> de provisions ou une quantité équivalente de butin est endommagée, selon le résultat choisi par le MJ.</p>`;
    case "leak": return "<p>Une petite voie d’eau apparaît dans la coque. Sa localisation et sa réparation restent à gérer sur la scène du navire.</p>";
    case "lifeboatLost": return "<p>Un canot de sauvetage est emporté par la tempête.</p>";
    case "lightning": return `<p>La foudre frappe ${detail.targetText ?? "une cible déterminée par la table"}. Les effets sur les créatures sont gérés avec les règles PF1 ; le module n’invente pas de dégâts de coque lorsque le passage ne les chiffre pas.</p>`;
    case "brokenMast": return `<p>Un mât se brise et tombe à la mer. Si le gréement n’est pas coupé à temps, il risque de percer la coque après <strong>${detail.rounds ?? "2d6"} round(s)</strong>.</p>`;
    case "heel": return `<p>Le navire se couche sur le flanc puis se redresse après <strong>${detail.rounds ?? "1d4"} round(s)</strong>. Les créatures et objets non arrimés risquent de passer par-dessus bord.</p>`;
    case "bowSwamped": return "<p>Une masse d’eau balaie le pont depuis la proue. Résolvez la bousculade indiquée par la table contre les occupants du pont.</p>";
    case "sternSwamped": return "<p>Une masse d’eau balaie le pont depuis la poupe. Résolvez la bousculade indiquée par la table ; les victimes sont prises au dépourvu contre cet effet.</p>";
    case "majorBreach": return "<p><strong>Importante voie d’eau :</strong> la coque est percée et le navire commence à couler. Le module marque cette avarie séparément ; elle n’est pas assimilée automatiquement à l’état S&amp;S « en plein naufrage » lié aux PV.</p>";
    default: return "<p>Consultez la table des Dangers des tempêtes pour résoudre cet effet.</p>";
  }
}

export class HazardsController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-hazards", "standard-form"],
    tag: "form",
    position: { width: 930, height: "auto" },
    window: { icon: "fa-solid fa-cloud-bolt", resizable: true },
    actions: {
      openDashboard: this.#openDashboard,
      rollWeather: this.#rollWeather,
      rollStormDanger: this.#rollStormDanger,
      clearRudderJam: this.#clearRudderJam,
      clearSpeedHalf: this.#clearSpeedHalf,
      toggleGrounded: this.#toggleGrounded,
      toggleAnchored: this.#toggleAnchored,
      clearMajorBreach: this.#clearMajorBreach,
      reefSpot: this.#reefSpot,
      reefAvoid: this.#reefAvoid,
      reefImpact: this.#reefImpact,
      reefSpeedScore: this.#reefSpeedScore,
      reefBypass: this.#reefBypass,
      reefReset: this.#reefReset,
      startRegatta: this.#startRegatta,
      resetRegatta: this.#resetRegatta,
      setStage: this.#setStage,
      regattaNav: this.#regattaNav,
      regattaSkill: this.#regattaSkill,
      adjustScore: this.#adjustScore,
      atollCrossing: this.#atollCrossing,
      hurricaneLightning: this.#hurricaneLightning,
      uncontrolledPenalty: this.#uncontrolledPenalty,
      finishRegatta: this.#finishRegatta
    },
    form: { handler: this.#onSubmit, closeOnSubmit: false }
  };

  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/hazards-controller.hbs` } };

  constructor(actor, options = {}) {
    super({
      id: `pf1-ss-hazards-${actor.id}`,
      ...options,
      window: { ...(options.window ?? {}), title: `Dangers & Régate — ${actor.name}` }
    });
    this.actor = actor;
  }

  static open(actor) {
    if (!actor || actor.type !== "vehicle") {
      ui.notifications.warn("Skull & Shackles : sélectionne un token lié à un Vehicle PF1.");
      return null;
    }
    const app = new HazardsController(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const hazards = getHazardsData(this.actor);
    const ss = getSSShipData(this.actor);
    const shipState = deriveShipState(this.actor, ss);
    const crew = listCrewActors();
    const weatherActor = actorByUuid(hazards.weather.characterUuid);
    const weatherSkill = resolveWeatherSkill(weatherActor, hazards);
    const observer = actorByUuid(hazards.reef.observerUuid);
    const perception = resolvePerceptionSkill(observer, hazards);
    const stage = getRegattaStage(hazards);
    const weather = WEATHER_TYPES[hazards.weather.currentType];
    const outcome = getRaceOutcome(hazards.regatta.score);
    const speedM = speedFeetToMeters(shipState.speedCurrent);
    const reefDistance = hazards.reef.lastSpotDistanceM;
    let reefSuggestedDc = 20;
    let reefAuto = false;
    let reefBandNote = "";
    if (reefDistance > 4 * speedM && speedM > 0) {
      reefAuto = true;
      reefSuggestedDc = 0;
      reefBandNote = "Récif repéré à plus de quatre fois la vitesse : évitement automatique.";
    } else if (reefDistance >= 2 * speedM && speedM > 0) {
      reefSuggestedDc = 5;
      reefBandNote = "Récif repéré entre deux et quatre fois la vitesse : DD de base 5.";
    } else {
      reefSuggestedDc = 20;
      reefBandNote = "Le texte donne DD 20 lorsque le récif est repéré à une distance égale à la vitesse. Pour une distance intermédiaire non explicitée, le DD reste modifiable ci-dessous.";
    }

    return {
      ...context,
      actor: this.actor,
      hazards,
      shipState,
      weather,
      weatherSkill,
      observer,
      perception,
      stage,
      outcome,
      currentSpeedM: Math.round(speedM * 10) / 10,
      reefSuggestedDc,
      reefAuto,
      reefBandNote,
      eyeChoices: Object.entries(EYE_MODIFIERS).map(([key, d]) => ({ key, ...d, selected: key === hazards.weather.eyeBand })),
      weatherChoices: Object.entries(WEATHER_TYPES).map(([key, d]) => ({ key, ...d, selected: key === hazards.weather.currentType })),
      weatherSkillChoices: [
        { key: "sailor", label: "Profession (marin)" },
        { key: "survival", label: "Survie" }
      ].map((x) => ({ ...x, selected: x.key === hazards.weather.skillMode })),
      regattaSkillChoices: [
        { key: "survival", label: "Survie" },
        { key: "nature", label: "Connaissances (nature)" },
        { key: "geography", label: "Connaissances (géographie)" },
        { key: "local", label: "Connaissances (folklore local)" },
        { key: "perception", label: "Perception" },
        { key: "sailor", label: "Profession (marin)" }
      ].map((x) => ({ ...x, selected: x.key === hazards.regatta.skillMode })),
      crewChoices: crew.map((a) => ({ uuid: a.uuid, name: a.name, weatherSelected: a.uuid === hazards.weather.characterUuid, observerSelected: a.uuid === hazards.reef.observerUuid, raceSelected: a.uuid === hazards.regatta.skillActorUuid })),
      stageChoices: Object.values(REGATTA_STAGES).map((s) => ({ ...s, selected: s.key === hazards.regatta.stage })),
      dangerAvailable: weather?.dangerModifier !== null,
      dangerModifierDisplay: weather?.dangerModifier == null ? "—" : signed(weather.dangerModifier),
      regattaDc: Number(hazards.regatta.navDcOverride || stage.navDc || 0),
      navChecksRemaining: Math.max(0, Number(stage.navMax ?? 0) - Number(hazards.regatta.navChecksUsed ?? 0)),
      regattaHistory: [...(hazards.regatta.history ?? [])].slice(-8).reverse(),
      activeLabels: {
        rudder: hazards.active.rudderJammed ? "Gouvernail bloqué" : "Libre",
        speed: hazards.active.speedHalved ? "Vitesse ÷2" : "Normale",
        grounded: hazards.active.grounded ? "Échoué" : "À flot",
        breach: hazards.active.majorBreach ? "Voie d’eau majeure" : "Aucune",
        anchored: hazards.active.anchored ? "Ancré" : "Non ancré"
      }
    };
  }

  static async #onSubmit(event, form, formData) {
    const obj = formData.object ?? formData.toObject?.() ?? Object.fromEntries(formData.entries());
    const raw = foundry.utils.expandObject(obj);
    const existing = getHazardsData(this.actor);
    const incoming = raw.hazards ?? {};
    incoming.regatta ??= {};
    incoming.regatta.history = existing.regatta.history;
    incoming.regatta.navChecksUsed = existing.regatta.navChecksUsed;
    incoming.regatta.active = existing.regatta.active;
    incoming.weather ??= {};
    incoming.weather.lastRaw = existing.weather.lastRaw;
    incoming.weather.lastEyeModifier = existing.weather.lastEyeModifier;
    incoming.weather.lastSkillTotal = existing.weather.lastSkillTotal;
    incoming.weather.lastFinal = existing.weather.lastFinal;
    incoming.active ??= existing.active;
    await setHazardsData(this.actor, normalizeHazardsData(foundry.utils.mergeObject(existing, incoming, { inplace: false, insertKeys: true, overwrite: true })));
    await this.render();
  }

  async #saveForm() {
    try { await this.submit(); } catch (error) { console.warn(`${MODULE_ID} | sauvegarde Dangers & Régate`, error); }
  }

  static async #openDashboard() { game.modules.get(MODULE_ID)?.api?.openDashboard?.(this.actor); }

  static async #rollWeather() {
    await this.#saveForm();
    const h = getHazardsData(this.actor);
    const weatherActor = actorByUuid(h.weather.characterUuid);
    const skill = resolveWeatherSkill(weatherActor, h);
    const raw = await evalRoll("1d100");
    const eye = EYE_MODIFIERS[h.weather.eyeBand]?.modifier ?? 0;
    const skillRoll = await evalRoll(`1d20 + ${Number(skill.mod ?? 0)}`);
    const final = Number(raw.total) + eye - Number(skillRoll.total);
    const weatherKey = getWeatherByRoll(final);
    let detail = "";
    if (weatherKey === "precipitation") {
      const p = await evalRoll("1d100");
      detail = Number(p.total) <= 40 ? "Brouillard" : "Pluie";
    }
    h.weather.currentType = weatherKey;
    h.weather.currentDetail = detail;
    h.weather.lastRaw = Number(raw.total);
    h.weather.lastEyeModifier = eye;
    h.weather.lastSkillTotal = Number(skillRoll.total);
    h.weather.lastFinal = Math.trunc(final);
    await setHazardsData(this.actor, h);
    const w = WEATHER_TYPES[weatherKey];
    await post(this.actor, `Météo des Chaînes — ${w.label}`, `<p>d100 : <strong>${raw.total}</strong> · proximité de l’Œil : <strong>${signed(eye)}</strong> · ${esc(skill.label)} : <strong>${skillRoll.total}</strong></p><p>Résultat final : <strong>${Math.trunc(final)}</strong>${detail ? ` · ${esc(detail)}` : ""}.</p>${w.dangerModifier == null ? "" : `<p>Dangers des tempêtes : <strong>${esc(w.frequency)}</strong>, modificateur ${signed(w.dangerModifier)}.</p>`}`, "fa-cloud-sun-rain");
    await this.render();
  }

  async #resolveOneStormDanger(skillTotal) {
    const h = getHazardsData(this.actor);
    const weather = WEATHER_TYPES[h.weather.currentType];
    const dangerMod = Number(weather?.dangerModifier ?? 0);
    const raw = await evalRoll("1d100");
    const final = Number(raw.total) + dangerMod - Number(skillTotal);
    const danger = getStormDanger(final);
    const detail = {};
    if (danger.key === "slipperyDeck" || danger.key === "heel") detail.rounds = Number((await evalRoll("1d4")).total);
    if (danger.key === "damagedSupplies") detail.weeks = Number((await evalRoll("1d4")).total);
    if (danger.key === "brokenMast") detail.rounds = Number((await evalRoll("2d6")).total);
    if (danger.key === "lightning") {
      const target = await evalRoll("1d100");
      detail.targetText = Number(target.total) <= 60 ? "le navire" : "le personnage le plus haut placé";
    }
    if (danger.key === "jammedRudder") h.active.rudderJammed = true;
    if (danger.key === "windAgainstTide") {
      h.active.speedHalved = true;
      h.active.speedHalvedUntil = Number(game.time?.worldTime ?? 0) + 3600;
    }
    if (danger.key === "anchorDrift" && h.active.anchored) h.active.anchored = false;
    if (danger.key === "majorBreach") h.active.majorBreach = true;
    await setHazardsData(this.actor, h);
    await post(this.actor, `Danger des tempêtes — ${danger.label}`, `<p>d100 ${raw.total} ${signed(dangerMod)} (météo) − ${skillTotal} (navigation) = <strong>${Math.trunc(final)}</strong>.</p>${stormEffectText(danger.key, detail)}`, "fa-cloud-bolt");
    return danger;
  }

  static async #rollStormDanger() {
    await this.#saveForm();
    const h = getHazardsData(this.actor);
    const weather = WEATHER_TYPES[h.weather.currentType];
    if (weather?.dangerModifier == null) {
      ui.notifications.warn("La météo actuelle ne prévoit pas de jet dans la table des Dangers des tempêtes.");
      return;
    }
    const weatherActor = actorByUuid(h.weather.characterUuid);
    const skill = resolveWeatherSkill(weatherActor, h);
    const skillRoll = await evalRoll(`1d20 + ${Number(skill.mod ?? 0)}`);
    const danger = await this.#resolveOneStormDanger(Number(skillRoll.total));
    if (danger.key === "twoDangers") {
      await post(this.actor, "Deux dangers simultanés", `<p>Le résultat 95–99 demande deux dangers. Le module les résout ci-dessous en réutilisant le test de ${esc(skill.label)} déjà effectué : <strong>${skillRoll.total}</strong>.</p>`, "fa-triangle-exclamation");
      const first = await this.#resolveOneStormDanger(Number(skillRoll.total));
      const second = await this.#resolveOneStormDanger(Number(skillRoll.total));
      // Évite une récursion sans fin : si l’un des sous-jets donne encore 95–99, le chat indique ce résultat mais ne redouble pas automatiquement.
      if (first.key === "twoDangers" || second.key === "twoDangers") ui.notifications.warn("Un sous-jet a de nouveau donné « Deux dangers » : relance manuellement deux fois pour ce résultat.");
    }
    await this.render();
  }

  static async #clearRudderJam() { await this.#saveForm(); const h = getHazardsData(this.actor); h.active.rudderJammed = false; await setHazardsData(this.actor, h); await this.render(); }
  static async #clearSpeedHalf() { await this.#saveForm(); const h = getHazardsData(this.actor); h.active.speedHalved = false; h.active.speedHalvedUntil = 0; await setHazardsData(this.actor, h); await this.render(); }
  static async #toggleGrounded() { await this.#saveForm(); const h = getHazardsData(this.actor); h.active.grounded = !h.active.grounded; if (h.active.grounded) await this.actor.update({ "system.details.currentSpeed": 0 }); await setHazardsData(this.actor, h); await this.render(); }
  static async #toggleAnchored() { await this.#saveForm(); const h = getHazardsData(this.actor); h.active.anchored = !h.active.anchored; await setHazardsData(this.actor, h); await this.render(); }
  static async #clearMajorBreach() { await this.#saveForm(); const h = getHazardsData(this.actor); h.active.majorBreach = false; await setHazardsData(this.actor, h); await this.render(); }

  static async #reefSpot() {
    await this.#saveForm();
    const h = getHazardsData(this.actor);
    if (h.reef.remaining <= 0) { ui.notifications.info("Tous les récifs non répertoriés de cette série ont déjà été traités."); return; }
    const observer = actorByUuid(h.reef.observerUuid);
    const perception = resolvePerceptionSkill(observer, h);
    const roll = await evalRoll(`1d20 + ${Number(perception.mod ?? 0)}`);
    const total = Number(roll.total);
    const distanceM = Math.max(0, (total - 5) * 3);
    h.reef.lastPerceptionTotal = total;
    h.reef.lastSpotDistanceM = distanceM;
    await setHazardsData(this.actor, h);
    await post(this.actor, `Récif ${h.reef.currentIndex} — repérage`, `<p>${esc(observer?.name ?? "Observateur")} : ${esc(perception.label)} <strong>${total}</strong>.</p><p>Distance de repérage calculée : <strong>${Math.round(distanceM)} m</strong> (DD de base 5 +1 par tranche de 3 m).</p>`, "fa-binoculars");
    await this.render();
  }

  static async #reefAvoid() {
    await this.#saveForm();
    const h = getHazardsData(this.actor);
    const ss = getSSShipData(this.actor);
    const state = deriveShipState(this.actor, ss);
    const speedM = speedFeetToMeters(state.speedCurrent);
    const distance = Number(h.reef.lastSpotDistanceM ?? 0);
    if (!distance) { ui.notifications.warn("Repère d’abord le récif, ou utilise « récif non repéré »."); return; }
    if (speedM > 0 && distance > speedM * 4) {
      await post(this.actor, "Récif évité automatiquement", `<p>Le récif a été aperçu à ${Math.round(distance)} m, soit à plus de quatre fois la vitesse actuelle (${Math.round(speedM)} m). Aucun test de navigation n’est nécessaire.</p>`, "fa-check");
      h.reef.remaining = Math.max(0, h.reef.remaining - 1); h.reef.currentIndex += 1; h.reef.lastSpotDistanceM = 0; await setHazardsData(this.actor, h); await this.render(); return;
    }
    let dc = Number(h.reef.manualAvoidDc ?? 0);
    if (!dc) dc = speedM > 0 && distance >= speedM * 2 ? 5 : 20;
    const turnPenalty = getTurnPenalty(this.actor);
    const nav = getNavigationBreakdown(this.actor, ss, { extraModifier: turnPenalty, ignoreHeadToWind: true });
    if (nav.impossibleReason) { ui.notifications.warn(nav.impossibleReason); return; }
    const roll = await evalRoll(`1d20 + ${nav.totalModifier}`);
    const total = Number(roll.total);
    const failBy = dc - total;
    let consequence = "Récif évité.";
    if (total < dc) {
      if (failBy >= 5) {
        const dmg = await evalRoll("8d8");
        const result = await applyComponentDamage(this.actor, "structure", Number(dmg.total), { source: "Récif non répertorié" });
        h.active.grounded = true;
        await this.actor.update({ "system.details.currentSpeed": 0 });
        let scoreLoss = 0;
        if (h.regatta.active) { scoreLoss = Number((await evalRoll("1d4+1")).total); h.regatta.score -= scoreLoss; }
        consequence = `Échec de ${failBy} : ${dmg.total} dégâts bruts (${result.effective} après solidité), navire échoué${scoreLoss ? `, score de course −${scoreLoss}` : ""}.`;
      } else if (ss.combat?.ramEquipped) {
        consequence = "Échec de moins de 5, mais le navire possède un éperon : aucun dégât de raclement selon cette étape.";
      } else {
        const ram = await evalRoll(String(ss.ramDamage || "1d8"));
        const half = Math.floor(Number(ram.total) / 2);
        const result = await applyComponentDamage(this.actor, "structure", half, { source: "Récif — moitié des dégâts d’éperonnage" });
        consequence = `Échec de ${failBy} : moitié des dégâts d’éperonnage = ${half} bruts (${result.effective} après solidité).`;
      }
    }
    h.reef.remaining = Math.max(0, h.reef.remaining - 1); h.reef.currentIndex += 1; h.reef.lastSpotDistanceM = 0;
    await setHazardsData(this.actor, h);
    await post(this.actor, `Récif — navigation DD ${dc}`, `<p>Jet : <strong>${total}</strong> · malus de virage ${signed(turnPenalty)}.</p><p>${esc(consequence)}</p>`, total >= dc ? "fa-check" : "fa-triangle-exclamation");
    await this.render();
  }

  static async #reefImpact() {
    await this.#saveForm();
    const h = getHazardsData(this.actor);
    const dmg = await evalRoll("8d8");
    const result = await applyComponentDamage(this.actor, "structure", Number(dmg.total), { source: "Récif non repéré" });
    h.active.grounded = true;
    await this.actor.update({ "system.details.currentSpeed": 0 });
    let scoreLoss = 0;
    if (h.regatta.active) { scoreLoss = Number((await evalRoll("1d4+1")).total); h.regatta.score -= scoreLoss; }
    h.reef.remaining = Math.max(0, h.reef.remaining - 1); h.reef.currentIndex += 1; h.reef.lastSpotDistanceM = 0;
    await setHazardsData(this.actor, h);
    await post(this.actor, "Récif non repéré — impact", `<p><strong>${dmg.total}</strong> dégâts bruts, <strong>${result.effective}</strong> après solidité. Le navire s’échoue.${scoreLoss ? ` Score de course : <strong>−${scoreLoss}</strong>.` : ""}</p>`, "fa-triangle-exclamation");
    await this.render();
  }

  static async #reefSpeedScore() {
    await this.#saveForm();
    const h = getHazardsData(this.actor);
    if (!h.regatta.active) { ui.notifications.warn("Démarre la Régate pour appliquer ce modificateur au score."); return; }
    if (h.reef.speedScoreApplied) { ui.notifications.warn("Le modificateur de vitesse des Récifs éventreurs a déjà été appliqué."); return; }
    const delta = Math.round((Number(h.reef.averageSpeedM ?? 0) * 3) / 30) - 2;
    h.regatta.score += delta;
    h.reef.speedScoreApplied = true;
    h.regatta.history.push({ label: `Récifs — vitesse moyenne ${h.reef.averageSpeedM} m`, delta, score: h.regatta.score });
    await setHazardsData(this.actor, h);
    await post(this.actor, "Récifs éventreurs — vitesse moyenne", `<p>Arrondi((${h.reef.averageSpeedM} × 3) / 30) − 2 = <strong>${signed(delta)}</strong> au score de course.</p><p>Nouveau score : <strong>${h.regatta.score}</strong>.</p>`, "fa-gauge-high");
    await this.render();
  }

  static async #reefBypass() {
    await this.#saveForm(); const h = getHazardsData(this.actor);
    if (h.regatta.active) { h.regatta.score -= 7; h.regatta.history.push({ label: "Contournement des Récifs éventreurs", delta: -7, score: h.regatta.score }); }
    h.reef.remaining = 0; await setHazardsData(this.actor, h); await post(this.actor, "Récifs éventreurs contournés", `<p>Aucun danger des récifs n’est résolu.${h.regatta.active ? ` Score de course <strong>−7</strong> → ${h.regatta.score}.` : ""}</p>`, "fa-route"); await this.render();
  }

  static async #reefReset() { await this.#saveForm(); const h = getHazardsData(this.actor); h.reef.currentIndex = 1; h.reef.remaining = 5; h.reef.lastPerceptionTotal = 0; h.reef.lastSpotDistanceM = 0; h.reef.speedScoreApplied = false; await setHazardsData(this.actor, h); await this.render(); }

  static async #startRegatta() {
    await this.#saveForm(); const h = getHazardsData(this.actor);
    h.regatta.active = true; h.regatta.score = 0; h.regatta.stage = "D"; h.regatta.navChecksUsed = 0; h.regatta.history = [{ label: "Départ de la Régate", delta: 0, score: 0 }];
    h.reef.currentIndex = 1; h.reef.remaining = 5; h.reef.speedScoreApplied = false;
    await setHazardsData(this.actor, h); await post(this.actor, "Régate des Capitaines libres", "<p>Score de course initial : <strong>0</strong>. La course est active.</p>", "fa-flag-checkered"); await this.render();
  }

  static async #resetRegatta() { await this.#saveForm(); const h = getHazardsData(this.actor); h.regatta.active = false; h.regatta.score = 0; h.regatta.stage = "D"; h.regatta.navChecksUsed = 0; h.regatta.history = []; await setHazardsData(this.actor, h); await this.render(); }

  static async #setStage() {
    await this.#saveForm();
    const h = getHazardsData(this.actor);
    h.regatta.navChecksUsed = 0;
    const defaults = {
      D: { mode: "sailor", dc: 25, fail: 0, severe: 0 },
      E: { mode: "survival", dc: 25, fail: 1, severe: 2 },
      F: { mode: "geography", dc: 20, fail: 1, severe: 0 },
      G: { mode: "survival", dc: 30, fail: 1, severe: 0 },
      H: { mode: "sailor", dc: 25, fail: 0, severe: 0 },
      I: { mode: "sailor", dc: 25, fail: 3, severe: 0 },
      J: { mode: "sailor", dc: 30, fail: 0, severe: 0 },
      L: { mode: "sailor", dc: 20, fail: 0, severe: 0 }
    }[h.regatta.stage];
    if (defaults) {
      h.regatta.skillMode = defaults.mode;
      h.regatta.skillDc = defaults.dc;
      h.regatta.skillFailPenalty = defaults.fail;
      h.regatta.skillSeverePenalty = defaults.severe;
    }
    const stage = getRegattaStage(h);
    await setHazardsData(this.actor, h);
    await post(this.actor, `Régate — étape ${stage.key}`, `<p><strong>${esc(stage.name)}</strong></p><p>${esc(stage.note)}</p>`, "fa-flag");
    await this.render();
  }

  static async #regattaNav() {
    await this.#saveForm(); const h = getHazardsData(this.actor); if (!h.regatta.active) { ui.notifications.warn("Démarre d’abord la Régate."); return; }
    const stage = getRegattaStage(h); const dc = Number(h.regatta.navDcOverride || stage.navDc || 0); if (!dc) { ui.notifications.warn("Cette étape n’indique pas de DD de navigation automatique. Saisis un DD manuel si le texte de ta scène en fournit un."); return; }
    if (stage.navMax > 0 && h.regatta.navChecksUsed >= stage.navMax) { ui.notifications.warn(`Le nombre normal de tests de navigation de score pour l’étape ${stage.key} est déjà atteint.`); return; }
    let extra = Number(h.regatta.navigationManualModifier ?? 0) + (Number(h.regatta.aidCount ?? 0) * 2);
    if (stage.key === "D" && h.regatta.goodWindsChart) extra += 3;
    if (h.regatta.jalhazarRudder) extra += 5;
    const nav = getNavigationBreakdown(this.actor, getSSShipData(this.actor), { extraModifier: extra, ignoreHeadToWind: true });
    if (nav.impossibleReason) { ui.notifications.warn(nav.impossibleReason); return; }
    const roll = await evalRoll(`1d20 + ${nav.totalModifier}`); const total = Number(roll.total); const delta = raceScoreDelta(total, dc); h.regatta.score += delta; h.regatta.navChecksUsed += 1;
    h.regatta.history.push({ label: `Étape ${stage.key} — navigation ${total} vs DD ${dc}`, delta, score: h.regatta.score });
    let accident = "";
    if (stage.key === "D" && total <= dc - 5) {
      const d100 = Number((await evalRoll("1d100")).total); let rawDamage = 0; let kind = "";
      const ss = getSSShipData(this.actor);
      if (d100 <= 50) { kind = "Le navire des PJ en éperonne un autre"; if (!ss.combat?.ramEquipped) { const ram = await evalRoll(String(ss.ramDamage || "1d8")); rawDamage = Math.floor(Number(ram.total) / 2); } }
      else if (d100 <= 75) { kind = "Le navire des PJ est éperonné"; rawDamage = Number((await evalRoll("8d8")).total); }
      else { kind = "Collision particulièrement violente"; rawDamage = Number((await evalRoll("16d8")).total); }
      let applied = 0; if (rawDamage > 0) applied = (await applyComponentDamage(this.actor, "structure", rawDamage, { source: "Accident au départ de la Régate" })).effective;
      h.regatta.score -= 1; h.regatta.history.push({ label: `Accident au départ (${kind})`, delta: -1, score: h.regatta.score }); accident = `<p><strong>Échec de 5 ou plus :</strong> ${esc(kind)} (d100 ${d100}). ${rawDamage ? `${rawDamage} dégâts bruts / ${applied} après solidité.` : "Aucun dégât grâce à l’éperon."} Score supplémentaire : −1.</p>`;
    }
    await setHazardsData(this.actor, h); await post(this.actor, `Régate — navigation étape ${stage.key}`, `<p>Jet <strong>${total}</strong> contre DD <strong>${dc}</strong> : score ${signed(delta)}.</p>${accident}<p>Nouveau score : <strong>${h.regatta.score}</strong>.</p>`, "fa-flag-checkered"); await this.render();
  }

  static async #regattaSkill() {
    await this.#saveForm(); const h = getHazardsData(this.actor); if (!h.regatta.active) { ui.notifications.warn("Démarre d’abord la Régate."); return; }
    const actor = actorByUuid(h.regatta.skillActorUuid); const mode = String(h.regatta.skillMode ?? "survival"); const skill = skillForMode(actor, mode, Number(h.regatta.skillManualModifier ?? 0)); const dc = Math.max(0, Number(h.regatta.skillDc ?? 0)); if (!dc) { ui.notifications.warn("Indique un DD pour ce test d’étape."); return; }
    const stage = getRegattaStage(h);
    let extra = 0;
    if (stage.key === "F" && mode === "geography" && h.regatta.goodWindsChart) extra += 2;
    const roll = await evalRoll(`1d20 + ${skill.mod + extra}`); const total = Number(roll.total); const failPenalty = Math.max(0, Number(h.regatta.skillFailPenalty ?? 1)); const severePenalty = Math.max(0, Number(h.regatta.skillSeverePenalty ?? 0)); let delta = 0; if (total < dc) delta -= failPenalty; if (total <= dc - 5) delta -= severePenalty;
    let special = "";
    if (stage.key === "F" && mode === "geography" && total >= dc) {
      const removed = Math.min(h.reef.remaining, Math.floor((total - dc) / 5));
      if (removed > 0) { h.reef.remaining -= removed; special = `<p>Résultat supérieur : <strong>${removed}</strong> récif(s) non répertorié(s) retiré(s) de l’étape.</p>`; }
    }
    h.regatta.score += delta; h.regatta.history.push({ label: `${actor?.name ?? "PJ"} — ${skill.label} ${total} vs DD ${dc}`, delta, score: h.regatta.score }); await setHazardsData(this.actor, h); await post(this.actor, "Régate — test d’étape", `<p>${esc(actor?.name ?? "Personnage")} · ${esc(skill.label)} : <strong>${total}</strong> contre DD ${dc}${extra ? ` (bonus spécial ${signed(extra)})` : ""}.</p><p>Variation du score : <strong>${signed(delta)}</strong> → ${h.regatta.score}.</p>${special}`, total >= dc ? "fa-check" : "fa-triangle-exclamation"); await this.render();
  }

  static async #adjustScore(event, target) {
    await this.#saveForm(); const amount = Number(target?.dataset?.amount ?? event?.target?.closest?.("[data-amount]")?.dataset?.amount ?? 0); const h = getHazardsData(this.actor); if (!h.regatta.active) { ui.notifications.warn("Démarre d’abord la Régate."); return; } h.regatta.score += amount; h.regatta.history.push({ label: "Ajustement manuel", delta: amount, score: h.regatta.score }); await setHazardsData(this.actor, h); await this.render();
  }

  static async #atollCrossing() {
    await this.#saveForm(); const h = getHazardsData(this.actor); const nav = getNavigationBreakdown(this.actor, getSSShipData(this.actor), { extraModifier: Number(h.regatta.navigationManualModifier ?? 0), ignoreHeadToWind: true }); if (nav.impossibleReason) { ui.notifications.warn(nav.impossibleReason); return; } const roll = await evalRoll(`1d20 + ${nav.totalModifier}`); const total = Number(roll.total); let text = `<p>Navigation : <strong>${total}</strong> contre DD 30.</p>`; if (total < 30) { const dmg = await evalRoll("8d8"); const result = await applyComponentDamage(this.actor, "structure", Number(dmg.total), { source: "Récif peau de requin" }); text += `<p>Échec : <strong>${dmg.total}</strong> dégâts bruts, ${result.effective} après solidité.</p>`; } else text += "<p>Le navire franchit ce passage sans heurter l’écueil.</p>"; await post(this.actor, "Atoll du pinacle — passage DD 30", text, total >= 30 ? "fa-check" : "fa-triangle-exclamation"); await this.render();
  }

  static async #hurricaneLightning() {
    await this.#saveForm(); const dmg = await evalRoll("10d8"); const result = await applyComponentDamage(this.actor, "sails", Number(dmg.total), { damageType: "physical", source: "Foudre — cœur de l’ouragan" }); await post(this.actor, "Au cœur de l’ouragan — foudre", `<p>La foudre frappe les voiles : <strong>${dmg.total}</strong> dégâts d’électricité, ${result.effective} appliqués après solidité.</p><p>Voiles : ${result.after} / ${result.beforeState.sailsMax}.${result.afterState.sailsBroken ? " <strong>Les voiles sont brisées.</strong>" : ""}</p>`, "fa-bolt"); await this.render();
  }

  static async #uncontrolledPenalty() {
    await this.#saveForm(); const h = getHazardsData(this.actor); if (!h.regatta.active) { ui.notifications.warn("Démarre d’abord la Régate."); return; } h.regatta.score -= 1; h.regatta.history.push({ label: "Dernière ligne droite — round incontrôlé", delta: -1, score: h.regatta.score }); await setHazardsData(this.actor, h); await post(this.actor, "Régate — navire incontrôlé", `<p>Le navire reste incontrôlé pendant un round : <strong>−1</strong> au score. Nouveau score : ${h.regatta.score}.</p>`, "fa-arrow-down"); await this.render();
  }

  static async #finishRegatta() {
    await this.#saveForm(); const h = getHazardsData(this.actor); const out = getRaceOutcome(h.regatta.score); await post(this.actor, "Régate — résultat final", `<p>Score de course : <strong>${h.regatta.score}</strong>.</p><p><strong>${esc(out.label)}</strong></p><p>Récompense d’histoire indiquée par l’aventure : ${out.xp.toLocaleString("fr-FR")} PX, +${out.infamy} Infamie et +${out.disrepute} Déshonneur.</p>`, "fa-trophy");
  }
}
