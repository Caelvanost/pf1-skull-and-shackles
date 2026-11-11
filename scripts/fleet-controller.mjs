import { MODULE_ID } from "./ship-data.mjs";
import {
  SHIP_TYPES,
  FLEET_ADVANTAGES,
  getFleetData,
  setFleetData,
  normalizeFleetData,
  createSquadron,
  createImportantCharacter,
  getFleetInfamy,
  getAdmiralData,
  getFleetMaxSquadrons,
  getAdvantageCounts,
  deriveSquadron,
  fleetOfficerActors,
  getSquadronPr,
  repairFleetDamage,
  isSquadronEliminated
} from "./fleet-data.mjs";
import { FleetBattleController } from "./fleet-battle-controller.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function signed(value) {
  const n = Number(value ?? 0);
  return `${n >= 0 ? "+" : ""}${n}`;
}

function bool(value) {
  return value === true || value === "true" || value === "on" || value === 1 || value === "1";
}

function arrayFromIndexed(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  return Object.keys(value).sort((a, b) => Number(a) - Number(b)).map((k) => value[k]);
}

export class FleetController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-fleet", "standard-form"],
    tag: "form",
    position: { width: 980, height: 780 },
    window: { icon: "fa-solid fa-flag", resizable: true },
    actions: {
      openShipController: this.#openShipController,
      addSquadron: this.#addSquadron,
      removeSquadron: this.#removeSquadron,
      addImportant: this.#addImportant,
      removeImportant: this.#removeImportant,
      syncOfficers: this.#syncOfficers,
      resetSquadron: this.#resetSquadron,
      openBattle: this.#openBattle,
      openRecruitment: this.#openRecruitment
    },
    form: { handler: this.#onSubmit, closeOnSubmit: false }
  };

  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/fleet-controller.hbs` } };

  constructor(actor, options = {}) {
    super({
      id: `pf1-ss-fleet-${actor.id}`,
      ...options,
      window: { ...(options.window ?? {}), title: `Flotte — ${actor.name}` }
    });
    this.actor = actor;
  }

  static open(actor) {
    if (!actor || actor.type !== "vehicle") {
      ui.notifications.warn("Skull & Shackles : la flotte doit être rattachée au Vehicle PF1 qui sert de vaisseau amiral.");
      return null;
    }
    const app = new FleetController(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const fleet = getFleetData(this.actor);
    const infamy = getFleetInfamy(this.actor, fleet);
    const admiral = getAdmiralData(fleet);
    const maxSquadrons = getFleetMaxSquadrons(this.actor, fleet);
    const advantages = getAdvantageCounts(fleet);
    const actors = fleetOfficerActors();

    const actorChoices = actors.map((a) => ({ uuid: a.uuid, name: a.name, selected: a.uuid === fleet.admiralUuid }));
    const locations = [
      { value: "flagship", label: "Vaisseau amiral" },
      ...fleet.squadrons.map((s) => ({ value: `squadron:${s.id}`, label: s.name }))
    ];
    const advantageChoices = Object.entries(FLEET_ADVANTAGES).map(([value, data]) => ({ value, ...data }));
    const shipTypeChoices = Object.entries(SHIP_TYPES).map(([value, data]) => ({ value, ...data }));

    const squadrons = fleet.squadrons.map((s, index) => {
      const d = deriveSquadron(this.actor, fleet, s);
      return {
        ...s,
        index,
        derived: d,
        professionDisplay: signed(d.vice.profession),
        chaDisplay: signed(d.vice.cha),
        attackDisplay: signed(d.attack),
        moraleModDisplay: signed(d.moraleMod),
        shipTypeLabel: s.shipType === "custom" ? (s.customShipName || "Autre") : SHIP_TYPES[s.shipType]?.label,
        shipTypeChoices: shipTypeChoices.map((x) => ({ ...x, selected: x.value === s.shipType })),
        officerChoices: actors.map((a) => ({ uuid: a.uuid, name: a.name, selected: a.uuid === s.viceAdmiralUuid })),
        shipRows: s.ships.map((ship, shipIndex) => ({
          ...ship,
          index: shipIndex,
          statusLabel: ship.status === "active" ? "Actif" : ship.status === "disabled" ? "Hors de combat" : "Coulé",
          active: ship.status === "active",
          disabled: ship.status === "disabled",
          sunk: ship.status === "sunk"
        }))
      };
    });

    const importants = fleet.importantCharacters.map((c, index) => ({
      ...c,
      index,
      locationChoices: locations.map((l) => ({ ...l, selected: l.value === c.location })),
      advantageChoices: advantageChoices.map((a) => ({ ...a, selected: a.value === c.advantage }))
    }));

    return {
      ...context,
      actor: this.actor,
      fleet,
      infamy,
      admiral,
      admiralProfessionDisplay: signed(admiral.profession),
      admiralChaDisplay: signed(admiral.cha),
      maxSquadrons,
      squadronCount: fleet.squadrons.length,
      overFleetLimit: fleet.squadrons.length > maxSquadrons,
      actorChoices,
      squadrons,
      importants,
      advantages,
      advantageList: advantageChoices,
      hasFleet: Boolean(this.actor.getFlag(MODULE_ID, "fleet"))
    };
  }

  static async #onSubmit(event, form, formData) {
    const object = formData.object ?? formData.toObject?.() ?? Object.fromEntries(formData.entries());
    const raw = foundry.utils.expandObject(object).fleet ?? {};
    const stored = getFleetData(this.actor);

    raw.squadrons = arrayFromIndexed(raw.squadrons).map((incoming, i) => {
      const old = stored.squadrons[i] ?? {};
      incoming.ships = arrayFromIndexed(incoming.ships).map((shipIncoming, j) => ({ ...(old.ships?.[j] ?? {}), ...shipIncoming }));
      return { ...old, ...incoming, counterAdmiralImportant: bool(incoming.counterAdmiralImportant), mutinied: bool(incoming.mutinied) };
    });
    raw.importantCharacters = arrayFromIndexed(raw.importantCharacters).map((incoming, i) => ({
      ...(stored.importantCharacters[i] ?? {}),
      ...incoming,
      enabled: bool(incoming.enabled)
    }));
    raw.npcFleet = bool(raw.npcFleet);
    raw.useReputationInfamy = bool(raw.useReputationInfamy);

    await setFleetData(this.actor, normalizeFleetData({ ...stored, ...raw }));
    await this.render();
  }

  async #saveVisibleForm() {
    try { await this.submit(); } catch (error) { console.warn(`${MODULE_ID} | Impossible d'enregistrer la flotte`, error); }
  }

  static async #openRecruitment() {
    await this.#saveVisibleForm();
    const { FleetRecruitmentController } = await import("./fleet-recruitment-controller.mjs");
    FleetRecruitmentController.open(this.actor);
  }

  static async #openShipController() {
    const { ShipController } = await import("./ship-controller.mjs");
    ShipController.open(this.actor);
  }

  static async #addSquadron() {
    await this.#saveVisibleForm();
    const fleet = getFleetData(this.actor);
    const advantages = getAdvantageCounts(fleet);
    if ((advantages.loyalty ?? 0) > 0) {
      for (const s of fleet.squadrons) s.loyaltyBonus = Math.max(Number(s.loyaltyBonus ?? 0), 2);
    }
    const morale = fleet.npcFleet ? 3 : Math.max(1, Math.min(10, Math.floor(getFleetInfamy(this.actor, fleet) / 10)));
    fleet.squadrons.push(createSquadron({ name: `Escadron ${fleet.squadrons.length + 1}`, morale }));
    await setFleetData(this.actor, fleet);
    await this.render();
  }

  static async #removeSquadron(event) {
    await this.#saveVisibleForm();
    const id = event.target.closest("[data-squadron-id]")?.dataset.squadronId;
    const fleet = getFleetData(this.actor);
    fleet.squadrons = fleet.squadrons.filter((s) => s.id !== id);
    for (const c of fleet.importantCharacters) if (c.location === `squadron:${id}`) c.location = "flagship";
    await setFleetData(this.actor, fleet);
    await this.render();
  }

  static async #addImportant() {
    await this.#saveVisibleForm();
    const fleet = getFleetData(this.actor);
    fleet.importantCharacters.push(createImportantCharacter());
    await setFleetData(this.actor, fleet);
    await this.render();
  }

  static async #removeImportant(event) {
    await this.#saveVisibleForm();
    const id = event.target.closest("[data-important-id]")?.dataset.importantId;
    const fleet = getFleetData(this.actor);
    fleet.importantCharacters = fleet.importantCharacters.filter((c) => c.id !== id);
    await setFleetData(this.actor, fleet);
    await this.render();
  }

  static async #syncOfficers() {
    await this.#saveVisibleForm();
    const fleet = getFleetData(this.actor);
    const admiral = getAdmiralData(fleet);
    if (admiral.actor) {
      fleet.admiralName = admiral.name;
      fleet.admiralCha = admiral.cha;
      fleet.admiralProfession = admiral.profession;
    }
    for (const s of fleet.squadrons) {
      const d = deriveSquadron(this.actor, fleet, s);
      if (d.vice.actor) {
        s.viceAdmiralName = d.vice.name;
        s.viceAdmiralCha = d.vice.cha;
        s.viceAdmiralProfession = d.vice.profession;
      }
    }
    await setFleetData(this.actor, fleet);
    ui.notifications.info("Officiers actualisés depuis les fiches PF1 quand une compétence de marin a pu être identifiée.");
    await this.render();
  }

  static async #resetSquadron(event) {
    await this.#saveVisibleForm();
    const id = event.target.closest("[data-squadron-id]")?.dataset.squadronId;
    const fleet = getFleetData(this.actor);
    const squad = fleet.squadrons.find((s) => s.id === id);
    if (!squad) return;
    squad.mutinied = false;
    squad.morale = fleet.npcFleet ? 3 : Math.max(1, Math.min(10, Math.floor(getFleetInfamy(this.actor, fleet) / 10)));
    squad.manualLosses = 0;
    squad.ships = squad.ships.map((ship) => ({ ...ship, damage: 0, status: "active", pr: getSquadronPr(squad) }));
    await setFleetData(this.actor, fleet);
    await this.render();
  }

  static async #openBattle() {
    await this.#saveVisibleForm();
    const targetActor = [...(game.user?.targets ?? [])].map((t) => t.actor).find((a) => a?.type === "vehicle" && a.id !== this.actor.id);
    if (!targetActor) {
      ui.notifications.warn("Cible le token Vehicle du vaisseau amiral de la flotte adverse.");
      return;
    }
    if (!targetActor.getFlag(MODULE_ID, "fleet")) {
      ui.notifications.warn("La cible n'a pas encore de fiche de flotte Skull & Shackles. Ouvre sa fiche Vehicle puis Flotte pour la créer.");
      return;
    }
    FleetBattleController.open(this.actor, targetActor);
  }
}
