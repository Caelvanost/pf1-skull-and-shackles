import {
  MODULE_ID,
  NAVAL_SQUARE_FEET,
  getSSShipData,
  normalizeSSShipData,
  deriveShipState,
  getDirectionLabel,
  getSceneWindDirection,
  getWindState,
  getNavalScaleInfo,
  getRelativeNavalGeometry,
  getShipNavalLengthSquares,
  turnHeading,
  formatDistance,
  formatNavalSquares,
  getActorCanvasToken
} from "./ship-data.mjs";
import {
  syncTokenHeading,
  moveTokenOneNavalSquare,
  setShipHeading,
  configureNavalSceneScale,
  refreshWindOverlay,
  beginShearPlan,
  cancelShearPlan,
  updateShearPlanAfterMove
} from "./naval-map-tools.mjs";
import { refreshNavalVisualOverlay } from "./naval-visuals.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function targetVehicle(exceptActor) {
  const targets = [...(game.user?.targets ?? [])]
    .map((token) => token.actor)
    .filter((actor) => actor?.type === "vehicle" && actor.id !== exceptActor?.id);
  return targets.length === 1 ? targets[0] : null;
}

function currentRound() {
  return Math.max(0, Number(game.combat?.round ?? 0));
}

function effectiveMapState(ss, round) {
  const storedRound = Number(ss.map?.movementRound ?? 0);
  const sameRound = round > 0 && storedRound === round;
  return {
    speedSquaresSpent: sameRound ? Number(ss.map?.speedSquaresSpent ?? 0) : 0,
    advantageSquaresSpent: sameRound ? Number(ss.map?.advantageSquaresSpent ?? 0) : 0,
    advantageRotationSpent: sameRound ? Number(ss.map?.advantageRotationSpent ?? 0) : 0,
    reverseUsed: round > 0 && Number(ss.map?.reverseUsedRound ?? 0) === round
  };
}

export class NavalMapController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-naval-map", "standard-form"],
    tag: "form",
    position: { width: 780, height: "auto" },
    window: { icon: "fa-solid fa-map", resizable: true },
    actions: {
      syncHeading: this.#syncHeading,
      saveMapSettings: this.#saveMapSettings,
      applyHeading: this.#applyHeading,
      randomizeWind: this.#randomizeWind,
      configureScale: this.#configureScale,
      moveForward: this.#moveForward,
      moveForwardPort: this.#moveForwardPort,
      moveForwardStarboard: this.#moveForwardStarboard,
      moveBackward: this.#moveBackward,
      moveBackwardPort: this.#moveBackwardPort,
      moveBackwardStarboard: this.#moveBackwardStarboard,
      advMoveForward: this.#advMoveForward,
      advMoveForwardPort: this.#advMoveForwardPort,
      advMoveForwardStarboard: this.#advMoveForwardStarboard,
      advMovePort: this.#advMovePort,
      advMoveStarboard: this.#advMoveStarboard,
      advMoveBackward: this.#advMoveBackward,
      advMoveBackwardPort: this.#advMoveBackwardPort,
      advMoveBackwardStarboard: this.#advMoveBackwardStarboard,
      toggleZones: this.#toggleZones,
      toggleReachable: this.#toggleReachable,
      beginShearPlan: this.#beginShearPlan,
      cancelShearPlan: this.#cancelShearPlan,
      advantagePort: this.#advantagePort,
      advantageStarboard: this.#advantageStarboard,
      resetRoundMovement: this.#resetRoundMovement,
      centerOnShip: this.#centerOnShip,
      openShipController: this.#openShipController,
      refresh: this.#refresh
    },
    form: { handler: this.#onSubmit, closeOnSubmit: false }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/naval-map-controller.hbs` }
  };

  constructor(actor, options = {}) {
    super({
      id: `pf1-ss-naval-map-${actor.id}`,
      ...options,
      window: { ...(options.window ?? {}), title: `Skull & Shackles — Carte navale — ${actor.name}` }
    });
    this.actor = actor;
  }

  static open(actor) {
    if (!actor || actor.type !== "vehicle") {
      ui.notifications.warn("Skull & Shackles : sélectionne un token lié à un Vehicle PF1.");
      return null;
    }
    const app = new NavalMapController(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const ss = getSSShipData(this.actor);
    const state = deriveShipState(this.actor, ss);
    const round = currentRound();
    const spent = effectiveMapState(ss, round);
    const token = getActorCanvasToken(this.actor);
    const target = targetVehicle(this.actor);
    const geometry = target ? getRelativeNavalGeometry(this.actor, target, ss) : null;
    const targetSS = target ? getSSShipData(target) : null;
    const targetRelativeGeometry = target ? getRelativeNavalGeometry(target, this.actor, targetSS) : null;
    const scale = getNavalScaleInfo();
    const wind = getWindState(this.actor, ss);
    const speedBudget = Math.max(0, Math.floor(Number(state.speedCurrent ?? 0) / NAVAL_SQUARE_FEET));
    const advantageValid = round > 0 && ss.advantage?.status === "won" && Number(ss.advantage?.lastRound ?? 0) === round;
    const advantageMoveBudget = advantageValid ? Number(ss.advantage?.moveSquares ?? 0) : 0;
    const advantageRotationBudget = advantageValid ? Number(ss.advantage?.rotationDegrees ?? 0) : 0;
    const speedRemaining = Math.max(0, speedBudget - spent.speedSquaresSpent);
    const advantageMoveRemaining = Math.max(0, advantageMoveBudget - spent.advantageSquaresSpent);
    const advantageRotationRemaining = Math.max(0, advantageRotationBudget - spent.advantageRotationSpent);

    const movementSources = [
      { value: "speed", label: "Vitesse actuelle", selected: ss.map?.movementSource !== "advantage" },
      { value: "advantage", label: "Déplacement gratuit d’ascendant", selected: ss.map?.movementSource === "advantage" }
    ];
    const headings = ["N", "E", "S", "W"].map((value) => ({
      value,
      label: getDirectionLabel(value),
      selected: value === ss.navigation?.heading
    }));

    return {
      ...context,
      actor: this.actor,
      ss,
      state,
      tokenReady: Boolean(token),
      tokenName: token?.name ?? token?.document?.name ?? "Aucun token",
      round,
      scale,
      scaleLabel: scale.valid
        ? `${scale.gridDistance} ${scale.units} par case Foundry → 1 case navale = ${Math.round(scale.pixels * 10) / 10}px`
        : "Échelle de scène indisponible",
      wind,
      windDirection: getSceneWindDirection(),
      headings,
      movementSources,
      budgets: {
        speed: speedBudget,
        speedSpent: spent.speedSquaresSpent,
        speedRemaining,
        advantageMove: advantageMoveBudget,
        advantageMoveSpent: spent.advantageSquaresSpent,
        advantageMoveRemaining,
        advantageRotation: advantageRotationBudget,
        advantageRotationSpent: spent.advantageRotationSpent,
        advantageRotationRemaining,
        reverseUsed: spent.reverseUsed
      },
      movementBlocked: Boolean(state.sunk || state.sinking || ss.combat?.grappledWithUuid),
      visuals: { showZones: Boolean(ss.map?.showZones), showReachable: Boolean(ss.map?.showReachable) },
      shearPlan: {
        ...(ss.map?.shearPlan ?? {}),
        active: Boolean(ss.map?.shearPlan?.active),
        sideLabel: ({ port: "bâbord", starboard: "tribord" })[ss.map?.shearPlan?.side] ?? "",
        progressLabel: `${Number(ss.map?.shearPlan?.progress ?? 0)} / ${Number(ss.map?.shearPlan?.requiredSquares ?? 0)} case(s)`
      },
      target: target ? {
        name: target.name,
        uuid: target.uuid,
        geometry,
        targetRelativeGeometry,
        lengthSquares: getShipNavalLengthSquares(target, targetSS),
        arcClass: geometry?.arc ?? "unknown",
        distanceLabel: geometry?.calculable ? `${geometry.distanceSquares} case${geometry.distanceSquares === 1 ? "" : "s"} navale${geometry.distanceSquares === 1 ? "" : "s"}` : "indéterminée",
        ramReady: Boolean(geometry?.calculable && geometry?.ramPosition),
        grappleReady: Boolean(geometry?.calculable && geometry?.adjacent),
        broadsidePort: geometry?.arc === "port",
        broadsideStarboard: geometry?.arc === "starboard",
        shearStartReady: Boolean(targetRelativeGeometry?.calculable && Number(targetRelativeGeometry?.distanceSquares ?? 99) === 0 && ["bow", "stern"].includes(targetRelativeGeometry?.arc))
      } : null,
      displays: {
        currentSpeed: formatDistance(state.speedCurrent),
        currentSpeedSquares: formatNavalSquares(state.speedCurrent),
        heading: getDirectionLabel(ss.navigation?.heading),
        wind: getDirectionLabel(getSceneWindDirection())
      }
    };
  }

  static async #onSubmit(event, form, formData) {
    const object = formData.object ?? formData.toObject?.() ?? Object.fromEntries(formData.entries());
    const raw = foundry.utils.expandObject(object);
    const stored = getSSShipData(this.actor);
    const map = raw.map ?? {};
    stored.map.rotationOffset = Number(map.rotationOffset ?? stored.map.rotationOffset ?? 0);
    stored.map.navalLengthOverride = Math.max(0, Math.trunc(Number(map.navalLengthOverride ?? stored.map.navalLengthOverride ?? 0)));
    stored.map.movementSource = map.movementSource === "advantage" ? "advantage" : "speed";
    await this.actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(stored));
    refreshNavalVisualOverlay(this.actor);
  }

  async #saveVisibleForm() {
    try { await this.submit(); }
    catch (error) { console.warn(`${MODULE_ID} | Impossible d'enregistrer la carte navale`, error); }
  }

  async #prepareRoundState(ss) {
    const round = currentRound();
    if (round > 0 && Number(ss.map?.movementRound ?? 0) !== round) {
      ss.map.movementRound = round;
      ss.map.speedSquaresSpent = 0;
      ss.map.advantageSquaresSpent = 0;
      ss.map.advantageRotationSpent = 0;
      await this.actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
    }
    return { ss: getSSShipData(this.actor), round };
  }

  static async #saveMapSettings() {
    await this.#saveVisibleForm();
    ui.notifications.info("Réglages de carte navale enregistrés.");
    await this.render();
  }

  static async #syncHeading() {
    await this.#saveVisibleForm();
    const ok = await syncTokenHeading(this.actor, getSSShipData(this.actor), { notify: true });
    if (ok) ui.notifications.info("Orientation du token synchronisée avec le cap du navire.");
    await this.render();
  }

  static async #applyHeading(event, target) {
    await this.#saveVisibleForm();
    const select = this.element?.querySelector?.('select[name="headingOverride"]');
    const heading = select?.value ?? "N";
    try {
      await setShipHeading(this.actor, heading, { syncToken: true });
      ui.notifications.info(`${this.actor.name} : cap ${getDirectionLabel(heading)}.`);
    } catch (error) {
      ui.notifications.error(error.message);
    }
    await this.render();
  }

  static async #randomizeWind() {
    if (!canvas?.scene) return ui.notifications.warn("Aucune scène active.");
    if (!canvas.scene.isOwner && !game.user?.isGM) return ui.notifications.warn("Permission insuffisante pour modifier le vent de la scène.");
    const roll = await new Roll("1d4").evaluate();
    const direction = ({ 1: "N", 2: "E", 3: "S", 4: "W" })[Number(roll.total)] ?? "N";
    await canvas.scene.setFlag(MODULE_ID, "windDirection", direction);
    refreshWindOverlay();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-wind"></i> Vent de la scène</h3><p>Le vent souffle vers le <strong>${foundry.utils.escapeHTML(getDirectionLabel(direction))}</strong>.</p></div>`
    });
    await this.render();
  }

  static async #configureScale() {
    const scale = getNavalScaleInfo();
    const target = scale.metric ? "9 m" : "30 ft";
    if (!window.confirm(`Configurer la grille de la scène pour que chaque case Foundry représente directement une case navale (${target}) ?\n\nLe visuel de la grille ne change pas, mais sa distance de mesure sera modifiée.`)) return;
    try {
      const updated = await configureNavalSceneScale();
      ui.notifications.info(`Grille navale configurée : ${updated.distance} ${updated.units} par case.`);
      refreshWindOverlay();
    } catch (error) {
      ui.notifications.error(error.message);
    }
    await this.render();
  }

  async #move(relative, { reverse = false } = {}) {
    await this.#saveVisibleForm();
    let ss = getSSShipData(this.actor);
    const prepared = await this.#prepareRoundState(ss);
    ss = prepared.ss;
    const round = prepared.round;
    const state = deriveShipState(this.actor, ss);
    if (state.sunk) return ui.notifications.warn("Le navire a coulé.");
    if (state.sinking) return ui.notifications.warn("Le navire est en plein naufrage et ne peut plus se déplacer.");
    if (ss.combat?.grappledWithUuid) return ui.notifications.warn("Le navire est agrippé et doit d'abord se libérer.");

    if (reverse) {
      if (state.speedCurrent > 0) return ui.notifications.warn("Arrière toute ! exige une vitesse actuelle de 0.");
      if (round > 0 && Number(ss.map.reverseUsedRound ?? 0) === round) return ui.notifications.warn("Le recul d’Arrière toute ! a déjà été utilisé ce round.");
    } else {
      const budget = Math.floor(Number(state.speedCurrent ?? 0) / NAVAL_SQUARE_FEET);
      if (Number(ss.map.speedSquaresSpent ?? 0) >= budget) return ui.notifications.warn("Toute la distance autorisée par la vitesse actuelle a déjà été dépensée ce round.");
    }

    try {
      await moveTokenOneNavalSquare(this.actor, relative, ss);
    } catch (error) {
      return ui.notifications.error(error.message);
    }

    ss = getSSShipData(this.actor);
    if (reverse) {
      if (round > 0) ss.map.reverseUsedRound = round;
    } else ss.map.speedSquaresSpent = Number(ss.map.speedSquaresSpent ?? 0) + 1;
    if (round > 0) ss.map.movementRound = round;
    await this.actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
    await updateShearPlanAfterMove(this.actor);
    refreshNavalVisualOverlay(this.actor);
    await this.render();
  }

  static async #moveForward() { await this.#move("forward"); }
  static async #moveForwardPort() { await this.#move("forwardPort"); }
  static async #moveForwardStarboard() { await this.#move("forwardStarboard"); }
  static async #moveBackward() { await this.#move("backward", { reverse: true }); }
  static async #moveBackwardPort() { await this.#move("backwardPort", { reverse: true }); }
  static async #moveBackwardStarboard() { await this.#move("backwardStarboard", { reverse: true }); }

  async #moveAdvantage(relative) {
    await this.#saveVisibleForm();
    let ss = getSSShipData(this.actor);
    const prepared = await this.#prepareRoundState(ss);
    ss = prepared.ss;
    const round = prepared.round;
    const state = deriveShipState(this.actor, ss);
    if (state.sunk || state.sinking) return ui.notifications.warn("Ce navire ne peut plus se déplacer.");
    if (ss.combat?.grappledWithUuid) return ui.notifications.warn("Le navire est agrippé et doit d'abord se libérer.");
    const valid = round > 0 && ss.advantage?.status === "won" && Number(ss.advantage?.lastRound ?? 0) === round;
    if (!valid) return ui.notifications.warn("Aucun déplacement gratuit d’ascendant n’est disponible pour le round actuel.");
    if (Number(ss.map.advantageSquaresSpent ?? 0) >= Number(ss.advantage?.moveSquares ?? 0)) return ui.notifications.warn("Tout le déplacement gratuit d’ascendant a déjà été dépensé.");
    try {
      await moveTokenOneNavalSquare(this.actor, relative, ss);
    } catch (error) {
      return ui.notifications.error(error.message);
    }
    ss = getSSShipData(this.actor);
    ss.map.advantageSquaresSpent = Number(ss.map.advantageSquaresSpent ?? 0) + 1;
    if (round > 0) ss.map.movementRound = round;
    await this.actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
    await updateShearPlanAfterMove(this.actor);
    refreshNavalVisualOverlay(this.actor);
    await this.render();
  }

  static async #advMoveForward() { await this.#moveAdvantage("forward"); }
  static async #advMoveForwardPort() { await this.#moveAdvantage("forwardPort"); }
  static async #advMoveForwardStarboard() { await this.#moveAdvantage("forwardStarboard"); }
  static async #advMovePort() { await this.#moveAdvantage("port"); }
  static async #advMoveStarboard() { await this.#moveAdvantage("starboard"); }
  static async #advMoveBackward() { await this.#moveAdvantage("backward"); }
  static async #advMoveBackwardPort() { await this.#moveAdvantage("backwardPort"); }
  static async #advMoveBackwardStarboard() { await this.#moveAdvantage("backwardStarboard"); }

  async #toggleMapBoolean(key, label) {
    await this.#saveVisibleForm();
    const ss = getSSShipData(this.actor);
    ss.map[key] = !Boolean(ss.map[key]);
    await this.actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
    refreshNavalVisualOverlay(this.actor);
    ui.notifications.info(`${label} : ${ss.map[key] ? "affiché" : "masqué"}.`);
    await this.render();
  }

  static async #toggleZones() { await this.#toggleMapBoolean("showZones", "Secteurs autour du navire"); }
  static async #toggleReachable() { await this.#toggleMapBoolean("showReachable", "Cases atteignables"); }

  static async #beginShearPlan() {
    await this.#saveVisibleForm();
    const target = targetVehicle(this.actor);
    if (!target) return ui.notifications.warn("Cisaillement : cible exactement un token Vehicle adverse.");
    try {
      const plan = await beginShearPlan(this.actor, target);
      ui.notifications.info(`Cisaillement préparé contre ${target.name} : il faut longer ${plan.requiredSquares} case(s) adjacente(s).`);
    } catch (error) {
      return ui.notifications.warn(error.message);
    }
    await this.render();
  }

  static async #cancelShearPlan() {
    await cancelShearPlan(this.actor, { notify: true });
    await this.render();
  }

  async #rotateAdvantage(side) {
    await this.#saveVisibleForm();
    let ss = getSSShipData(this.actor);
    const prepared = await this.#prepareRoundState(ss);
    ss = prepared.ss;
    const round = prepared.round;
    const valid = round > 0 && ss.advantage?.status === "won" && Number(ss.advantage?.lastRound ?? 0) === round;
    if (!valid) return ui.notifications.warn("Aucune rotation gratuite d’ascendant n’est disponible pour le round actuel.");
    const spent = Number(ss.map?.advantageRotationSpent ?? 0);
    const budget = Number(ss.advantage?.rotationDegrees ?? 0);
    if (budget - spent < 90) return ui.notifications.warn("Il reste moins de 90° de rotation d’ascendant disponible.");

    ss.navigation.heading = turnHeading(ss.navigation.heading, side);
    ss.map.advantageRotationSpent = spent + 90;
    ss.map.movementRound = round;
    await this.actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
    await syncTokenHeading(this.actor, ss, { notify: true });
    refreshNavalVisualOverlay(this.actor);
    await this.render();
  }

  static async #advantagePort() { await this.#rotateAdvantage("port"); }
  static async #advantageStarboard() { await this.#rotateAdvantage("starboard"); }

  static async #resetRoundMovement() {
    await this.#saveVisibleForm();
    const ss = getSSShipData(this.actor);
    ss.map.movementRound = currentRound();
    ss.map.speedSquaresSpent = 0;
    ss.map.advantageSquaresSpent = 0;
    ss.map.advantageRotationSpent = 0;
    ss.map.reverseUsedRound = 0;
    await this.actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
    ui.notifications.info("Compteurs de déplacement naval réinitialisés.");
    refreshNavalVisualOverlay(this.actor);
    await this.render();
  }

  static async #centerOnShip() {
    const token = getActorCanvasToken(this.actor);
    if (!token) return ui.notifications.warn("Aucun token de ce navire sur la scène active.");
    const center = token.center ?? { x: token.x, y: token.y };
    canvas.pan({ x: center.x, y: center.y });
  }

  static async #openShipController() {
    game.modules.get(MODULE_ID)?.api?.openShip?.(this.actor);
  }

  static async #refresh() { refreshWindOverlay(); refreshNavalVisualOverlay(this.actor); await this.render(); }
}
