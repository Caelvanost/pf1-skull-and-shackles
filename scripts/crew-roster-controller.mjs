import { MODULE_ID } from "./ship-data.mjs";
import { actorByUuid, listCrewActors, getLifeData, ROLES } from "./life-data.mjs";
import { getBoardingData, setBoardingData, createNamedCrewMember, OFFICER_ROLES } from "./boarding-data.mjs";
import {
  getCrewRelationsData, setCrewRelationsData, createCrewRelation,
  attitudeInfo, mutinySideForRelation
} from "./crew-relations-data.mjs";
import {
  CREW_WATCHES, createRosterEntry, getCrewRosterData, setCrewRosterData,
  normalizeCrewRosterData
} from "./crew-roster-data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const esc = foundry.utils.escapeHTML;

function requireGM() {
  if (game.user?.isGM) return true;
  ui.notifications.warn("Seul le MJ peut modifier le registre d’équipage.");
  return false;
}

function sideLabel(side) {
  return ({ pcs: "Avec les PJ", neutral: "Neutre", opposition: "Opposition" })[side] ?? "—";
}

function namedStatusLabel(member) {
  if (!member) return "—";
  const labels = {
    ok: "Apte",
    scratched: "Égratigné",
    wounded: "Blessé",
    severe: "Blessé grave",
    critical: "Critique"
  };
  if (member.captured) return "Capturé";
  return labels[member.status] ?? member.status ?? "—";
}

function healthClass(member) {
  if (!member) return "muted";
  if (member.captured || ["severe", "critical"].includes(member.status)) return "danger";
  if (["scratched", "wounded"].includes(member.status)) return "warning";
  return "ok";
}

function actorLevel(actor) {
  const value = actor?.system?.details?.level?.value ?? actor?.system?.details?.level ?? actor?.system?.attributes?.hd?.total ?? 0;
  return Math.max(0, Number(value) || 0);
}

function allTrackedUuids(ship) {
  const roster = getCrewRosterData(ship);
  const life = getLifeData(ship);
  const boarding = getBoardingData(ship);
  const relations = getCrewRelationsData(ship);
  const uuids = new Set(roster.entries.map((entry) => entry.actorUuid));
  for (const member of life.members ?? []) if (member.actorUuid) uuids.add(member.actorUuid);
  for (const member of boarding.profile?.namedCrew ?? []) if (member.actorUuid) uuids.add(member.actorUuid);
  for (const uuid of Object.values(boarding.profile?.officers ?? {})) if (uuid) uuids.add(uuid);
  for (const relation of relations.entries ?? []) if (relation.actorUuid) uuids.add(relation.actorUuid);
  return [...uuids];
}

function sourceBadges({ manual, lifeMember, namedMember, officerRoles, relation }) {
  const out = [];
  if (manual) out.push({ label: "Registre", className: "ok" });
  if (lifeMember) out.push({ label: "Vie à bord", className: "" });
  if (namedMember) out.push({ label: "Abordage", className: "" });
  if (officerRoles.length) out.push({ label: "Officier", className: "warning" });
  if (relation) out.push({ label: "Relation", className: "" });
  return out;
}

export class CrewRosterController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-crew-roster", "standard-form"],
    tag: "form",
    position: { width: 1040, height: 760 },
    window: { icon: "fa-solid fa-address-book", resizable: true },
    actions: {
      addMember: this.#addMember,
      removeManual: this.#removeManual,
      addToRelations: this.#addToRelations,
      addToBoarding: this.#addToBoarding,
      openActor: this.#openActor,
      openLife: this.#openLife,
      openBoarding: this.#openBoarding,
      openRelations: this.#openRelations,
      openDevelopment: this.#openDevelopment,
      openWatch: this.#openWatch,
      postSummary: this.#postSummary
    },
    form: { handler: this.#submit, closeOnSubmit: false }
  };

  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/crew-roster-controller.hbs` } };

  constructor(actor, options = {}) {
    super({
      id: `pf1-ss-crew-roster-${actor.id}`,
      ...options,
      window: { ...(options.window ?? {}), title: `Registre d’équipage — ${actor.name}` }
    });
    this.actor = actor;
  }

  static open(actor) {
    if (!actor || actor.type !== "vehicle") {
      ui.notifications.warn("Skull & Shackles : sélectionne le Vehicle du navire.");
      return null;
    }
    const app = new CrewRosterController(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const roster = getCrewRosterData(this.actor);
    const life = getLifeData(this.actor);
    const boarding = getBoardingData(this.actor);
    const relations = getCrewRelationsData(this.actor);
    const rosterByUuid = new Map(roster.entries.map((entry, index) => [entry.actorUuid, { ...entry, index }]));
    const lifeByUuid = new Map((life.members ?? []).map((member) => [member.actorUuid, member]));
    const namedByUuid = new Map((boarding.profile?.namedCrew ?? []).map((member) => [member.actorUuid, member]));
    const relationByUuid = new Map((relations.entries ?? []).map((entry) => [entry.actorUuid, entry]));
    const officerMap = new Map();
    for (const [key, uuid] of Object.entries(boarding.profile?.officers ?? {})) {
      if (!uuid) continue;
      const list = officerMap.get(uuid) ?? [];
      list.push(OFFICER_ROLES[key] ?? key);
      officerMap.set(uuid, list);
    }

    const rows = allTrackedUuids(this.actor).map((uuid) => {
      const actor = actorByUuid(uuid);
      if (!game.user?.isGM && (!actor || !actor.testUserPermission?.(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED))) return null;
      const manual = rosterByUuid.get(uuid) ?? null;
      const lifeMember = lifeByUuid.get(uuid) ?? null;
      const namedMember = namedByUuid.get(uuid) ?? null;
      const relation = relationByUuid.get(uuid) ?? null;
      const officers = officerMap.get(uuid) ?? [];
      const attitude = relation ? attitudeInfo(relation.attitude) : null;
      const linkedPc = relation ? actorByUuid(relation.linkedPcUuid) : null;
      return {
        actorUuid: uuid,
        actorName: actor?.name ?? uuid,
        actorImg: actor?.img ?? "icons/svg/mystery-man.svg",
        level: actorLevel(actor),
        typeLabel: actor?.type === "character" ? "PJ" : "PNJ",
        manual,
        manualIndex: manual?.index ?? -1,
        duty: manual?.duty ?? "",
        notes: manual?.notes ?? "",
        highlighted: Boolean(manual?.highlighted),
        watchChoices: Object.entries(CREW_WATCHES).map(([value, label]) => ({ value, label, selected: value === (manual?.watch ?? "none") })),
        lifeRole: lifeMember ? (ROLES[lifeMember.role]?.label ?? lifeMember.role) : "—",
        fatigued: Boolean(lifeMember?.fatigued),
        officerLabel: officers.join(", ") || "—",
        attitudeLabel: attitude?.label ?? "—",
        attitudeClass: attitude?.className ?? "muted",
        linkedPcName: linkedPc?.name ?? "—",
        mutinySide: relation ? sideLabel(mutinySideForRelation(relation)) : "—",
        healthLabel: namedStatusLabel(namedMember),
        healthClass: healthClass(namedMember),
        injuryLabel: namedMember?.injuryLabel || "—",
        exposed: Boolean(namedMember?.exposed),
        captured: Boolean(namedMember?.captured),
        inRelations: Boolean(relation),
        inBoarding: Boolean(namedMember),
        sources: sourceBadges({ manual, lifeMember, namedMember, officerRoles: officers, relation })
      };
    }).filter(Boolean).sort((a, b) => {
      if (a.highlighted !== b.highlighted) return a.highlighted ? -1 : 1;
      return a.actorName.localeCompare(b.actorName, game.i18n.lang);
    });

    const summary = {
      total: rows.length,
      officers: rows.filter((row) => row.officerLabel !== "—").length,
      wounded: rows.filter((row) => !["—", "Apte"].includes(row.healthLabel)).length,
      pcsSide: rows.filter((row) => row.mutinySide === "Avec les PJ").length,
      opposition: rows.filter((row) => row.mutinySide === "Opposition").length
    };

    const existing = new Set(rows.map((row) => row.actorUuid));
    const addChoices = listCrewActors().filter((actor) => !existing.has(actor.uuid)).map((actor) => ({ uuid: actor.uuid, name: actor.name }));

    return { ...context, actor: this.actor, isGM: Boolean(game.user?.isGM), rows, roster, summary, addChoices };
  }

  static async #submit(event, form, formData) {
    if (!requireGM()) return;
    const raw = foundry.utils.expandObject(formData.object ?? formData.toObject?.() ?? Object.fromEntries(formData.entries()));
    const old = getCrewRosterData(this.actor);
    const submitted = raw.roster?.entries ?? {};
    const incoming = Object.keys(submitted).sort((a, b) => Number(a) - Number(b)).map((key) => submitted[key]);
    const oldById = new Map(old.entries.map((entry) => [entry.id, entry]));
    const entries = incoming.map((entry) => ({
      ...(oldById.get(String(entry.id ?? "")) ?? {}),
      ...entry,
      highlighted: Boolean(entry.highlighted)
    }));
    await setCrewRosterData(this.actor, normalizeCrewRosterData({ ...old, entries }));
    await this.render();
  }

  async #save() {
    try { await this.submit(); }
    catch (error) { console.warn(`${MODULE_ID} | Sauvegarde du registre impossible`, error); }
  }

  static async #addMember() {
    if (!requireGM()) return;
    await this.#save();
    const uuid = String(this.element?.querySelector?.('[name="newRosterUuid"]')?.value ?? "");
    if (!uuid) return ui.notifications.warn("Choisis un personnage à ajouter au registre.");
    const data = getCrewRosterData(this.actor);
    if (!data.entries.some((entry) => entry.actorUuid === uuid)) data.entries.push(createRosterEntry(uuid));
    await setCrewRosterData(this.actor, data);
    await this.render();
  }

  static async #removeManual(event, target) {
    if (!requireGM()) return;
    await this.#save();
    const uuid = String(target?.dataset?.uuid ?? "");
    const data = getCrewRosterData(this.actor);
    data.entries = data.entries.filter((entry) => entry.actorUuid !== uuid);
    await setCrewRosterData(this.actor, data);
    ui.notifications.info("Entrée manuelle retirée. Le personnage reste visible s’il est encore utilisé par un autre sous-système.");
    await this.render();
  }

  static async #addToRelations(event, target) {
    if (!requireGM()) return;
    const uuid = String(target?.dataset?.uuid ?? "");
    const data = getCrewRelationsData(this.actor);
    if (!data.entries.some((entry) => entry.actorUuid === uuid)) {
      data.entries.push(createCrewRelation(uuid));
      await setCrewRelationsData(this.actor, data);
      ui.notifications.info("Personnage ajouté au suivi des relations.");
    }
    await this.render();
  }

  static async #addToBoarding(event, target) {
    if (!requireGM()) return;
    const uuid = String(target?.dataset?.uuid ?? "");
    const data = getBoardingData(this.actor);
    if (!data.profile.namedCrew.some((member) => member.actorUuid === uuid)) {
      data.profile.namedCrew.push(createNamedCrewMember(uuid));
      await setBoardingData(this.actor, data);
      ui.notifications.info("Personnage ajouté au suivi des PNJ nommés d’Abordage.");
    }
    await this.render();
  }

  static async #openActor(event, target) {
    actorByUuid(String(target?.dataset?.uuid ?? ""))?.sheet?.render(true);
  }

  static async #openLife() {
    const { LifeController } = await import("./life-controller.mjs");
    LifeController.open(this.actor);
  }

  static async #openBoarding() {
    const { BoardingController } = await import("./boarding-controller.mjs");
    BoardingController.open(this.actor);
  }

  static async #openRelations() {
    const { CrewRelationsController } = await import("./crew-relations-controller.mjs");
    CrewRelationsController.open(this.actor);
  }

  static async #openDevelopment() {
    const { CrewDevelopmentController } = await import("./crew-development-controller.mjs");
    CrewDevelopmentController.open(this.actor);
  }

  static async #openWatch() {
    const { CrewWatchController } = await import("./crew-watch-controller.mjs");
    CrewWatchController.open(this.actor);
  }

  static async #postSummary() {
    await this.#save();
    const context = await this._prepareContext({});
    const listed = context.rows.filter((row) => row.highlighted || row.officerLabel !== "—" || row.healthLabel !== "—" || row.attitudeLabel !== "—");
    const items = listed.slice(0, 30).map((row) => `<li><strong>${esc(row.actorName)}</strong> — ${esc(row.officerLabel !== "—" ? row.officerLabel : (row.duty || row.lifeRole))} · ${esc(row.healthLabel)} · ${esc(row.attitudeLabel)}</li>`).join("");
    await ChatMessage.create({ content: `<div class="pf1-ss-chat-card"><h3>📒 Registre d’équipage — ${esc(this.actor.name)}</h3><p><strong>${context.summary.total}</strong> personnage(s) suivi(s) · <strong>${context.summary.officers}</strong> officier(s) · <strong>${context.summary.wounded}</strong> blessé(s)/capturé(s).</p>${items ? `<ul>${items}</ul>` : "<p>Aucun personnage notable à publier.</p>"}</div>` });
  }
}