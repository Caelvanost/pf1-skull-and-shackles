import { MODULE_ID } from "./ship-data.mjs";
import { getLifeData, setLifeData, actorByUuid } from "./life-data.mjs";
import {
  getCrewWatchData,
  setCrewWatchData,
  addWatchHistory,
  activeRotation,
  watchLabel,
  fatigueInfo
} from "./crew-watch-data.mjs";
import { getCrewRosterData } from "./crew-roster-data.mjs";
import {
  DAILY_PHASES,
  getDailyCycleData,
  setDailyCycleData,
  addDailyHistory,
  nextDailyPhase,
  phaseInfo
} from "./daily-cycle-data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const esc = foundry.utils.escapeHTML;

function requireGM() {
  if (game.user?.isGM) return true;
  ui.notifications.warn("Seul le MJ peut faire avancer le cycle journalier.");
  return false;
}

function memberProgress(life) {
  return (life.members ?? []).map((member) => {
    const actor = actorByUuid(member.actorUuid);
    const day = Number(life.day ?? 1);
    const player = member.player ?? {};
    const taskDone = Number(player.taskRolledDay ?? 0) === day || Number(member.taskRoll ?? 0) !== 0;
    const dayDone = Number(player.dayResolvedDay ?? 0) === day;
    const nightDone = Number(player.nightResolvedDay ?? 0) === day;
    const rumDone = Number(player.rumResolvedDay ?? 0) === day || Boolean(member.rum?.drankToday || member.rum?.dumpedToday);
    const complete = taskDone && dayDone && nightDone && rumDone;
    return {
      actorUuid: member.actorUuid,
      actorName: actor?.name ?? "Personnage introuvable",
      taskDone,
      dayDone,
      nightDone,
      rumDone,
      complete
    };
  });
}

function dailyStatus(life) {
  const rows = memberProgress(life);
  return {
    rows,
    total: rows.length,
    complete: rows.filter((row) => row.complete).length,
    unresolved: rows.filter((row) => !row.complete).length,
    allComplete: rows.length === 0 || rows.every((row) => row.complete)
  };
}

async function advanceLifeToNextDay(ship) {
  const life = getLifeData(ship);
  life.day += 1;
  for (const member of life.members ?? []) {
    if (member.nightAction === "rest") member.fatigued = false;
    if (member.fatiguedNextDay) member.fatigued = true;
    member.fatiguedNextDay = false;
    member.extraNightActions = 0;
    member.taskId = "";
    member.taskRoll = 0;
    member.rum = {
      ...(member.rum ?? {}),
      drankToday: false,
      dumpedToday: false,
      chaBonus: 0,
      fatigueHours: 0,
      conDamage: 0,
      addictionFailed: false
    };
    member.lastTask = { passed: null, worstMargin: null, text: "" };
    member.player = {
      ...(member.player ?? {}),
      taskRolledDay: 0,
      dayResolvedDay: 0,
      nightResolvedDay: 0,
      rumResolvedDay: 0
    };
  }
  const kroop = await new Roll("1d100").evaluate();
  life.kroopDrunk = Number(kroop.total) <= 50;
  await setLifeData(ship, life);
  return { life, kroop: Number(kroop.total) };
}

async function syncWatchDay(ship, day) {
  const watch = getCrewWatchData(ship);
  const roster = getCrewRosterData(ship);
  const sequence = activeRotation(roster.entries);
  watch.day = Math.max(1, Number(day ?? watch.day ?? 1));
  if (!sequence.includes(watch.currentWatch)) watch.currentWatch = sequence[0] ?? "day";
  const updated = addWatchHistory(watch, "daily", `Cycle journalier synchronisé au jour ${watch.day}.`);
  await setCrewWatchData(ship, updated);
  return updated;
}

export class DailyCycleController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-daily-cycle", "standard-form"],
    tag: "form",
    position: { width: 900, height: 760 },
    window: { icon: "fa-solid fa-calendar-day", resizable: true },
    actions: {
      previousPhase: this.#previousPhase,
      nextPhase: this.#nextPhase,
      setPhase: this.#setPhase,
      syncDays: this.#syncDays,
      closeDay: this.#closeDay,
      forceCloseDay: this.#forceCloseDay,
      addNote: this.#addNote,
      postSummary: this.#postSummary,
      openLife: this.#openLife,
      openWatch: this.#openWatch,
      openRoster: this.#openRoster
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/daily-cycle-controller.hbs` }
  };

  constructor(actor, options = {}) {
    super({
      id: `pf1-ss-daily-cycle-${actor.id}`,
      ...options,
      window: { ...(options.window ?? {}), title: `Cycle journalier — ${actor.name}` }
    });
    this.actor = actor;
  }

  static open(actor) {
    if (!actor || actor.type !== "vehicle") {
      ui.notifications.warn("Skull & Shackles : sélectionne le Vehicle du navire.");
      return null;
    }
    const app = new DailyCycleController(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const daily = getDailyCycleData(this.actor);
    const life = getLifeData(this.actor);
    const watch = getCrewWatchData(this.actor);
    const progress = dailyStatus(life);
    const history = [...(daily.history ?? [])].reverse().slice(0, 30).map((entry) => ({
      ...entry,
      phaseLabel: phaseInfo(entry.phase).label,
      timeLabel: entry.at ? new Date(entry.at).toLocaleString(game.i18n.lang) : "—"
    }));
    return {
      ...context,
      actor: this.actor,
      isGM: Boolean(game.user?.isGM),
      daily,
      life,
      watch,
      progress,
      phase: phaseInfo(daily.phase),
      phases: DAILY_PHASES.map((phase) => ({ ...phase, active: phase.id === daily.phase })),
      dayMismatch: daily.day !== life.day || daily.day !== watch.day,
      lifeDay: life.day,
      watchDay: watch.day,
      currentWatchLabel: watchLabel(watch.currentWatch),
      generalFatigue: fatigueInfo(watch.generalFatigue),
      history
    };
  }

  async #changePhase(direction) {
    if (!requireGM()) return;
    let daily = getDailyCycleData(this.actor);
    const move = nextDailyPhase(daily.phase, direction);
    if (move.wrappedForward) {
      ui.notifications.warn("La dernière phase est atteinte. Utilise « Clore la journée » pour passer au jour suivant.");
      return;
    }
    if (move.wrappedBackward) {
      ui.notifications.warn("La première phase de la journée est atteinte.");
      return;
    }
    daily.phase = move.phase;
    daily = addDailyHistory(daily, "phase", `Phase : ${phaseInfo(daily.phase).label}`);
    await setDailyCycleData(this.actor, daily);
    await this.render();
  }

  static async #previousPhase() { await this.#changePhase(-1); }
  static async #nextPhase() { await this.#changePhase(1); }

  static async #setPhase(event, target) {
    if (!requireGM()) return;
    const phaseId = String(target?.dataset?.phase ?? "");
    if (!DAILY_PHASES.some((phase) => phase.id === phaseId)) return;
    let daily = getDailyCycleData(this.actor);
    daily.phase = phaseId;
    daily = addDailyHistory(daily, "phase", `Phase : ${phaseInfo(phaseId).label}`);
    await setDailyCycleData(this.actor, daily);
    await this.render();
  }

  static async #syncDays() {
    if (!requireGM()) return;
    const life = getLifeData(this.actor);
    const watch = getCrewWatchData(this.actor);
    const targetDay = Math.max(1, Number(life.day ?? 1), Number(watch.day ?? 1));
    let daily = getDailyCycleData(this.actor);
    daily.day = targetDay;
    daily = addDailyHistory(daily, "sync", `Synchronisation des compteurs au jour ${targetDay}.`);
    await setDailyCycleData(this.actor, daily);
    if (life.day !== targetDay) {
      life.day = targetDay;
      await setLifeData(this.actor, life);
    }
    await syncWatchDay(this.actor, targetDay);
    await this.render();
  }

  async #doCloseDay(force = false) {
    if (!requireGM()) return;
    const lifeBefore = getLifeData(this.actor);
    const status = dailyStatus(lifeBefore);
    if (!force && !status.allComplete) {
      ui.notifications.warn(`${status.unresolved} personnage(s) ont encore des éléments quotidiens non résolus. Utilise « Forcer la clôture » si nécessaire.`);
      return;
    }

    const { life, kroop } = await advanceLifeToNextDay(this.actor);
    const watch = await syncWatchDay(this.actor, life.day);
    let daily = getDailyCycleData(this.actor);
    daily.day = life.day;
    daily.phase = "dawn";
    daily = addDailyHistory(
      daily,
      force && !status.allComplete ? "force" : "day",
      `Ouverture du jour ${life.day}. Kroop : ${life.kroopDrunk ? "saoul" : "fonctionnel"} (${kroop}/100). Quart : ${watchLabel(watch.currentWatch)}.`
    );
    await setDailyCycleData(this.actor, daily);

    await ChatMessage.create({
      content: `<div class="pf1-ss-chat-card"><h3>🌅 Jour ${life.day} — ${esc(this.actor.name)}</h3><p>Nouvelle journée ouverte. Kroop est <strong>${life.kroopDrunk ? "complètement saoul" : "sobre / fonctionnel"}</strong> (${kroop}/100).</p><p>Quart actif : <strong>${esc(watchLabel(watch.currentWatch))}</strong>. Les tâches quotidiennes sont prêtes à être attribuées.</p>${force && !status.allComplete ? `<p><em>Clôture forcée : ${status.unresolved} personnage(s) avaient encore des éléments non résolus.</em></p>` : ""}</div>`
    });
    await this.render();
  }

  static async #closeDay() { await this.#doCloseDay(false); }
  static async #forceCloseDay() { await this.#doCloseDay(true); }

  static async #addNote() {
    if (!requireGM()) return;
    const input = this.element?.querySelector?.("[data-daily-note]");
    const note = String(input?.value ?? "").trim();
    if (!note) {
      ui.notifications.warn("Saisis une note avant de l’ajouter au journal.");
      return;
    }
    let daily = getDailyCycleData(this.actor);
    daily = addDailyHistory(daily, "note", note);
    await setDailyCycleData(this.actor, daily);
    if (input) input.value = "";
    await this.render();
  }

  static async #postSummary() {
    const context = await this._prepareContext({});
    const unresolved = context.progress.rows.filter((row) => !row.complete)
      .map((row) => `<li><strong>${esc(row.actorName)}</strong> — tâche ${row.taskDone ? "✓" : "…"} · jour ${row.dayDone ? "✓" : "…"} · nuit ${row.nightDone ? "✓" : "…"} · rhum ${row.rumDone ? "✓" : "…"}</li>`)
      .join("");
    await ChatMessage.create({
      content: `<div class="pf1-ss-chat-card"><h3>📘 Journal de bord — ${esc(this.actor.name)}</h3><p>Jour <strong>${context.daily.day}</strong> · phase <strong>${esc(context.phase.label)}</strong> · quart <strong>${esc(context.currentWatchLabel)}</strong> · fatigue générale <strong>${esc(context.generalFatigue.label)}</strong>.</p><p>Vie à bord : <strong>${context.progress.complete}/${context.progress.total}</strong> personnage(s) complètement résolus.</p>${unresolved ? `<h4>À terminer</h4><ul>${unresolved}</ul>` : "<p>Tout le monde est à jour pour la journée.</p>"}</div>`
    });
  }

  static async #openLife() {
    const { LifeController } = await import("./life-controller.mjs");
    LifeController.open(this.actor);
  }

  static async #openWatch() {
    const { CrewWatchController } = await import("./crew-watch-controller.mjs");
    CrewWatchController.open(this.actor);
  }

  static async #openRoster() {
    const { CrewRosterController } = await import("./crew-roster-controller.mjs");
    CrewRosterController.open(this.actor);
  }
}
