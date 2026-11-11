import {
  MODULE_ID,
  getSSShipData,
  deriveShipState,
  getDriverData,
  getDirectionLabel,
  getSceneWindDirection,
  formatDistance,
  formatNavalSquares
} from "./ship-data.mjs";
import { getShipProfile } from "./library-data.mjs";
import { ShipController } from "./ship-controller.mjs";
import { NavalMapController } from "./naval-map-controller.mjs";
import { HazardsController } from "./hazards-controller.mjs";
import { ShipImprovementsController } from "./ship-improvements-controller.mjs";
import { VoyageController } from "./voyage-controller.mjs";
import { PiracyController } from "./piracy-controller.mjs";
import { getVoyageData, deriveTravel } from "./voyage-data.mjs";
import { getImprovementsData, deriveImprovementEffects } from "./ship-improvements-data.mjs";
import { SiegeController } from "./siege-controller.mjs";
import { ReputationController } from "./reputation-controller.mjs";
import { FleetController } from "./fleet-controller.mjs";
import { FleetRecruitmentController } from "./fleet-recruitment-controller.mjs";
import { LifeController } from "./life-controller.mjs";
import { EntertainmentController } from "./entertainment-controller.mjs";
import { BoardingController } from "./boarding-controller.mjs";
import { ShipDisguiseController } from "./ship-disguise-controller.mjs";
import { LibraryController } from "./library-controller.mjs";
import { ShipWizard } from "./ship-wizard.mjs";
import { installWorldTools, openQuickReference, getWorldToolsStatus } from "./world-tools.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function selectedTargetVehicle() {
  const targets = [...(game.user?.targets ?? [])].filter((token) => token.actor?.type === "vehicle");
  return targets.length === 1 ? targets[0].actor : null;
}

function statusBadges(state) {
  const badges = [];
  if (state.sunk) badges.push({ label: "Coulé", className: "danger" });
  else if (state.sinking) badges.push({ label: `Naufrage ${state.sinkingRoundsRemaining} r.`, className: "danger" });
  if (state.fireActive) badges.push({ label: `En feu (${state.fireRoundsElapsed})`, className: "danger" });
  if (state.hullBroken) badges.push({ label: "Structure brisée", className: "warning" });
  if (state.propulsionBroken) badges.push({ label: "Propulsion brisée", className: "warning" });
  if (state.steeringBroken) badges.push({ label: "Pilotage brisé", className: "warning" });
  if (state.weatherRudderJammed) badges.push({ label: "Gouvernail bloqué", className: "warning" });
  if (state.weatherSpeedHalved) badges.push({ label: "Vitesse météo ÷2", className: "warning" });
  if (state.grounded) badges.push({ label: "Échoué", className: "danger" });
  if (state.majorBreach) badges.push({ label: "Voie d’eau majeure", className: "danger" });
  if (state.crewInsufficient) badges.push({ label: "Équipage insuffisant", className: "danger" });
  else if (state.crewIncomplete) badges.push({ label: "Équipage incomplet", className: "warning" });
  if (!badges.length) badges.push({ label: "Prêt à naviguer", className: "ok" });
  return badges;
}

export class DashboardController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-dashboard"],
    position: { width: 840, height: "auto" },
    window: { icon: "fa-solid fa-compass", resizable: true },
    actions: {
      openShip: this.#openShip,
      openNavalMap: this.#openNavalMap,
      openHazards: this.#openHazards,
      openImprovements: this.#openImprovements,
      openVoyage: this.#openVoyage,
      openPiracy: this.#openPiracy,
      openVehicleSheet: this.#openVehicleSheet,
      openSiege: this.#openSiege,
      openReputation: this.#openReputation,
      openFleet: this.#openFleet,
      openFleetRecruitment: this.#openFleetRecruitment,
      openLife: this.#openLife,
      openEntertainment: this.#openEntertainment,
      openBoarding: this.#openBoarding,
      openDisguise: this.#openDisguise,
      openLibrary: this.#openLibrary,
      openWizard: this.#openWizard,
      openHelp: this.#openHelp,
      installTools: this.#installTools,
      refresh: this.#refresh
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/dashboard-controller.hbs` }
  };

  constructor(actor, options = {}) {
    super({
      id: `pf1-ss-dashboard-${actor.id}`,
      ...options,
      window: { ...(options.window ?? {}), title: `Skull & Shackles — Passerelle — ${actor.name}` }
    });
    this.actor = actor;
  }

  static open(actor) {
    if (!actor || actor.type !== "vehicle") {
      ui.notifications.warn("Skull & Shackles : sélectionne un token lié à un Vehicle PF1.");
      return null;
    }
    const app = new DashboardController(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const ss = getSSShipData(this.actor);
    const state = deriveShipState(this.actor, ss);
    const driver = getDriverData(this.actor);
    const profile = getShipProfile(ss.profileId);
    const wind = getSceneWindDirection();
    const target = selectedTargetVehicle();
    const targetSS = target ? getSSShipData(target) : null;
    const targetState = target ? deriveShipState(target, targetSS) : null;
    const combat = game.combat;
    const tools = getWorldToolsStatus();
    const improvementsData = getImprovementsData(this.actor);
    const improvementEffects = deriveImprovementEffects(this.actor, improvementsData);
    const voyageData = getVoyageData(this.actor);
    const voyage = deriveTravel(this.actor, voyageData);

    return {
      ...context,
      actor: this.actor,
      ss,
      state,
      profileName: profile?.name ?? "Profil personnalisé",
      driverName: driver.actor?.name ?? "Aucun pilote",
      driverSkill: driver.actor ? `${driver.skillName} (${driver.modifier >= 0 ? "+" : ""}${driver.modifier})` : "—",
      headingLabel: getDirectionLabel(ss.navigation?.heading),
      windLabel: wind ? getDirectionLabel(wind) : "Non défini",
      hpLabel: `${state.hpValue} / ${state.hpMax}`,
      speedLabel: `${formatDistance(state.speedCurrent)} / ${formatDistance(state.effectiveMaxSpeed)}`,
      speedSquaresLabel: `${formatNavalSquares(state.speedCurrent)} / ${formatNavalSquares(state.effectiveMaxSpeed)}`,
      crewLabel: `${state.crewCurrent} / ${state.crewFull}`,
      status: statusBadges(state),
      target: target ? {
        name: target.name,
        hpLabel: `${targetState.hpValue} / ${targetState.hpMax}`,
        speedLabel: formatDistance(targetState.speedCurrent),
        status: statusBadges(targetState)
      } : null,
      combat: combat ? {
        round: Number(combat.round ?? 0),
        turn: Number(combat.turn ?? 0) + 1,
        started: Boolean(combat.started)
      } : null,
      tools,
      improvements: { count: improvementEffects.count, navigation: `${improvementEffects.navigationBonus >= 0 ? "+" : ""}${improvementEffects.navigationBonus}`, travel: `${improvementEffects.travelPercent >= 0 ? "+" : ""}${Math.round(improvementEffects.travelPercent * 100)}%` },
      voyage: {
        speed: voyage.effectiveKmPerHour > 0 ? `${Math.round(voyage.effectiveKmPerHour * 10) / 10} km/h` : "à renseigner",
        progress: voyage.distanceKm > 0 ? `${Math.round(voyage.progressKm)} / ${Math.round(voyage.distanceKm)} km` : "aucun trajet"
      },
      isGM: Boolean(game.user?.isGM)
    };
  }

  static async #openShip() { ShipController.open(this.actor); }
  static async #openNavalMap() { NavalMapController.open(this.actor); }
  static async #openHazards() { HazardsController.open(this.actor); }
  static async #openImprovements() { ShipImprovementsController.open(this.actor); }
  static async #openVoyage() { VoyageController.open(this.actor); }
  static async #openPiracy() { PiracyController.open(this.actor); }
  static async #openVehicleSheet() { this.actor.sheet?.render(true); }
  static async #openSiege() { SiegeController.open(this.actor); }
  static async #openReputation() { ReputationController.open(this.actor); }
  static async #openFleet() { FleetController.open(this.actor); }
  static async #openFleetRecruitment() { FleetRecruitmentController.open(this.actor); }
  static async #openLife() { LifeController.open(this.actor); }
  static async #openEntertainment() { EntertainmentController.open(this.actor); }
  static async #openBoarding() { BoardingController.open(this.actor); }
  static async #openDisguise() { ShipDisguiseController.open(this.actor); }
  static async #openLibrary() { LibraryController.open(this.actor); }
  static async #openWizard() { ShipWizard.open(this.actor); }
  static async #openHelp() { await openQuickReference(); }
  static async #installTools() {
    try {
      await installWorldTools({ installPacks: true });
      await this.render();
    } catch (error) {
      console.error(`${MODULE_ID} | Installation des outils de monde impossible`, error);
      ui.notifications.error(`Impossible d’installer les outils S&S : ${error.message}`);
    }
  }
  static async #refresh() { await this.render(); }
}
