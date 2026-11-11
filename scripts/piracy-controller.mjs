import {
  MODULE_ID,
  getSSShipData,
  normalizeSSShipData,
  getDriverData,
  deriveShipState
} from "./ship-data.mjs";
import { applyShipProfile, getShipProfile } from "./library-data.mjs";
import {
  getReputationData,
  setReputationData,
  listActorSkills,
  getCharacterSkillData
} from "./reputation-data.mjs";
import {
  PIRACY_PREY,
  defaultPiracyData,
  getPiracyData,
  setPiracyData,
  normalizePiracyData,
  getPrey,
  deriveCargoState,
  getPrizeSalePreview,
  getPrisonerValue
} from "./piracy-data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const esc = foundry.utils.escapeHTML;

function actorByUuid(uuid) {
  if (!uuid) return null;
  try { return fromUuidSync(uuid) ?? null; } catch { return null; }
}

function selectedTargetVehicle(ownActor = null) {
  const targets = [...(game.user?.targets ?? [])]
    .map((token) => token.actor)
    .filter((actor) => actor?.type === "vehicle" && actor.id !== ownActor?.id);
  return targets.length === 1 ? targets[0] : null;
}

function signed(n) {
  const value = Number(n ?? 0);
  return `${value >= 0 ? "+" : ""}${value}`;
}

function fmtGp(value) {
  return new Intl.NumberFormat(game?.i18n?.lang ?? "fr-FR", { maximumFractionDigits: 1 }).format(Number(value ?? 0));
}

async function evaluate(formula) {
  return new Roll(formula).evaluate();
}

async function post(actor, title, body, rolls = [], icon = "fa-skull-crossbones") {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid ${icon}"></i> ${esc(title)}</h3>${body}</div>`,
    rolls: rolls.map((roll) => JSON.stringify(roll.toJSON()))
  });
}

function findSkill(actor, regex) {
  return listActorSkills(actor).find((skill) => regex.test(skill.name)) ?? null;
}

function recruitSkillChoices(actor, selectedId) {
  if (!actor) return [];
  return listActorSkills(actor)
    .filter((s) => /(bluff|diplom|intimid)/i.test(s.name))
    .map((s) => ({ ...s, selected: s.id === selectedId, modLabel: signed(s.mod) }));
}

async function setExactVehicleStats(actor, prey) {
  const hp = actor.system?.attributes?.hp ?? {};
  const max = Number(hp.max ?? 0);
  const bonus = Number(hp.bonus ?? 0);
  const hardness = actor.system?.attributes?.hardness ?? {};
  const hardnessNow = Number(hardness.total ?? hardness.value ?? 0);
  const hardnessBonus = Number(hardness.bonus ?? 0);
  const update = {
    "system.crew.value": prey.crew,
    "system.crew.max": prey.crew,
    "system.details.currentSpeed": 0
  };
  if (Number.isFinite(prey.hp) && prey.hp !== max) update["system.attributes.hp.bonus"] = bonus + (prey.hp - max);
  if (Number.isFinite(prey.hardness) && prey.hardness !== hardnessNow) update["system.attributes.hardness.bonus"] = hardnessBonus + (prey.hardness - hardnessNow);
  await actor.update(update);
  await actor.update({ "system.attributes.hp.value": Number(actor.system?.attributes?.hp?.max ?? prey.hp) });

  const profile = getShipProfile(prey.profileId);
  const ss = normalizeSSShipData(getSSShipData(actor));
  ss.crewMinimumOverride = prey.minimumCrew;
  ss.sails.max = prey.sailsHp;
  ss.sails.value = prey.sailsHp;
  if (Number.isFinite(Number(prey.oarsHp))) {
    ss.oars.max = Number(prey.oarsHp);
    ss.oars.value = Number(prey.oarsHp);
  }
  ss.combat.ramEquipped = Boolean(profile?.ram && String(prey.publishedRam) !== String(profile.ram));
  ss.combat.maneuverModifier = 0;
  ss.damage = ss.damage ?? {};
  await actor.setFlag(MODULE_ID, "ship", ss);
  await actor.setFlag(MODULE_ID, "piracyEncounter", {
    source: "Les Pillards de la mer de Fièvre — évènement 7",
    preyId: prey.id,
    fp: prey.fp,
    captain: prey.captain,
    captainProfession: prey.captainProfession,
    captainSenseMotive: prey.captainSenseMotive,
    published: {
      ac: prey.publishedAc,
      save: prey.publishedSave,
      cmb: prey.publishedCmb,
      cmd: prey.publishedCmd,
      ram: prey.publishedRam,
      weapons: prey.weapons,
      cargo: prey.cargoLabel
    }
  });
}

export class PiracyController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-piracy", "standard-form"],
    tag: "form",
    position: { width: 980, height: "auto" },
    window: { icon: "fa-solid fa-skull-crossbones", resizable: true },
    actions: {
      openDashboard: this.#openDashboard,
      openVoyage: this.#openVoyage,
      openReputation: this.#openReputation,
      rollPrey: this.#rollPrey,
      useTarget: this.#useTarget,
      createPrey: this.#createPrey,
      bluffToStand: this.#bluffToStand,
      claimCargo: this.#claimCargo,
      payCrewShare: this.#payCrewShare,
      replaceLosses: this.#replaceLosses,
      recruitCrew: this.#recruitCrew,
      assignPrizeCrew: this.#assignPrizeCrew,
      sellPrize: this.#sellPrize,
      keepPrize: this.#keepPrize,
      planRefit: this.#planRefit,
      valuePrisoners: this.#valuePrisoners,
      resetEncounter: this.#resetEncounter
    },
    form: { handler: this.#onSubmit, closeOnSubmit: false }
  };

  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/piracy-controller.hbs` } };

  constructor(actor, options = {}) {
    super({
      id: `pf1-ss-piracy-${actor.id}`,
      ...options,
      window: { ...(options.window ?? {}), title: `Piraterie & Prises — ${actor.name}` }
    });
    this.actor = actor;
  }

  static open(actor) {
    if (!actor || actor.type !== "vehicle") {
      ui.notifications.warn("Skull & Shackles : sélectionne un token lié à un Vehicle PF1.");
      return null;
    }
    const app = new PiracyController(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const data = getPiracyData(this.actor);
    const prey = getPrey(data.prey.selectedId);
    const linked = actorByUuid(data.prey.linkedActorUuid);
    const target = selectedTargetVehicle(this.actor);
    const cargo = deriveCargoState(this.actor);
    const rep = getReputationData(this.actor);
    const driver = getDriverData(this.actor);
    const bluff = driver.actor ? findSkill(driver.actor, /bluff/i) : null;
    const recruiter = actorByUuid(data.capture.recruiterUuid);
    const officer = actorByUuid(data.capture.prizeOfficerUuid);
    const prize = getPrizeSalePreview(prey, linked, data.capture.prizeBasePlunderManual);
    const prisoners = getPrisonerValue(data);
    const ownState = deriveShipState(this.actor);

    const people = (game.actors?.contents ?? [])
      .filter((a) => ["character", "npc"].includes(a.type))
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));

    return {
      ...context,
      actor: this.actor,
      data,
      prey: {
        ...prey,
        profileName: getShipProfile(prey.profileId)?.name ?? prey.profileId,
        linkedName: linked?.name ?? "Aucun Vehicle lié",
        hasLinked: Boolean(linked?.type === "vehicle"),
        targetName: target?.name ?? "Aucune cible unique",
        canClaim: !data.prey.cargoClaimed,
        cargoClaimed: data.prey.cargoClaimed,
        sold: data.prey.shipSold,
        kept: data.prey.shipKept,
        refitPlanned: data.prey.refitPlanned
      },
      preyChoices: PIRACY_PREY.map((p) => ({ id: p.id, label: `${p.name} — FP ${p.fp}`, selected: p.id === data.prey.selectedId })),
      cargo: {
        ...cargo,
        capacityLabel: `${Math.round(cargo.capacityTons * 10) / 10} t`,
        usedLabel: `${Math.round(cargo.usedTons * 10) / 10} t`,
        freeLabel: `${Math.round(cargo.freeTons * 10) / 10} t`
      },
      reputation: { plunder: rep.plunder, infamy: rep.infamy, disrepute: rep.disrepute },
      driver: {
        name: driver.actor?.name ?? "Aucun pilote",
        bluffName: bluff?.name ?? "Bluff non détecté",
        bluffMod: bluff ? signed(bluff.mod) : signed(data.prey.bluffManualModifier),
        usesManual: !bluff
      },
      peopleChoices: people.map((a) => ({
        uuid: a.uuid,
        name: a.name,
        recruiterSelected: a.uuid === data.capture.recruiterUuid,
        officerSelected: a.uuid === data.capture.prizeOfficerUuid
      })),
      recruitSkills: recruitSkillChoices(recruiter, data.capture.recruiterSkillId),
      recruiterName: recruiter?.name ?? "Non choisi",
      officerName: officer?.name ?? "Non choisi",
      ownCrew: {
        current: ownState.crewCurrent,
        full: ownState.crewFull,
        minimum: ownState.crewMinimum,
        spareAboveMinimum: Math.max(0, ownState.crewCurrent - ownState.crewMinimum)
      },
      prize: {
        ...prize,
        multiplierLabel: prize.damaged ? "25 % (plus de la moitié des PV perdus)" : "50 %",
        baseLabel: prize.known ? `${prize.base} Butin` : "à renseigner",
        saleLabel: prize.known ? `${prize.salePlunder} Butin` : "—"
      },
      prisoners: { ...prisoners, totalLabel: `${fmtGp(prisoners.totalGp)} po` },
      lastBluffLabel: data.prey.lastBluffOutcome === "success" ? "réussite" : data.prey.lastBluffOutcome === "failure" ? "échec" : "",
      isGM: Boolean(game.user?.isGM)
    };
  }

  static async #onSubmit(event, form, formData) {
    const obj = formData.object ?? formData.toObject?.() ?? Object.fromEntries(formData.entries());
    const raw = foundry.utils.expandObject(obj);
    const existing = getPiracyData(this.actor);
    const incoming = raw.piracy ?? {};
    incoming.prey ??= {};
    incoming.capture ??= {};
    incoming.prisoners ??= {};
    incoming.ledger ??= {};

    incoming.prey.cargoClaimed = existing.prey.cargoClaimed;
    incoming.prey.shipSold = existing.prey.shipSold;
    incoming.prey.shipKept = existing.prey.shipKept;
    incoming.prey.refitPlanned = existing.prey.refitPlanned;
    incoming.prey.ownShipTookAttack = Boolean(form.elements.namedItem("piracy.prey.ownShipTookAttack")?.checked);
    incoming.prey.lastBluffOwn = existing.prey.lastBluffOwn;
    incoming.prey.lastBluffEnemy = existing.prey.lastBluffEnemy;
    incoming.prey.lastBluffOutcome = existing.prey.lastBluffOutcome;
    incoming.capture.lastRecruitTotal = existing.capture.lastRecruitTotal;
    incoming.capture.lastRecruits = existing.capture.lastRecruits;
    incoming.capture.prizeCrewAssigned = existing.capture.prizeCrewAssigned;
    incoming.capture.assignedCrew = existing.capture.assignedCrew;
    incoming.capture.lastSalePlunder = existing.capture.lastSalePlunder;

    // Changer de proie réinitialise les états propres à la rencontre précédente.
    const selectedId = String(incoming.prey.selectedId ?? existing.prey.selectedId);
    if (selectedId !== existing.prey.selectedId) {
      incoming.prey.linkedActorUuid = "";
      incoming.prey.cargoClaimed = false;
      incoming.prey.shipSold = false;
      incoming.prey.shipKept = false;
      incoming.prey.refitPlanned = false;
      incoming.capture.prizeCrewAssigned = false;
      incoming.capture.assignedCrew = 0;
      incoming.capture.lastSalePlunder = 0;
    }

    const merged = foundry.utils.mergeObject(existing, incoming, { inplace: false, insertKeys: true, overwrite: true });
    await setPiracyData(this.actor, normalizePiracyData(merged));
    await this.render();
  }

  async #saveForm() {
    try { await this.submit(); } catch (error) { console.warn(`${MODULE_ID} | sauvegarde Piraterie & Prises`, error); }
  }

  static async #openDashboard() { game.modules.get(MODULE_ID)?.api?.openDashboard?.(this.actor); }
  static async #openVoyage() { game.modules.get(MODULE_ID)?.api?.openVoyage?.(this.actor); }
  static async #openReputation() { game.modules.get(MODULE_ID)?.api?.openReputation?.(this.actor); }

  static async #rollPrey() {
    await this.#saveForm();
    const roll = await evaluate(`1d${PIRACY_PREY.length}`);
    const prey = PIRACY_PREY[Math.max(0, Math.min(PIRACY_PREY.length - 1, Number(roll.total) - 1))];
    const data = getPiracyData(this.actor);
    data.prey.selectedId = prey.id;
    data.prey.rolledId = prey.id;
    data.prey.linkedActorUuid = "";
    data.prey.cargoClaimed = false;
    data.prey.shipSold = false;
    data.prey.shipKept = false;
    data.prey.refitPlanned = false;
    data.prey.enemySenseMotive = prey.captainSenseMotive;
    data.capture.prizeCrewAssigned = false;
    data.capture.assignedCrew = 0;
    await setPiracyData(this.actor, data);
    await post(this.actor, "Navire rencontré", `<p><strong>${esc(prey.name)}</strong> — ${esc(prey.subtitle)} (FP ${prey.fp}).</p><p>Capitaine : ${esc(prey.captain)} · équipage ${prey.crew} · cargaison : ${esc(prey.cargoLabel)}.</p>`, [roll], "fa-sailboat");
    await this.render();
  }

  static async #useTarget() {
    await this.#saveForm();
    const target = selectedTargetVehicle(this.actor);
    if (!target) return ui.notifications.warn("Cible exactement un autre token Vehicle pour le lier à cette rencontre.");
    const data = getPiracyData(this.actor);
    data.prey.linkedActorUuid = target.uuid;
    await setPiracyData(this.actor, data);
    ui.notifications.info(`${target.name} est maintenant le navire rencontré lié.`);
    await this.render();
  }

  static async #createPrey() {
    await this.#saveForm();
    if (!game.user?.isGM) return ui.notifications.warn("Seul un MJ peut créer le Vehicle de la proie.");
    const data = getPiracyData(this.actor);
    const prey = getPrey(data.prey.selectedId);
    const actor = await Actor.create({ name: prey.name, type: "vehicle" });
    if (!actor) return;
    await applyShipProfile(actor, prey.profileId);
    await setExactVehicleStats(actor, prey);
    data.prey.linkedActorUuid = actor.uuid;
    data.prey.enemySenseMotive = prey.captainSenseMotive;
    await setPiracyData(this.actor, data);
    ui.notifications.info(`${prey.name} a été créé comme Vehicle PF1. Les valeurs publiées de la rencontre sont conservées dans ses flags S&S.`);
    await post(this.actor, "Proie créée", `<p><strong>${esc(prey.name)}</strong> a été créé avec le profil ${esc(getShipProfile(prey.profileId)?.name ?? prey.profileId)}.</p><p><strong>Valeurs publiées :</strong> CA ${prey.publishedAc}, sauvegarde +${prey.publishedSave}, BMO +${prey.publishedCmb}, DMD ${prey.publishedCmd}, éperonnage ${esc(prey.publishedRam)}.</p><p class="notes">Pour utiliser les manœuvres navales automatiques, assigne un pilote PF1 au Vehicle créé ; le contrôleur de piraterie conserve les statistiques publiées comme référence.</p>`, [], "fa-sailboat");
    await this.render();
  }

  static async #bluffToStand() {
    await this.#saveForm();
    const data = getPiracyData(this.actor);
    const prey = getPrey(data.prey.selectedId);
    if (!data.prey.ownShipTookAttack) {
      return ui.notifications.warn("La ruse de l’évènement 7 n’est disponible qu’après que le navire des PJ a subi au moins une attaque du navire adverse.");
    }
    const driver = getDriverData(this.actor);
    if (!driver.actor) return ui.notifications.warn("Aucun pilote n’est assigné au navire des PJ.");
    const bluff = findSkill(driver.actor, /bluff/i);
    const ownMod = bluff ? Number(bluff.mod ?? 0) : Number(data.prey.bluffManualModifier ?? 0);
    const enemyMod = Number(data.prey.enemySenseMotive ?? prey.captainSenseMotive ?? 5);
    const ownRoll = await evaluate(`1d20 + ${ownMod}`);
    const enemyRoll = await evaluate(`1d20 + ${enemyMod}`);
    const success = ownRoll.total > enemyRoll.total;
    data.prey.lastBluffOwn = ownRoll.total;
    data.prey.lastBluffEnemy = enemyRoll.total;
    data.prey.lastBluffOutcome = success ? "success" : "failure";
    await setPiracyData(this.actor, data);
    await post(this.actor, "Ruse pour retenir la proie", `<p>${esc(driver.actor.name)} tente de convaincre <strong>${esc(prey.name)}</strong> que la fuite n’est plus nécessaire.</p><p><strong>Bluff :</strong> ${ownRoll.total} contre <strong>Psychologie :</strong> ${enemyRoll.total}.</p><p class="${success ? "success" : "failure"}"><strong>${success ? "Réussite" : "Échec"}.</strong> ${success ? "La proie peut cesser de fuir selon la tactique de la rencontre." : "La proie continue de chercher à s’échapper."}</p>`, [ownRoll, enemyRoll], "fa-masks-theater");
    await this.render();
  }

  static async #claimCargo() {
    await this.#saveForm();
    const data = getPiracyData(this.actor);
    const prey = getPrey(data.prey.selectedId);
    if (data.prey.cargoClaimed) return ui.notifications.warn("La cargaison de cette rencontre a déjà été récupérée.");
    const cargo = deriveCargoState(this.actor);
    if (prey.cargoPlunder > cargo.freePlunder) {
      return ui.notifications.warn(`Cales insuffisantes : ${prey.cargoPlunder} point(s) de Butin exigent ${prey.cargoPlunder * 10} t, mais il ne reste qu’environ ${Math.floor(cargo.freeTons)} t.`);
    }
    const rep = getReputationData(this.actor);
    rep.plunder += prey.cargoPlunder;
    await setReputationData(this.actor, rep);
    data.ledger.miscCargoGp += prey.cargoGp;
    data.prey.cargoClaimed = true;
    await setPiracyData(this.actor, data);
    await post(this.actor, "Cargaison capturée", `<p>${esc(prey.cargoLabel)}.</p><p><strong>Butin :</strong> +${prey.cargoPlunder} point(s)${prey.cargoGp ? ` · <strong>Marchandises diverses :</strong> +${fmtGp(prey.cargoGp)} po` : ""}.</p><p>Chaque point de Butin occupe 10 tonnes de cargaison.</p>`, [], "fa-box-open");
    await this.render();
  }

  static async #payCrewShare() {
    await this.#saveForm();
    const rep = getReputationData(this.actor);
    if (Number(rep.plunder ?? 0) < 1) return ui.notifications.warn("Il faut au moins 1 point de Butin pour verser la part de l’équipage.");
    rep.plunder = Math.max(0, Number(rep.plunder ?? 0) - 1);
    await setReputationData(this.actor, rep);
    await post(this.actor, "Part de l’équipage", `<p><strong>−1 point de Butin</strong> est versé à l’équipage lors de la vente du butin.</p><p>Butin restant : <strong>${rep.plunder}</strong>.</p>`, [], "fa-hand-holding-dollar");
    await this.render();
  }

  static async #replaceLosses() {
    await this.#saveForm();
    const data = getPiracyData(this.actor);
    const requested = Math.max(0, Number(data.capture.crewLosses ?? 0));
    if (!requested) return ui.notifications.warn("Indique d’abord le nombre de matelots perdus pendant le combat.");
    const current = Number(this.actor.system?.crew?.value ?? 0);
    const full = Number(this.actor.system?.crew?.max ?? current);
    const replaced = Math.min(requested, Math.max(0, full - current));
    if (!replaced) return ui.notifications.info("L’équipage est déjà à son effectif complet.");
    await this.actor.update({ "system.crew.value": current + replaced });
    data.capture.crewLosses = Math.max(0, requested - replaced);
    await setPiracyData(this.actor, data);
    await post(this.actor, "Survivants enrôlés", `<p>${replaced} survivant(s) de la prise remplacent les matelots perdus pendant l’affrontement.</p><p>Équipage : <strong>${current + replaced} / ${full}</strong>.</p>`, [], "fa-people-group");
    await this.render();
  }

  static async #recruitCrew() {
    await this.#saveForm();
    const data = getPiracyData(this.actor);
    const recruiter = actorByUuid(data.capture.recruiterUuid);
    if (!recruiter) return ui.notifications.warn("Choisis le personnage qui recrute.");
    const skill = getCharacterSkillData(recruiter, data.capture.recruiterSkillId);
    const mod = Number(skill?.mod ?? 0) + Number(data.capture.recruitManualModifier ?? 0);
    const check = await evaluate(`1d20 + ${mod}`);
    const success = check.total >= 20;
    let recruitsRoll = null;
    let recruits = 0;
    if (success) {
      recruitsRoll = await evaluate("1d4 + 2");
      recruits = Number(recruitsRoll.total ?? 0);
      const current = Number(this.actor.system?.crew?.value ?? 0);
      await this.actor.update({ "system.crew.value": current + recruits });
    }
    data.capture.lastRecruitTotal = check.total;
    data.capture.lastRecruits = recruits;
    await setPiracyData(this.actor, data);
    await post(this.actor, "Recrutement d’équipage", `<p>${esc(recruiter.name)} utilise ${esc(skill?.name ?? "un modificateur manuel")} : <strong>${check.total}</strong> contre DD 20.</p><p class="${success ? "success" : "failure"}"><strong>${success ? `Réussite : ${recruits} nouveau(x) marin(s).` : "Échec : aucune recrue."}</strong></p><p>Cette tentative représente une journée complète de recrutement.</p>`, [check, ...(recruitsRoll ? [recruitsRoll] : [])], "fa-user-plus");
    await this.render();
  }

  static async #assignPrizeCrew() {
    await this.#saveForm();
    const data = getPiracyData(this.actor);
    if (data.capture.prizeCrewAssigned) return ui.notifications.warn("Un équipage de prise a déjà été détaché pour ce navire.");
    const prey = getPrey(data.prey.selectedId);
    const officer = actorByUuid(data.capture.prizeOfficerUuid);
    if (!officer) return ui.notifications.warn("Choisis un officier de confiance pour commander la prise.");
    const linked = actorByUuid(data.prey.linkedActorUuid);
    if (!linked || linked.type !== "vehicle") return ui.notifications.warn("Lie ou crée d’abord le Vehicle du navire capturé.");
    const own = deriveShipState(this.actor);
    const needed = prey.minimumCrew;
    if (own.crewCurrent - needed < own.crewMinimum) {
      return ui.notifications.warn(`Impossible de détacher ${needed} marins sans faire tomber ton propre navire sous son équipage minimum (${own.crewMinimum}).`);
    }
    await this.actor.update({ "system.crew.value": own.crewCurrent - needed });
    await linked.update({ "system.crew.value": needed });
    const linkedSS = normalizeSSShipData(getSSShipData(linked));
    linkedSS.crewMinimumOverride = needed;
    await linked.setFlag(MODULE_ID, "ship", linkedSS);
    data.capture.prizeCrewAssigned = true;
    data.capture.assignedCrew = needed;
    await setPiracyData(this.actor, data);
    await post(this.actor, "Équipage de prise", `<p><strong>${needed} marins</strong> sont détachés sous les ordres de <strong>${esc(officer.name)}</strong> pour ramener ${esc(linked.name)} au port.</p><p>Équipage restant sur ${esc(this.actor.name)} : ${own.crewCurrent - needed}.</p>`, [], "fa-flag");
    await this.render();
  }

  static async #sellPrize() {
    await this.#saveForm();
    const data = getPiracyData(this.actor);
    if (data.prey.shipSold) return ui.notifications.warn("Cette prise a déjà été vendue.");
    if (!data.capture.prizeCrewAssigned) return ui.notifications.warn("Affecte d’abord l’équipage minimum et un officier à la prise pour la ramener au port.");
    const prey = getPrey(data.prey.selectedId);
    const linked = actorByUuid(data.prey.linkedActorUuid);
    const preview = getPrizeSalePreview(prey, linked, data.capture.prizeBasePlunderManual);
    if (!preview.known) return ui.notifications.warn("La campagne ne fournit pas de valeur de prise générique pour ce type : renseigne d’abord la valeur de Butin de base.");
    const rep = getReputationData(this.actor);
    rep.plunder += preview.salePlunder;
    await setReputationData(this.actor, rep);
    data.prey.shipSold = true;
    data.prey.shipKept = false;
    data.capture.lastSalePlunder = preview.salePlunder;
    await setPiracyData(this.actor, data);
    if (linked) await linked.setFlag(MODULE_ID, "piracyPrizeSold", { port: data.capture.salePort, plunder: preview.salePlunder, at: Date.now() });
    await post(this.actor, "Prise vendue", `<p>${esc(prey.name)} est vendu à <strong>${esc(data.capture.salePort || "un port approprié")}</strong>.</p><p>Valeur de prise : ${preview.base} Butin · taux : ${preview.damaged ? "25 %" : "50 %"} · <strong>gain : ${preview.salePlunder} Butin</strong>.</p>${preview.damaged ? "<p>Le navire a perdu plus de la moitié de ses PV : le prix est réduit au quart de sa valeur de prise.</p>" : ""}`, [], "fa-coins");
    await this.render();
  }

  static async #keepPrize() {
    await this.#saveForm();
    const data = getPiracyData(this.actor);
    data.prey.shipKept = true;
    data.prey.shipSold = false;
    await setPiracyData(this.actor, data);
    await post(this.actor, "Prise conservée", `<p>L’équipage décide de conserver <strong>${esc(getPrey(data.prey.selectedId).name)}</strong> au lieu de le vendre.</p><p>Il peut être ramené, caché ou rééquipé selon les décisions du groupe.</p>`, [], "fa-anchor");
    await this.render();
  }

  static async #planRefit() {
    await this.#saveForm();
    const data = getPiracyData(this.actor);
    data.prey.refitPlanned = !data.prey.refitPlanned;
    await setPiracyData(this.actor, data);
    ui.notifications.info(data.prey.refitPlanned ? "La prise est marquée pour être maquillée/rééquipée." : "Projet de rééquipement retiré.");
    await this.render();
  }

  static async #valuePrisoners() {
    await this.#saveForm();
    const data = getPiracyData(this.actor);
    const v = getPrisonerValue(data);
    await post(this.actor, "Valeur des prisonniers", `<p>Calcul de campagne :</p><ul><li>${data.prisoners.healthy} prisonnier(s) en bonne santé : ${fmtGp(v.healthyGp)} po</li><li>${data.prisoners.badlyWounded} prisonnier(s) sous la moitié de leurs PV : ${fmtGp(v.woundedGp)} po</li><li>Personnages importants : ${data.prisoners.importantLevels} niveau(x) de classe cumulés : ${fmtGp(v.ransomGp)} po de rançon</li></ul><p><strong>Total indicatif : ${fmtGp(v.totalGp)} po.</strong></p>`, [], "fa-sack-dollar");
  }

  static async #resetEncounter() {
    const ok = window.confirm("Réinitialiser la rencontre de piraterie actuelle ?\n\nLes gains déjà transférés au Butin ou à l’équipage ne seront pas retirés.");
    if (!ok) return;
    const current = getPiracyData(this.actor);
    const reset = defaultPiracyData();
    reset.prey.selectedId = current.prey.selectedId;
    reset.ledger.miscCargoGp = current.ledger.miscCargoGp;
    reset.ledger.notes = current.ledger.notes;
    await setPiracyData(this.actor, reset);
    await this.render();
  }
}
