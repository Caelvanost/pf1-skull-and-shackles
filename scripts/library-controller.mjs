import { MODULE_ID } from "./ship-data.mjs";
import { SHIP_PROFILES, PIRATE_WEAPONS, CAMPAIGN_TRAITS, CRITICAL_WOUNDS, applyShipProfile, formatGp } from "./library-data.mjs";
import { getSetting, SETTINGS } from "./settings.mjs";
import { installReferencePacks } from "./reference-packs.mjs";
import { installWorldTools, openQuickReference, getWorldToolsStatus } from "./world-tools.mjs";
import { ShipWizard } from "./ship-wizard.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class LibraryController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-library"],
    position: { width: 860, height: 760 },
    window: { icon: "fa-solid fa-book-open", resizable: true },
    actions: {
      applyProfile: this.#applyProfile,
      createFromProfile: this.#createFromProfile,
      openWizard: this.#openWizard,
      installPacks: this.#installPacks,
      installWorldTools: this.#installWorldTools,
      openQuickReference: this.#openQuickReference,
      rollCriticalWound: this.#rollCriticalWound
    }
  };

  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/library-controller.hbs` } };

  constructor(actor = null, options = {}) {
    super({
      id: `pf1-ss-library-${actor?.id ?? "global"}`,
      ...options,
      window: { ...(options.window ?? {}), title: "Skull & Shackles — Bibliothèque de règles" }
    });
    this.actor = actor?.type === "vehicle" ? actor : null;
  }

  static open(actor = null) {
    const app = new LibraryController(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return {
      ...context,
      actor: this.actor,
      canEditActor: Boolean(this.actor?.isOwner),
      isGM: Boolean(game.user?.isGM),
      criticalWoundsEnabled: Boolean(getSetting(SETTINGS.enableCriticalWounds, false)),
      worldTools: getWorldToolsStatus(),
      navigationCombatDc: Number(getSetting(SETTINGS.navigationCombatDc, 20)),
      navigationOutsideDc: Number(getSetting(SETTINGS.navigationOutsideDc, 5)),
      profiles: SHIP_PROFILES.map((p) => ({ ...p, costLabel: formatGp(p.cost) })),
      weapons: PIRATE_WEAPONS,
      traits: CAMPAIGN_TRAITS,
      wounds: CRITICAL_WOUNDS.map((w) => ({ ...w, rangeLabel: w.min === w.max ? String(w.min) : `${w.min}–${w.max}` }))
    };
  }

  static async #applyProfile(event, target) {
    if (!this.actor) return ui.notifications.warn("Ouvre la bibliothèque depuis un Vehicle pour lui appliquer un profil.");
    if (!this.actor.isOwner) return ui.notifications.warn("Tu ne peux pas modifier ce Vehicle.");
    const profileId = target?.dataset?.profileId;
    if (!profileId) return;
    const accepted = window.confirm(`Appliquer le profil sélectionné à « ${this.actor.name} » ?`);
    if (!accepted) return;
    await applyShipProfile(this.actor, profileId);
    ui.notifications.info(`${this.actor.name} a reçu le profil sélectionné.`);
    await this.render();
  }

  static async #createFromProfile(event, target) {
    if (!game.user?.isGM) return ui.notifications.warn("Seul un MJ peut créer un navire.");
    const profileId = target?.dataset?.profileId;
    const profile = SHIP_PROFILES.find((p) => p.id === profileId);
    if (!profile) return;
    const actor = await Actor.create({ name: profile.name, type: "vehicle" });
    if (!actor) return;
    await applyShipProfile(actor, profileId);
    ui.notifications.info(`${profile.name} créé dans l’onglet Actors.`);
    actor.sheet?.render(true);
  }

  static async #openWizard() {
    ShipWizard.open(this.actor);
  }

  static async #installPacks() {
    try {
      await installReferencePacks();
    } catch (error) {
      console.error(`${MODULE_ID} | Création des compendiums impossible`, error);
      ui.notifications.error(`Impossible d’installer les compendiums S&S : ${error.message}`);
    }
  }

  static async #installWorldTools() {
    try {
      await installWorldTools({ installPacks: true });
      await this.render();
    } catch (error) {
      console.error(`${MODULE_ID} | Installation des outils de monde impossible`, error);
      ui.notifications.error(`Impossible d’installer les outils S&S : ${error.message}`);
    }
  }

  static async #openQuickReference() {
    await openQuickReference();
  }

  static async #rollCriticalWound() {
    if (!getSetting(SETTINGS.enableCriticalWounds, false)) {
      ui.notifications.warn("Active d’abord la règle optionnelle « Jambe de bois et cache-œil » dans les paramètres du module.");
      return;
    }
    const roll = await new Roll("1d20").evaluate();
    const value = Number(roll.total ?? 0);
    const wound = CRITICAL_WOUNDS.find((w) => value >= w.min && value <= w.max);
    const content = `<div class="pf1-ss-chat-card"><h3>Jambe de bois et cache-œil</h3><p>Résultat du d20 : <strong>${value}</strong></p><p><strong>${wound?.label ?? "Résultat"}</strong></p><p>${wound?.effect ?? "—"}</p></div>`;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker(),
      flavor: "Skull & Shackles — Blessure critique",
      content,
      rolls: [JSON.stringify(roll.toJSON())]
    });
  }
}
