import { MODULE_ID } from "./ship-data.mjs";
import { SHIP_PROFILES, applyShipProfile, formatGp } from "./library-data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ShipWizard extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-wizard", "standard-form"],
    tag: "form",
    position: { width: 780, height: "auto" },
    window: { icon: "fa-solid fa-wand-magic-sparkles", resizable: true },
    actions: {
      createShip: this.#createShip,
      applyProfile: this.#applyProfile
    },
    form: {
      handler: this.#onSubmit,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/ship-wizard.hbs` }
  };

  constructor(actor = null, options = {}) {
    super({
      id: `pf1-ss-ship-wizard-${actor?.id ?? "new"}`,
      ...options,
      window: { ...(options.window ?? {}), title: "Skull & Shackles — Assistant de navire" }
    });
    this.actor = actor?.type === "vehicle" ? actor : null;
    this.selectedProfileId = this.actor?.getFlag(MODULE_ID, "ship")?.profileId || "sailingShip";
    this.shipName = this.actor?.name ?? "Nouveau navire";
  }

  static open(actor = null) {
    const app = new ShipWizard(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return {
      ...context,
      actor: this.actor,
      shipName: this.shipName,
      selectedProfileId: this.selectedProfileId,
      profiles: SHIP_PROFILES.map((p) => ({
        ...p,
        costLabel: formatGp(p.cost),
        selected: p.id === this.selectedProfileId,
        speedLabel: this.#formatSpeeds(p.speeds)
      }))
    };
  }

  #formatSpeeds(speeds = {}) {
    const parts = [];
    if (speeds.wind) parts.push(`vent ${Math.round(speeds.wind * 0.3048)} m`);
    if (speeds.muscles) parts.push(`muscles ${Math.round(speeds.muscles * 0.3048)} m`);
    if (speeds.mixed && speeds.mixed !== speeds.wind && speeds.mixed !== speeds.muscles) parts.push(`mixte ${Math.round(speeds.mixed * 0.3048)} m`);
    return parts.join(" · ") || "—";
  }

  #readForm() {
    const form = this.element?.querySelector?.("form") ?? this.element;
    const profileId = String(form?.querySelector?.('[name="profileId"]:checked')?.value ?? this.selectedProfileId ?? "sailingShip");
    const name = String(form?.querySelector?.('[name="shipName"]')?.value ?? this.shipName ?? "Nouveau navire").trim() || "Nouveau navire";
    this.selectedProfileId = profileId;
    this.shipName = name;
    return { profileId, name };
  }

  static async #onSubmit() {
    this.#readForm();
    await this.render();
  }

  static async #createShip() {
    if (!game.user?.isGM) {
      ui.notifications.warn("Seul un MJ peut créer un nouveau Vehicle depuis l’assistant.");
      return;
    }
    const { profileId, name } = this.#readForm();
    const actor = await Actor.create({ name, type: "vehicle" });
    if (!actor) return;
    await applyShipProfile(actor, profileId);
    this.actor = actor;
    ui.notifications.info(`${actor.name} a été créé avec le profil Skull & Shackles sélectionné.`);
    actor.sheet?.render(true);
    const module = game.modules.get(MODULE_ID);
    module?.api?.openShip?.(actor);
    await this.render();
  }

  static async #applyProfile() {
    if (!this.actor) {
      ui.notifications.warn("Ouvre l’assistant depuis un Vehicle pour appliquer un profil à un navire existant.");
      return;
    }
    if (!this.actor.isOwner) {
      ui.notifications.warn("Tu ne possèdes pas les droits nécessaires pour modifier ce Vehicle.");
      return;
    }
    const { profileId } = this.#readForm();
    const accepted = window.confirm(`Appliquer ce profil à « ${this.actor.name} » ?\n\nLes statistiques de coque, propulsion, équipage et composants seront remplacées.`);
    if (!accepted) return;
    await applyShipProfile(this.actor, profileId);
    ui.notifications.info(`${this.actor.name} a reçu le nouveau profil Skull & Shackles.`);
    await this.render();
  }
}
