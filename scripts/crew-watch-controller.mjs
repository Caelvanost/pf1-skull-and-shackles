import { MODULE_ID } from "./ship-data.mjs";
import { actorByUuid, getLifeData } from "./life-data.mjs";
import { getBoardingData } from "./boarding-data.mjs";
import { getCrewRelationsData } from "./crew-relations-data.mjs";
import {
  CREW_WATCHES,
  createRosterEntry,
  getCrewRosterData,
  setCrewRosterData
} from "./crew-roster-data.mjs";
import {
  addWatchHistory,
  activeRotation,
  crewCombatFatigueModifier,
  fatigueInfo,
  getCrewWatchData,
  getMemberFatigue,
  setCrewWatchData,
  setMemberFatigue,
  watchLabel
} from "./crew-watch-data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const esc = foundry.utils.escapeHTML;

function requireGM() {
  if (game.user?.isGM) return true;
  ui.notifications.warn("Seul le MJ peut modifier les quarts et la fatigue de l’équipage.");
  return false;
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

function ensureRosterEntry(roster, actorUuid) {
  let entry = roster.entries.find((row) => row.actorUuid === actorUuid);
  if (!entry) {
    entry = createRosterEntry(actorUuid);
    roster.entries.push(entry);
  }
  return entry;
}

function trackedRows(ship, watchData = getCrewWatchData(ship)) {
  const roster = getCrewRosterData(ship);
  const rosterByUuid = new Map(roster.entries.map((entry) => [entry.actorUuid, entry]));
  const life = getLifeData(ship);
  const lifeByUuid = new Map((life.members ?? []).map((member) => [member.actorUuid, member]));
  return allTrackedUuids(ship).map((uuid) => {
    const actor = actorByUuid(uuid);
    if (!actor) return null;
    if (!game.user?.isGM && !actor.testUserPermission?.(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED)) return null;
    const rosterEntry = rosterByUuid.get(uuid) ?? null;
    const memberFatigue = getMemberFatigue(watchData, uuid);
    const fatigue = fatigueInfo(memberFatigue.points);
    const assignedWatch = rosterEntry?.watch ?? "none";
    const lifeMember = lifeByUuid.get(uuid) ?? null;
    const onDuty = assignedWatch === watchData.currentWatch;
    return {
      actorUuid: uuid,
      actorName: actor.name,
      actorImg: actor.img ?? "icons/svg/mystery-man.svg",
      assignedWatch,
      assignedWatchLabel: watchLabel(assignedWatch),
      duty: rosterEntry?.duty ?? "",
      onDuty,
      reserve: assignedWatch === "reserve",
      fatigue,
      fatigueNote: memberFatigue.note ?? "",
      lifeFatigued: Boolean(lifeMember?.fatigued || lifeMember?.fatiguedNextDay),
      watchChoices: Object.entries(CREW_WATCHES).map(([value, label]) => ({
        value,
        label,
        selected: value === assignedWatch
      }))
    };
  }).filter(Boolean).sort((a, b) => {
    if (a.onDuty !== b.onDuty) return a.onDuty ? -1 : 1;
    if (a.reserve !== b.reserve) return a.reserve ? -1 : 1;
    return a.actorName.localeCompare(b.actorName, game.i18n.lang);
  });
}

function watchChoices(data) {
  return Object.entries(CREW_WATCHES)
    .filter(([key]) => !["none", "reserve"].includes(key))
    .map(([value, label]) => ({ value, label, selected: value === data.currentWatch }));
}

export class CrewWatchController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-crew-watch", "standard-form"],
    tag: "form",
    position: { width: 940, height: 760 },
    window: { icon: "fa-solid fa-clock", resizable: true },
    actions: {
      setWatch: this.#setWatch,
      nextWatch: this.#nextWatch,
      previousWatch: this.#previousWatch,
      generalQuarters: this.#generalQuarters,
      restCycle: this.#restCycle,
      adjustGeneral: this.#adjustGeneral,
      adjustMember: this.#adjustMember,
      syncLifeFatigue: this.#syncLifeFatigue,
      resetFatigue: this.#resetFatigue,
      openRoster: this.#openRoster,
      openLife: this.#openLife,
      openBoarding: this.#openBoarding,
      postSummary: this.#postSummary
    },
    form: { handler: this.#submit, closeOnSubmit: false }
  };

  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/crew-watch-controller.hbs` } };

  constructor(actor, options = {}) {
    super({
      id: `pf1-ss-crew-watch-${actor.id}`,
      ...options,
      window: { ...(options.window ?? {}), title: `Quarts & fatigue — ${actor.name}` }
    });
    this.actor = actor;
  }

  static open(actor) {
    if (!actor || actor.type !== "vehicle") {
      ui.notifications.warn("Skull & Shackles : sélectionne le Vehicle du navire.");
      return null;
    }
    const app = new CrewWatchController(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const data = getCrewWatchData(this.actor);
    const roster = getCrewRosterData(this.actor);
    const rows = trackedRows(this.actor, data);
    const general = fatigueInfo(data.generalFatigue);
    const rotation = activeRotation(roster.entries);
    const summary = {
      total: rows.length,
      onDuty: rows.filter((row) => row.onDuty).length,
      reserve: rows.filter((row) => row.reserve).length,
      fatigued: rows.filter((row) => row.fatigue.points >= 1).length,
      exhausted: rows.filter((row) => row.fatigue.points >= 2).length
    };
    const history = [...(data.history ?? [])].reverse().slice(0, 20).map((entry) => ({
      ...entry,
      watchLabel: watchLabel(entry.watch),
      timeLabel: entry.at ? new Date(entry.at).toLocaleString(game.i18n.lang) : "—"
    }));
    return {
      ...context,
      actor: this.actor,
      isGM: Boolean(game.user?.isGM),
      data,
      rows,
      summary,
      general,
      currentWatchLabel: watchLabel(data.currentWatch),
      watchChoices: watchChoices(data),
      rotationLabel: rotation.map(watchLabel).join(" → "),
      boardingModifier: crewCombatFatigueModifier(data),
      fatigueScale: [0, 1, 2, 3].map((points) => ({ ...fatigueInfo(points), active: points === data.generalFatigue })),
      history
    };
  }

  static async #submit(event, form, formData) {
    if (!requireGM()) return;
    const raw = foundry.utils.expandObject(formData.object ?? formData.toObject?.() ?? Object.fromEntries(formData.entries()));
    const submitted = raw.watchRows ?? {};
    const rows = Object.keys(submitted).sort((a, b) => Number(a) - Number(b)).map((key) => submitted[key]);
    const roster = getCrewRosterData(this.actor);
    for (const row of rows) {
      const actorUuid = String(row?.actorUuid ?? "");
      if (!actorUuid) continue;
      const entry = ensureRosterEntry(roster, actorUuid);
      if (CREW_WATCHES[row.watch]) entry.watch = String(row.watch);
      if (row.duty !== undefined) entry.duty = String(row.duty ?? "");
    }
    await setCrewRosterData(this.actor, roster);
  }

  async #save() {
    try { await this.submit(); }
    catch (error) { console.warn(`${MODULE_ID} | Sauvegarde des quarts impossible`, error); }
  }

  static async #setWatch() {
    if (!requireGM()) return;
    await this.#save();
    const select = this.element?.querySelector?.('[data-current-watch]');
    const value = String(select?.value ?? "");
    if (!CREW_WATCHES[value] || ["none", "reserve"].includes(value)) return;
    let data = getCrewWatchData(this.actor);
    data.currentWatch = value;
    data = addWatchHistory(data, "watch", `Quart actif : ${watchLabel(value)}`);
    await setCrewWatchData(this.actor, data);
    await this.render();
  }

  static async #nextWatch() { await this.#rotateWatch(1); }
  static async #previousWatch() { await this.#rotateWatch(-1); }

  async #rotateWatch(direction) {
    if (!requireGM()) return;
    await this.#save();
    const roster = getCrewRosterData(this.actor);
    const sequence = activeRotation(roster.entries);
    let data = getCrewWatchData(this.actor);
    const index = sequence.indexOf(data.currentWatch);
    let next;
    if (index < 0) next = direction > 0 ? 0 : sequence.length - 1;
    else next = (index + direction + sequence.length) % sequence.length;
    if (index >= 0 && direction > 0 && next <= index) data.day += 1;
    if (index >= 0 && direction < 0 && next >= index) data.day = Math.max(1, data.day - 1);
    data.currentWatch = sequence[next];
    data = addWatchHistory(data, "watch", `${direction > 0 ? "Relève" : "Retour"} : ${watchLabel(data.currentWatch)}`);
    await setCrewWatchData(this.actor, data);
    await this.render();
  }

  static async #generalQuarters() {
    if (!requireGM()) return;
    await this.#save();
    let data = getCrewWatchData(this.actor);
    const rows = trackedRows(this.actor, data);
    data.generalFatigue = Math.min(3, data.generalFatigue + 1);
    for (const row of rows) {
      if (row.onDuty) continue;
      const old = getMemberFatigue(data, row.actorUuid);
      data = setMemberFatigue(data, row.actorUuid, Math.min(3, old.points + 1), "Branle-bas de combat hors quart");
    }
    data = addWatchHistory(data, "combat", "Branle-bas de combat : fatigue générale +1 ; équipiers hors quart +1.");
    await setCrewWatchData(this.actor, data);
    await ChatMessage.create({ content: `<div class="pf1-ss-chat-card"><h3>🔔 Branle-bas de combat — ${esc(this.actor.name)}</h3><p>L’équipage entier est rappelé à son poste. Fatigue générale : <strong>${esc(fatigueInfo(data.generalFatigue).label)}</strong>.</p><p><em>Règle maison : les personnages nommés qui n’étaient pas de quart gagnent 1 niveau de fatigue abstraite.</em></p></div>` });
    await this.render();
  }

  static async #restCycle() {
    if (!requireGM()) return;
    await this.#save();
    let data = getCrewWatchData(this.actor);
    const rows = trackedRows(this.actor, data);
    data.generalFatigue = Math.max(0, data.generalFatigue - 1);
    for (const row of rows) {
      if (row.onDuty) continue;
      const old = getMemberFatigue(data, row.actorUuid);
      if (old.points > 0) data = setMemberFatigue(data, row.actorUuid, old.points - 1, "Repos hors quart");
    }
    data = addWatchHistory(data, "rest", "Cycle de repos : fatigue générale −1 ; équipiers hors quart −1.");
    await setCrewWatchData(this.actor, data);
    await this.render();
  }

  static async #adjustGeneral(event, target) {
    if (!requireGM()) return;
    await this.#save();
    const delta = Number(target?.dataset?.delta ?? 0);
    let data = getCrewWatchData(this.actor);
    data.generalFatigue = Math.max(0, Math.min(3, data.generalFatigue + delta));
    data = addWatchHistory(data, "fatigue", `Fatigue générale ${delta >= 0 ? "+" : ""}${delta} → ${fatigueInfo(data.generalFatigue).label}`);
    await setCrewWatchData(this.actor, data);
    await this.render();
  }

  static async #adjustMember(event, target) {
    if (!requireGM()) return;
    await this.#save();
    const uuid = String(target?.dataset?.uuid ?? "");
    const delta = Number(target?.dataset?.delta ?? 0);
    let data = getCrewWatchData(this.actor);
    const old = getMemberFatigue(data, uuid);
    data = setMemberFatigue(data, uuid, old.points + delta, delta > 0 ? "Fatigue ajoutée par le MJ" : "Récupération accordée par le MJ");
    const actor = actorByUuid(uuid);
    data = addWatchHistory(data, "member", `${actor?.name ?? uuid} : ${fatigueInfo(old.points).label} → ${fatigueInfo(getMemberFatigue(data, uuid).points).label}`);
    await setCrewWatchData(this.actor, data);
    await this.render();
  }

  static async #syncLifeFatigue() {
    if (!requireGM()) return;
    await this.#save();
    const life = getLifeData(this.actor);
    let data = getCrewWatchData(this.actor);
    let changed = 0;
    for (const member of life.members ?? []) {
      if (!member.actorUuid || !(member.fatigued || member.fatiguedNextDay)) continue;
      const old = getMemberFatigue(data, member.actorUuid);
      if (old.points >= 1) continue;
      data = setMemberFatigue(data, member.actorUuid, 1, "Importé depuis Vie à bord");
      changed += 1;
    }
    data = addWatchHistory(data, "sync", `Vie à bord : ${changed} état(s) de fatigue importé(s).`);
    await setCrewWatchData(this.actor, data);
    ui.notifications.info(`${changed} état(s) de fatigue importé(s) depuis Vie à bord.`);
    await this.render();
  }

  static async #resetFatigue() {
    if (!requireGM()) return;
    await this.#save();
    let data = getCrewWatchData(this.actor);
    data.generalFatigue = 0;
    data.memberFatigue = data.memberFatigue.map((entry) => ({ ...entry, points: 0, note: "Réinitialisé par le MJ", updatedAt: Date.now() }));
    data = addWatchHistory(data, "reset", "Toutes les fatigues ont été remises à zéro.");
    await setCrewWatchData(this.actor, data);
    await this.render();
  }

  static async #openRoster() {
    const { CrewRosterController } = await import("./crew-roster-controller.mjs");
    CrewRosterController.open(this.actor);
  }

  static async #openLife() {
    const { LifeController } = await import("./life-controller.mjs");
    LifeController.open(this.actor);
  }

  static async #openBoarding() {
    const { BoardingController } = await import("./boarding-controller.mjs");
    BoardingController.open(this.actor);
  }

  static async #postSummary() {
    await this.#save();
    const context = await this._prepareContext({});
    const tired = context.rows.filter((row) => row.fatigue.points > 0).slice(0, 20)
      .map((row) => `<li><strong>${esc(row.actorName)}</strong> — ${esc(row.assignedWatchLabel)} · ${esc(row.fatigue.label)}</li>`).join("");
    await ChatMessage.create({ content: `<div class="pf1-ss-chat-card"><h3>🕰️ Quarts & fatigue — ${esc(this.actor.name)}</h3><p>Jour <strong>${context.data.day}</strong> · quart actif <strong>${esc(context.currentWatchLabel)}</strong> · fatigue générale <strong>${esc(context.general.label)}</strong>.</p><p>Modificateur maison d’abordage lié à la fatigue : <strong>${context.boardingModifier >= 0 ? "+" : ""}${context.boardingModifier}</strong>.</p>${tired ? `<ul>${tired}</ul>` : "<p>Aucun personnage nommé fatigué.</p>"}</div>` });
  }
}
