import { MODULE_ID } from "./ship-data.mjs";
import {
  ROLES, TASKS, DAY_ACTIONS, NIGHT_ACTIONS,
  getLifeData, setLifeData, normalizeLifeData, createCrewMember,
  getTaskById, getTaskByRoll, actorByUuid, listCrewActors,
  listActorSkills, findSkill, abilityMod, saveMod, bestAlternative,
  getUnderstaffedTaskDcBonus, getTaskModifier
} from "./life-data.mjs";
import { EntertainmentController } from "./entertainment-controller.mjs";
import { getPerformanceCharismaBonus, getEntertainmentData, setEntertainmentData } from "./entertainment-data.mjs";
import { getCrewRelationsData, relationForActor, attitudeInfo } from "./crew-relations-data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const escape = foundry.utils.escapeHTML;

function signed(v) { const x = Number(v ?? 0); return `${x >= 0 ? "+" : ""}${x}`; }
function naturalD20(roll) {
  const die = roll?.dice?.find?.(d => Number(d.faces) === 20);
  return Number(die?.results?.find?.(r => r.active !== false)?.result ?? 0);
}
function speaker(actor) { return ChatMessage.getSpeaker({ actor: actor ?? null }); }
function crewActorChoices() { return listCrewActors(); }
function getMember(life, id) { return life.members.find(m => m.id === id) ?? null; }
function memberIdFromEvent(event) { return event?.target?.closest?.("[data-member-id]")?.dataset?.memberId ?? ""; }
function safeName(actor, fallback = "Personnage") { return actor?.name ?? fallback; }
function taskRollLabel(task) { return task?.range ?? String(task?.roll ?? "—"); }
function roleLabel(role) { return ROLES[role]?.label ?? role; }
function actionText(key, table) { return table[key]?.label ?? key; }

function actorHasRunFeat(actor) {
  // Le nom du don peut varier selon la traduction ; on ne fait qu'une détection permissive.
  const items = actor?.items ?? [];
  return items.some(i => /(^|\b)(course|run)(\b|$)/i.test(String(i.name ?? "")));
}

function pickInfluenceSkills(actor) {
  return listActorSkills(actor).filter(s => /bluff|diplomat|intimid/i.test(s.name));
}
function pickStealthSkills(actor) {
  return listActorSkills(actor).filter(s => /discr[eé]tion|stealth|escamotage|sleight/i.test(s.name));
}
function pickPerformance(actor) {
  const skills = listActorSkills(actor).filter(s => /repr[eé]sentation|perform/i.test(s.name));
  return skills.sort((a,b)=>b.mod-a.mod)[0] ?? null;
}

async function postChat(actor, title, body, icon = "fa-solid fa-anchor") {
  return ChatMessage.create({
    speaker: speaker(actor),
    content: `<div class="pf1-ss-chat-card"><h3><i class="${icon}"></i> ${escape(title)}</h3>${body}</div>`
  });
}

export class LifeController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-life", "standard-form"],
    tag: "form",
    position: { width: 900, height: "auto" },
    window: { icon: "fa-solid fa-bottle-droplet", resizable: true },
    actions: {
      openShipController: this.#openShipController,
      addMember: this.#addMember,
      removeMember: this.#removeMember,
      assignTask: this.#assignTask,
      assignAllTasks: this.#assignAllTasks,
      rollTask: this.#rollTask,
      refuseWork: this.#refuseWork,
      resolveDayAction: this.#resolveDayAction,
      resolveNightAction: this.#resolveNightAction,
      extraNightAction: this.#extraNightAction,
      drinkRum: this.#drinkRum,
      dumpRum: this.#dumpRum,
      rollInfluence: this.#rollInfluence,
      rollStealth: this.#rollStealth,
      resolvePunishment: this.#resolvePunishment,
      clearPunishments: this.#clearPunishments,
      newDay: this.#newDay,
      randomizeKroop: this.#randomizeKroop,
      openEntertainmentController: this.#openEntertainmentController,
      openCrewRelations: this.#openCrewRelations
    },
    form: { handler: this.#onSubmit, closeOnSubmit: false }
  };

  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/life-controller.hbs` } };

  constructor(actor, options = {}) {
    super({
      id: `pf1-ss-life-${actor.id}`,
      ...options,
      window: { ...(options.window ?? {}), title: `Vie à bord — ${actor.name}` }
    });
    this.actor = actor;
  }

  static open(actor) {
    if (!actor || actor.type !== "vehicle") {
      ui.notifications.warn("Skull & Shackles : la vie à bord doit être rattachée à un Vehicle PF1.");
      return null;
    }
    const app = new LifeController(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const life = getLifeData(this.actor);
    const actors = crewActorChoices();
    const actorChoices = actors.map(a => ({ uuid: a.uuid, name: a.name }));
    const understaffedBonus = getUnderstaffedTaskDcBonus(this.actor, life);

    const members = life.members.map((member, index) => {
      const actor = actorByUuid(member.actorUuid);
      const task = getTaskById(member.taskId);
      const dayChoices = Object.entries(DAY_ACTIONS).map(([value, d]) => ({ value, label: d.label, selected: value === member.dayAction }));
      const nightChoices = Object.entries(NIGHT_ACTIONS).map(([value, d]) => ({ value, label: d.label, selected: value === member.nightAction }));
      const extraChoices = Object.entries(NIGHT_ACTIONS).filter(([,d])=>d.starred).map(([value,d])=>({ value, label:d.label, selected:value===member.extraNightChoice }));
      return {
        ...member, index, actor, actorName: safeName(actor, "—"), task,
        taskRollLabel: taskRollLabel(task), roleLabel: roleLabel(member.role),
        taskModifier: getTaskModifier(member),
        dayChoices, nightChoices, extraChoices,
        actorChoices: actorChoices.map(c => ({ ...c, selected: c.uuid === member.actorUuid })),
        roleChoices: Object.entries(ROLES).map(([value,r])=>({value,label:r.label,selected:value===member.role})),
        hasPunishments: member.punishmentQueue.length > 0,
        playerTaskDone: Number(member.player?.taskRolledDay ?? 0) === life.day,
        playerDayDone: Number(member.player?.dayResolvedDay ?? 0) === life.day,
        playerNightDone: Number(member.player?.nightResolvedDay ?? 0) === life.day,
        playerRumDone: Number(member.player?.rumResolvedDay ?? 0) === life.day,
        extraNightDc: 10 + 4 * (member.extraNightActions + 1)
      };
    });

    const influencer = actorByUuid(life.influence.influencerUuid);
    const influenceSkills = pickInfluenceSkills(influencer);
    if (influencer && !life.influence.skillId && influenceSkills.length) life.influence.skillId = influenceSkills[0].id;
    const stealthActor = actorByUuid(life.stealth.actorUuid);
    const stealthSkills = pickStealthSkills(stealthActor);
    if (stealthActor && !life.stealth.skillId && stealthSkills.length) life.stealth.skillId = stealthSkills[0].id;
    const relations = getCrewRelationsData(this.actor);
    const targetRelation = relationForActor(relations, life.influence.targetUuid);
    const helpfulRelations = relations.entries.filter(r => r.attitude === "helpful" && r.actorUuid !== life.influence.targetUuid && r.actorUuid !== life.influence.influencerUuid);
    const helpfulChoices = helpfulRelations.map(r => { const a = actorByUuid(r.actorUuid); return a ? { uuid:a.uuid, name:a.name, selected:a.uuid===life.influence.helperUuid } : null; }).filter(Boolean);

    return {
      ...context,
      actor: this.actor, life, members, understaffedBonus,
      crewCurrent: Number(this.actor.system?.crew?.value ?? 0),
      actorChoices,
      roleChoices: Object.entries(ROLES).map(([value,d])=>({value,label:d.label})),
      dayActions: DAY_ACTIONS, nightActions: NIGHT_ACTIONS,
      influencer,
      influenceActorChoices: actorChoices.map(c=>({ ...c, selected:c.uuid===life.influence.influencerUuid })),
      influenceTargetChoices: actorChoices.map(c=>({ ...c, selected:c.uuid===life.influence.targetUuid })),
      influenceSkills: influenceSkills.map(s=>({ ...s, selected:s.id===life.influence.skillId, modDisplay:signed(s.mod) })),
      influenceHelperChoices: helpfulChoices,
      trackedInfluenceAttitude: targetRelation ? attitudeInfo(targetRelation.attitude).label : "Non suivi",
      stealthActor,
      stealthActorChoices: actorChoices.map(c=>({ ...c, selected:c.uuid===life.stealth.actorUuid })),
      stealthSkills: stealthSkills.map(s=>({ ...s, selected:s.id===life.stealth.skillId, modDisplay:signed(s.mod) })),
      punishmentTargetChoices: actorChoices.map(c=>({ ...c, selected:c.uuid===life.punishment.targetUuid })),
      kroopStatus: life.kroopDrunk ? "complètement saoul" : "sobre / fonctionnel",
      taskDcTotalMod: Number(life.taskDcManualModifier ?? 0) + understaffedBonus,
      attitudeChoices: ["hostile","inamicale","indifférente","amicale","serviable"].map(v=>({value:v,label:v,selected:v===life.influence.currentAttitude})),
      punishmentTypes: [
        {value:"rope",label:"Coup de corde",selected:life.punishment.type==="rope"},
        {value:"whip",label:"Fouet",selected:life.punishment.type==="whip"},
        {value:"cat",label:"Chat à neuf queues",selected:life.punishment.type==="cat"},
        {value:"sauna",label:"Confinement au sauna",selected:life.punishment.type==="sauna"},
        {value:"keel",label:"Supplice de la quille",selected:life.punishment.type==="keel"}
      ],
      keelChoices: [
        {value:"slow",label:"Lent — 12 rounds sur l’Absinthe",selected:life.punishment.keelhauling==="slow"},
        {value:"fast",label:"Rapide — 6 rounds sur l’Absinthe",selected:life.punishment.keelhauling==="fast"}
      ]
    };
  }

  static async #onSubmit(event, form, formData) {
    const asObject = formData.object ?? formData.toObject?.() ?? Object.fromEntries(formData.entries());
    const raw = foundry.utils.expandObject(asObject);
    const old = getLifeData(this.actor);
    const incoming = raw.life ?? {};
    // Préserve les données d'historique/résolution qui ne figurent pas directement dans le formulaire.
    incoming.influenceHistory = old.influenceHistory;
    const submittedMembers = incoming.members ?? {};
    const oldById = new Map(old.members.map(m=>[m.id,m]));
    const incomingArray = Object.keys(submittedMembers).sort((a,b)=>Number(a)-Number(b)).map(k=>submittedMembers[k]);
    incoming.members = incomingArray.map(m => {
      const prior = oldById.get(String(m.id ?? ""));
      return prior ? { ...prior, ...m, rum: prior.rum, lastTask: prior.lastTask, punishmentQueue: prior.punishmentQueue } : m;
    });
    const life = normalizeLifeData({ ...old, ...incoming });
    await setLifeData(this.actor, life);
    await this.render();
  }

  async #saveVisibleForm() {
    try { await this.submit(); } catch (error) { console.warn(`${MODULE_ID} | Sauvegarde vie à bord impossible`, error); }
  }

  static async #openShipController() {
    const { ShipController } = await import("./ship-controller.mjs");
    ShipController.open(this.actor);
  }

  static async #openEntertainmentController() {
    EntertainmentController.open(this.actor);
  }

  static async #openCrewRelations() {
    const { CrewRelationsController } = await import("./crew-relations-controller.mjs");
    CrewRelationsController.open(this.actor);
  }

  static async #addMember() {
    await this.#saveVisibleForm();
    const life = getLifeData(this.actor);
    life.members.push(createCrewMember());
    await setLifeData(this.actor, life);
    await this.render();
  }

  static async #removeMember(event) {
    await this.#saveVisibleForm();
    const id = memberIdFromEvent(event);
    const life = getLifeData(this.actor);
    life.members = life.members.filter(m=>m.id!==id);
    await setLifeData(this.actor, life);
    await this.render();
  }

  static async #randomizeKroop() {
    await this.#saveVisibleForm();
    const life = getLifeData(this.actor);
    const roll = await new Roll("1d100").evaluate();
    life.kroopDrunk = Number(roll.total) <= 50;
    await setLifeData(this.actor, life);
    await postChat(null, "État d’Ambrose Kroop", `<p>Jet : <strong>${roll.total}</strong>/100 — Kroop est <strong>${life.kroopDrunk ? "complètement saoul" : "sobre / fonctionnel"}</strong> aujourd’hui.</p>`, "fa-solid fa-wine-bottle");
    await this.render();
  }

  static async #assignTask(event) {
    await this.#saveVisibleForm();
    const id = memberIdFromEvent(event);
    const life = getLifeData(this.actor);
    const member = getMember(life, id);
    if (!member) return;
    const roll = await new Roll("1d6").evaluate();
    member.taskRoll = Number(roll.total);
    const task = getTaskByRoll(member.role, member.taskRoll);
    member.taskId = task?.id ?? "";
    await setLifeData(this.actor, life);
    const a = actorByUuid(member.actorUuid);
    await postChat(a, "Tâche journalière", `<p><strong>${escape(safeName(a))}</strong> (${escape(roleLabel(member.role))}) obtient <strong>${roll.total}</strong> : <strong>${escape(task?.name ?? "Tâche inconnue")}</strong>.</p>`, "fa-solid fa-broom");
    await this.render();
  }

  static async #assignAllTasks() {
    await this.#saveVisibleForm();
    const life = getLifeData(this.actor);
    const kroop = await new Roll("1d100").evaluate();
    life.kroopDrunk = Number(kroop.total) <= 50;
    const lines = [];
    for (const member of life.members) {
      const roll = await new Roll("1d6").evaluate();
      member.taskRoll = Number(roll.total);
      const task = getTaskByRoll(member.role, member.taskRoll);
      member.taskId = task?.id ?? "";
      lines.push(`<li>${escape(safeName(actorByUuid(member.actorUuid)))} — ${escape(roleLabel(member.role))} : <strong>${roll.total}</strong> → ${escape(task?.name ?? "—")}</li>`);
    }
    await setLifeData(this.actor, life);
    await postChat(null, `Affectations — jour ${life.day}`, `<p>Kroop est <strong>${life.kroopDrunk ? "complètement saoul" : "sobre / fonctionnel"}</strong> (${kroop.total}/100).</p><ul>${lines.join("")}</ul>`, "fa-solid fa-clipboard-list");
    await this.render();
  }

  static #effectiveChecks(task, life) {
    const checks = (task?.checks ?? []).filter(c => !c.onlyIfKroopDrunk || life.kroopDrunk).map(c=>({...c}));
    if (life.kroopDrunk && ["cook-3","cook-4"].includes(task?.id)) {
      checks.push({ label: "Préparer aussi le repas (Kroop saoul)", dc: 10, alternatives: [{ type:"skill", label:"Profession (cuisinier)", patterns:[/profession.*cuisin/i,/cook/i], ability:"wis" }, { type:"ability", label:"Intelligence", ability:"int" }] });
    }
    return checks;
  }

  static async #rollTask(event) {
    await this.#saveVisibleForm();
    const id = memberIdFromEvent(event);
    const life = getLifeData(this.actor);
    const member = getMember(life, id);
    const actor = actorByUuid(member?.actorUuid);
    const task = getTaskById(member?.taskId);
    if (!member || !actor || !task) { ui.notifications.warn("Choisis un personnage et attribue-lui une tâche."); return; }

    const checks = this.#effectiveChecks(task, life);
    const under = getUnderstaffedTaskDcBonus(this.actor, life);
    const dcMod = Number(life.taskDcManualModifier ?? 0) + under;
    let taskMod = getTaskModifier(member);
    const huntingWhileKroopDrunk = life.kroopDrunk && ["cook-3","cook-4","cook-6"].includes(task.id);
    if (huntingWhileKroopDrunk) taskMod -= 4;

    // Si le commis doit obtenir/préparer une proie avec Kroop saoul, une action diurne autre que se consacrer au travail fait rater le travail.
    const forcedFailure = huntingWhileKroopDrunk && member.dayAction !== "diligent";
    if (huntingWhileKroopDrunk && member.dayAction === "diligent") taskMod -= 4; // pas de +4 d'assiduité dans ce cas.

    let primaryPassed = true;
    let worstMargin = Infinity;
    let fatigueFailed = false;
    const rows = [];

    if (task.id === "swab-5" && actorHasRunFeat(actor)) {
      rows.push(`<li><strong>Coursier :</strong> réussite automatique détectée grâce au don Course.</li>`);
    } else if (forcedFailure) {
      primaryPassed = false; worstMargin = -5;
      rows.push(`<li><strong>Échec automatique :</strong> Kroop est saoul, cette tâche exige aussi la préparation de la nourriture et le commis a utilisé une action de bord diurne.</li>`);
    } else {
      for (const check of checks) {
        const alt = bestAlternative(actor, check.alternatives);
        const mod = Number(alt.mod ?? 0) + (check.fatigueOnly ? 0 : taskMod);
        const dc = Number(check.dc ?? 10) + dcMod;
        const roll = await new Roll(`1d20 + ${mod}`).evaluate();
        const margin = Number(roll.total) - dc;
        const ok = margin >= 0;
        if (check.fatigueOnly) { if (!ok) fatigueFailed = true; }
        else { primaryPassed &&= ok; worstMargin = Math.min(worstMargin, margin); }
        rows.push(`<li>${escape(check.label)} — ${escape(alt.label)} ${signed(mod)} : <strong>${roll.total}</strong> contre DD ${dc} → <strong>${ok ? "réussite" : "échec"}</strong>${check.fatigueOnly ? " (fatigue uniquement)" : ""}.</li>`);
      }
    }

    if (!checks.length && !forcedFailure) {
      primaryPassed = true; worstMargin = 0;
      rows.push(`<li>Cette tâche ne demande pas de test de travail.</li>`);
    }

    if (task.alwaysFatigued || fatigueFailed) member.fatigued = true;
    if (task.extraRum) rows.push(`<li><strong>Épreuve d’endurance :</strong> une ration supplémentaire de rhum doit être bue ; une action diurne supplémentaire est disponible.</li>`);

    let punishment = "";
    if (primaryPassed) {
      member.consecutiveTaskFailures = 0;
    } else {
      member.consecutiveTaskFailures += 1;
      if (worstMargin >= -4) punishment = "Réprimande sévère ; au pire un coup de corde.";
      else punishment = `${3 * member.consecutiveTaskFailures} coup(s) de fouet (${member.consecutiveTaskFailures} échec(s) consécutif(s)).`;
      if (forcedFailure && huntingWhileKroopDrunk) punishment = "L’équipage houspille le commis ; Kroop et son assistant reçoivent plusieurs coups de corde.";
      member.punishmentQueue.push(punishment);
    }
    member.lastTask = { passed: primaryPassed, worstMargin: Number.isFinite(worstMargin) ? worstMargin : 0, text: task.name };

    await setLifeData(this.actor, life);
    const notes = [task.note, task.failureNote && !primaryPassed ? task.failureNote : "", punishment ? `Punition : ${punishment}` : "", member.fatigued ? "Le personnage est fatigué." : ""].filter(Boolean).map(x=>`<p>${escape(x)}</p>`).join("");
    await postChat(actor, `Tâche — ${task.name}`, `<p><strong>${escape(actor.name)}</strong> — action diurne : ${escape(actionText(member.dayAction, DAY_ACTIONS))}; modificateur de tâche ${signed(taskMod)} ; modificateur de DD ${signed(dcMod)}.</p><ul>${rows.join("")}</ul><p><strong>Résultat global : ${primaryPassed ? "RÉUSSITE" : "ÉCHEC"}</strong></p>${notes}`, "fa-solid fa-hammer");
    await this.render();
  }

  static async #refuseWork(event) {
    await this.#saveVisibleForm();
    const id = memberIdFromEvent(event); const life = getLifeData(this.actor); const member = getMember(life,id); if (!member) return;
    member.refusalCount += 1;
    let punishment;
    if (member.refusalCount === 1) punishment = "12 coups de fouet";
    else if (member.refusalCount === 2) punishment = "12 coups de chat à neuf queues";
    else punishment = "12 heures de confinement au sauna";
    member.punishmentQueue.push(punishment);
    await setLifeData(this.actor, life);
    const a = actorByUuid(member.actorUuid);
    await postChat(a, "Refus de travailler", `<p><strong>${escape(safeName(a))}</strong> refuse ou se révèle incapable de travailler. Infraction n°${member.refusalCount} : <strong>${escape(punishment)}</strong>.</p>`, "fa-solid fa-gavel");
    await this.render();
  }

  static async #resolveDayAction(event) {
    await this.#saveVisibleForm();
    const id = memberIdFromEvent(event); const life = getLifeData(this.actor); const member = getMember(life,id); const a = actorByUuid(member?.actorUuid); if (!member || !a) return;
    const action = DAY_ACTIONS[member.dayAction];
    if (member.dayAction === "shirk") {
      const sk = findSkill(a, [/discr[eé]tion/i,/stealth/i]) ?? { name:"Dextérité", mod:abilityMod(a,"dex") };
      const dc = 15;
      const roll = await new Roll(`1d20 + ${Number(sk.mod ?? 0)}`).evaluate();
      const margin = Number(roll.total)-dc;
      let consequence = margin >= 0 ? "Le personnage n’est pas découvert." : margin >= -4 ? "Le personnage est dérangé et ne peut pas poursuivre son exploration." : "Le personnage est pris la main dans le sac et risque une punition disciplinaire.";
      await postChat(a, `Action diurne — ${action.label}`, `<p>${escape(action.description)}</p><p>Test pour ne pas être découvert : ${escape(sk.name)} ${signed(sk.mod)}, <strong>${roll.total}</strong> contre DD ${dc}. ${escape(consequence)}</p><p>Le personnage peut faire 10 à un unique test de Perception ou d’une autre compétence pendant l’exploration.</p>`, "fa-solid fa-user-secret");
    } else {
      await postChat(a, `Action diurne — ${action.label}`, `<p>${escape(action.description)}</p>${member.dayAction === "influence" ? "<p>Utilise le panneau Influence ci-dessous pour résoudre la tentative.</p>" : ""}`, "fa-solid fa-sun");
    }
  }

  static async #resolveNightAction(event) {
    await this.#saveVisibleForm();
    const id = memberIdFromEvent(event); const life = getLifeData(this.actor); const member = getMember(life,id); const a = actorByUuid(member?.actorUuid); if (!member || !a) return;
    const action = NIGHT_ACTIONS[member.nightAction];
    if (member.nightAction === "rest") {
      member.fatigued = false; member.fatiguedNextDay = false;
      await setLifeData(this.actor, life);
      await postChat(a, "Action nocturne — Repos", `<p><strong>${escape(a.name)}</strong> dort toute la nuit et récupère automatiquement de sa fatigue.</p>`, "fa-solid fa-bed");
    } else if (member.nightAction === "entertain") {
      const ent = getEntertainmentData(this.actor);
      ent.performance.actorUuid = a.uuid;
      await setEntertainmentData(this.actor, ent);
      EntertainmentController.open(this.actor);
      await postChat(a, "Action nocturne — Amusement", `<p>La fenêtre <strong>Divertissements pirates</strong> a été ouverte sur ${escape(a.name)} pour résoudre la Représentation DD 20 et mémoriser ses effets pendant 24 h.</p>`, "fa-solid fa-music");
    } else if (member.nightAction === "game") {
      EntertainmentController.open(this.actor);
      await postChat(a, "Action nocturne — Jeu", `<p>La fenêtre <strong>Divertissements pirates</strong> a été ouverte pour choisir entre bras de fer, lancer de cochon ou <em>Haut les cœurs !</em>.</p>`, "fa-solid fa-dice");
    } else if (["sneak","larceny"].includes(member.nightAction)) {
      const sk = findSkill(a, [/discr[eé]tion/i,/stealth/i,/escamotage/i,/sleight/i]) ?? { name:"Dextérité", mod:abilityMod(a,"dex") };
      const dc = Number(life.stealth.dc ?? 15);
      const roll = await new Roll(`1d20 + ${Number(sk.mod ?? 0)}`).evaluate();
      const margin = Number(roll.total)-dc;
      const consequence = margin >= 0 ? "action discrète réussie" : margin >= -4 ? "dérangé : l’action ne peut pas être poursuivie" : "pris la main dans le sac : punition possible";
      const special = member.nightAction === "sneak" ? "Le personnage peut faire 20 à un unique test pendant cette exploration." : "Le personnage tente d’ouvrir une porte ou un casier verrouillé.";
      await postChat(a, `Action nocturne — ${action.label}`, `<p>${escape(special)}</p><p>${escape(sk.name)} ${signed(sk.mod)} : <strong>${roll.total}</strong> contre DD ${dc} → <strong>${escape(consequence)}</strong>.</p>`, "fa-solid fa-moon");
    } else {
      await postChat(a, `Action nocturne — ${action.label}`, `<p>${escape(action.description)}</p>${member.nightAction === "influence" ? "<p>Utilise le panneau Influence pour le test.</p>" : ""}`, "fa-solid fa-moon");
    }
    await this.render();
  }

  static async #extraNightAction(event) {
    await this.#saveVisibleForm();
    const id = memberIdFromEvent(event); const life = getLifeData(this.actor); const member = getMember(life,id); const a = actorByUuid(member?.actorUuid); if (!member || !a) return;
    if (member.extraNightActions >= 2) { ui.notifications.warn("Deux actions supplémentaires maximum pendant le quart intermédiaire."); return; }
    if (!NIGHT_ACTIONS[member.extraNightChoice]?.starred) { ui.notifications.warn("L’action supplémentaire doit être une action nocturne marquée d’un astérisque."); return; }
    const number = member.extraNightActions + 1;
    const dc = 10 + 4 * number;
    const mod = abilityMod(a,"con");
    const roll = await new Roll(`1d20 + ${mod}`).evaluate();
    const ok = Number(roll.total)>=dc;
    member.extraNightActions = number;
    if (!ok) member.fatiguedNextDay = true;
    await setLifeData(this.actor, life);
    await postChat(a, `Action nocturne supplémentaire n°${number}`, `<p>${escape(actionText(member.extraNightChoice,NIGHT_ACTIONS))}. Test de Constitution ${signed(mod)} : <strong>${roll.total}</strong> contre DD ${dc}.</p><p>${ok ? "Réussite : pas de fatigue supplémentaire demain." : "Échec : le personnage sera fatigué le lendemain."}</p>`, "fa-solid fa-clock");
    await this.render();
  }

  static async #drinkRum(event) {
    await this.#saveVisibleForm();
    const id = memberIdFromEvent(event); const life=getLifeData(this.actor); const member=getMember(life,id); const a=actorByUuid(member?.actorUuid); if (!member||!a) return;
    const fort = saveMod(a,"fort");
    const addiction = await new Roll(`1d20 + ${fort}`).evaluate();
    const cha = await new Roll("1d4").evaluate(); const hours=await new Roll("1d8").evaluate(); const con=await new Roll("1d3").evaluate();
    member.rum = { ...member.rum, drankToday:true, dumpedToday:false, chaBonus:Number(cha.total), fatigueHours:Number(hours.total), conDamage:Number(con.total), addictionFailed:Number(addiction.total)<5 };
    member.fatigued = true;
    await setLifeData(this.actor, life);
    await postChat(a, "Ration de rhum des Chaînes", `<p><strong>${escape(a.name)}</strong> boit sa ration.</p><ul><li>Dépendance mineure : Vigueur ${signed(fort)} = <strong>${addiction.total}</strong> contre DD 5 → ${Number(addiction.total)>=5?"réussite":"échec"}.</li><li>Effet : <strong>+${cha.total} Charisme</strong> (bonus alchimique) et <strong>fatigué pendant ${hours.total} h</strong>.</li><li>Dégâts : <strong>${con.total} Con</strong>.</li></ul><p class="hint">Le module consigne ces valeurs mais ne modifie pas automatiquement les caractéristiques PF1 afin de ne pas créer un effet de drogue incompatible avec la fiche.</p>`, "fa-solid fa-wine-bottle");
    await this.render();
  }

  static async #dumpRum(event) {
    await this.#saveVisibleForm();
    const id=memberIdFromEvent(event); const life=getLifeData(this.actor); const member=getMember(life,id); const a=actorByUuid(member?.actorUuid); if(!member||!a)return;
    const sk = findSkill(a,[/discr[eé]tion/i,/stealth/i]) ?? {name:"Dextérité",mod:abilityMod(a,"dex")};
    const roll = await new Roll(`1d20 + ${Number(sk.mod??0)}`).evaluate();
    const ok = Number(roll.total)>=10;
    member.rum.dumpedToday=true; member.rum.drankToday=false;
    let punishment="";
    if(!ok){ member.rumDumpOffenses+=1; punishment=member.rumDumpOffenses===1?"6 coups de fouet":"6 coups de chat à neuf queues"; member.punishmentQueue.push(punishment); }
    await setLifeData(this.actor,life);
    await postChat(a,"Jeter sa ration de rhum",`<p>${escape(sk.name)} ${signed(sk.mod)} : <strong>${roll.total}</strong> contre DD 10.</p><p>${ok?"La ration disparaît par-dessus bord sans être remarquée.":`Le personnage est repéré. Punition : <strong>${escape(punishment)}</strong>.`}</p>`,"fa-solid fa-bottle-water");
    await this.render();
  }

  static async #rollInfluence() {
    await this.#saveVisibleForm();
    const life=getLifeData(this.actor); const inf=life.influence; const a=actorByUuid(inf.influencerUuid); const target=actorByUuid(inf.targetUuid);
    if(!a||!target){ui.notifications.warn("Choisis le PJ qui agit et le PNJ visé.");return;}
    const skills=pickInfluenceSkills(a); const sk=skills.find(s=>s.id===inf.skillId)??skills[0]; if(!sk){ui.notifications.warn("Aucune compétence de Bluff, Diplomatie ou Intimidation détectée.");return;}
    const key=`${life.day}:${a.uuid}:${target.uuid}`;
    if(life.influenceHistory[key]){ui.notifications.warn(`${a.name} a déjà tenté d’influencer ${target.name} aujourd’hui.`);return;}
    const performanceBonus=getPerformanceCharismaBonus(this.actor,a.uuid);
    const relations=getCrewRelationsData(this.actor),helperRel=relationForActor(relations,inf.helperUuid),helper=actorByUuid(inf.helperUuid);
    const helperBonus=helperRel?.attitude==="helpful"&&helper&&helper.uuid!==a.uuid&&helper.uuid!==target.uuid?2:0;
    const tracked=relationForActor(relations,target.uuid);
    const mod=Number(sk.mod)+Number(inf.manualModifier??0)+performanceBonus+helperBonus; const roll=await new Roll(`1d20 + ${mod}`).evaluate(); const ok=Number(roll.total)>=Number(inf.dc);
    const attitudeText=tracked?`, attitude suivie : <strong>${escape(attitudeInfo(tracked.attitude).label)}</strong>`:`, attitude déclarée : ${escape(inf.currentAttitude)}`;
    life.influenceHistory[key]={total:Number(roll.total),skill:sk.name,success:ok,day:life.day,helperUuid:helperBonus?helper.uuid:""}; inf.lastKey=key;
    await setLifeData(this.actor,life);
    await postChat(a,"Influencer un membre d’équipage",`<p><strong>${escape(a.name)}</strong> tente d’influencer <strong>${escape(target.name)}</strong>${attitudeText}.</p><p>${escape(sk.name)} ${signed(mod)} : <strong>${roll.total}</strong> contre DD ${inf.dc} → <strong>${ok?"réussite":"échec"}</strong>.</p>${performanceBonus?`<p><strong>+${performanceBonus}</strong> inclus grâce à une Représentation réussie devant l’équipage (24 h).</p>`:""}${helperBonus?`<p><strong>+2</strong> grâce à l’aide nocturne/journalière de <strong>${escape(helper.name)}</strong>, actuellement serviable.</p>`:""}<p class="hint">La campagne traite Bluff, Diplomatie ou Intimidation comme Diplomatie pour changer l’attitude. Le DD et le nouvel état final restent au MJ ; mets ensuite à jour l’attitude dans Relations d’équipage.</p>`,"fa-solid fa-comments");
    await this.render();
  }

  static async #rollStealth() {
    await this.#saveVisibleForm();
    const life=getLifeData(this.actor); const st=life.stealth; const a=actorByUuid(st.actorUuid); if(!a){ui.notifications.warn("Choisis le personnage qui agit.");return;}
    const skills=pickStealthSkills(a); const sk=skills.find(s=>s.id===st.skillId)??skills[0]??{name:"Dextérité",mod:abilityMod(a,"dex")};
    const mod=Number(sk.mod)+Number(st.manualModifier??0); const roll=await new Roll(`1d20 + ${mod}`).evaluate(); const margin=Number(roll.total)-Number(st.dc);
    const result=margin>=0?"Réussite":margin>=-4?"Échec de 4 ou moins : le PJ est dérangé et ne peut pas poursuivre":"Échec de 5 ou plus : le PJ est pris la main dans le sac";
    await postChat(a,"Discrétion à bord",`<p>${escape(sk.name)} ${signed(mod)} : <strong>${roll.total}</strong> contre DD ${st.dc}.</p><p><strong>${escape(result)}</strong></p><p class="hint">Repères de la campagne : DD 20 au milieu d’une foule ; DD 15 lorsqu’il existe un risque d’être découvert ; DD 10 sous le couvert d’une bonne diversion.</p>`,"fa-solid fa-user-secret");
  }

  static async #resolvePunishment() {
    await this.#saveVisibleForm();
    const life=getLifeData(this.actor); const p=life.punishment; const a=actorByUuid(p.targetUuid); if(!a){ui.notifications.warn("Choisis la victime du châtiment.");return;}
    const type=p.type;
    if(type==="sauna"){
      const fort=saveMod(a,"fort"); let total=0; const rows=[];
      for(let h=1;h<=p.hours;h++){ const r=await new Roll(`1d20 + ${fort}`).evaluate(); const dc=15+(h-1); if(Number(r.total)<dc){const d=await new Roll("1d4").evaluate();total+=Number(d.total);rows.push(`<li>Heure ${h}: ${r.total} vs DD ${dc} — échec, ${d.total} dégâts non létaux.</li>`);}else rows.push(`<li>Heure ${h}: ${r.total} vs DD ${dc} — réussite.</li>`); }
      await postChat(a,"Confinement au sauna",`<p>${p.hours} heure(s), Vigueur ${signed(fort)}. Total : <strong>${total} dégâts non létaux</strong>.</p><ul>${rows.join("")}</ul><p class="hint">Une créature résistante au feu est immunisée selon la règle.</p>`,"fa-solid fa-temperature-high");
      return;
    }
    if(type==="keel"){
      const fast=p.keelhauling==="fast"; const rounds=fast?6:12; const formula=fast?"1d6":"1d3"; const ref=saveMod(a,"ref"); let total=0; const rows=[];
      for(let r=1;r<=rounds;r++){ const save=await new Roll(`1d20 + ${ref}`).evaluate(); const dmg=await new Roll(formula).evaluate(); const dealt=Number(save.total)>=20?Math.floor(Number(dmg.total)/2):Number(dmg.total); total+=dealt; rows.push(`<li>Round ${r}: Réflexes ${save.total} vs DD 20 ; ${formula} = ${dmg.total} → ${dealt} dégâts.</li>`); }
      await postChat(a,`Supplice de la quille — ${fast?"rapide":"lent"}`,`<p>Durée de l’Absinthe : ${rounds} rounds. Total : <strong>${total} dégâts</strong>.</p><ul>${rows.join("")}</ul>${fast?"":"<p class=\"hint\">Le passage lent augmente le risque de noyade ; cette partie renvoie aux règles aquatiques normales et n’est pas automatisée ici.</p>"}`,"fa-solid fa-water");
      return;
    }
    const count=Math.max(1,Number(p.count)); const ab=Number(p.attackBonus??0); const ac=Number(p.targetAc??10); let hits=0; let damage=0; const rows=[];
    for(let i=1;i<=count;i++){ const r=await new Roll(`1d20 + ${ab}`).evaluate(); const nat=naturalD20(r); const hit=nat!==1 && Number(r.total)>=ac; if(hit)hits++; if(type==="cat"&&hit){const d=await new Roll("1d4").evaluate();damage+=Number(d.total);rows.push(`<li>Coup ${i}: ${r.total} contre CA ${ac} — touche, ${d.total} dégâts tranchants.</li>`);}else rows.push(`<li>Coup ${i}: ${r.total} contre CA ${ac} — ${hit?"touche":"rate"}${nat===1?" (1 naturel : échec sans conséquence, mais le coup compte)":""}.</li>`); }
    let note="";
    if(type==="rope") note=`${hits} coup(s) réussi(s) : ${hits} dégât(s) non létal(aux), à raison de 1 par coup.`;
    if(type==="whip") note=`${hits} attaque(s) au fouet réussie(s). Les dégâts du fouet ne sont pas reproduits par cette source : utilise l’arme PF1 pour les dégâts ; pendant l’heure du sang ils sont généralement non létaux.`;
    if(type==="cat") note=`${hits} coup(s) réussi(s), ${damage} dégâts tranchants au total.`;
    await postChat(a,`Châtiment — ${type==="rope"?"coup de corde":type==="whip"?"fouet":"chat à neuf queues"}`,`<p>${escape(note)}</p><ul>${rows.join("")}</ul>`,"fa-solid fa-gavel");
  }

  static async #clearPunishments(event) {
    await this.#saveVisibleForm();
    const id=memberIdFromEvent(event); const life=getLifeData(this.actor); const m=getMember(life,id); if(!m)return; m.punishmentQueue=[]; await setLifeData(this.actor,life); await this.render();
  }

  static async #newDay() {
    await this.#saveVisibleForm();
    const life=getLifeData(this.actor); life.day += 1;
    for(const m of life.members){
      if(m.nightAction==="rest") m.fatigued=false;
      if(m.fatiguedNextDay) m.fatigued=true;
      m.fatiguedNextDay=false; m.extraNightActions=0; m.taskId=""; m.taskRoll=0;
      m.rum={...m.rum,drankToday:false,dumpedToday:false,chaBonus:0,fatigueHours:0,conDamage:0,addictionFailed:false};
      m.lastTask={passed:null,worstMargin:null,text:""};
      m.player={...(m.player??{}),taskRolledDay:0,dayResolvedDay:0,nightResolvedDay:0,rumResolvedDay:0};
    }
    const kroop=await new Roll("1d100").evaluate(); life.kroopDrunk=Number(kroop.total)<=50;
    await setLifeData(this.actor,life);
    await postChat(null,`Jour ${life.day} à bord`, `<p>Nouvelle journée. Kroop est <strong>${life.kroopDrunk?"complètement saoul":"sobre / fonctionnel"}</strong> (${kroop.total}/100).</p><p>Les tâches journalières sont prêtes à être tirées.</p>`,"fa-solid fa-sun");
    await this.render();
  }
}
