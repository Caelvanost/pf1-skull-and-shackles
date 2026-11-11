import { MODULE_ID } from "./ship-data.mjs";
import { actorByUuid, listCrewActors, getLifeData } from "./life-data.mjs";
import { getBoardingData } from "./boarding-data.mjs";
import {
  CREW_ATTITUDES, MUTINY_SIDE_OVERRIDES,
  createCrewRelation, getCrewRelationsData, setCrewRelationsData,
  normalizeCrewRelationsData, attitudeInfo, shiftAttitude, mutinySideForRelation,
  mutinyRoster, recordAttitudeChange
} from "./crew-relations-data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const esc = foundry.utils.escapeHTML;

function requireGM() {
  if (game.user?.isGM) return true;
  ui.notifications.warn("Seul le MJ peut modifier les relations d’équipage.");
  return false;
}
function currentDay(ship) { return Math.max(1, Number(getLifeData(ship)?.day ?? 1)); }
function actorChoices() {
  return listCrewActors().map(a => ({ uuid: a.uuid, name: a.name, type: a.type }));
}
function relationBenefits(attitude) {
  if (attitude === "friendly") return "Aide de jour : +2 à une tâche si le PNJ possède des rangs dans la compétence appropriée.";
  if (attitude === "helpful") return "Aide jour/nuit : +2 aux tâches admissibles, à l’influence et aux jeux/divertissements ; prêts d’argent/équipement selon le MJ.";
  return "Aucun bonus d’aide automatique.";
}
function sideLabel(side) {
  return ({ pcs: "Avec les PJ", neutral: "Neutre", opposition: "Opposition" })[side] ?? side;
}
function historyRows(data) {
  return [...(data.history ?? [])].reverse().slice(0, 30).map(h => ({
    ...h,
    date: h.at ? new Date(h.at).toLocaleString() : "—",
    fromLabel: attitudeInfo(h.from).label,
    toLabel: attitudeInfo(h.to).label
  }));
}

export class CrewRelationsController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-crew-relations", "standard-form"],
    tag: "form",
    position: { width: 900, height: "auto" },
    window: { icon: "fa-solid fa-people-group", resizable: true },
    actions: {
      addRelation: this.#addRelation,
      removeRelation: this.#removeRelation,
      improveAttitude: this.#improveAttitude,
      worsenAttitude: this.#worsenAttitude,
      syncBoarding: this.#syncBoarding,
      postMutinyRoster: this.#postMutinyRoster,
      clearHistory: this.#clearHistory,
      openLife: this.#openLife,
      openBoarding: this.#openBoarding,
      openCrewDevelopment: this.#openCrewDevelopment
    },
    form: { handler: this.#submit, closeOnSubmit: false }
  };
  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/crew-relations-controller.hbs` } };

  constructor(actor, options = {}) {
    super({
      id: `pf1-ss-crew-relations-${actor.id}`,
      ...options,
      window: { ...(options.window ?? {}), title: `Relations d’équipage — ${actor.name}` }
    });
    this.actor = actor;
  }

  static open(actor) {
    if (!actor || actor.type !== "vehicle") {
      ui.notifications.warn("Skull & Shackles : sélectionne le Vehicle du navire.");
      return null;
    }
    const app = new CrewRelationsController(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const data = getCrewRelationsData(this.actor);
    const choices = actorChoices();
    const pcChoices = choices.filter(c => c.type === "character");
    const rows = data.entries.map((entry, index) => {
      const actor = actorByUuid(entry.actorUuid);
      const linked = actorByUuid(entry.linkedPcUuid);
      const info = attitudeInfo(entry.attitude);
      const side = mutinySideForRelation(entry);
      return {
        ...entry, index,
        actorName: actor?.name ?? entry.actorUuid,
        linkedPcName: linked?.name ?? "—",
        attitudeLabel: info.label,
        attitudeClass: info.className,
        sideLabel: sideLabel(side),
        benefits: relationBenefits(entry.attitude),
        attitudeChoices: Object.entries(CREW_ATTITUDES).map(([value, d]) => ({ value, label: d.label, selected: value === entry.attitude })),
        sideChoices: Object.entries(MUTINY_SIDE_OVERRIDES).map(([value, d]) => ({ value, label: d.label, selected: value === entry.mutinySide })),
        pcChoices: pcChoices.map(c => ({ ...c, selected: c.uuid === entry.linkedPcUuid }))
      };
    });
    const roster = mutinyRoster(data);
    return {
      ...context,
      actor: this.actor,
      isGM: Boolean(game.user?.isGM),
      data,
      rows,
      addChoices: choices.filter(c => !data.entries.some(e => e.actorUuid === c.uuid)),
      pcsCount: roster.pcs.length,
      neutralCount: roster.neutral.length,
      oppositionCount: roster.opposition.length,
      pcsNames: roster.pcs.map(e => actorByUuid(e.actorUuid)?.name ?? e.actorUuid).join(", ") || "—",
      neutralNames: roster.neutral.map(e => actorByUuid(e.actorUuid)?.name ?? e.actorUuid).join(", ") || "—",
      oppositionNames: roster.opposition.map(e => actorByUuid(e.actorUuid)?.name ?? e.actorUuid).join(", ") || "—",
      history: historyRows(data)
    };
  }

  static async #submit(event, form, formData) {
    if (!requireGM()) return;
    const raw = foundry.utils.expandObject(formData.object ?? formData.toObject?.() ?? Object.fromEntries(formData.entries()));
    const old = getCrewRelationsData(this.actor);
    const submitted = raw.relations?.entries ?? {};
    const incoming = Object.keys(submitted).sort((a,b)=>Number(a)-Number(b)).map(k=>submitted[k]);
    const oldById = new Map(old.entries.map(e => [e.id, e]));
    const entries = incoming.map(e => ({ ...(oldById.get(String(e.id ?? "")) ?? {}), ...e }));
    await setCrewRelationsData(this.actor, normalizeCrewRelationsData({ ...old, entries, history: old.history }));
    await this.render();
  }

  async #save() {
    try { await this.submit(); }
    catch (error) { console.warn(`${MODULE_ID} | Sauvegarde relations impossible`, error); }
  }

  static async #addRelation() {
    if (!requireGM()) return;
    await this.#save();
    const uuid = String(this.element?.querySelector?.('[name="newRelationUuid"]')?.value ?? "");
    if (!uuid) return ui.notifications.warn("Choisis un PNJ ou membre d’équipage à suivre.");
    const data = getCrewRelationsData(this.actor);
    if (data.entries.some(e => e.actorUuid === uuid)) return ui.notifications.info("Ce personnage est déjà suivi.");
    data.entries.push(createCrewRelation(uuid));
    await setCrewRelationsData(this.actor, data);
    await this.render();
  }

  static async #removeRelation(event, target) {
    if (!requireGM()) return;
    await this.#save();
    const id = String(target?.dataset?.id ?? "");
    const data = getCrewRelationsData(this.actor);
    data.entries = data.entries.filter(e => e.id !== id);
    await setCrewRelationsData(this.actor, data);
    await this.render();
  }

  static async #changeAttitude(event, target, delta) {
    if (!requireGM()) return;
    await this.#save();
    const id = String(target?.dataset?.id ?? "");
    let data = getCrewRelationsData(this.actor);
    const entry = data.entries.find(e => e.id === id);
    if (!entry) return;
    const actor = actorByUuid(entry.actorUuid);
    const from = entry.attitude;
    const to = shiftAttitude(from, delta);
    if (to === from) return ui.notifications.info("Cette attitude est déjà à sa limite.");
    data = recordAttitudeChange(data, entry, { from, to, actorName: actor?.name ?? "", source: "Ajustement rapide", day: currentDay(this.actor) });
    await setCrewRelationsData(this.actor, data);
    await ChatMessage.create({ content: `<div class="pf1-ss-chat-card"><h3>🤝 Relation d’équipage — ${esc(actor?.name ?? "PNJ")}</h3><p>Attitude : <strong>${esc(attitudeInfo(from).label)}</strong> → <strong>${esc(attitudeInfo(to).label)}</strong>.</p><p>En cas de mutinerie : <strong>${esc(sideLabel(mutinySideForRelation(data.entries.find(e=>e.id===id))))}</strong>.</p></div>` });
    await this.render();
  }
  static async #improveAttitude(event, target) { return this.#changeAttitude(event, target, +1); }
  static async #worsenAttitude(event, target) { return this.#changeAttitude(event, target, -1); }

  static async #syncBoarding() {
    if (!requireGM()) return;
    await this.#save();
    const board = getBoardingData(this.actor);
    const data = getCrewRelationsData(this.actor);
    let added = 0;
    for (const member of board.profile?.namedCrew ?? []) {
      if (!member.actorUuid || data.entries.some(e => e.actorUuid === member.actorUuid)) continue;
      data.entries.push(createCrewRelation(member.actorUuid));
      added++;
    }
    await setCrewRelationsData(this.actor, data);
    ui.notifications.info(`${added} personnage(s) importé(s) depuis Abordage.`);
    await this.render();
  }

  static async #postMutinyRoster() {
    await this.#save();
    const data = getCrewRelationsData(this.actor);
    const roster = mutinyRoster(data);
    const names = (list) => list.map(e => esc(actorByUuid(e.actorUuid)?.name ?? e.actorUuid)).join(", ") || "—";
    await ChatMessage.create({ content: `<div class="pf1-ss-chat-card"><h3>⚔️ Camps de mutinerie — ${esc(this.actor.name)}</h3><p><strong>Avec les PJ (${roster.pcs.length}) :</strong> ${names(roster.pcs)}</p><p><strong>Neutres (${roster.neutral.length}) :</strong> ${names(roster.neutral)}</p><p><strong>Opposition (${roster.opposition.length}) :</strong> ${names(roster.opposition)}</p><p class="hint">Règle de campagne : les PNJ amicaux/serviables soutiennent les PJ, les indifférents ne participent pas, et les inamicaux/hostiles soutiennent l’opposition, sauf exception décidée par le scénario ou le MJ.</p></div>` });
  }

  static async #clearHistory() {
    if (!requireGM()) return;
    const data = getCrewRelationsData(this.actor);
    data.history = [];
    await setCrewRelationsData(this.actor, data);
    await this.render();
  }

  static async #openLife() { const { LifeController } = await import("./life-controller.mjs"); LifeController.open(this.actor); }
  static async #openBoarding() { const { BoardingController } = await import("./boarding-controller.mjs"); BoardingController.open(this.actor); }
  static async #openCrewDevelopment() { const { CrewDevelopmentController } = await import("./crew-development-controller.mjs"); CrewDevelopmentController.open(this.actor); }
}
