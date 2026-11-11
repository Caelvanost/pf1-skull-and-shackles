import { MODULE_ID } from "./ship-data.mjs";
import {
  COMMUNITY_SIZES,
  IMPOSITIONS,
  INFAMY_THRESHOLDS,
  getReputationData,
  setReputationData,
  normalizeReputationData,
  getInfamyCap,
  getInfamyTier,
  getNextInfamyTier,
  getInfamyDC,
  getPortProgress,
  getFavoredPortBonus,
  getCharacterSkillData,
  listActorSkills,
  getSaleOfferPercent,
  getSaleTierBonus,
  getEffectiveImpositionCost,
  canAccessImposition,
  getImpositionById,
  getImpositionGrade,
  normalizePortKey
} from "./reputation-data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const escape = foundry.utils.escapeHTML;

function signed(value) {
  const n = Number(value ?? 0);
  return `${n >= 0 ? "+" : ""}${n}`;
}

function actorByUuid(uuid) {
  if (!uuid) return null;
  try {
    return fromUuidSync(uuid) ?? null;
  } catch {
    return null;
  }
}

function ownedCrewActors() {
  return game.actors
    .filter((a) => ["character", "npc"].includes(a.type) && a.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED))
    .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
}

export class ReputationController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-reputation", "standard-form"],
    tag: "form",
    position: { width: 820, height: "auto" },
    window: { icon: "fa-solid fa-skull-crossbones", resizable: true },
    actions: {
      openShipController: this.#openShipController,
      rollInfamy: this.#rollInfamy,
      rollSale: this.#rollSale,
      acceptSale: this.#acceptSale,
      rejectSale: this.#rejectSale,
      buyPlunder: this.#buyPlunder,
      buyImposition: this.#buyImposition,
      resetPortProgress: this.#resetPortProgress
    },
    form: {
      handler: this.#onSubmit,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/reputation-controller.hbs` }
  };

  constructor(actor, options = {}) {
    super({
      id: `pf1-ss-reputation-${actor.id}`,
      ...options,
      window: {
        ...(options.window ?? {}),
        title: `Réputation pirate — ${actor.name}`
      }
    });
    this.actor = actor;
  }

  static open(actor) {
    if (!actor || actor.type !== "vehicle") {
      ui.notifications.warn("Skull & Shackles : la réputation doit être rattachée à un Vehicle PF1 (le navire du groupe). ");
      return null;
    }
    const app = new ReputationController(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const rep = getReputationData(this.actor);
    const cap = getInfamyCap(rep.averagePartyLevel);
    const tier = getInfamyTier(rep.infamy);
    const nextTier = getNextInfamyTier(rep.infamy);
    const port = getPortProgress(rep);
    const favoredBonus = getFavoredPortBonus(rep);
    const dc = getInfamyDC(rep);
    const crewActors = ownedCrewActors();

    const storyteller = actorByUuid(rep.storytellerUuid);
    const storytellerSkills = storyteller ? listActorSkills(storyteller, { infamyOnly: true }) : [];
    const currentStorySkill = getCharacterSkillData(storyteller, rep.storytellerSkill);

    const merchant = actorByUuid(rep.sale.merchantUuid);
    const merchantSkills = merchant ? listActorSkills(merchant, { saleOnly: true }) : [];
    const currentSaleSkill = getCharacterSkillData(merchant, rep.sale.skill);
    const saleTierBonus = getSaleTierBonus(rep.infamy);

    const communityChoices = Object.entries(COMMUNITY_SIZES).map(([value, data]) => ({
      value,
      label: data.label,
      selected: value === rep.sale.communitySize,
      base: data.basePercent,
      max: data.maxPercent
    }));

    const actorChoices = crewActors.map((a) => ({
      uuid: a.uuid,
      name: a.name,
      storytellerSelected: a.uuid === rep.storytellerUuid,
      merchantSelected: a.uuid === rep.sale.merchantUuid
    }));

    const gradeOrder = ["shameful", "contemptible", "infamous", "disgusting", "vile"];
    const impositionGroups = gradeOrder.map((grade) => {
      const gradeInfo = getImpositionGrade(grade);
      const entries = IMPOSITIONS.filter((i) => i.grade === grade).map((i) => {
        const effectiveCost = getEffectiveImpositionCost(i, rep.infamy);
        const accessible = canAccessImposition(i, rep.infamy);
        return {
          ...i,
          gradeLabel: gradeInfo?.label ?? grade,
          requiredInfamy: gradeInfo?.min ?? 0,
          effectiveCost,
          discounted: effectiveCost !== i.cost,
          accessible,
          affordable: rep.disrepute >= effectiveCost,
          canBuy: accessible && rep.disrepute >= effectiveCost
        };
      });
      return {
        grade,
        label: gradeInfo?.label ?? grade,
        min: gradeInfo?.min ?? 0,
        accessible: Number(rep.infamy) >= Number(gradeInfo?.min ?? 0),
        entries
      };
    });

    const favoredAllowed = tier.favoredPorts ?? 0;
    const favoredPortFields = [0, 1, 2].map((index) => ({
      index,
      number: index + 1,
      value: rep.favoredPorts[index] ?? "",
      enabled: index < favoredAllowed,
      current: normalizePortKey(rep.favoredPorts[index]) && normalizePortKey(rep.favoredPorts[index]) === normalizePortKey(rep.currentPort)
    }));

    return {
      ...context,
      actor: this.actor,
      rep,
      cap,
      tier,
      nextTier,
      infamyDc: dc,
      port,
      portRemaining: Math.max(0, 5 - Number(port.earned ?? 0)),
      favoredBonus,
      favoredAllowed,
      favoredPortFields,
      actorChoices,
      storyteller,
      storytellerSkills: storytellerSkills.map((s) => ({ ...s, selected: s.id === rep.storytellerSkill, modDisplay: signed(s.mod) })),
      currentStorySkill,
      merchant,
      merchantSkills: merchantSkills.map((s) => ({ ...s, selected: s.id === rep.sale.skill, modDisplay: signed(s.mod) })),
      currentSaleSkill,
      saleTierBonus,
      communityChoices,
      impositionGroups,
      thresholds: INFAMY_THRESHOLDS.slice(1).map((t) => ({ ...t, reached: rep.infamy >= t.min })),
      infamyProgressPercent: cap > 0 ? Math.min(100, Math.round((rep.infamy / cap) * 100)) : 0,
      nextTierRemaining: nextTier ? Math.max(0, nextTier.min - rep.infamy) : 0,
      lastOfferAvailable: Number(rep.sale.lastOfferGp ?? 0) > 0,
      displays: {
        storySkill: currentStorySkill ? `${currentStorySkill.name} ${signed(currentStorySkill.mod)}` : "—",
        storyManual: signed(rep.infamyManualModifier),
        plunderBonus: signed(rep.infamyPlunderSpend * 2),
        favoredBonus: signed(favoredBonus),
        saleSkill: currentSaleSkill ? `${currentSaleSkill.name} ${signed(currentSaleSkill.mod)}` : "—",
        saleTierBonus: signed(saleTierBonus),
        saleManual: signed(rep.sale.manualModifier)
      }
    };
  }

  static async #onSubmit(event, form, formData) {
    const asObject = formData.object ?? formData.toObject?.() ?? Object.fromEntries(formData.entries());
    const raw = foundry.utils.expandObject(asObject);
    const stored = getReputationData(this.actor);
    const incoming = raw.rep ?? {};

    // Les historiques et la dernière offre ne sont pas écrasés par des champs absents du formulaire.
    const oldTier = getInfamyTier(stored.infamy);
    incoming.ports = stored.ports;
    const submittedFavored = incoming.favoredPorts ?? {};
    incoming.favoredPorts = [0, 1, 2].map((index) => submittedFavored[index] ?? stored.favoredPorts[index] ?? "");
    incoming.sale ??= {};
    incoming.sale.lastOfferPercent = stored.sale.lastOfferPercent;
    incoming.sale.lastOfferGp = stored.sale.lastOfferGp;
    incoming.sale.lastCheckTotal = stored.sale.lastCheckTotal;
    incoming.sale.lastPort = stored.sale.lastPort;
    incoming.sale.lastCommunitySize = stored.sale.lastCommunitySize;

    const rep = normalizeReputationData(incoming);
    const newTier = getInfamyTier(rep.infamy);
    if (newTier.key !== oldTier.key) {
      for (const [key, data] of Object.entries(rep.ports ?? {})) {
        rep.ports[key] = { ...data, earned: 0, tierKey: newTier.key };
      }
    }
    await setReputationData(this.actor, rep);
    await this.render();
  }

  async #saveVisibleForm() {
    try {
      await this.submit();
    } catch (error) {
      console.warn(`${MODULE_ID} | Impossible d'enregistrer la réputation avant l'action`, error);
    }
  }

  static async #rollInfamy() {
    await this.#saveVisibleForm();
    let rep = getReputationData(this.actor);
    const storyteller = actorByUuid(rep.storytellerUuid);
    const skill = getCharacterSkillData(storyteller, rep.storytellerSkill);
    const portName = String(rep.currentPort ?? "").trim();

    if (!portName) {
      ui.notifications.warn("Indique le port où le groupe passe la journée à fanfaronner.");
      return;
    }
    if (!storyteller || !skill) {
      ui.notifications.warn("Choisis un conteur principal et une compétence de Bluff, Intimidation ou Représentation.");
      return;
    }

    const port = getPortProgress(rep, portName);
    if (port.earned >= 5) {
      ui.notifications.warn(`${portName} a déjà rapporté 5 points à ce seuil d’Infamie. Il faut changer de port ou atteindre le seuil suivant.`);
      return;
    }

    const spent = Math.max(0, Math.floor(Number(rep.infamyPlunderSpend ?? 0)));
    if (spent > rep.plunder) {
      ui.notifications.warn(`Le groupe ne possède que ${rep.plunder} point(s) de butin.`);
      return;
    }

    const dc = getInfamyDC(rep);
    const favoredBonus = getFavoredPortBonus(rep, portName);
    const plunderBonus = spent * 2;
    const totalModifier = Number(skill.mod ?? 0) + Number(rep.infamyManualModifier ?? 0) + favoredBonus + plunderBonus;
    const roll = await new Roll(`1d20 + ${totalModifier}`).evaluate();
    const margin = Number(roll.total ?? 0) - dc;
    let rawGain = 0;
    if (margin >= 10) rawGain = 3;
    else if (margin >= 5) rawGain = 2;
    else if (margin >= 0) rawGain = 1;

    const oldInfamy = rep.infamy;
    const oldDisrepute = rep.disrepute;
    const oldTier = getInfamyTier(oldInfamy);
    const cap = getInfamyCap(rep.averagePartyLevel);
    const remainingAtPort = Math.max(0, 5 - Number(port.earned ?? 0));
    const portLimitedGain = Math.min(rawGain, remainingAtPort);

    rep.plunder = Math.max(0, rep.plunder - spent);
    rep.infamy = Math.min(cap, rep.infamy + portLimitedGain);
    const actualInfamyGain = rep.infamy - oldInfamy;
    rep.disrepute = Math.min(rep.infamy, rep.disrepute + portLimitedGain);
    const actualDisreputeGain = rep.disrepute - oldDisrepute;

    const key = normalizePortKey(portName);
    rep.ports[key] = {
      name: portName,
      earned: Math.min(5, Number(port.earned ?? 0) + Math.max(actualInfamyGain, actualDisreputeGain)),
      tierKey: oldTier.key
    };

    const newTier = getInfamyTier(rep.infamy);
    if (newTier.key !== oldTier.key) {
      // Le plafond local de 5 points se réinitialise dans tous les ports à chaque nouveau seuil.
      for (const [portKey, data] of Object.entries(rep.ports)) {
        rep.ports[portKey] = { ...data, earned: 0, tierKey: newTier.key };
      }
    }

    rep.infamyPlunderSpend = 0;
    rep = await setReputationData(this.actor, rep);

    const capNote = portLimitedGain > actualInfamyGain ? ` L’Infamie est plafonnée à ${cap} par le NMG.` : "";
    const portNote = rawGain > portLimitedGain ? " Le plafond de 5 points gagnés dans ce port a limité le gain." : "";
    const thresholdNote = newTier.key !== oldTier.key ? `<p><strong>Nouveau seuil :</strong> ${escape(newTier.title)} (${newTier.min}+). Les plafonds par port sont réinitialisés.</p>` : "";

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: storyteller }),
      content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-skull-crossbones"></i> Test d’Infamie — ${escape(portName)}</h3>
        <p><strong>${escape(storyteller.name)}</strong> : ${escape(skill.name)} ${signed(skill.mod)} ; DD <strong>${dc}</strong>.</p>
        <p>Modificateurs : butin ${signed(plunderBonus)}, port de prédilection ${signed(favoredBonus)}, circonstances ${signed(rep.infamyManualModifier)}.</p>
        <p>Résultat : <strong>${Number(roll.total ?? 0)}</strong> (${margin >= 0 ? `réussite de ${margin}` : `échec de ${Math.abs(margin)}`}).</p>
        <p>Gain : Infamie <strong>+${actualInfamyGain}</strong>, Déshonneur <strong>+${actualDisreputeGain}</strong>. Butin dépensé : <strong>${spent}</strong>.${escape(capNote + portNote)}</p>
        ${thresholdNote}</div>`,
      rolls: [JSON.stringify(roll.toJSON())]
    });
    await this.render();
  }

  static async #rollSale() {
    await this.#saveVisibleForm();
    let rep = getReputationData(this.actor);
    const merchant = actorByUuid(rep.sale.merchantUuid);
    const skill = getCharacterSkillData(merchant, rep.sale.skill);
    if (!merchant || !skill) {
      ui.notifications.warn("Choisis le personnage qui marchande et une compétence appropriée (Bluff, Diplomatie, Intimidation ou Profession pertinente). ");
      return;
    }
    if (rep.plunder < 1) {
      ui.notifications.warn("Le groupe n’a aucun point de butin à vendre.");
      return;
    }

    const community = COMMUNITY_SIZES[rep.sale.communitySize] ?? COMMUNITY_SIZES.smallTown;
    const tierBonus = getSaleTierBonus(rep.infamy);
    const totalModifier = Number(skill.mod ?? 0) + Number(rep.sale.manualModifier ?? 0) + tierBonus;
    const roll = await new Roll(`1d20 + ${totalModifier}`).evaluate();
    const total = Number(roll.total ?? 0);
    const percent = getSaleOfferPercent(rep.sale.communitySize, total);
    const gp = Math.round(1000 * (percent / 100));

    rep.sale.lastOfferPercent = percent;
    rep.sale.lastOfferGp = gp;
    rep.sale.lastCheckTotal = total;
    rep.sale.lastPort = rep.currentPort;
    rep.sale.lastCommunitySize = rep.sale.communitySize;
    await setReputationData(this.actor, rep);

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: merchant }),
      content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-coins"></i> Vente d’un point de butin</h3>
        <p><strong>${escape(community.label)}</strong> — valeur de base ${community.basePercent}% (max. ${community.maxPercent}%).</p>
        <p>${escape(merchant.name)} : ${escape(skill.name)} ${signed(skill.mod)} ; bonus de seuil ${signed(tierBonus)} ; circonstances ${signed(rep.sale.manualModifier)}.</p>
        <p>Résultat : <strong>${total}</strong>. Offre : <strong>${percent}% = ${gp} po</strong> pour 1 point de butin.</p>
        <p><em>L’offre n’est pas encore acceptée : utilise « Accepter la dernière offre » dans la fenêtre Réputation.</em></p></div>`,
      rolls: [JSON.stringify(roll.toJSON())]
    });
    await this.render();
  }

  static async #acceptSale() {
    await this.#saveVisibleForm();
    let rep = getReputationData(this.actor);
    const gp = Number(rep.sale.lastOfferGp ?? 0);
    const percent = Number(rep.sale.lastOfferPercent ?? 0);
    if (gp <= 0) {
      ui.notifications.warn("Aucune offre de vente n’est en attente.");
      return;
    }
    if (rep.plunder < 1) {
      ui.notifications.warn("Le groupe n’a plus de point de butin à vendre.");
      return;
    }
    rep.plunder -= 1;
    const port = rep.sale.lastPort || rep.currentPort || "le port";
    rep.sale.lastOfferGp = 0;
    rep.sale.lastOfferPercent = 0;
    rep.sale.lastCheckTotal = null;
    await setReputationData(this.actor, rep);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-handshake"></i> Butin vendu</h3><p>1 point de butin est vendu à <strong>${percent}%</strong> pour <strong>${gp} po</strong> à ${escape(port)}.</p><p>Ajoute ${gp} po au trésor du groupe. La vente représente une journée complète au port.</p></div>`
    });
    await this.render();
  }

  static async #rejectSale() {
    await this.#saveVisibleForm();
    let rep = getReputationData(this.actor);
    if (!rep.sale.lastOfferGp) return;
    rep.sale.lastOfferGp = 0;
    rep.sale.lastOfferPercent = 0;
    rep.sale.lastCheckTotal = null;
    await setReputationData(this.actor, rep);
    ui.notifications.info("Offre refusée. La journée de marchandage est perdue, mais le butin est conservé.");
    await this.render();
  }

  static async #buyPlunder() {
    await this.#saveVisibleForm();
    const ok = window.confirm("Acheter 1 point de butin pour 1 000 po ? Le module ajoutera le point de butin, mais ne retirera pas automatiquement l’or d’un personnage.");
    if (!ok) return;
    let rep = getReputationData(this.actor);
    rep.plunder += 1;
    await setReputationData(this.actor, rep);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-boxes-stacked"></i> Achat de butin</h3><p>Le groupe achète <strong>1 point de butin</strong> pour <strong>1 000 po</strong>. Retire manuellement l’or du trésor du groupe.</p></div>`
    });
    await this.render();
  }

  static async #buyImposition(event, target) {
    await this.#saveVisibleForm();
    const id = target?.dataset?.impositionId ?? event?.currentTarget?.dataset?.impositionId ?? event?.target?.closest?.("[data-imposition-id]")?.dataset?.impositionId;
    const imposition = getImpositionById(id);
    if (!imposition) return;
    let rep = getReputationData(this.actor);
    if (!canAccessImposition(imposition, rep.infamy)) {
      const grade = getImpositionGrade(imposition.grade);
      ui.notifications.warn(`Cette imposition exige ${grade?.min ?? "?"} points d’Infamie.`);
      return;
    }
    const cost = getEffectiveImpositionCost(imposition, rep.infamy);
    if (rep.disrepute < cost) {
      ui.notifications.warn(`Déshonneur insuffisant : ${rep.disrepute} disponible(s), ${cost} requis.`);
      return;
    }
    const ok = window.confirm(`Dépenser ${cost} point(s) de Déshonneur pour « ${imposition.name} » ?`);
    if (!ok) return;
    rep.disrepute = Math.max(0, rep.disrepute - cost);
    await setReputationData(this.actor, rep);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-skull"></i> Imposition : ${escape(imposition.name)}</h3><p>Coût payé : <strong>${cost} Déshonneur</strong>. Il reste <strong>${rep.disrepute}</strong>.</p><p>${escape(imposition.description)}</p><p><em>Sauf indication contraire dans son texte, une imposition demande une journée complète pour être achetée. Ses effets narratifs ou magiques restent à résoudre par le MJ.</em></p></div>`
    });
    await this.render();
  }

  static async #resetPortProgress() {
    await this.#saveVisibleForm();
    const ok = window.confirm("Réinitialiser manuellement les plafonds de gain d’Infamie/Déshonneur de tous les ports pour le seuil actuel ?");
    if (!ok) return;
    let rep = getReputationData(this.actor);
    const tierKey = getInfamyTier(rep.infamy).key;
    for (const [key, data] of Object.entries(rep.ports ?? {})) {
      rep.ports[key] = { ...data, earned: 0, tierKey };
    }
    await setReputationData(this.actor, rep);
    ui.notifications.info("Progression par port réinitialisée.");
    await this.render();
  }

  static async #openShipController() {
    const module = game.modules.get(MODULE_ID);
    module?.api?.openShip?.(this.actor);
  }
}
