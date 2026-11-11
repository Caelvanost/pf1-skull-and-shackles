import {
  MODULE_ID,
  getSSShipData,
  deriveShipState,
  getNavigationBreakdown,
  getDriverData
} from "./ship-data.mjs";
import { getShipProfile } from "./library-data.mjs";
import {
  SEA_ENCOUNTER_TIERS,
  getVoyageData,
  setVoyageData,
  normalizeVoyageData,
  getLongDistancePreset,
  deriveTravel,
  getSeaEncounter,
  getSeaEncounterTable
} from "./voyage-data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const esc = foundry.utils.escapeHTML;

function signed(value) {
  const n = Number(value ?? 0);
  return `${n >= 0 ? "+" : ""}${n}`;
}

function fmt(value, digits = 1) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(game?.i18n?.lang ?? "fr-FR", { maximumFractionDigits: digits }).format(n);
}

function actorByUuid(uuid) {
  if (!uuid) return null;
  try { return fromUuidSync(uuid) ?? null; } catch { return null; }
}

function selectedTargetVehicle() {
  const targets = [...(game.user?.targets ?? [])].filter((token) => token.actor?.type === "vehicle");
  return targets.length === 1 ? targets[0].actor : null;
}

async function post(actor, title, body, rolls = [], icon = "fa-route") {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid ${icon}"></i> ${esc(title)}</h3>${body}</div>`,
    rolls: rolls.map((roll) => JSON.stringify(roll.toJSON()))
  });
}

async function evaluate(formula) {
  return new Roll(formula).evaluate();
}

async function rollEncounterQuantity(text) {
  const match = String(text ?? "").match(/^(\d+d\d+(?:\s*[+-]\s*\d+)?)\s+(.+)$/i);
  if (!match) return { text, roll: null };
  const roll = await evaluate(match[1].replace(/\s+/g, ""));
  return { text: `${roll.total} ${match[2]}`, roll };
}

function journeyHoursLabel(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return "—";
  if (hours < 24) return `${fmt(hours, 1)} h`;
  const days = Math.floor(hours / 24);
  const rest = hours - days * 24;
  return rest > 0.05 ? `${days} j ${fmt(rest, 1)} h` : `${days} j`;
}

export class VoyageController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-voyage", "standard-form"],
    tag: "form",
    position: { width: 960, height: "auto" },
    window: { icon: "fa-solid fa-route", resizable: true },
    actions: {
      openDashboard: this.#openDashboard,
      openHazards: this.#openHazards,
      applyProfilePreset: this.#applyProfilePreset,
      resetTrip: this.#resetTrip,
      advanceDay: this.#advanceDay,
      checkEncounter: this.#checkEncounter,
      rollEncounter: this.#rollEncounter,
      rollNavigation: this.#rollNavigation,
      useTarget: this.#useTarget,
      rollChase: this.#rollChase,
      rollChaseDays: this.#rollChaseDays
    },
    form: { handler: this.#onSubmit, closeOnSubmit: false }
  };

  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/voyage-controller.hbs` } };

  constructor(actor, options = {}) {
    super({
      id: `pf1-ss-voyage-${actor.id}`,
      ...options,
      window: { ...(options.window ?? {}), title: `Voyages & Poursuites — ${actor.name}` }
    });
    this.actor = actor;
  }

  static open(actor) {
    if (!actor || actor.type !== "vehicle") {
      ui.notifications.warn("Skull & Shackles : sélectionne un token lié à un Vehicle PF1.");
      return null;
    }
    const app = new VoyageController(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const data = getVoyageData(this.actor);
    const travel = deriveTravel(this.actor, data);
    const preset = getLongDistancePreset(this.actor);
    const ss = getSSShipData(this.actor);
    const state = deriveShipState(this.actor, ss);
    const profile = getShipProfile(ss.profileId);
    const targeted = selectedTargetVehicle();
    const storedOpponent = actorByUuid(data.chase.opponentUuid);
    const opponent = storedOpponent?.type === "vehicle" ? storedOpponent : targeted;
    const opponentTravel = opponent ? deriveTravel(opponent, getVoyageData(opponent)) : null;
    const driver = getDriverData(this.actor);
    const opponentDriver = opponent ? getDriverData(opponent) : null;

    const vehicleChoices = (game.actors?.contents ?? [])
      .filter((a) => a.type === "vehicle" && a.id !== this.actor.id)
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang))
      .map((a) => ({ uuid: a.uuid, name: a.name, selected: a.uuid === data.chase.opponentUuid }));

    const progressPercent = travel.distanceKm > 0 ? Math.max(0, Math.min(100, travel.progressKm / travel.distanceKm * 100)) : 0;
    const table = getSeaEncounterTable(data.encounters.tier);
    const tier = SEA_ENCOUNTER_TIERS[data.encounters.tier];

    return {
      ...context,
      actor: this.actor,
      data,
      ss,
      state,
      profileName: profile?.name ?? "Profil personnalisé",
      preset,
      travel: {
        ...travel,
        baseLabel: `${fmt(travel.baseKmPerHour, 2)} km/h`,
        effectiveLabel: `${fmt(travel.effectiveKmPerHour, 2)} km/h`,
        dailyLabel: `${fmt(travel.kmPerDay, 1)} km/jour`,
        progressLabel: `${fmt(travel.progressKm, 1)} / ${fmt(travel.distanceKm, 1)} km`,
        remainingLabel: `${fmt(travel.remainingKm, 1)} km`,
        etaLabel: travel.effectiveKmPerHour > 0 && travel.remainingKm > 0 ? journeyHoursLabel(travel.remainingHours) : travel.complete ? "Arrivé" : "—",
        progressPercent: Math.round(progressPercent * 10) / 10,
        improvementSigned: `${travel.improvementPercent >= 0 ? "+" : ""}${fmt(travel.improvementPercent, 0)}%`,
        conditionSigned: `${travel.conditionPercent >= 0 ? "+" : ""}${fmt(travel.conditionPercent, 0)}%`
      },
      driverName: driver.actor?.name ?? "Aucun pilote",
      driverModifier: signed(driver.modifier),
      tier,
      tierChoices: Object.entries(SEA_ENCOUNTER_TIERS).map(([key, item]) => ({ key, ...item, selected: key === data.encounters.tier })),
      encounterTable: table,
      vehicleChoices,
      targeted: targeted ? { uuid: targeted.uuid, name: targeted.name } : null,
      opponent: opponent ? {
        uuid: opponent.uuid,
        name: opponent.name,
        driverName: opponentDriver?.actor?.name ?? "Aucun pilote",
        driverModifier: signed(opponentDriver?.modifier ?? 0),
        travelSpeed: opponentTravel?.effectiveKmPerHour > 0 ? `${fmt(opponentTravel.effectiveKmPerHour, 2)} km/h` : "Non renseignée"
      } : null,
      chaseRoleChoices: [
        { key: "pursuer", label: "Poursuivant", selected: data.chase.ownRole === "pursuer" },
        { key: "fugitive", label: "Fuyard", selected: data.chase.ownRole === "fugitive" }
      ],
      weatherSpeedHalved: Boolean(state.weatherSpeedHalved),
      isGM: Boolean(game.user?.isGM)
    };
  }

  static async #onSubmit(event, form, formData) {
    const obj = formData.object ?? formData.toObject?.() ?? Object.fromEntries(formData.entries());
    const raw = foundry.utils.expandObject(obj);
    const existing = getVoyageData(this.actor);
    const incoming = raw.voyage ?? {};

    // Les résultats historiques ne doivent pas disparaître lorsqu'ils ne sont pas dans le formulaire.
    incoming.encounters ??= {};
    incoming.encounters.lastCheck = existing.encounters.lastCheck;
    incoming.encounters.lastEncounterRoll = existing.encounters.lastEncounterRoll;
    incoming.encounters.lastEncounterText = existing.encounters.lastEncounterText;
    incoming.chase ??= {};
    incoming.chase.lastDays = existing.chase.lastDays;
    incoming.chase.lastOwnWins = existing.chase.lastOwnWins;
    incoming.chase.lastOpponentWins = existing.chase.lastOpponentWins;
    incoming.chase.lastOutcome = existing.chase.lastOutcome;

    const merged = foundry.utils.mergeObject(existing, incoming, { inplace: false, insertKeys: true, overwrite: true });
    await setVoyageData(this.actor, normalizeVoyageData(merged));
    await this.render();
  }

  async #saveForm() {
    try { await this.submit(); } catch (error) { console.warn(`${MODULE_ID} | sauvegarde Voyages & Poursuites`, error); }
  }

  static async #openDashboard() { game.modules.get(MODULE_ID)?.api?.openDashboard?.(this.actor); }
  static async #openHazards() { game.modules.get(MODULE_ID)?.api?.openHazards?.(this.actor); }

  static async #applyProfilePreset() {
    await this.#saveForm();
    const preset = getLongDistancePreset(this.actor);
    if (!preset) {
      return ui.notifications.warn("Ce profil ne fournit pas, dans le Guide du Joueur utilisé par le module, une vitesse de voyage chiffrée directement exploitable. Renseigne la valeur manuellement.");
    }
    const data = getVoyageData(this.actor);
    data.travel.baseKmPerHour = preset.kmPerHour;
    data.travel.hoursPerDay = preset.hoursPerDay;
    await setVoyageData(this.actor, data);
    ui.notifications.info(`${preset.label} : ${preset.kmPerHour} km/h et ${preset.kmPerDay} km/jour appliqués.`);
    await this.render();
  }

  static async #resetTrip() {
    await this.#saveForm();
    const data = getVoyageData(this.actor);
    data.travel.progressKm = 0;
    data.travel.daysElapsed = 0;
    await setVoyageData(this.actor, data);
    await this.render();
  }

  static async #advanceDay() {
    await this.#saveForm();
    const data = getVoyageData(this.actor);
    const travel = deriveTravel(this.actor, data);
    if (travel.distanceKm <= 0) return ui.notifications.warn("Renseigne d’abord une distance de voyage.");
    if (travel.kmPerDay <= 0) return ui.notifications.warn("La vitesse de voyage ou le nombre d’heures par jour est nul.");
    if (travel.complete) return ui.notifications.info("Le navire a déjà atteint la distance prévue.");

    const travelled = Math.min(travel.kmPerDay, travel.remainingKm);
    data.travel.progressKm = Math.min(travel.distanceKm, travel.progressKm + travelled);
    data.travel.daysElapsed += 1;
    await setVoyageData(this.actor, data);

    const encounterRolls = [];
    const encounterLines = [];
    for (let i = 0; i < data.encounters.checksPerDay; i += 1) {
      const check = await evaluate("1d100");
      encounterRolls.push(check);
      const triggered = Number(check.total) <= Number(data.encounters.chance);
      if (!triggered) {
        encounterLines.push(`Jet ${i + 1} : ${check.total} — aucune rencontre.`);
        continue;
      }
      const result = await this.#resolveEncounter(data, { postMessage: false });
      encounterRolls.push(...result.rolls);
      encounterLines.push(`Jet ${i + 1} : ${check.total} — <strong>${esc(result.text)}</strong> (FP moy. ${esc(result.entry.cr)}).`);
    }
    await setVoyageData(this.actor, data);

    const after = deriveTravel(this.actor, data);
    await post(this.actor, `Jour de voyage ${data.travel.daysElapsed}`,
      `<p><strong>${fmt(travelled, 1)} km</strong> parcourus. Progression : <strong>${fmt(after.progressKm, 1)} / ${fmt(after.distanceKm, 1)} km</strong>.</p>` +
      `<p>Allure effective : <strong>${fmt(after.effectiveKmPerHour, 2)} km/h</strong> · journée : <strong>${fmt(after.kmPerDay, 1)} km</strong>.</p>` +
      (encounterLines.length ? `<hr><p><strong>Rencontres :</strong><br>${encounterLines.join("<br>")}</p>` : "") +
      (after.complete ? `<p><strong>Destination atteinte.</strong></p>` : `<p>Reste : <strong>${fmt(after.remainingKm, 1)} km</strong>.</p>`),
      encounterRolls,
      "fa-compass"
    );
    await this.render();
  }

  async #resolveEncounter(data, { postMessage = true } = {}) {
    const d100 = await evaluate("1d100");
    const entry = getSeaEncounter(data.encounters.tier, Number(d100.total));
    const quantity = await rollEncounterQuantity(entry.result);
    const text = quantity.text;
    data.encounters.lastEncounterRoll = Number(d100.total);
    data.encounters.lastEncounterText = text;
    const rolls = [d100, ...(quantity.roll ? [quantity.roll] : [])];
    if (postMessage) {
      await setVoyageData(this.actor, data);
      await post(this.actor, `Rencontre aléatoire en mer — ${SEA_ENCOUNTER_TIERS[data.encounters.tier].label}`,
        `<p>d100 : <strong>${d100.total}</strong> → <strong>${esc(text)}</strong>.</p><p>FP moyen : <strong>${esc(entry.cr)}</strong> · Source : ${esc(entry.source)}.</p><p class="hint">Les tables de campagne supposent normalement que les PJ affrontent la rencontre sans la force de tout leur équipage.</p>`,
        rolls,
        "fa-water"
      );
    }
    return { d100, entry, text, rolls };
  }

  static async #rollEncounter() {
    await this.#saveForm();
    const data = getVoyageData(this.actor);
    await this.#resolveEncounter(data, { postMessage: true });
    await this.render();
  }

  static async #checkEncounter() {
    await this.#saveForm();
    const data = getVoyageData(this.actor);
    const check = await evaluate("1d100");
    const triggered = Number(check.total) <= Number(data.encounters.chance);
    data.encounters.lastCheck = Number(check.total);
    const rolls = [check];
    let body = `<p>Chance réglée à <strong>${fmt(data.encounters.chance, 0)}%</strong>. Jet : <strong>${check.total}</strong>.</p>`;
    if (triggered) {
      const result = await this.#resolveEncounter(data, { postMessage: false });
      rolls.push(...result.rolls);
      body += `<p><strong>Rencontre :</strong> ${esc(result.text)} (FP moy. ${esc(result.entry.cr)}, ${esc(result.entry.source)}).</p>`;
    } else {
      body += "<p><strong>Aucune rencontre.</strong></p>";
    }
    await setVoyageData(this.actor, data);
    await post(this.actor, "Vérification de rencontre en mer", body, rolls, "fa-dice-d20");
    await this.render();
  }

  static async #rollNavigation() {
    await this.#saveForm();
    const data = getVoyageData(this.actor);
    const breakdown = getNavigationBreakdown(this.actor, getSSShipData(this.actor), { extraModifier: Number(data.navigation.extraModifier ?? 0) });
    if (breakdown.impossibleReason) return ui.notifications.warn(breakdown.impossibleReason);
    const roll = await evaluate(`1d20 + ${Number(breakdown.totalModifier ?? 0)}`);
    const success = Number(roll.total) >= Number(data.navigation.dc);
    const lines = breakdown.lines.map((line) => `${esc(line.label)} ${signed(line.value)}`).join(" · ");
    await post(this.actor, `Navigation hors combat — ${success ? "Réussite" : "Échec"}`,
      `<p>${esc(breakdown.driver.skillName)} : <strong>${roll.total}</strong> contre DD <strong>${data.navigation.dc}</strong>.</p>` +
      (lines ? `<p class="hint">${lines}</p>` : "") +
      `<p>Le DD de base hors combat est 5 ; les tests ne sont normalement nécessaires que dans les situations particulières.</p>`,
      [roll], "fa-compass"
    );
  }

  static async #useTarget() {
    await this.#saveForm();
    const target = selectedTargetVehicle();
    if (!target) return ui.notifications.warn("Cible exactement un token Vehicle adverse.");
    const data = getVoyageData(this.actor);
    data.chase.opponentUuid = target.uuid;
    await setVoyageData(this.actor, data);
    await this.render();
  }

  static async #rollChase() {
    await this.#saveForm();
    const data = getVoyageData(this.actor);
    const opponent = actorByUuid(data.chase.opponentUuid) ?? selectedTargetVehicle();
    if (!opponent || opponent.type !== "vehicle") return ui.notifications.warn("Choisis un navire adverse ou cible exactement un token Vehicle.");

    const own = getNavigationBreakdown(this.actor, getSSShipData(this.actor));
    const other = getNavigationBreakdown(opponent, getSSShipData(opponent));
    if (own.impossibleReason) return ui.notifications.warn(`${this.actor.name} : ${own.impossibleReason}`);
    if (other.impossibleReason) return ui.notifications.warn(`${opponent.name} : ${other.impossibleReason}`);

    const rolls = [];
    const rows = [];
    let ownWins = 0;
    let opponentWins = 0;
    for (let i = 0; i < 3; i += 1) {
      const ownRoll = await evaluate(`1d20 + ${Number(own.totalModifier ?? 0)}`);
      const opponentRoll = await evaluate(`1d20 + ${Number(other.totalModifier ?? 0)}`);
      rolls.push(ownRoll, opponentRoll);
      const a = Number(ownRoll.total);
      const b = Number(opponentRoll.total);
      let result = "Égalité";
      if (a > b) { ownWins += 1; result = this.actor.name; }
      else if (b > a) { opponentWins += 1; result = opponent.name; }
      rows.push(`<tr><td>${i + 1}</td><td>${a}</td><td>${b}</td><td>${esc(result)}</td></tr>`);
    }

    let winner = null;
    if (ownWins >= 2) winner = this.actor;
    else if (opponentWins >= 2) winner = opponent;

    const ownPursuer = data.chase.ownRole === "pursuer";
    const pursuer = ownPursuer ? this.actor : opponent;
    const fugitive = ownPursuer ? opponent : this.actor;
    let outcome;
    if (!winner) outcome = "Aucun pilote ne remporte au moins deux tests : nouvelle série de trois tests nécessaire.";
    else if (winner.uuid === pursuer.uuid) outcome = `${pursuer.name} remporte la poursuite : le poursuivant rattrape ${fugitive.name} et le combat naval peut commencer.`;
    else outcome = `${fugitive.name} remporte la poursuite et parvient à s’échapper.`;

    data.chase.opponentUuid = opponent.uuid;
    data.chase.lastOwnWins = ownWins;
    data.chase.lastOpponentWins = opponentWins;
    data.chase.lastOutcome = outcome;
    await setVoyageData(this.actor, data);

    const ownTravel = deriveTravel(this.actor, data);
    const opponentTravel = deriveTravel(opponent, getVoyageData(opponent));
    let speedNote = "";
    if (ownTravel.effectiveKmPerHour > 0 && opponentTravel.effectiveKmPerHour > 0) {
      speedNote = `<p class="hint">Allures de voyage renseignées : ${esc(this.actor.name)} ${fmt(ownTravel.effectiveKmPerHour, 2)} km/h ; ${esc(opponent.name)} ${fmt(opponentTravel.effectiveKmPerHour, 2)} km/h. La règle autorise le MJ à décider qu’un navire plus rapide rattrape automatiquement un plus lent ; le module n’impose pas cette option.</p>`;
    }

    await post(this.actor, `Fuite et poursuite — ${this.actor.name} / ${opponent.name}`,
      `<p><strong>Poursuivant :</strong> ${esc(pursuer.name)} · <strong>Fuyard :</strong> ${esc(fugitive.name)}</p>` +
      `<table><thead><tr><th>Test</th><th>${esc(this.actor.name)}</th><th>${esc(opponent.name)}</th><th>Avantage</th></tr></thead><tbody>${rows.join("")}</tbody></table>` +
      `<p>Victoires : <strong>${esc(this.actor.name)} ${ownWins}</strong> — <strong>${esc(opponent.name)} ${opponentWins}</strong>.</p>` +
      `<p><strong>${esc(outcome)}</strong></p>${speedNote}`,
      rolls,
      "fa-flag-checkered"
    );
    await this.render();
  }

  static async #rollChaseDays() {
    await this.#saveForm();
    const data = getVoyageData(this.actor);
    const roll = await evaluate("1d4");
    data.chase.lastDays = Number(roll.total);
    await setVoyageData(this.actor, data);
    await post(this.actor, "Durée de la poursuite", `<p>À l’appréciation du MJ, la poursuite dure <strong>${roll.total} jour(s)</strong>.</p>`, [roll], "fa-calendar-days");
    await this.render();
  }
}
