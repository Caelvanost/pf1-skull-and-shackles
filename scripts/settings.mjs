import { MODULE_ID } from "./ship-data.mjs";

export const SETTINGS = Object.freeze({
  showHeaderButton: "showHeaderButton",
  headerButtonMode: "headerButtonMode",
  navigationCombatDc: "navigationCombatDc",
  navigationOutsideDc: "navigationOutsideDc",
  infamyDcBase: "infamyDcBase",
  enableCriticalWounds: "enableCriticalWounds",
  autoApplyRamDamage: "autoApplyRamDamage",
  showWindOverlay: "showWindOverlay",
  showNavalVisuals: "showNavalVisuals",
  autoSyncTokenRotation: "autoSyncTokenRotation",
  showResourceHud: "showResourceHud",
  primaryShipUuid: "primaryShipUuid",
  hudPositionX: "hudPositionX",
  hudPositionY: "hudPositionY"
});

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.showHeaderButton, {
    name: "Afficher le bouton Skull & Shackles sur les Vehicles",
    hint: "Ajoute un bouton d’accès au contrôleur S&S dans l’en-tête des fiches Vehicle PF1.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS.headerButtonMode, {
    name: "Ouverture du bouton de fiche",
    hint: "Choisit si le bouton Skull & Shackles d’une fiche Vehicle ouvre directement le contrôleur naval ou la passerelle synthétique.",
    scope: "client",
    config: true,
    type: String,
    choices: {
      controller: "Contrôleur naval",
      dashboard: "Passerelle"
    },
    default: "controller"
  });

  game.settings.register(MODULE_ID, SETTINGS.navigationCombatDc, {
    name: "DD de navigation en combat",
    hint: "Valeur utilisée par l’assistant lors de la création ou de l’application d’un nouveau profil de navire.",
    scope: "world",
    config: true,
    type: Number,
    default: 20,
    range: { min: 0, max: 100, step: 1 }
  });

  game.settings.register(MODULE_ID, SETTINGS.navigationOutsideDc, {
    name: "DD de navigation hors combat",
    hint: "Valeur de référence affichée dans la bibliothèque et disponible pour les futurs profils hors combat.",
    scope: "world",
    config: true,
    type: Number,
    default: 5,
    range: { min: 0, max: 100, step: 1 }
  });

  game.settings.register(MODULE_ID, SETTINGS.infamyDcBase, {
    name: "Base du DD d’Infamie",
    hint: "La procédure détaillée emploie 5 + 2 × NMG. Modifie ici la base si ta table utilise une autre lecture.",
    scope: "world",
    config: true,
    type: Number,
    default: 5,
    range: { min: 0, max: 50, step: 1 }
  });

  game.settings.register(MODULE_ID, SETTINGS.enableCriticalWounds, {
    name: "Activer « Jambe de bois et cache-œil »",
    hint: "Autorise le bouton de tirage des blessures critiques optionnelles dans la bibliothèque S&S.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, SETTINGS.autoApplyRamDamage, {
    name: "Appliquer automatiquement les dégâts d’éperonnage",
    hint: "Valeur par défaut pour les nouveaux navires créés par l’assistant. Chaque navire peut ensuite la modifier.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS.showWindOverlay, {
    name: "Afficher l’indicateur de vent sur les scènes navales",
    hint: "Affiche un petit indicateur de direction du vent lorsqu’une scène contient au moins un navire Skull & Shackles.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => game.modules.get(MODULE_ID)?.api?.refreshWindOverlay?.()
  });

  game.settings.register(MODULE_ID, SETTINGS.showNavalVisuals, {
    name: "Afficher les aides visuelles de carte navale",
    hint: "Affiche autour du navire contrôlé les secteurs proue/bâbord/tribord/poupe, les cases atteignables et le trajet de cisaillement préparé.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => game.modules.get(MODULE_ID)?.api?.refreshNavalVisuals?.()
  });

  game.settings.register(MODULE_ID, SETTINGS.showResourceHud, {
    name: "Afficher le HUD Butin / Infamie / Déshonneur",
    hint: "Affiche en haut à droite de l’écran les trois ressources de réputation du navire de campagne, ainsi que les jeux ouverts aux joueurs.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => game.modules.get(MODULE_ID)?.api?.refreshCampaignHud?.()
  });


  game.settings.register(MODULE_ID, SETTINGS.hudPositionX, {
    name: "Position X du HUD S&S",
    scope: "client",
    config: false,
    type: Number,
    default: -1,
    onChange: () => game.modules.get(MODULE_ID)?.api?.refreshCampaignHud?.()
  });

  game.settings.register(MODULE_ID, SETTINGS.hudPositionY, {
    name: "Position Y du HUD S&S",
    scope: "client",
    config: false,
    type: Number,
    default: -1,
    onChange: () => game.modules.get(MODULE_ID)?.api?.refreshCampaignHud?.()
  });

  game.settings.register(MODULE_ID, SETTINGS.primaryShipUuid, {
    name: "Navire de campagne principal",
    hint: "Identifiant interne du navire dont Butin, Infamie et Déshonneur sont affichés dans le HUD.",
    scope: "world",
    config: false,
    type: String,
    default: "",
    onChange: () => game.modules.get(MODULE_ID)?.api?.refreshCampaignHud?.()
  });

  game.settings.register(MODULE_ID, SETTINGS.autoSyncTokenRotation, {
    name: "Synchroniser automatiquement le token après un virage",
    hint: "Après une réussite à Bâbord toute ! ou Tribord toute !, fait pivoter le token du navire pour correspondre au nouveau cap.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });
}

export function getSetting(key, fallback = null) {
  try {
    const value = game.settings.get(MODULE_ID, key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
