import { MODULE_ID } from "./ship-data.mjs";
import { getFleetData, getFleetInfamy, getFleetMaxSquadrons, fleetOfficerActors } from "./fleet-data.mjs";
import { getReputationData, listActorSkills } from "./reputation-data.mjs";
import {
  MERCENARY_PORTS, ALLIED_SQUADRONS, getRecruitmentData, setRecruitmentData, addRecruitmentLog,
  addMercenarySquadron, addAlliedSquadron, payMercenaryWithPlunder
} from "./fleet-recruitment-data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function n(v, f = 0) { const x = Number(v); return Number.isFinite(x) ? x : f; }
function selectedRecruiter(data) { try { return data.recruiterUuid ? fromUuidSync(data.recruiterUuid) : null; } catch { return null; } }
function socialSkills(actor) {
  if (!actor) return [];
  return listActorSkills(actor).filter((s) => /(bluff|diplom|intimid)/i.test(s.name));
}

export class FleetRecruitmentController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-fleet-recruitment", "standard-form"],
    tag: "form",
    position: { width: 900, height: 760 },
    window: { icon: "fa-solid fa-users-viewfinder", resizable: true },
    actions: {
      openFleet: this.#openFleet,
      attemptMercenary: this.#attemptMercenary,
      payMercenaryPlunder: this.#payMercenaryPlunder,
      payMercenaryGold: this.#payMercenaryGold,
      cancelPending: this.#cancelPending,
      recruitAlly: this.#recruitAlly,
      toggleAlly: this.#toggleAlly,
      advanceDay: this.#advanceDay,
      advanceWeek: this.#advanceWeek,
      clearLog: this.#clearLog,
      releaseMercenaries: this.#releaseMercenaries
    },
    form: { handler: this.#onSubmit, closeOnSubmit: false }
  };
  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/fleet-recruitment-controller.hbs` } };

  constructor(actor, options = {}) {
    super({ id: `pf1-ss-fleet-recruitment-${actor.id}`, ...options, window: { ...(options.window ?? {}), title: `Recrutement de flotte — ${actor.name}` } });
    this.actor = actor;
  }

  static open(actor) {
    if (!actor || actor.type !== "vehicle") { ui.notifications.warn("Sélectionne le Vehicle PF1 du vaisseau amiral."); return null; }
    const app = new FleetRecruitmentController(actor); app.render({ force: true }); return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const recruitment = getRecruitmentData(this.actor);
    const fleet = getFleetData(this.actor);
    const rep = getReputationData(this.actor);
    const actors = fleetOfficerActors();
    const recruiter = selectedRecruiter(recruitment);
    const skills = socialSkills(recruiter);
    const selectedSkill = skills.find((s) => s.id === recruitment.recruiterSkill) ?? skills[0] ?? null;
    const portRows = MERCENARY_PORTS.map((name) => {
      const p = recruitment.ports[name];
      const cooldown = Math.max(0, p.availableDay - recruitment.day);
      return { name, selected: name === recruitment.currentPort, recruited: p.recruited, available: cooldown <= 0, cooldown };
    });
    const allyRows = Object.entries(ALLIED_SQUADRONS).map(([key, profile]) => ({ key, ...profile, ...recruitment.allies[key] }));
    return {
      ...context, actor: this.actor, recruitment, fleet, rep,
      fleetCount: fleet.squadrons.length, fleetMax: getFleetMaxSquadrons(this.actor, fleet), infamy: getFleetInfamy(this.actor, fleet),
      recruiterChoices: actors.map((a) => ({ uuid: a.uuid, name: a.name, selected: a.uuid === recruitment.recruiterUuid })),
      skillChoices: skills.map((s) => ({ ...s, selected: s.id === selectedSkill?.id })), selectedSkill,
      portRows, allyRows,
      mercenaryCostPlunder: 40, mercenaryCostGold: 40000,
      plunder: rep.plunder, disrepute: rep.disrepute,
      canDiscount1: rep.disrepute >= 1, canDiscount2: rep.disrepute >= 2, canDiscount3: rep.disrepute >= 3,
      pending: recruitment.pendingMercenary,
      mercenarySailingSelected: recruitment.mercenaryShipType === "sailingShip",
      mercenaryLongshipSelected: recruitment.mercenaryShipType === "longship",
      mercenaryCount: fleet.squadrons.filter((s) => s.recruitmentType === "mercenary").length,
      logRows: [...recruitment.log].reverse()
    };
  }

  static async #onSubmit(event, form, formData) {
    const obj = formData.object ?? formData.toObject?.() ?? Object.fromEntries(formData.entries());
    const incoming = foundry.utils.expandObject(obj).recruitment ?? {};
    const data = getRecruitmentData(this.actor);
    Object.assign(data, incoming);
    data.manualModifier = n(incoming.manualModifier, data.manualModifier);
    data.aidSuccesses = Math.max(0, Math.min(5, Math.floor(n(incoming.aidSuccesses, data.aidSuccesses))));
    await setRecruitmentData(this.actor, data);
    await this.render();
  }

  async #save() { try { await this.submit(); } catch (e) { console.warn(`${MODULE_ID} | recruitment save`, e); } }

  static async #openFleet() { const { FleetController } = await import("./fleet-controller.mjs"); FleetController.open(this.actor); }
  static async #advanceDay() { await this.#save(); const d = getRecruitmentData(this.actor); d.day += 1; addRecruitmentLog(d, "Un jour s’écoule."); await setRecruitmentData(this.actor, d); await this.render(); }
  static async #advanceWeek() { await this.#save(); const d = getRecruitmentData(this.actor); d.day += 7; addRecruitmentLog(d, "Une semaine s’écoule."); await setRecruitmentData(this.actor, d); await this.render(); }
  static async #clearLog() { const d = getRecruitmentData(this.actor); d.log = []; await setRecruitmentData(this.actor, d); await this.render(); }

  static async #releaseMercenaries() {
    await this.#save();
    const fleet = getFleetData(this.actor);
    const before = fleet.squadrons.length;
    fleet.squadrons = fleet.squadrons.filter((s) => s.recruitmentType !== "mercenary");
    const removed = before - fleet.squadrons.length;
    if (!removed) { ui.notifications.info("Aucun escadron mercenaire sous contrat."); return; }
    const { setFleetData } = await import("./fleet-data.mjs");
    await setFleetData(this.actor, fleet);
    const d = getRecruitmentData(this.actor); addRecruitmentLog(d, `${removed} contrat(s) mercenaire(s) prennent fin après une bataille notable.`); await setRecruitmentData(this.actor, d);
    ui.notifications.info(`${removed} escadron(s) mercenaire(s) retiré(s) de la flotte.`); await this.render();
  }

  static async #attemptMercenary() {
    await this.#save();
    const d = getRecruitmentData(this.actor);
    if (d.pendingMercenary) { ui.notifications.warn("Un contrat mercenaire est déjà en attente de paiement."); return; }
    const fleet = getFleetData(this.actor);
    if (fleet.squadrons.length >= getFleetMaxSquadrons(this.actor, fleet)) { ui.notifications.warn("La flotte a atteint son nombre maximum d’escadrons."); return; }
    const port = d.ports[d.currentPort];
    if (port.availableDay > d.day) { ui.notifications.warn(`Aucun nouvel escadron n’est encore disponible à ${d.currentPort}.`); return; }
    const recruiter = selectedRecruiter(d);
    const skills = socialSkills(recruiter);
    const skill = skills.find((s) => s.id === d.recruiterSkill) ?? skills[0];
    if (!skill) { ui.notifications.warn("Choisis un recruteur possédant Bluff, Diplomatie ou Intimidation."); return; }
    const delayRoll = await (new Roll("1d4")).evaluate();
    const days = Number(delayRoll.total ?? 1);
    d.day += days;
    const bonus = Number(skill.mod ?? 0) + (2 * d.aidSuccesses) + Number(d.manualModifier ?? 0);
    const roll = await (new Roll(`1d20 + ${bonus}`)).evaluate();
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: recruiter }), flavor: `Recrutement mercenaire à ${d.currentPort} — ${skill.name}, DD 30 · ${days} jour(s) de recherche` });
    if (Number(roll.total) >= 30) {
      d.pendingMercenary = { port: d.currentPort, shipType: d.mercenaryShipType, roll: Number(roll.total), days };
      addRecruitmentLog(d, `Recrutement réussi à ${d.currentPort} (${roll.total} contre DD 30). Contrat en attente de paiement.`);
      ui.notifications.info("Escadron trouvé. Il reste à payer son engagement.");
    } else {
      addRecruitmentLog(d, `Échec du recrutement à ${d.currentPort} (${roll.total} contre DD 30) après ${days} jour(s).`);
    }
    await setRecruitmentData(this.actor, d); await this.render();
  }

  static async #payMercenaryPlunder(event) {
    await this.#save(); const d = getRecruitmentData(this.actor); if (!d.pendingMercenary) return;
    const spend = Math.max(0, Math.min(3, Number(event.target.closest("button")?.dataset.disrepute ?? 0)));
    try {
      const paid = await payMercenaryWithPlunder(this.actor, spend);
      await addMercenarySquadron(this.actor, { shipType: d.pendingMercenary.shipType });
      const cooldown = await (new Roll("1d4+4")).evaluate();
      const weeks = Number(cooldown.total ?? 5);
      const p = d.ports[d.pendingMercenary.port]; p.recruited = true; p.availableDay = d.day + weeks * 7;
      if (!p.xpAwarded) { p.xpAwarded = true; d.storyXp += 1200; }
      d.plunderSpent += paid.cost; d.disreputeSpent += paid.disrepute;
      addRecruitmentLog(d, `Escadron mercenaire engagé à ${d.pendingMercenary.port} pour ${paid.cost} Butin${paid.disrepute ? ` et ${paid.disrepute} Déshonneur` : ""}. Nouveau recrutement dans ${weeks} semaine(s).`);
      d.pendingMercenary = null; await setRecruitmentData(this.actor, d); ui.notifications.info("Escadron mercenaire ajouté à la flotte."); await this.render();
    } catch (e) { ui.notifications.error(e.message); }
  }

  static async #payMercenaryGold() {
    await this.#save(); const d = getRecruitmentData(this.actor); if (!d.pendingMercenary) return;
    try {
      await addMercenarySquadron(this.actor, { shipType: d.pendingMercenary.shipType });
      const cooldown = await (new Roll("1d4+4")).evaluate(); const weeks = Number(cooldown.total ?? 5);
      const p = d.ports[d.pendingMercenary.port]; p.recruited = true; p.availableDay = d.day + weeks * 7;
      if (!p.xpAwarded) { p.xpAwarded = true; d.storyXp += 1200; }
      d.goldSpent += 40000;
      addRecruitmentLog(d, `Escadron mercenaire engagé à ${d.pendingMercenary.port} pour 40 000 po (dépense enregistrée, monnaie non retirée automatiquement). Nouveau recrutement dans ${weeks} semaine(s).`);
      d.pendingMercenary = null; await setRecruitmentData(this.actor, d); ui.notifications.info("Escadron mercenaire ajouté à la flotte."); await this.render();
    } catch (e) { ui.notifications.error(e.message); }
  }

  static async #cancelPending() { const d = getRecruitmentData(this.actor); d.pendingMercenary = null; addRecruitmentLog(d, "Contrat mercenaire abandonné avant paiement."); await setRecruitmentData(this.actor, d); await this.render(); }

  static async #recruitAlly(event) {
    await this.#save(); const key = event.target.closest("[data-ally-key]")?.dataset.allyKey; const d = getRecruitmentData(this.actor); const state = d.allies[key];
    if (!state?.available) { ui.notifications.warn("Cet allié n’est pas disponible dans cette campagne."); return; }
    if (state.recruited) { ui.notifications.warn("Cet allié a déjà rejoint la flotte."); return; }
    try {
      await addAlliedSquadron(this.actor, key); state.recruited = true; if (!state.xpAwarded) { state.xpAwarded = true; d.storyXp += 4800; }
      addRecruitmentLog(d, `${ALLIED_SQUADRONS[key].label} rejoint la flotte sans coût d’entretien.`);
      await setRecruitmentData(this.actor, d); ui.notifications.info("Escadron allié ajouté à la flotte."); await this.render();
    } catch (e) { ui.notifications.error(e.message); }
  }

  static async #toggleAlly(event) {
    const key = event.target.closest("[data-ally-key]")?.dataset.allyKey; const d = getRecruitmentData(this.actor); if (!d.allies[key]) return;
    d.allies[key].available = !d.allies[key].available; await setRecruitmentData(this.actor, d); await this.render();
  }
}
