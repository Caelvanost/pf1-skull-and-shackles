import { MODULE_ID } from "./ship-data.mjs";
import { ShipController } from "./ship-controller.mjs";
import { DashboardController } from "./dashboard-controller.mjs";
import { NavalMapController } from "./naval-map-controller.mjs";
import { HazardsController } from "./hazards-controller.mjs";
import { ShipImprovementsController } from "./ship-improvements-controller.mjs";
import { VoyageController } from "./voyage-controller.mjs";
import { PiracyController } from "./piracy-controller.mjs";
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
import { installReferencePacks } from "./reference-packs.mjs";
import { installWorldTools, openQuickReference } from "./world-tools.mjs";
import { registerSettings, getSetting, SETTINGS } from "./settings.mjs";
import { syncSinkingState, processSinkingRound } from "./ship-damage.mjs";
import { refreshWindOverlay, removeWindOverlay } from "./naval-map-tools.mjs";
import { refreshNavalVisualOverlay, removeNavalVisualOverlay } from "./naval-visuals.mjs";
import { refreshCampaignHud, autoBindPrimaryShip, setPrimaryShip } from "./campaign-hud.mjs";
import { initMultiplayerSocket, broadcastHudRefresh } from "./multiplayer.mjs";

function getSelectedVehicle() {
  const selected = canvas?.tokens?.controlled?.[0]?.actor ?? null;
  if (selected?.type === "vehicle") return selected;
  if (game.user?.character?.type === "vehicle") return game.user.character;
  return null;
}

Hooks.once("init", () => {
  registerSettings();
  const module = game.modules.get(MODULE_ID);
  if (module) {
    module.api = {
      openDashboard: (actor) => DashboardController.open(actor),
      openNavalMap: (actor) => NavalMapController.open(actor),
      openHazards: (actor) => HazardsController.open(actor),
      openImprovements: (actor) => ShipImprovementsController.open(actor),
      openVoyage: (actor) => VoyageController.open(actor),
      openPiracy: (actor) => PiracyController.open(actor),
      openShip: (actor) => ShipController.open(actor),
      openSiege: (actor) => SiegeController.open(actor),
      openReputation: (actor) => ReputationController.open(actor),
      openFleet: (actor) => FleetController.open(actor),
      openFleetRecruitment: (actor) => FleetRecruitmentController.open(actor),
      openLife: (actor) => LifeController.open(actor),
      openEntertainment: (actor) => EntertainmentController.open(actor),
      openBoarding: (actor) => BoardingController.open(actor),
      openDisguise: (actor) => ShipDisguiseController.open(actor),
      openLibrary: (actor = null) => LibraryController.open(actor),
      openShipWizard: (actor = null) => ShipWizard.open(actor),
      installReferencePacks: () => installReferencePacks(),
      installWorldTools: () => installWorldTools({ installPacks: true }),
      openQuickReference: () => openQuickReference(),
      refreshWindOverlay: () => refreshWindOverlay(),
      refreshNavalVisuals: (actor = null) => refreshNavalVisualOverlay(actor),
      refreshCampaignHud: () => refreshCampaignHud(),
      setPrimaryShip: (actor) => setPrimaryShip(actor),
      broadcastHudRefresh: () => broadcastHudRefresh(),
      openSelectedNavalMap: () => {
        const actor = getSelectedVehicle();
        if (!actor) {
          ui.notifications.warn("Skull & Shackles : sélectionne un token lié à un Vehicle PF1.");
          return null;
        }
        return NavalMapController.open(actor);
      },
      openSelectedHazards: () => {
        const actor = getSelectedVehicle();
        if (!actor) {
          ui.notifications.warn("Skull & Shackles : sélectionne un token lié à un Vehicle PF1.");
          return null;
        }
        return HazardsController.open(actor);
      },
      openSelectedImprovements: () => {
        const actor = getSelectedVehicle();
        if (!actor) {
          ui.notifications.warn("Skull & Shackles : sélectionne un token lié à un Vehicle PF1.");
          return null;
        }
        return ShipImprovementsController.open(actor);
      },
      openSelectedVoyage: () => {
        const actor = getSelectedVehicle();
        if (!actor) {
          ui.notifications.warn("Skull & Shackles : sélectionne un token lié à un Vehicle PF1.");
          return null;
        }
        return VoyageController.open(actor);
      },
      openSelectedPiracy: () => {
        const actor = getSelectedVehicle();
        if (!actor) {
          ui.notifications.warn("Skull & Shackles : sélectionne un token lié à un Vehicle PF1.");
          return null;
        }
        return PiracyController.open(actor);
      },
      openSelectedDashboard: () => {
        const actor = getSelectedVehicle();
        if (!actor) {
          ui.notifications.warn("Skull & Shackles : sélectionne un token lié à un Vehicle PF1.");
          return null;
        }
        return DashboardController.open(actor);
      },
      openSelectedShip: () => {
        const actor = getSelectedVehicle();
        if (!actor) {
          ui.notifications.warn("Skull & Shackles : sélectionne un token lié à un Vehicle PF1.");
          return null;
        }
        return ShipController.open(actor);
      },
      openSelectedSiege: () => {
        const actor = getSelectedVehicle();
        if (!actor) {
          ui.notifications.warn("Skull & Shackles : sélectionne un token lié à un Vehicle PF1.");
          return null;
        }
        return SiegeController.open(actor);
      },
      openSelectedReputation: () => {
        const actor = getSelectedVehicle();
        if (!actor) {
          ui.notifications.warn("Skull & Shackles : sélectionne un token lié à un Vehicle PF1.");
          return null;
        }
        return ReputationController.open(actor);
      },
      openSelectedFleet: () => {
        const actor = getSelectedVehicle();
        if (!actor) {
          ui.notifications.warn("Skull & Shackles : sélectionne le token Vehicle du vaisseau amiral.");
          return null;
        }
        return FleetController.open(actor);
      },
      openSelectedFleetRecruitment: () => {
        const actor = getSelectedVehicle();
        if (!actor) {
          ui.notifications.warn("Skull & Shackles : sélectionne le token Vehicle du vaisseau amiral.");
          return null;
        }
        return FleetRecruitmentController.open(actor);
      },
      openSelectedLife: () => {
        const actor = getSelectedVehicle();
        if (!actor) {
          ui.notifications.warn("Skull & Shackles : sélectionne le token Vehicle du navire.");
          return null;
        }
        return LifeController.open(actor);
      },
      openSelectedEntertainment: () => {
        const actor = getSelectedVehicle();
        if (!actor) {
          ui.notifications.warn("Skull & Shackles : sélectionne le token Vehicle du navire.");
          return null;
        }
        return EntertainmentController.open(actor);
      },
      openSelectedBoarding: () => {
        const actor = getSelectedVehicle();
        if (!actor) { ui.notifications.warn("Skull & Shackles : sélectionne le navire qui monte à l'abordage."); return null; }
        return BoardingController.open(actor);
      },
      openSelectedDisguise: () => {
        const actor = getSelectedVehicle();
        if (!actor) { ui.notifications.warn("Skull & Shackles : sélectionne le Vehicle du navire à pétarder."); return null; }
        return ShipDisguiseController.open(actor);
      },
      openSelectedLibrary: () => LibraryController.open(getSelectedVehicle()),
      openSelectedShipWizard: () => ShipWizard.open(getSelectedVehicle())
    };
  }

  console.log(`${MODULE_ID} | Initialisé`);
});

// PF1 utilise encore une feuille Vehicle de la famille ActorSheet classique en v11.x.
// Ce hook ajoute un accès direct au contrôleur sans remplacer la feuille du système.
Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
  if (!getSetting(SETTINGS.showHeaderButton, true)) return;
  const actor = sheet.actor ?? sheet.document;
  if (actor?.type !== "vehicle") return;
  if (buttons.some((b) => b.class === "pf1-ss-open")) return;

  const headerMode = getSetting(SETTINGS.headerButtonMode, "controller");
  buttons.unshift({
    label: "Skull & Shackles",
    class: "pf1-ss-open",
    icon: "fas fa-anchor",
    onclick: () => headerMode === "dashboard" ? DashboardController.open(actor) : ShipController.open(actor)
  });
});

Hooks.once("ready", async () => {
  if (game.system.id !== "pf1") {
    ui.notifications.error("PF1 — Skull & Shackles nécessite le système Pathfinder 1.");
    return;
  }
  initMultiplayerSocket();
  await autoBindPrimaryShip();
  await refreshCampaignHud();
});


function isPrimaryActiveGM() {
  if (!game.user?.isGM) return false;
  const activeGM = game.users?.activeGM;
  return !activeGM || activeGM.id === game.user.id;
}

// Si les PV de structure sont modifiés depuis la fiche PF1 ou une autre automatisation,
// synchronise l'entrée en naufrage sans obliger l'utilisateur à passer par le contrôleur.
Hooks.on("updateActor", async (actor, changes) => {
  if (!isPrimaryActiveGM() || actor?.type !== "vehicle") return;
  if (!actor.getFlag(MODULE_ID, "ship")) return;
  const keys = Object.keys(changes ?? {});
  const hpChanged = foundry.utils.hasProperty(changes ?? {}, "system.attributes.hp.value")
    || keys.some((key) => key === "system.attributes.hp.value" || key.startsWith("system.attributes.hp."));
  if (!hpChanged) return;
  try {
    await syncSinkingState(actor, { announce: true });
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible de synchroniser le naufrage de ${actor.name}`, error);
  }
});

// Le compteur de naufrage reste un effet de round automatisé ; les incendies sont résolus au moment choisi par le MJ.
// Les incendies restent résolus manuellement afin que le MJ puisse choisir le moment
// où l'équipage tente de les éteindre dans le tour.
Hooks.on("updateCombat", async (combat, changes) => {
  if (!isPrimaryActiveGM()) return;
  const keys = Object.keys(changes ?? {});
  const roundChanged = Object.prototype.hasOwnProperty.call(changes ?? {}, "round") || keys.includes("round");
  if (!roundChanged) return;
  const round = Math.max(0, Number(combat?.round ?? 0));
  if (!round) return;

  const actors = new Map();
  const scene = combat?.scene ?? (combat?.sceneId ? game.scenes.get(combat.sceneId) : null);
  for (const token of scene?.tokens ?? []) {
    const actor = token.actor;
    if (actor?.type === "vehicle" && actor.getFlag(MODULE_ID, "ship")) actors.set(actor.uuid, actor);
  }
  for (const combatant of combat?.combatants ?? []) {
    const actor = combatant.actor;
    if (actor?.type === "vehicle" && actor.getFlag(MODULE_ID, "ship")) actors.set(actor.uuid, actor);
  }

  for (const actor of actors.values()) {
    try {
      await processSinkingRound(actor, round);
    } catch (error) {
      console.warn(`${MODULE_ID} | Erreur pendant le compteur de naufrage de ${actor.name}`, error);
    }
  }
});


// v1.2 — Indicateur de vent de scène. Le rendu est purement visuel et n'altère aucun Document.
Hooks.on("canvasReady", () => { refreshWindOverlay(); refreshNavalVisualOverlay(); });
Hooks.on("canvasTearDown", () => { removeWindOverlay(); removeNavalVisualOverlay(); });
Hooks.on("updateScene", (scene, changes) => {
  if (scene?.id !== canvas?.scene?.id) return;
  const keys = Object.keys(changes ?? {});
  const windChanged = foundry.utils.hasProperty(changes ?? {}, `flags.${MODULE_ID}.windDirection`)
    || keys.some((key) => key.includes(`${MODULE_ID}`) || key.startsWith("grid."));
  if (windChanged) { refreshWindOverlay(); refreshNavalVisualOverlay(); }
});
Hooks.on("createToken", () => refreshWindOverlay());
Hooks.on("deleteToken", () => refreshWindOverlay());


// v1.3 — Aides visuelles client-side autour du navire contrôlé.
Hooks.on("controlToken", () => refreshNavalVisualOverlay());
Hooks.on("targetToken", () => refreshNavalVisualOverlay());
Hooks.on("hoverToken", () => refreshNavalVisualOverlay());
Hooks.on("updateToken", () => refreshNavalVisualOverlay());
Hooks.on("createToken", () => refreshNavalVisualOverlay());
Hooks.on("deleteToken", () => refreshNavalVisualOverlay());
Hooks.on("updateActor", (actor, changes) => {
  if (actor?.type !== "vehicle" || !actor.getFlag(MODULE_ID, "ship")) return;
  const controlled = canvas?.tokens?.controlled?.some((t) => t.actor?.uuid === actor.uuid);
  if (!controlled) return;
  const keys = Object.keys(changes ?? {});
  if (keys.some((k) => k.startsWith("flags.") || k.startsWith("system.details.currentSpeed") || k.startsWith("system.details.maxSpeed"))
    || foundry.utils.hasProperty(changes ?? {}, `flags.${MODULE_ID}.ship`)) refreshNavalVisualOverlay(actor);
});
Hooks.on("updateCombat", () => refreshNavalVisualOverlay());


// v1.8 — HUD de campagne et synchronisation des jeux multijoueurs.
Hooks.on("canvasReady", () => refreshCampaignHud());
Hooks.on("controlToken", () => refreshCampaignHud());
Hooks.on("updateActor", (actor, changes) => {
  if (actor?.type !== "vehicle") return;
  const keys = Object.keys(changes ?? {});
  if (keys.some(k => k.startsWith(`flags.${MODULE_ID}.reputation`) || k.startsWith(`flags.${MODULE_ID}.pirateEntertainment`) || k.startsWith("flags."))) refreshCampaignHud();
});
