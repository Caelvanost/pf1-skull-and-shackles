import { MODULE_ID } from "./ship-data.mjs";
import { getMultiplayerAudit, canUndoMultiplayerEntry, undoMultiplayerEntry, clearMultiplayerAudit } from "./multiplayer-state.mjs";
import { broadcastHudRefresh } from "./multiplayer.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class MultiplayerHistory extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-multiplayer-history", "standard-form"],
    tag: "section",
    position: { width: 780, height: 620 },
    window: { icon: "fa-solid fa-clock-rotate-left", resizable: true },
    actions: {
      undo: this.#undo,
      clear: this.#clear,
      refresh: this.#refresh
    }
  };

  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/multiplayer-history.hbs` } };

  constructor(actor, options = {}) {
    super({ id: `pf1-ss-mp-history-${actor.id}`, ...options, window: { ...(options.window ?? {}), title: `Historique multijoueur — ${actor.name}` } });
    this.actor = actor;
  }

  static open(actor) {
    if (!game.user?.isGM) return ui.notifications.warn("Seul le MJ peut ouvrir l'historique multijoueur.");
    if (!actor || actor.type !== "vehicle") return ui.notifications.warn("Aucun navire de campagne valide.");
    const app = new MultiplayerHistory(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const audit = getMultiplayerAudit(this.actor);
    const rows = [...audit.history].reverse().map((row) => ({
      ...row,
      date: new Date(row.timestamp).toLocaleString(),
      canUndo: canUndoMultiplayerEntry(this.actor, row.id),
      status: row.undoneAt ? "Annulée" : row.kind === "correction" ? "Correction" : "Validée",
      statusClass: row.undoneAt ? "undone" : row.kind === "correction" ? "corrected" : "accepted",
      scopeLabel: row.scope === "entertainment" ? "Jeux" : row.scope === "life" ? "Vie à bord" : "Système"
    }));
    return { ...context, actor: this.actor, revision: audit.revision, rows, empty: rows.length === 0 };
  }

  static async #undo(event, target) {
    const id = String(target?.dataset?.id ?? "");
    if (!id) return;
    try {
      const row = await undoMultiplayerEntry(this.actor, id);
      ui.notifications.info(`Action annulée : ${row.label}. Le joueur peut à nouveau corriger ou relancer si l'état le permet.`);
      broadcastHudRefresh();
      await this.render();
    } catch (error) {
      ui.notifications.warn(error?.message ?? "Impossible d'annuler cette action.");
    }
  }

  static async #clear() {
    if (!game.user?.isGM) return;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Effacer l'historique multijoueur" },
      content: "<p>Effacer l'historique d'audit ? Les états de jeu actuels ne seront pas modifiés.</p>"
    });
    if (!ok) return;
    await clearMultiplayerAudit(this.actor);
    await this.render();
  }

  static async #refresh() { await this.render(); }
}
