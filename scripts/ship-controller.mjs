import {
  MODULE_ID,
  NAVAL_SQUARE_FEET,
  getSSShipData,
  normalizeSSShipData,
  getDriverData,
  deriveShipState,
  getNavigationBreakdown,
  getNavigationDC,
  getTurnPenalty,
  effectiveVehicleCombatValues,
  formatDistance,
  formatNavalSquares,
  CARDINAL_DIRECTIONS,
  getDirectionLabel,
  getSceneWindDirection,
  getWindState,
  getWindwardBonuses,
  turnHeading,
  getNavalManeuverBreakdown,
  getNavalProximity,
  getRelativeNavalGeometry,
  getImprovementAdvantageBonus
} from "./ship-data.mjs";
import { SiegeController } from "./siege-controller.mjs";
import { ReputationController } from "./reputation-controller.mjs";
import { FleetController } from "./fleet-controller.mjs";
import { LifeController } from "./life-controller.mjs";
import { EntertainmentController } from "./entertainment-controller.mjs";
import { LibraryController } from "./library-controller.mjs";
import { ShipWizard } from "./ship-wizard.mjs";
import { ShipImprovementsController } from "./ship-improvements-controller.mjs";
import { VoyageController } from "./voyage-controller.mjs";
import { PiracyController } from "./piracy-controller.mjs";
import { ShipDisguiseController } from "./ship-disguise-controller.mjs";
import { NavalMapController } from "./naval-map-controller.mjs";
import { syncTokenHeading, refreshWindOverlay, cancelShearPlan } from "./naval-map-tools.mjs";
import { getSetting, SETTINGS } from "./settings.mjs";
import { applyShipProfile } from "./library-data.mjs";
import {
  SHIP_COMPONENTS,
  DAMAGE_TYPES,
  getComponentInfo,
  applyComponentDamage,
  applyComponentRepair,
  setShipOnFire,
  advanceFireRound,
  extinguishFire,
  applyUncontrolledSlowdown,
  getShipGenericSave
} from "./ship-damage.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const ACTIONS = Object.freeze({
  ahead: {
    title: "En avant toute !",
    cost: "action simple",
    icon: "fa-solid fa-forward",
    success: "Le navire accélère et peut avancer tout droit ou en diagonale vers l’avant.",
    failure: "Le navire n’accélère pas et ne peut se déplacer que directement vers l’avant."
  },
  port: {
    title: "Bâbord toute !",
    cost: "action simple",
    icon: "fa-solid fa-rotate-left",
    success: "Le navire peut changer son cap de 90° vers bâbord pendant son déplacement.",
    failure: "Le navire ne vire pas, mais peut encore avancer en diagonale."
  },
  starboard: {
    title: "Tribord toute !",
    cost: "action simple",
    icon: "fa-solid fa-rotate-right",
    success: "Le navire peut changer son cap de 90° vers tribord pendant son déplacement.",
    failure: "Le navire ne vire pas, mais peut encore avancer en diagonale."
  },
  heaveTo: {
    title: "À la cape !",
    cost: "action simple",
    icon: "fa-solid fa-gauge-low",
    success: "Le navire ralentit et peut avancer tout droit ou en diagonale.",
    failure: "Le navire ne ralentit pas, mais peut avancer tout droit ou en diagonale."
  },
  makeWay: {
    title: "Faites place !",
    cost: "action simple",
    icon: "fa-solid fa-shuffle",
    success: "Le résultat devient le DD du prochain test de navigation du pilote adverse.",
    failure: "Le navire garde sa vitesse, ne peut pas avancer en diagonale et le pilote adverse conserve son DD normal."
  },
  holdCourse: {
    title: "Maintenez le cap !",
    cost: "action de mouvement",
    icon: "fa-solid fa-arrow-up",
    success: "Le navire avance à sa vitesse actuelle, tout droit ou en diagonale.",
    failure: "Le navire garde sa vitesse mais ne peut avancer que directement vers l’avant."
  },
  reverse: {
    title: "Arrière toute !",
    cost: "action complexe",
    icon: "fa-solid fa-backward",
    success: "Le navire peut reculer d’une case navale, tout droit ou en diagonale vers l’arrière.",
    failure: "Le navire ne recule pas."
  },
  uncontrolled: {
    title: "Incontrôlé",
    cost: "aucune action",
    icon: "fa-solid fa-triangle-exclamation"
  }
});

export class ShipController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "standard-form"],
    tag: "form",
    position: {
      width: 760,
      height: "auto"
    },
    window: {
      icon: "fa-solid fa-anchor",
      resizable: true
    },
    actions: {
      initializeSailingShip: this.#initializeSailingShip,
      rollNavigation: this.#rollNavigation,
      openVehicleSheet: this.#openVehicleSheet,
      openDashboard: this.#openDashboard,
      openNavalMap: this.#openNavalMap,
      openHazards: this.#openHazards,
      openImprovements: this.#openImprovements,
      openVoyage: this.#openVoyage,
      openPiracy: this.#openPiracy,
      moveAhead: this.#moveAhead,
      turnPort: this.#turnPort,
      turnStarboard: this.#turnStarboard,
      heaveTo: this.#heaveTo,
      makeWay: this.#makeWay,
      holdCourse: this.#holdCourse,
      reverse: this.#reverse,
      uncontrolled: this.#uncontrolled,
      clearForcedDc: this.#clearForcedDc,
      rollAdvantage: this.#rollAdvantage,
      randomizeWind: this.#randomizeWind,
      ramShip: this.#ramShip,
      grappleShip: this.#grappleShip,
      mutualGrapple: this.#mutualGrapple,
      breakGrapple: this.#breakGrapple,
      boardShip: this.#boardShip,
      shearOars: this.#shearOars,
      applyDamage: this.#applyDamage,
      igniteShip: this.#igniteShip,
      resolveFireRound: this.#resolveFireRound,
      extinguishShip: this.#extinguishShip,
      ordinaryRepair: this.#ordinaryRepair,
      makeWholeRepair: this.#makeWholeRepair,
      openSiegeController: this.#openSiegeController,
      openReputationController: this.#openReputationController,
      openFleetController: this.#openFleetController,
      openFleetRecruitment: this.#openFleetRecruitment,
      openDisguise: this.#openDisguise,
      openLifeController: this.#openLifeController,
      openEntertainmentController: this.#openEntertainmentController,
      openBoardingController: this.#openBoardingController,
      openLibraryController: this.#openLibraryController,
      openShipWizard: this.#openShipWizard
    },
    form: {
      handler: this.#onSubmit,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/ship-controller.hbs`
    }
  };

  constructor(actor, options = {}) {
    super({
      id: `pf1-ss-controller-${actor.id}`,
      ...options,
      window: {
        ...(options.window ?? {}),
        title: `Skull & Shackles — ${actor.name}`
      }
    });
    this.actor = actor;
  }

  static open(actor) {
    if (!actor || actor.type !== "vehicle") {
      ui.notifications.warn("Skull & Shackles : sélectionne ou ouvre un Actor PF1 de type Vehicle.");
      return null;
    }
    const app = new ShipController(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const ss = getSSShipData(this.actor);
    const state = deriveShipState(this.actor, ss);
    const nav = getNavigationBreakdown(this.actor, ss);
    const navDc = getNavigationDC(ss);
    const combat = effectiveVehicleCombatValues(this.actor, state);
    const driver = getDriverData(this.actor);
    const turnPenalty = getTurnPenalty(this.actor);
    const wind = getWindState(this.actor, ss);
    const windDirection = getSceneWindDirection();
    const targetVehicle = this.#getTargetVehicle();
    const targetSS = targetVehicle ? getSSShipData(targetVehicle) : null;
    const targetState = targetVehicle ? deriveShipState(targetVehicle, targetSS) : null;
    const targetCombat = targetVehicle ? effectiveVehicleCombatValues(targetVehicle, targetState) : null;
    const windward = targetVehicle ? getWindwardBonuses(this.actor, targetVehicle, { ssA: ss, ssB: targetSS }) : null;
    const proximity = targetVehicle ? getNavalProximity(this.actor, targetVehicle) : null;
    const maneuver = getNavalManeuverBreakdown(this.actor, ss);
    const componentChoices = Object.entries(SHIP_COMPONENTS).map(([value, data]) => ({
      value,
      label: data.label,
      damageSelected: value === ss.damage.component,
      repairSelected: value === ss.repair.component
    }));
    const damageTypeChoices = Object.entries(DAMAGE_TYPES).map(([value, data]) => ({
      value,
      label: data.label,
      selected: value === ss.damage.type
    }));
    const steeringChoices = [
      ["wheel", "Barre"],
      ["rudder", "Gouvernail"],
      ["oars", "Rames (dispositif de pilotage)"]
    ].map(([value, label]) => ({ value, label, selected: value === ss.steering.type }));
    const components = {
      structure: getComponentInfo(this.actor, "structure", ss),
      sails: getComponentInfo(this.actor, "sails", ss),
      oars: getComponentInfo(this.actor, "oars", ss),
      steering: getComponentInfo(this.actor, "steering", ss)
    };
    const fireSave = getShipGenericSave(this.actor);
    const fireExtinguishDc = 15 + Number(ss.fire.roundsElapsed ?? 0);

    const pilotChoices = game.actors
      .filter((a) => ["character", "npc"].includes(a.type) && a.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED))
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang))
      .map((a) => ({ uuid: a.uuid, name: a.name, selected: a.uuid === this.actor.system?.driver?.uuid }));

    let skillChoices = [];
    if (driver.actor) {
      skillChoices = driver.actor.allSkills
        .map((id) => {
          try {
            const skill = driver.actor.getSkillInfo(id);
            return {
              id,
              name: skill.fullName ?? skill.name ?? id,
              mod: Number(skill.mod ?? 0),
              modDisplay: `${Number(skill.mod ?? 0) >= 0 ? "+" : ""}${Number(skill.mod ?? 0)}`,
              selected: id === this.actor.system?.driver?.skill
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
    }

    const propulsionChoices = [
      ["wind", "Vent"],
      ["current", "Courants"],
      ["muscles", "Muscles / rames"],
      ["mixed", "Deux propulsions simultanées (−5)"]
    ].map(([value, label]) => ({ value, label, selected: value === ss.navigation.propulsionMode }));

    const directionChoices = Object.entries(CARDINAL_DIRECTIONS).map(([value, data]) => ({
      value,
      label: data.label,
      headingSelected: value === ss.navigation.heading,
      windSelected: value === windDirection
    }));

    const currentRound = Number(game.combat?.round ?? 0);
    const advantageCurrent = ss.advantage?.lastRound > 0 && (!currentRound || ss.advantage.lastRound === currentRound);

    const status = [];
    if (state.sunk) status.push({ className: "danger", label: "Coulé / détruit" });
    else if (state.sinking) status.push({ className: "danger", label: `En plein naufrage — ${state.sinkingRoundsRemaining} round(s)` });
    else if (state.hullBroken) status.push({ className: "warning", label: "Brisé" });
    else status.push({ className: "ok", label: "Intact" });
    if (state.fireActive) status.push({ className: "danger", label: `En feu — ${state.fireRoundsElapsed} round(s)` });
    if (state.sailsBroken) status.push({ className: "warning", label: "Voiles brisées" });
    if (state.oarsBroken) status.push({ className: "warning", label: "Rames brisées" });
    if (ss.combat?.grappledWithUuid) status.push({ className: "warning", label: `Agrippé à ${ss.combat.grappledWithName || "un navire"}` });
    if (wind.headToWind) status.push({ className: "danger", label: "Vent debout" });
    if (state.steeringDestroyed) status.push({ className: "danger", label: "Pilotage détruit" });
    else if (state.steeringBroken) status.push({ className: "warning", label: "Pilotage brisé" });
    if (state.weatherRudderJammed) status.push({ className: "warning", label: "Gouvernail bloqué" });
    if (state.weatherSpeedHalved) status.push({ className: "warning", label: "Vitesse météo ÷2" });
    if (state.grounded) status.push({ className: "danger", label: "Échoué" });
    if (state.majorBreach) status.push({ className: "danger", label: "Voie d’eau majeure" });
    if (advantageCurrent && ss.advantage.status === "won") status.push({ className: "ok", label: `Ascendant${currentRound ? ` (round ${currentRound})` : ""}` });
    if (navDc.forced) status.push({ className: "warning", label: `DD imposé ${navDc.dc}` });

    return {
      ...context,
      actor: this.actor,
      ss,
      state,
      nav,
      navDc,
      combat,
      status,
      pilotChoices,
      skillChoices,
      propulsionChoices,
      directionChoices,
      componentChoices,
      damageTypeChoices,
      steeringChoices,
      components,
      fireSave,
      fireExtinguishDc,
      wind,
      windward,
      targetVehicle,
      targetSS,
      targetState,
      targetCombat,
      targetSpeed: targetState ? formatDistance(targetState.speedCurrent) : "—",
      proximity,
      maneuver,
      advantageCurrent,
      currentRound,
      driver,
      actions: ACTIONS,
      displays: {
        driverModifier: `${nav.driver.modifier >= 0 ? "+" : ""}${nav.driver.modifier}`,
        navigationAdjustment: `${nav.adjustment >= 0 ? "+" : ""}${nav.adjustment}`,
        navigationTotal: `${nav.totalModifier >= 0 ? "+" : ""}${nav.totalModifier}`,
        maneuverTotal: `${maneuver.totalModifier >= 0 ? "+" : ""}${maneuver.totalModifier}`,
        turnPenalty: `${turnPenalty >= 0 ? "+" : ""}${turnPenalty}`
      },
      speed: {
        current: formatDistance(state.speedCurrent),
        currentSquares: formatNavalSquares(state.speedCurrent),
        maximum: formatDistance(state.speedMax),
        effectiveMaximum: formatDistance(state.effectiveMaxSpeed),
        acceleration: formatDistance(this.actor.system?.details?.acceleration ?? 0),
        accelerationSquares: formatNavalSquares(this.actor.system?.details?.acceleration ?? 0)
      }
    };
  }

  static async #onSubmit(event, form, formData) {
    const asObject = formData.object ?? formData.toObject?.() ?? Object.fromEntries(formData.entries());
    const raw = foundry.utils.expandObject(asObject);

    raw.ss ??= {};
    raw.ss.navigation ??= {};
    raw.ss.steering ??= {};
    raw.ss.combat ??= {};
    raw.ss.oars ??= {};
    raw.ss.navigation.aid = Boolean(form.elements.namedItem("ss.navigation.aid")?.checked);
    raw.ss.navigation.experiencedDriver = Boolean(form.elements.namedItem("ss.navigation.experiencedDriver")?.checked);
    raw.ss.navigation.windwardManual = Boolean(form.elements.namedItem("ss.navigation.windwardManual")?.checked);
    raw.ss.navigation.headToWind = false;
    raw.ss.steering.broken = Boolean(form.elements.namedItem("ss.steering.broken")?.checked);
    raw.ss.steering.destroyed = Boolean(form.elements.namedItem("ss.steering.destroyed")?.checked);
    raw.ss.combat.ramEquipped = Boolean(form.elements.namedItem("ss.combat.ramEquipped")?.checked);
    raw.ss.combat.autoApplyRamDamage = Boolean(form.elements.namedItem("ss.combat.autoApplyRamDamage")?.checked);
    raw.ss.combat.usesCorvus = Boolean(form.elements.namedItem("ss.combat.usesCorvus")?.checked);
    raw.ss.damage ??= {};
    raw.ss.damage.ignoreHardness = Boolean(form.elements.namedItem("ss.damage.ignoreHardness")?.checked);

    // Préserve les états de combat et de catastrophe qui ne sont pas des champs éditables du formulaire.
    const stored = getSSShipData(this.actor);
    raw.ss.navigation.forcedDc = stored.navigation.forcedDc;
    raw.ss.navigation.forcedDcSource = stored.navigation.forcedDcSource;
    raw.ss.advantage = stored.advantage;
    raw.ss.combat.grappledWithUuid = stored.combat.grappledWithUuid;
    raw.ss.combat.grappledWithName = stored.combat.grappledWithName;
    raw.ss.combat.grappleSource = stored.combat.grappleSource;
    raw.ss.combat.grappleEstablishedRound = stored.combat.grappleEstablishedRound;
    raw.ss.fire = stored.fire;
    raw.ss.sinking = stored.sinking;

    const ss = normalizeSSShipData(raw.ss);
    await this.actor.setFlag(MODULE_ID, "ship", ss);

    const native = raw.native ?? {};
    const update = {};
    if (typeof native.driverUuid === "string") update["system.driver.uuid"] = native.driverUuid;
    if (typeof native.driverSkill === "string") update["system.driver.skill"] = native.driverSkill;
    const steeringLabel = ({ wheel: "Barre", rudder: "Gouvernail", oars: "Rames" })[ss.steering.type];
    if (steeringLabel) update["system.details.drivingDevice"] = steeringLabel;
    if (Object.keys(update).length) await this.actor.update(update);

    const requestedWind = raw.world?.windDirection;
    if (requestedWind && canvas?.scene && requestedWind !== getSceneWindDirection()) {
      try {
        await canvas.scene.setFlag(MODULE_ID, "windDirection", requestedWind);
      } catch (error) {
        console.warn(`${MODULE_ID} | Impossible de modifier le vent de la scène`, error);
        ui.notifications.warn("Impossible de modifier la direction du vent sur cette scène (permissions insuffisantes).");
      }
    }

    await this.render();
  }

  async #saveVisibleForm() {
    try {
      await this.submit();
    } catch (error) {
      console.warn(`${MODULE_ID} | Impossible d'enregistrer le formulaire avant l'action`, error);
    }
  }

  static async #initializeSailingShip() {
    const accepted = window.confirm(
      "Appliquer le profil générique « Bateau à voiles » à ce Vehicle PF1 ?\n\n" +
      "Cela remplace les statistiques natives de coque, équipage et déplacement du véhicule, mais conserve son nom et son pilote."
    );
    if (!accepted) return;

    await applyShipProfile(this.actor, "sailingShip");
    ui.notifications.info(`${this.actor.name} a reçu le profil Bateau à voiles de Skull & Shackles.`);
    await this.render();
  }

  static async #rollNavigation() {
    await this.#saveVisibleForm();
    await this.#performNavigationRoll({
      title: "Test de navigation",
      action: null,
      consumeForcedDc: true
    });
  }

  async #performNavigationRoll({ title, action = null, extraModifier = 0, consumeForcedDc = true, ignoreHeadToWind = false } = {}) {
    const ss = getSSShipData(this.actor);
    const nav = getNavigationBreakdown(this.actor, ss, { extraModifier, ignoreHeadToWind });
    if (nav.impossibleReason) {
      ui.notifications.warn(nav.impossibleReason);
      return null;
    }

    const dcInfo = getNavigationDC(ss);
    const dc = dcInfo.dc;
    const formula = `1d20 + ${nav.totalModifier}`;
    const roll = await new Roll(formula).evaluate();
    const success = Number(roll.total) >= dc;

    if (consumeForcedDc && dcInfo.forced) {
      await this.#setForcedDc(this.actor, 0, "");
    }

    return { ss, nav, dcInfo, dc, roll, success, title, action };
  }

  async #postActionRoll(result, { details = "", target = null } = {}) {
    if (!result) return;
    const { nav, dcInfo, dc, roll, success, title, action } = result;
    const escape = foundry.utils.escapeHTML;
    const breakdown = nav.lines.length
      ? `<ul>${nav.lines.map((l) => `<li>${escape(l.label)} : ${l.value >= 0 ? "+" : ""}${l.value}</li>`).join("")}</ul>`
      : "<p>Aucun modificateur circonstanciel.</p>";

    const forcedNote = dcInfo.forced
      ? `<p><strong>DD imposé :</strong> ${dc}${dcInfo.source ? ` par ${escape(dcInfo.source)}` : ""} (consommé par ce test).</p>`
      : "";

    const actionData = action ? ACTIONS[action] : null;
    const outcome = actionData
      ? `<p>${escape(success ? actionData.success : actionData.failure)}</p>`
      : "";

    const targetLine = target ? `<p><strong>Cible :</strong> ${escape(target.name)}</p>` : "";

    const flavor = `
      <div class="pf1-ss-chat-card">
        <h3><i class="fa-solid fa-anchor"></i> ${escape(title)} — ${escape(this.actor.name)}</h3>
        ${actionData ? `<p><strong>Coût :</strong> ${escape(actionData.cost)}</p>` : ""}
        ${targetLine}
        <p><strong>Pilote :</strong> ${escape(nav.driver.actor.name)} — ${escape(nav.driver.skillName)} (${nav.driver.modifier >= 0 ? "+" : ""}${nav.driver.modifier})</p>
        <p><strong>DD :</strong> ${dc} &nbsp; <strong>Modificateur final :</strong> ${nav.totalModifier >= 0 ? "+" : ""}${nav.totalModifier}</p>
        ${forcedNote}
        ${breakdown}
        <p class="pf1-ss-result ${success ? "success" : "failure"}">${success ? "RÉUSSITE" : "ÉCHEC"}</p>
        ${outcome}
        ${details}
      </div>`;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: nav.driver.actor }),
      flavor
    });
  }

  async #setCurrentSpeed(value) {
    const state = deriveShipState(this.actor, getSSShipData(this.actor));
    const safe = Math.max(0, Math.min(Number(value ?? 0), Math.max(0, state.effectiveMaxSpeed)));
    await this.actor.update({ "system.details.currentSpeed": safe });
    return safe;
  }

  async #setForcedDc(actor, value, source = "") {
    const ss = getSSShipData(actor);
    ss.navigation.forcedDc = Math.max(0, Math.trunc(Number(value ?? 0)));
    ss.navigation.forcedDcSource = ss.navigation.forcedDc ? String(source ?? "") : "";
    await actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
  }

  #getTargetVehicle() {
    const targets = Array.from(game.user?.targets ?? [])
      .map((token) => token.actor)
      .filter((actor) => actor?.type === "vehicle" && actor.id !== this.actor.id);
    return targets.length === 1 ? targets[0] : null;
  }

  static async #moveAhead() {
    await this.#saveVisibleForm();
    const before = deriveShipState(this.actor, getSSShipData(this.actor));
    const result = await this.#performNavigationRoll({ title: ACTIONS.ahead.title, action: "ahead" });
    if (!result) return;

    let newSpeed = before.speedCurrent;
    if (result.success) {
      const acceleration = Math.max(0, Number(this.actor.system?.details?.acceleration ?? 0));
      newSpeed = await this.#setCurrentSpeed(Math.min(before.speedCurrent + acceleration, before.effectiveMaxSpeed));
    }

    const details = `
      <p><strong>Vitesse :</strong> ${formatDistance(before.speedCurrent)} → ${formatDistance(newSpeed)}.</p>
      <p><strong>Déplacement de ce tour :</strong> ${formatDistance(newSpeed)} (${formatNavalSquares(newSpeed)}).</p>`;
    await this.#postActionRoll(result, { details });
    await this.render();
  }

  static async #turnPort() {
    await this.#turn("port");
  }

  static async #turnStarboard() {
    await this.#turn("starboard");
  }

  async #turn(side) {
    await this.#saveVisibleForm();
    const penalty = getTurnPenalty(this.actor);
    const result = await this.#performNavigationRoll({
      title: ACTIONS[side].title,
      action: side,
      extraModifier: penalty,
      ignoreHeadToWind: true
    });
    if (!result) return;

    if (result.success) {
      const ss = getSSShipData(this.actor);
      const oldHeading = ss.navigation.heading;
      ss.navigation.heading = turnHeading(oldHeading, side);
      ss.navigation.headToWind = false;
      await this.actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
      if (getSetting(SETTINGS.autoSyncTokenRotation, true)) {
        try { await syncTokenHeading(this.actor, ss); }
        catch (error) { console.warn(`${MODULE_ID} | Rotation automatique du token impossible`, error); }
      }
    }

    const refreshedSS = getSSShipData(this.actor);
    const state = deriveShipState(this.actor, refreshedSS);
    const wind = getWindState(this.actor, refreshedSS);
    const details = `
      <p><strong>Vitesse conservée :</strong> ${formatDistance(state.speedCurrent)} (${formatNavalSquares(state.speedCurrent)}).</p>
      ${penalty ? `<p><strong>Malus de vitesse au virage :</strong> ${penalty}.</p>` : "<p>Aucun malus de vitesse au virage.</p>"}
      ${result.success ? `<p><strong>Nouveau cap :</strong> ${foundry.utils.escapeHTML(wind.headingLabel)}.</p>` : ""}
      ${result.success && wind.headToWind
        ? "<p><strong>Vent debout :</strong> la proue pointe contre le vent ; le navire devra accomplir l’action Incontrôlé jusqu’à correction du cap.</p>"
        : ""}
      ${result.success && wind.withWind
        ? "<p><strong>Vent arrière :</strong> la vitesse maximale due à la propulsion par le vent est doublée.</p>"
        : ""}`;
    await this.#postActionRoll(result, { details });
    await this.render();
  }

  static async #heaveTo() {
    await this.#saveVisibleForm();
    const before = deriveShipState(this.actor, getSSShipData(this.actor));
    const result = await this.#performNavigationRoll({ title: ACTIONS.heaveTo.title, action: "heaveTo" });
    if (!result) return;

    let newSpeed = before.speedCurrent;
    let inertiaHtml = "";
    if (result.success) {
      newSpeed = await this.#setCurrentSpeed(Math.max(0, before.speedCurrent - NAVAL_SQUARE_FEET));
      if (newSpeed === 0 && before.speedCurrent > 0) {
        const inertiaRoll = await new Roll("1d4").evaluate();
        let inertiaSquares = Number(inertiaRoll.total ?? 0);
        if (result.ss.navigation.experiencedDriver) inertiaSquares = Math.max(0, inertiaSquares - 1);
        const inertiaFeet = inertiaSquares * NAVAL_SQUARE_FEET;
        inertiaHtml = `<p><strong>Inertie :</strong> résultat du d4 = ${inertiaRoll.total}. Le navire continue sur ${formatDistance(inertiaFeet)} (${formatNavalSquares(inertiaFeet)})${result.ss.navigation.experiencedDriver ? " après réduction d’une case grâce à Conducteur expérimenté" : ""}, puis s’arrête.</p>`;
      }
    }

    const details = `
      <p><strong>Vitesse :</strong> ${formatDistance(before.speedCurrent)} → ${formatDistance(newSpeed)}.</p>
      <p><strong>Déplacement normal :</strong> ${formatDistance(newSpeed)} (${formatNavalSquares(newSpeed)}).</p>
      ${inertiaHtml}`;
    await this.#postActionRoll(result, { details });
    await this.render();
  }

  static async #makeWay() {
    await this.#saveVisibleForm();
    const target = this.#getTargetVehicle();
    const result = await this.#performNavigationRoll({ title: ACTIONS.makeWay.title, action: "makeWay" });
    if (!result) return;

    let details = "";
    if (result.success) {
      const imposedDc = Math.max(0, Math.trunc(Number(result.roll.total ?? 0)));
      if (target) {
        try {
          await this.#setForcedDc(target, imposedDc, this.actor.name);
          details = `<p><strong>${foundry.utils.escapeHTML(target.name)}</strong> devra utiliser un DD de <strong>${imposedDc}</strong> pour son prochain test de navigation. Le DD sera consommé automatiquement par le module.</p>`;
        } catch (error) {
          console.warn(`${MODULE_ID} | Impossible d'appliquer automatiquement Faites place ! à ${target.name}`, error);
          details = `<p>Le prochain test de navigation de <strong>${foundry.utils.escapeHTML(target.name)}</strong> a un DD de <strong>${imposedDc}</strong>. Le module n’a pas pu modifier automatiquement ce Vehicle (permissions insuffisantes) : appliquez ce DD manuellement.</p>`;
        }
      } else {
        details = `<p>Le prochain test de navigation du pilote adverse a un DD de <strong>${imposedDc}</strong>. Pour l’appliquer automatiquement, ciblez exactement un token Vehicle ennemi avant d’utiliser cette action.</p>`;
      }
    } else {
      details = `<p><strong>Vitesse conservée :</strong> ${formatDistance(this.actor.system?.details?.currentSpeed ?? 0)}. Aucun DD adverse n’est modifié.</p>`;
    }

    await this.#postActionRoll(result, { details, target });
    await this.render();
  }

  static async #holdCourse() {
    await this.#saveVisibleForm();
    const result = await this.#performNavigationRoll({ title: ACTIONS.holdCourse.title, action: "holdCourse" });
    if (!result) return;

    const speed = Number(this.actor.system?.details?.currentSpeed ?? 0);
    const details = `<p><strong>Vitesse conservée :</strong> ${formatDistance(speed)}. Déplacement : ${formatDistance(speed)} (${formatNavalSquares(speed)}).</p>`;
    await this.#postActionRoll(result, { details });
    await this.render();
  }

  static async #reverse() {
    await this.#saveVisibleForm();
    const speed = Number(this.actor.system?.details?.currentSpeed ?? 0);
    if (speed > 0) {
      ui.notifications.warn("Arrière toute ! exige que le navire soit à l’arrêt (vitesse actuelle 0).");
      return;
    }

    const result = await this.#performNavigationRoll({ title: ACTIONS.reverse.title, action: "reverse" });
    if (!result) return;
    const details = result.success
      ? `<p><strong>Recul autorisé :</strong> ${formatDistance(NAVAL_SQUARE_FEET)} (${formatNavalSquares(NAVAL_SQUARE_FEET)}), directement ou en diagonale vers l’arrière. La vitesse actuelle reste à 0.</p>`
      : "<p>Aucun déplacement vers l’arrière.</p>";
    await this.#postActionRoll(result, { details });
    await this.render();
  }

  static async #uncontrolled() {
    await this.#saveVisibleForm();
    const ss = getSSShipData(this.actor);
    const state = deriveShipState(this.actor, ss);
    if (state.sunk) {
      ui.notifications.warn("Le navire a coulé et est détruit.");
      return;
    }
    if (state.sinking) {
      ui.notifications.warn("Le navire est en plein naufrage et ne peut plus se déplacer.");
      return;
    }

    const before = state.speedCurrent;
    const after = await this.#setCurrentSpeed(Math.max(0, before - NAVAL_SQUARE_FEET));
    const escape = foundry.utils.escapeHTML;
    const flavor = `
      <div class="pf1-ss-chat-card">
        <h3><i class="fa-solid fa-triangle-exclamation"></i> Incontrôlé — ${escape(this.actor.name)}</h3>
        <p><strong>Coût :</strong> aucune action.</p>
        <p>Le navire ne peut se déplacer que directement vers l’avant et ralentit automatiquement d’une case navale.</p>
        <p><strong>Vitesse :</strong> ${formatDistance(before)} → ${formatDistance(after)}.</p>
        <p><strong>Déplacement de ce tour :</strong> ${formatDistance(after)} (${formatNavalSquares(after)}), directement vers l’avant uniquement.</p>
      </div>`;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: flavor
    });
    await this.render();
  }

  static async #randomizeWind() {
    await this.#saveVisibleForm();
    if (!canvas?.scene) {
      ui.notifications.warn("Aucune scène active : impossible d'enregistrer la direction du vent.");
      return;
    }
    if (!canvas.scene.isOwner) {
      ui.notifications.warn("Tu n'as pas la permission de modifier la direction du vent sur cette scène.");
      return;
    }

    const roll = await new Roll("1d4").evaluate();
    const direction = ({ 1: "N", 2: "E", 3: "S", 4: "W" })[Number(roll.total)] ?? "N";
    await canvas.scene.setFlag(MODULE_ID, "windDirection", direction);
    refreshWindOverlay();

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-wind"></i> Direction du vent</h3><p>Le vent souffle vers le <strong>${foundry.utils.escapeHTML(getDirectionLabel(direction))}</strong>.</p></div>`
    });
    await this.render();
  }

  async #saveAdvantageResult(actor, data) {
    const ss = getSSShipData(actor);
    ss.advantage = {
      ...ss.advantage,
      ...data
    };
    await actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
  }

  static async #rollAdvantage() {
    await this.#saveVisibleForm();
    const target = this.#getTargetVehicle();
    if (!target) {
      ui.notifications.warn("Pour déterminer l’ascendant, cible exactement un token Vehicle adverse.");
      return;
    }

    const ownSS = getSSShipData(this.actor);
    const targetSS = getSSShipData(target);
    const windward = getWindwardBonuses(this.actor, target, { ssA: ownSS, ssB: targetSS });
    const ownNav = getNavigationBreakdown(this.actor, ownSS, {
      extraModifier: windward.actorBonus + getImprovementAdvantageBonus(this.actor),
      ignoreHeadToWind: true
    });
    const targetNav = getNavigationBreakdown(target, targetSS, {
      extraModifier: windward.targetBonus + getImprovementAdvantageBonus(target),
      ignoreHeadToWind: true
    });

    if (ownNav.impossibleReason) {
      ui.notifications.warn(`${this.actor.name} : ${ownNav.impossibleReason}`);
      return;
    }
    if (targetNav.impossibleReason) {
      ui.notifications.warn(`${target.name} : ${targetNav.impossibleReason}`);
      return;
    }

    const ownRoll = await new Roll(`1d20 + ${ownNav.totalModifier}`).evaluate();
    const targetRoll = await new Roll(`1d20 + ${targetNav.totalModifier}`).evaluate();
    const ownTotal = Number(ownRoll.total ?? 0);
    const targetTotal = Number(targetRoll.total ?? 0);
    const margin = Math.abs(ownTotal - targetTotal);
    const round = Number(game.combat?.round ?? 0);

    let winner = null;
    let loser = null;
    let winnerState = null;
    let resultText = "Égalité : aucun pilote ne prend l’ascendant.";
    let moveSquares = 0;
    let rotationDegrees = 0;

    if (ownTotal !== targetTotal) {
      const candidate = ownTotal > targetTotal ? this.actor : target;
      const other = candidate.id === this.actor.id ? target : this.actor;
      const candidateState = deriveShipState(candidate, candidate.id === this.actor.id ? ownSS : targetSS);
      if (candidateState.canTakeAdvantage) {
        winner = candidate;
        loser = other;
        winnerState = candidateState;
        const increments = Math.floor(margin / 5);
        moveSquares = 1 + increments;
        rotationDegrees = 90 * (1 + increments);
        resultText = `${winner.name} prend l’ascendant : ${moveSquares} case${moveSquares > 1 ? "s" : ""} de déplacement libre et jusqu’à ${rotationDegrees}° de changement de cap.`;
      } else {
        resultText = `${candidate.name} obtient le meilleur résultat, mais ne peut pas prendre l’ascendant dans son état actuel.`;
      }
    }

    const ownStatus = winner?.id === this.actor.id ? "won" : winner ? "lost" : ownTotal === targetTotal ? "tie" : "ineligible";
    const targetStatus = winner?.id === target.id ? "won" : winner ? "lost" : ownTotal === targetTotal ? "tie" : "ineligible";

    const commonOwn = {
      status: ownStatus,
      lastRound: round,
      opponentUuid: target.uuid,
      opponentName: target.name,
      ownTotal,
      opponentTotal: targetTotal,
      margin,
      moveSquares: winner?.id === this.actor.id ? moveSquares : 0,
      rotationDegrees: winner?.id === this.actor.id ? rotationDegrees : 0
    };
    const commonTarget = {
      status: targetStatus,
      lastRound: round,
      opponentUuid: this.actor.uuid,
      opponentName: this.actor.name,
      ownTotal: targetTotal,
      opponentTotal: ownTotal,
      margin,
      moveSquares: winner?.id === target.id ? moveSquares : 0,
      rotationDegrees: winner?.id === target.id ? rotationDegrees : 0
    };

    try {
      await this.#saveAdvantageResult(this.actor, commonOwn);
      await this.#saveAdvantageResult(target, commonTarget);
    } catch (error) {
      console.warn(`${MODULE_ID} | Impossible d'enregistrer le résultat d'ascendant sur les deux navires`, error);
    }

    const esc = foundry.utils.escapeHTML;
    const ownLines = ownNav.lines.length
      ? `<ul>${ownNav.lines.map((l) => `<li>${esc(l.label)} : ${l.value >= 0 ? "+" : ""}${l.value}</li>`).join("")}</ul>`
      : "<p>Aucun ajustement.</p>";
    const targetLines = targetNav.lines.length
      ? `<ul>${targetNav.lines.map((l) => `<li>${esc(l.label)} : ${l.value >= 0 ? "+" : ""}${l.value}</li>`).join("")}</ul>`
      : "<p>Aucun ajustement.</p>";

    const content = `
      <div class="pf1-ss-chat-card pf1-ss-advantage-card">
        <h3><i class="fa-solid fa-flag"></i> Ascendant${round ? ` — round ${round}` : ""}</h3>
        <p><strong>Vent :</strong> vers le ${esc(windward.directionLabel)}. ${esc(windward.note)}</p>
        <div class="pf1-ss-versus">
          <div>
            <h4>${esc(this.actor.name)}</h4>
            <p><strong>${ownTotal}</strong> = d20 + ${ownNav.totalModifier >= 0 ? "+" : ""}${ownNav.totalModifier}</p>
            ${ownLines}
          </div>
          <div class="versus">VS</div>
          <div>
            <h4>${esc(target.name)}</h4>
            <p><strong>${targetTotal}</strong> = d20 + ${targetNav.totalModifier >= 0 ? "+" : ""}${targetNav.totalModifier}</p>
            ${targetLines}
          </div>
        </div>
        <p class="pf1-ss-result ${winner ? "success" : "failure"}">${esc(resultText)}</p>
        ${winner ? `<p><strong>Marge :</strong> ${margin}. Le bonus augmente d’une case et de 90° par tranche complète de 5 points.</p>` : ""}
      </div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: ownNav.driver.actor }),
      content,
      rolls: [JSON.stringify(ownRoll.toJSON()), JSON.stringify(targetRoll.toJSON())]
    });

    await this.render();
  }


  async #performNavalManeuverRoll(target, { title, extraModifier = 0, allowWhileGrappled = false } = {}) {
    const ss = getSSShipData(this.actor);
    const targetSS = getSSShipData(target);
    const own = getNavalManeuverBreakdown(this.actor, ss, { extraModifier, allowWhileGrappled });
    const targetState = deriveShipState(target, targetSS);
    const targetCombat = effectiveVehicleCombatValues(target, targetState);

    if (own.impossibleReason) {
      ui.notifications.warn(own.impossibleReason);
      return null;
    }

    const roll = await new Roll(`1d20 + ${own.totalModifier}`).evaluate();
    const total = Number(roll.total ?? 0);
    const dc = Number(targetCombat.cmd ?? 0);
    const success = total >= dc;
    return { title, ss, targetSS, own, targetState, targetCombat, roll, total, dc, success, margin: total - dc };
  }

  async #postNavalManeuver(result, { details = "", damageRoll = null } = {}) {
    if (!result) return;
    const esc = foundry.utils.escapeHTML;
    const { own, targetCombat, roll, total, dc, success, title } = result;
    const target = result.target;
    const breakdown = own.lines.length
      ? `<ul>${own.lines.map((l) => `<li>${esc(l.label)} : ${l.value >= 0 ? "+" : ""}${l.value}${l.included ? " (inclus)" : ""}</li>`).join("")}</ul>`
      : "<p>Aucun ajustement supplémentaire.</p>";
    const content = `
      <div class="pf1-ss-chat-card pf1-ss-maneuver-card">
        <h3><i class="fa-solid fa-skull-crossbones"></i> ${esc(title)} — ${esc(this.actor.name)}</h3>
        <p><strong>Cible :</strong> ${esc(target.name)}</p>
        <p><strong>BMO naval :</strong> ${own.totalModifier >= 0 ? "+" : ""}${own.totalModifier} &nbsp; <strong>DMD cible :</strong> ${targetCombat.cmd}</p>
        ${breakdown}
        <p><strong>Résultat :</strong> ${total} contre ${dc} — marge ${result.margin >= 0 ? "+" : ""}${result.margin}.</p>
        <p class="pf1-ss-result ${success ? "success" : "failure"}">${success ? "RÉUSSITE" : "ÉCHEC"}</p>
        ${details}
      </div>`;

    const rolls = [JSON.stringify(roll.toJSON())];
    if (damageRoll) rolls.push(JSON.stringify(damageRoll.toJSON()));
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls
    });
  }

  async #setGrapplePair(target, { source = "grapple" } = {}) {
    const round = Number(game.combat?.round ?? 0);
    const ownSS = getSSShipData(this.actor);
    const targetSS = getSSShipData(target);
    ownSS.combat.grappledWithUuid = target.uuid;
    ownSS.combat.grappledWithName = target.name;
    ownSS.combat.grappleSource = source;
    ownSS.combat.grappleEstablishedRound = round;
    targetSS.combat.grappledWithUuid = this.actor.uuid;
    targetSS.combat.grappledWithName = this.actor.name;
    targetSS.combat.grappleSource = source;
    targetSS.combat.grappleEstablishedRound = round;

    await this.actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ownSS));
    try {
      await target.setFlag(MODULE_ID, "ship", normalizeSSShipData(targetSS));
    } catch (error) {
      console.warn(`${MODULE_ID} | Impossible d'enregistrer l'agrippement sur ${target.name}`, error);
    }

    // Le texte de règle place les navires adjacents et à vitesse 0 au round suivant.
    // Pour éviter un état incohérent dans Foundry, le contrôleur prépare immédiatement cette vitesse 0.
    await this.actor.update({ "system.details.currentSpeed": 0 });
    try {
      await target.update({ "system.details.currentSpeed": 0 });
    } catch (error) {
      console.warn(`${MODULE_ID} | Impossible de mettre la vitesse de ${target.name} à 0`, error);
    }
  }

  async #clearGrapplePair(target) {
    const ownSS = getSSShipData(this.actor);
    ownSS.combat.grappledWithUuid = "";
    ownSS.combat.grappledWithName = "";
    ownSS.combat.grappleSource = "";
    ownSS.combat.grappleEstablishedRound = 0;
    await this.actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ownSS));

    if (target) {
      const targetSS = getSSShipData(target);
      if (targetSS.combat.grappledWithUuid === this.actor.uuid || targetSS.combat.grappledWithName === this.actor.name) {
        targetSS.combat.grappledWithUuid = "";
        targetSS.combat.grappledWithName = "";
        targetSS.combat.grappleSource = "";
        targetSS.combat.grappleEstablishedRound = 0;
        try {
          await target.setFlag(MODULE_ID, "ship", normalizeSSShipData(targetSS));
        } catch (error) {
          console.warn(`${MODULE_ID} | Impossible d'effacer l'agrippement sur ${target.name}`, error);
        }
      }
    }
  }

  async #resolveStoredGrappleTarget() {
    const ss = getSSShipData(this.actor);
    if (!ss.combat.grappledWithUuid) return null;
    try {
      return await fromUuid(ss.combat.grappledWithUuid);
    } catch {
      return null;
    }
  }

  async #applyStructureDamage(target, rawDamage) {
    try {
      const result = await applyComponentDamage(target, "structure", rawDamage, {
        damageType: "physical",
        ignoreHardness: false,
        source: `Éperonnage de ${this.actor.name}`
      });
      return { ...result, applied: true, rawDamage: result.rawDamage, hardness: result.hardness };
    } catch (error) {
      console.warn(`${MODULE_ID} | Impossible d'appliquer les dégâts à ${target.name}`, error);
      const hardness = Math.max(0, Number(target.system?.attributes?.hardness?.total ?? 0));
      const effective = Math.max(0, Math.trunc(Number(rawDamage ?? 0)) - hardness);
      const before = Number(target.system?.attributes?.hp?.value ?? target.system?.attributes?.hp?.max ?? 0);
      return { applied: false, rawDamage, hardness, effective, before, after: before };
    }
  }

  static async #ramShip() {
    await this.#saveVisibleForm();
    const target = this.#getTargetVehicle();
    if (!target) {
      ui.notifications.warn("Éperonnage : cible exactement un token Vehicle adverse.");
      return;
    }

    const ss = getSSShipData(this.actor);
    const state = deriveShipState(this.actor, ss);
    if (state.speedCurrent < NAVAL_SQUARE_FEET) {
      ui.notifications.warn("Éperonnage : le navire doit s'être déplacé d'au moins une case navale (9 m / 30 ft). Sa vitesse actuelle est insuffisante.");
      return;
    }
    const proximity = getNavalProximity(this.actor, target);
    if (proximity.calculable && !proximity.adjacent) {
      ui.notifications.warn("Éperonnage : les tokens semblent trop éloignés. La proue doit terminer adjacente à la cible.");
      return;
    }
    if (proximity.calculable && proximity.arc !== "bow") {
      ui.notifications.warn(`Éperonnage : la cible est actuellement dans le secteur ${proximity.arcLabel.toLowerCase()}. Place-la devant la proue avant de résoudre la manœuvre.`);
      return;
    }

    const result = await this.#performNavalManeuverRoll(target, { title: "Éperonnage" });
    if (!result) return;
    result.target = target;

    // L'attaquant s'arrête quelle que soit l'issue de la manœuvre.
    await this.actor.update({ "system.details.currentSpeed": 0 });

    let damageRoll = null;
    let damageHtml = "";
    if (result.success) {
      const base = String(ss.ramDamage || "0").trim() || "0";
      const formula = ss.combat.ramEquipped ? `(${base} + 2d8)` : `(${base})`;
      const multiplier = result.margin >= 5 ? 2 : 1;
      damageRoll = await new Roll(`${formula} * ${multiplier}`).evaluate();
      const rawDamage = Math.max(0, Number(damageRoll.total ?? 0));

      let applied = null;
      if (ss.combat.autoApplyRamDamage) applied = await this.#applyStructureDamage(target, rawDamage);

      if (result.margin >= 10) {
        try { await target.update({ "system.details.currentSpeed": 0 }); } catch {}
        await this.#setGrapplePair(target, { source: "ram" });
      }

      damageHtml = `<p><strong>Dégâts d'éperonnage :</strong> ${rawDamage}${multiplier === 2 ? " (doublés grâce à une marge d’au moins 5)" : ""}${ss.combat.ramEquipped ? " ; éperon +2d8 inclus" : ""}.</p>`;
      if (applied) {
        damageHtml += applied.applied
          ? `<p><strong>Dégâts appliqués à la structure :</strong> ${applied.rawDamage} − solidité ${applied.hardness} = <strong>${applied.effective}</strong> ; PV ${applied.before} → ${applied.after}.</p>`
          : `<p>Le module n'a pas pu appliquer les dégâts automatiquement. Après solidité ${applied.hardness}, les dégâts effectifs seraient de <strong>${applied.effective}</strong>.</p>`;
      } else {
        const hardness = Number(target.system?.attributes?.hardness?.total ?? 0);
        damageHtml += `<p>Application automatique désactivée. La solidité affichée de la cible est ${hardness}.</p>`;
      }
      if (result.margin >= 10) damageHtml += `<p><strong>Marge d’au moins 10 :</strong> la vitesse de la cible tombe à 0. Les deux navires sont considérés comme agrippés.</p>`;
    } else {
      damageHtml = "<p>Aucun dégât d'éperonnage. Le navire attaquant s'arrête malgré l'échec.</p>";
    }

    const positionNote = proximity.calculable ? `<p class="hint">${foundry.utils.escapeHTML(proximity.note)}</p>` : "";
    await this.#postNavalManeuver(result, { details: positionNote + damageHtml, damageRoll });
    await this.render();
  }

  static async #grappleShip() {
    await this.#saveVisibleForm();
    const target = this.#getTargetVehicle();
    if (!target) {
      ui.notifications.warn("Agrippement : cible exactement un token Vehicle adverse.");
      return;
    }
    const ss = getSSShipData(this.actor);
    if (ss.combat.grappledWithUuid) {
      ui.notifications.warn(`${this.actor.name} est déjà agrippé à ${ss.combat.grappledWithName || "un autre navire"}.`);
      return;
    }
    const proximity = getNavalProximity(this.actor, target);
    if (proximity.calculable && !proximity.adjacent) {
      ui.notifications.warn("Agrippement : les navires doivent être dans un rayon d'une case navale (9 m / 30 ft).");
      return;
    }

    const result = await this.#performNavalManeuverRoll(target, { title: "Agrippement" });
    if (!result) return;
    result.target = target;
    let details = `<p>${foundry.utils.escapeHTML(proximity.note ?? "")}</p>`;
    if (result.success) {
      await this.#setGrapplePair(target, { source: "grapple" });
      details += `<p><strong>Agrippement réussi :</strong> les navires sont liés. La règle prévoit qu'au round suivant ils soient adjacents et à vitesse 0 ; le module prépare immédiatement les deux vitesses à 0 pour éviter l'oubli.</p>`;
    }
    await this.#postNavalManeuver(result, { details });
    await this.render();
  }

  static async #mutualGrapple() {
    await this.#saveVisibleForm();
    const target = this.#getTargetVehicle();
    if (!target) {
      ui.notifications.warn("Agrippement mutuel : cible exactement un token Vehicle adverse.");
      return;
    }
    const ownSS = getSSShipData(this.actor);
    const targetSS = getSSShipData(target);
    const ownState = deriveShipState(this.actor, ownSS);
    const targetState = deriveShipState(target, targetSS);
    if (!getDriverData(this.actor).actor || !getDriverData(target).actor) {
      ui.notifications.warn("Agrippement mutuel : les deux navires doivent avoir un pilote assigné.");
      return;
    }
    if (ownState.crewInsufficient || targetState.crewInsufficient) {
      ui.notifications.warn("Agrippement mutuel : les deux navires doivent disposer d'au moins la moitié de leur équipage requis.");
      return;
    }
    if (ownSS.combat.grappledWithUuid || targetSS.combat.grappledWithUuid) {
      ui.notifications.warn("Agrippement mutuel : l'un des navires est déjà agrippé.");
      return;
    }
    const proximity = getNavalProximity(this.actor, target);
    if (proximity.calculable && !proximity.adjacent) {
      ui.notifications.warn("Agrippement mutuel : les navires doivent être à une case navale ou moins.");
      return;
    }
    await this.#setGrapplePair(target, { source: "mutual" });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-link"></i> Agrippement mutuel</h3><p><strong>${foundry.utils.escapeHTML(this.actor.name)}</strong> et <strong>${foundry.utils.escapeHTML(target.name)}</strong> veulent tous deux s'agripper : la manœuvre réussit automatiquement.</p><p>Le module prépare les deux vitesses à 0. Dans la règle, le positionnement adjacent et la vitesse 0 prennent effet au round suivant.</p></div>`
    });
    await this.render();
  }

  static async #breakGrapple() {
    await this.#saveVisibleForm();
    const target = await this.#resolveStoredGrappleTarget();
    if (!target || target.type !== "vehicle") {
      ui.notifications.warn("Ce navire n'est pas lié à un autre Vehicle identifiable.");
      return;
    }
    const result = await this.#performNavalManeuverRoll(target, { title: "Libérer le navire de l’agrippement", extraModifier: -4, allowWhileGrappled: true });
    if (!result) return;
    result.target = target;
    let details = "<p><strong>Malus spécifique :</strong> −4 au test de manœuvre offensive pour se libérer.</p>";
    if (result.success) {
      await this.#clearGrapplePair(target);
      details += "<p>Les cordes et grappins sont tranchés : le navire peut de nouveau se déplacer normalement.</p>";
    }
    await this.#postNavalManeuver(result, { details });
    await this.render();
  }

  static async #boardShip() {
    await this.#saveVisibleForm();
    const ss = getSSShipData(this.actor);
    const target = await this.#resolveStoredGrappleTarget();
    if (!target || target.type !== "vehicle") {
      ui.notifications.warn("Abordage : le navire doit d'abord être agrippé à un autre navire.");
      return;
    }

    const usesCorvus = Boolean(ss.combat.usesCorvus);
    const ownDriver = getDriverData(this.actor).actor;
    const targetDriver = getDriverData(target).actor;
    const combat = game.combat;
    const initiativeOf = (actor) => {
      if (!combat || !actor) return null;
      const c = combat.combatants.find((entry) => entry.actor?.id === actor.id || entry.actor?.uuid === actor.uuid);
      return Number.isFinite(Number(c?.initiative)) ? Number(c.initiative) : null;
    };
    const ownInit = initiativeOf(ownDriver);
    const targetInit = initiativeOf(targetDriver);
    let initiativeText = "L'initiative des pilotes n'a pas pu être comparée automatiquement.";
    if (ownInit !== null && targetInit !== null) {
      if (ownInit > targetInit) initiativeText = `${this.actor.name} a le pilote avec l'initiative la plus élevée (${ownInit} contre ${targetInit}) : il choisit d'aborder en premier ou d'attendre.`;
      else if (targetInit > ownInit) initiativeText = `${target.name} a le pilote avec l'initiative la plus élevée (${targetInit} contre ${ownInit}) : il choisit d'aborder en premier ou d'attendre.`;
      else initiativeText = `Les pilotes sont à égalité d'initiative (${ownInit}). Le MJ tranche l'ordre de choix.`;
    }

    const flatFooted = usesCorvus
      ? "Les personnages qui utilisent le corbeau ne sont pas considérés comme pris au dépourvu au premier round."
      : "Les personnages qui montent à l'abordage sont pris au dépourvu pendant le premier round de l'abordage.";

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-person-running"></i> Abordage — ${foundry.utils.escapeHTML(this.actor.name)} → ${foundry.utils.escapeHTML(target.name)}</h3><p>${foundry.utils.escapeHTML(initiativeText)}</p><p><strong>${foundry.utils.escapeHTML(flatFooted)}</strong></p><p>Le combat naval laisse maintenant place au combat normal à bord des navires.</p></div>`
    });
    const { BoardingController } = await import("./boarding-controller.mjs");
    BoardingController.open(this.actor);
  }

  static async #shearOars() {
    await this.#saveVisibleForm();
    const target = this.#getTargetVehicle();
    if (!target) {
      ui.notifications.warn("Cisaillement : cible exactement un token Vehicle adverse.");
      return;
    }
    const targetSS = getSSShipData(target);
    const ownSS = getSSShipData(this.actor);
    const shearPlan = ownSS.map?.shearPlan;
    const hasPreparedRoute = Boolean(shearPlan?.active && shearPlan?.targetUuid === target.uuid);
    if (!targetSS.oars?.max || targetSS.oars.max <= 0) {
      ui.notifications.warn("Cisaillement : la cible n'a pas de rames configurées dans le contrôleur Skull & Shackles.");
      return;
    }
    if (!["muscles", "mixed"].includes(targetSS.navigation?.propulsionMode)) {
      ui.notifications.warn("Cisaillement : la cible n'utilise pas actuellement une propulsion par muscles/rames.");
      return;
    }
    if (hasPreparedRoute) {
      if (!shearPlan.valid) {
        ui.notifications.warn(`Cisaillement : le trajet préparé est invalide${shearPlan.reason ? ` — ${shearPlan.reason}` : "."}`);
        return;
      }
      if (!shearPlan.complete || Number(shearPlan.progress ?? 0) < Number(shearPlan.requiredSquares ?? 0)) {
        ui.notifications.warn(`Cisaillement : trajet incomplet (${Number(shearPlan.progress ?? 0)} / ${Number(shearPlan.requiredSquares ?? 0)} cases).`);
        return;
      }
    } else {
      const targetGeometry = getRelativeNavalGeometry(target, this.actor, targetSS);
      if (targetGeometry.calculable && (Number(targetGeometry.distanceSquares ?? 99) !== 0 || !["bow", "stern"].includes(targetGeometry.arc))) {
        ui.notifications.warn("Cisaillement : la manœuvre doit commencer directement adjacente à la case avant ou arrière de la cible, ou utiliser un trajet préparé depuis la Carte navale.");
        return;
      }
    }

    const result = await this.#performNavalManeuverRoll(target, { title: "Cisaillement des rames" });
    if (!result) return;
    result.target = target;
    let details = hasPreparedRoute
      ? `<p><strong>Trajet préparé :</strong> ${Number(shearPlan.progress ?? 0)} / ${Number(shearPlan.requiredSquares ?? 0)} cases adjacentes validées le long du flanc ${foundry.utils.escapeHTML(shearPlan.side || "indéterminé")}.</p>`
      : `<p><strong>Condition positionnelle :</strong> le module a vérifié le départ à la proue ou à la poupe. Sans planificateur de Carte navale, le suivi de toute la longueur reste à valider par le MJ.</p>`;
    if (result.success) {
      const updatedTargetSS = getSSShipData(target);
      const half = Math.max(0, updatedTargetSS.oars.max / 2);
      updatedTargetSS.oars.value = Math.min(Number(updatedTargetSS.oars.value ?? updatedTargetSS.oars.max), half);
      try {
        await target.setFlag(MODULE_ID, "ship", normalizeSSShipData(updatedTargetSS));
        const refreshed = deriveShipState(target, getSSShipData(target));
        const current = Number(target.system?.details?.currentSpeed ?? 0);
        if (current > refreshed.effectiveMaxSpeed) await target.update({ "system.details.currentSpeed": refreshed.effectiveMaxSpeed });
        details += `<p><strong>Rames brisées :</strong> leurs PV sont ramenés à ${updatedTargetSS.oars.value} / ${updatedTargetSS.oars.max}. La vitesse maximale de la propulsion concernée est divisée par deux et le navire ne peut plus prendre l'ascendant tant que les rames ne sont pas réparées.</p>`;
      } catch (error) {
        console.warn(`${MODULE_ID} | Impossible d'appliquer le cisaillement à ${target.name}`, error);
        details += "<p>Réussite, mais le module n'a pas pu modifier les rames de la cible (permissions insuffisantes). Applique manuellement l'état Brisé aux rames.</p>";
      }
    }
    await this.#postNavalManeuver(result, { details });
    if (hasPreparedRoute) await cancelShearPlan(this.actor);
    await this.render();
  }


  static async #applyDamage() {
    await this.#saveVisibleForm();
    const ss = getSSShipData(this.actor);
    const formula = String(ss.damage?.formula || "1d6").trim() || "1d6";
    let damageRoll;
    try {
      damageRoll = await new Roll(formula).evaluate();
    } catch (error) {
      ui.notifications.error(`Formule de dégâts invalide : ${formula}`);
      return;
    }

    const result = await applyComponentDamage(this.actor, ss.damage.component, Number(damageRoll.total ?? 0), {
      damageType: ss.damage.type,
      ignoreHardness: ss.damage.ignoreHardness,
      source: "Dégâts ciblés"
    });

    let fireSaveRoll = null;
    let fireSaveHtml = "";
    if (ss.damage.type === "fire" && result.effective > 0 && !result.afterState.sunk) {
      const save = getShipGenericSave(this.actor);
      const dc = 10 + result.effective;
      fireSaveRoll = await new Roll(`1d20 + ${save}`).evaluate();
      const success = Number(fireSaveRoll.total ?? 0) >= dc;
      if (!success) await setShipOnFire(this.actor, true);
      fireSaveHtml = `<p><strong>Risque d'incendie :</strong> jet de Vigueur ${Number(fireSaveRoll.total ?? 0)} contre DD ${dc} (10 + dégâts subis) — <strong>${success ? "réussite, pas d'incendie" : "échec, le navire prend feu"}</strong>.</p>`;
    }

    const esc = foundry.utils.escapeHTML;
    const vulnerability = result.multiplier > 1 ? `<p><strong>Vulnérabilité :</strong> les voiles subissent ×${result.multiplier} contre le ${esc(result.damageTypeLabel.toLowerCase())}.</p>` : "";
    const hardnessText = result.ignoreHardness
      ? `solidité ignorée (valeur normale ${result.hardness})`
      : `solidité ${result.hardness}`;
    let sinkingText = "";
    if (result.beforeState.sinking && result.effective > 25 && result.sinkingChange?.changed) {
      sinkingText = `<p><strong>Naufrage accéléré :</strong> ce coup supplémentaire inflige plus de 25 dégâts effectifs ; il reste ${result.sinkingChange.remaining} round(s) avant de couler.</p>`;
    }

    const rolls = [JSON.stringify(damageRoll.toJSON())];
    if (fireSaveRoll) rolls.push(JSON.stringify(fireSaveRoll.toJSON()));
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-burst"></i> Dégâts ciblés — ${esc(this.actor.name)}</h3><p><strong>Cible :</strong> ${esc(result.componentLabel)} ; <strong>type :</strong> ${esc(result.damageTypeLabel)}.</p><p><strong>Dégâts :</strong> ${result.rawDamage}${result.multiplier > 1 ? ` × ${result.multiplier} = ${result.multipliedDamage}` : ""} ; ${hardnessText} ; dégâts effectifs <strong>${result.effective}</strong>.</p><p><strong>PV du composant :</strong> ${result.before} → ${result.after}.</p>${vulnerability}${fireSaveHtml}${sinkingText}</div>`,
      rolls
    });
    await this.render();
  }

  static async #igniteShip() {
    await this.#saveVisibleForm();
    const state = deriveShipState(this.actor, getSSShipData(this.actor));
    if (state.sunk) {
      ui.notifications.warn("Le navire a déjà coulé.");
      return;
    }
    const result = await setShipOnFire(this.actor, true);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-fire"></i> Incendie — ${foundry.utils.escapeHTML(this.actor.name)}</h3><p>${result.changed ? "Le navire prend feu." : "Le navire était déjà en feu."} Chaque round de feu inflige normalement <strong>2d6 dégâts de feu en ignorant la solidité</strong>.</p></div>`
    });
    await this.render();
  }

  static async #resolveFireRound() {
    await this.#saveVisibleForm();
    const ss = getSSShipData(this.actor);
    if (!ss.fire.active) {
      ui.notifications.warn("Ce navire n'est pas actuellement en feu.");
      return;
    }
    const damageRoll = await new Roll("2d6").evaluate();
    const result = await applyComponentDamage(this.actor, "structure", Number(damageRoll.total ?? 0), {
      damageType: "fire",
      ignoreHardness: true,
      source: "Incendie à bord"
    });
    const round = await advanceFireRound(this.actor);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-fire-flame-curved"></i> Incendie — round ${round}</h3><p><strong>${foundry.utils.escapeHTML(this.actor.name)}</strong> subit ${result.rawDamage} dégâts de feu. La solidité est ignorée.</p><p>Structure : ${result.before} → ${result.after} PV.</p></div>`,
      rolls: [JSON.stringify(damageRoll.toJSON())]
    });
    await this.render();
  }

  static async #extinguishShip() {
    await this.#saveVisibleForm();
    const ss = getSSShipData(this.actor);
    const state = deriveShipState(this.actor, ss);
    if (!ss.fire.active) {
      ui.notifications.warn("Ce navire n'est pas actuellement en feu.");
      return;
    }
    if (state.crewCurrent <= 0) {
      ui.notifications.warn("Aucun équipage n'est disponible pour combattre l'incendie.");
      return;
    }

    const save = getShipGenericSave(this.actor);
    const dc = 15 + Number(ss.fire.roundsElapsed ?? 0);
    const saveRoll = await new Roll(`1d20 + ${save}`).evaluate();
    const success = Number(saveRoll.total ?? 0) >= dc;
    const slowdown = await applyUncontrolledSlowdown(this.actor);
    let damageRoll = null;
    let damageText = "";

    if (success) {
      await extinguishFire(this.actor);
    } else {
      damageRoll = await new Roll("2d6").evaluate();
      const damage = await applyComponentDamage(this.actor, "structure", Number(damageRoll.total ?? 0), {
        damageType: "fire",
        ignoreHardness: true,
        source: "Échec d'extinction"
      });
      const round = await advanceFireRound(this.actor);
      damageText = `<p>Échec : le feu continue pour le round ${round} et inflige <strong>${damage.rawDamage}</strong> dégâts de feu, solidité ignorée. Structure ${damage.before} → ${damage.after} PV.</p>`;
    }

    const rolls = [JSON.stringify(saveRoll.toJSON())];
    if (damageRoll) rolls.push(JSON.stringify(damageRoll.toJSON()));
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-bucket"></i> Combattre l'incendie — ${foundry.utils.escapeHTML(this.actor.name)}</h3><p><strong>Action complexe de l'équipage.</strong> Jet de Réflexes ${Number(saveRoll.total ?? 0)} contre DD ${dc}.</p><p class="pf1-ss-result ${success ? "success" : "failure"}">${success ? "INCENDIE ÉTEINT" : "ÉCHEC"}</p>${damageText}<p>Comme l'équipage combat les flammes, le navire accomplit l'action <strong>Incontrôlé</strong> : vitesse ${formatDistance(slowdown.before)} → ${formatDistance(slowdown.after)}.</p></div>`,
      rolls
    });
    await this.render();
  }

  static async #ordinaryRepair() {
    await this.#saveVisibleForm();
    const ss = getSSShipData(this.actor);
    const modifier = Number(ss.repair.modifier ?? 0);
    const roll = await new Roll(`1d20 + ${modifier}`).evaluate();
    const success = Number(roll.total ?? 0) >= 10;
    const amount = success ? 10 : 5;
    const result = await applyComponentRepair(this.actor, ss.repair.component, amount, { magical: false });
    const esc = foundry.utils.escapeHTML;
    const outcome = result.applied
      ? `<p>${success ? "Réussite" : "Échec"} au test : <strong>${amount} PV réparés</strong>. ${result.componentLabel} : ${result.before} → ${result.after} PV.</p>`
      : `<p><strong>Réparation non appliquée :</strong> ${esc(result.reason)}</p>`;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-hammer"></i> Réparation ordinaire — ${esc(this.actor.name)}</h3><p>Test DD 10 : ${Number(roll.total ?? 0)} avec un bonus de ${modifier >= 0 ? "+" : ""}${modifier}. La procédure représente <strong>une journée de travail et 10 po de matériaux</strong>.</p>${outcome}</div>`,
      rolls: [JSON.stringify(roll.toJSON())]
    });
    await this.render();
  }

  static async #makeWholeRepair() {
    await this.#saveVisibleForm();
    const ss = getSSShipData(this.actor);
    const level = Math.max(1, Number(ss.repair.casterLevel ?? 1));
    const state = deriveShipState(this.actor, ss);
    if (state.sunk) {
      ui.notifications.warn("Un navire qui a complètement coulé est détruit et ne peut plus être réparé.");
      return;
    }
    const roll = await new Roll(`${level}d6`).evaluate();
    const result = await applyComponentRepair(this.actor, "structure", Number(roll.total ?? 0), { magical: true });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-wand-magic-sparkles"></i> Réparation intégrale — ${foundry.utils.escapeHTML(this.actor.name)}</h3><p>NLS ${level} : récupération de <strong>${Number(roll.total ?? 0)} PV</strong> (1d6 par niveau).</p><p>Structure : ${result.before} → ${result.after} PV.${result.after > 0 && state.sinking ? " Le navire est ramené au-dessus de 0 PV avant d'avoir sombré : le naufrage est interrompu." : ""}</p></div>`,
      rolls: [JSON.stringify(roll.toJSON())]
    });
    await this.render();
  }

  static async #clearForcedDc() {
    await this.#setForcedDc(this.actor, 0, "");
    ui.notifications.info("DD de navigation imposé supprimé.");
    await this.render();
  }

  static async #openVehicleSheet() {
    this.actor.sheet?.render(true);
  }

  static async #openDashboard() {
    game.modules.get(MODULE_ID)?.api?.openDashboard?.(this.actor);
  }

  static async #openNavalMap() {
    NavalMapController.open(this.actor);
  }

  static async #openHazards() {
    game.modules.get(MODULE_ID)?.api?.openHazards?.(this.actor);
  }

  static async #openImprovements() {
    ShipImprovementsController.open(this.actor);
  }

  static async #openVoyage() {
    VoyageController.open(this.actor);
  }

  static async #openPiracy() {
    PiracyController.open(this.actor);
  }

  static async #openSiegeController() {
    SiegeController.open(this.actor);
  }

  static async #openReputationController() {
    ReputationController.open(this.actor);
  }

  static async #openDisguise() { ShipDisguiseController.open(this.actor); }

  static async #openFleetRecruitment() {
    const { FleetRecruitmentController } = await import("./fleet-recruitment-controller.mjs");
    FleetRecruitmentController.open(this.actor);
  }

  static async #openFleetController() {
    FleetController.open(this.actor);
  }

  static async #openLifeController() {
    LifeController.open(this.actor);
  }

  static async #openEntertainmentController() {
    EntertainmentController.open(this.actor);
  }

  static async #openBoardingController() {
    const { BoardingController } = await import("./boarding-controller.mjs");
    BoardingController.open(this.actor);
  }

  static async #openLibraryController() {
    LibraryController.open(this.actor);
  }

  static async #openShipWizard() {
    ShipWizard.open(this.actor);
  }
}
