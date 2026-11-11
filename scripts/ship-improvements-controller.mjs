import { MODULE_ID } from "./ship-data.mjs";
import {
  SHIP_IMPROVEMENTS,
  getImprovementDefinition,
  getImprovementsData,
  normalizeImprovementsData,
  ensureImprovementsInitialized,
  getInstallationPrice,
  getBuilderPenalty,
  deriveImprovementEffects,
  installedQuantity,
  syncImprovementEffects,
  makeBaseSnapshot
} from "./ship-improvements-data.mjs";
import { getShipProfile } from "./library-data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const esc = foundry.utils.escapeHTML;

function actorByUuid(uuid) {
  if (!uuid) return null;
  try { return fromUuidSync(uuid) ?? null; } catch { return null; }
}

function formatGp(value) {
  const n = Math.round(Number(value ?? 0));
  return `${new Intl.NumberFormat(game.i18n.lang ?? "fr-FR").format(n)} po`;
}

function signed(value) {
  const n = Number(value ?? 0);
  return `${n >= 0 ? "+" : ""}${n}`;
}

function builderSkill(actor, skillId, manualModifier = 0) {
  if (!actor || !skillId) return { name: "Bonus manuel", mod: Number(manualModifier ?? 0), found: false };
  try {
    const skill = actor.getSkillInfo(skillId);
    return { name: skill.fullName ?? skill.name ?? skillId, mod: Number(skill.mod ?? 0), found: true };
  } catch {
    return { name: "Bonus manuel", mod: Number(manualModifier ?? 0), found: false };
  }
}

function hasWondrousFeat(actor) {
  if (!actor) return false;
  const names = Array.from(actor.items ?? []).map((i) => String(i.name ?? ""));
  return names.some((name) => /cr[eé]ation d.?objets merveilleux|craft wondrous item/i.test(name));
}

async function post(actor, title, body, roll = null) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-hammer"></i> ${esc(title)}</h3>${body}</div>`,
    rolls: roll ? [JSON.stringify(roll.toJSON())] : []
  });
}

export class ShipImprovementsController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-improvements", "standard-form"],
    tag: "form",
    position: { width: 980, height: "auto" },
    window: { icon: "fa-solid fa-hammer", resizable: true },
    actions: {
      openDashboard: this.#openDashboard,
      selectImprovement: this.#selectImprovement,
      installImprovement: this.#installImprovement,
      removeImprovement: this.#removeImprovement,
      clearFailure: this.#clearFailure,
      resetBaseline: this.#resetBaseline,
      recalculate: this.#recalculate
    },
    form: { handler: this.#onSubmit, closeOnSubmit: false }
  };

  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/ship-improvements-controller.hbs` } };

  constructor(actor, options = {}) {
    super({
      id: `pf1-ss-improvements-${actor.id}`,
      ...options,
      window: { ...(options.window ?? {}), title: `Améliorations du navire — ${actor.name}` }
    });
    this.actor = actor;
  }

  static open(actor) {
    if (!actor || actor.type !== "vehicle") {
      ui.notifications.warn("Skull & Shackles : sélectionne un token lié à un Vehicle PF1.");
      return null;
    }
    const app = new ShipImprovementsController(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const data = await ensureImprovementsInitialized(this.actor);
    const effects = deriveImprovementEffects(this.actor, data);
    const profile = getShipProfile(this.actor.getFlag(MODULE_ID, "ship")?.profileId);
    const builder = actorByUuid(data.builderUuid);
    const skill = builderSkill(builder, data.builderSkillId, data.manualModifier);
    const builderPenalty = getBuilderPenalty(data, data.builderUuid || "__manual__");
    const failedForSelected = (data.failedBuilders?.[data.selectedId] ?? []).includes(data.builderUuid || "__manual__");

    const actorChoices = game.actors
      .filter((a) => ["character", "npc"].includes(a.type) && a.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED))
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang))
      .map((a) => ({ uuid: a.uuid, name: a.name, selected: a.uuid === data.builderUuid }));

    let skillChoices = [];
    if (builder) {
      skillChoices = builder.allSkills
        .map((id) => {
          try {
            const info = builder.getSkillInfo(id);
            const mod = Number(info.mod ?? 0);
            return { id, name: info.fullName ?? info.name ?? id, mod, display: signed(mod), selected: id === data.builderSkillId };
          } catch { return null; }
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
    }

    const improvements = SHIP_IMPROVEMENTS.map((def) => {
      const quantity = installedQuantity(data, def.id);
      const price = getInstallationPrice(def, data, this.actor);
      const selected = def.id === data.selectedId;
      const finalDc = def.dc + builderPenalty;
      const failedBuilders = data.failedBuilders?.[def.id] ?? [];
      const failedThisBuilder = failedBuilders.includes(data.builderUuid || "__manual__");
      return {
        ...def,
        selected,
        installed: quantity > 0,
        quantity,
        price,
        priceLabel: formatGp(price),
        finalDc,
        builderPenalty,
        constructionBlocked: Boolean(def.constructionOnly && !data.constructionMode),
        failedThisBuilder,
        canInstall: !(def.single && quantity > 0) && !(def.constructionOnly && !data.constructionMode) && !failedThisBuilder,
        canRemove: quantity > 0,
        magicFeatWarning: Boolean(def.magic && builder && !hasWondrousFeat(builder))
      };
    });

    const selected = improvements.find((i) => i.selected) ?? improvements[0];
    const base = data.base;

    return {
      ...context,
      actor: this.actor,
      data,
      effects,
      improvements,
      selected,
      profileName: profile?.name ?? "Profil personnalisé",
      hasProfile: Boolean(profile),
      actorChoices,
      skillChoices,
      builderName: builder?.name ?? "Constructeur manuel",
      skillName: skill.name,
      skillMod: signed(skill.mod),
      builderPenaltyDisplay: signed(builderPenalty),
      selectedFinalDc: selected?.finalDc ?? 0,
      selectedPriceLabel: selected?.priceLabel ?? "—",
      failedForSelected,
      spentLabel: formatGp(data.spentGp),
      baseline: {
        hp: Math.round(base.hullHp), hardness: base.hardness, cargo: base.cargoTons, passengers: base.passengers,
        length: Math.round(base.lengthM * 10) / 10, width: Math.round(base.widthM * 10) / 10, cost: formatGp(base.costGp)
      },
      effective: {
        hp: Math.round(effects.hullHp), hardness: effects.hardness,
        cargo: Math.round(effects.cargoTons * 100) / 100,
        passengers: effects.passengers,
        length: Math.round(effects.lengthM * 10) / 10,
        width: Math.round(effects.widthM * 10) / 10,
        navigation: signed(effects.navigationBonus),
        advantage: signed(effects.advantageBonus),
        travel: `${effects.travelPercent >= 0 ? "+" : ""}${Math.round(effects.travelPercent * 100)}%`,
        hiddenPlunder: effects.hiddenPlunderPoints,
        hiddenGunports: effects.hiddenGunports,
        count: effects.count
      }
    };
  }

  static async #onSubmit(event, form, formData) {
    const obj = formData.object ?? formData.toObject?.() ?? Object.fromEntries(formData.entries());
    const raw = foundry.utils.expandObject(obj);
    let data = getImprovementsData(this.actor);
    data.constructionMode = Boolean(form.elements.namedItem("data.constructionMode")?.checked);
    data.selectedId = String(raw.data?.selectedId ?? data.selectedId ?? "armor");
    data.builderUuid = String(raw.data?.builderUuid ?? "");
    data.builderSkillId = String(raw.data?.builderSkillId ?? "");
    data.manualModifier = Number(raw.data?.manualModifier ?? 0);
    data.manualPrice = Math.max(0, Number(raw.data?.manualPrice ?? data.manualPrice ?? 500));
    for (const key of ["costGp", "hullHp", "hardness", "cargoTons", "passengers", "lengthM", "widthM", "sailsHp", "sailsHardness", "oarsHp", "oarsHardness", "steeringHp", "steeringHardness", "shipSquares", "sailSquares", "oarCount"]) {
      if (raw.data?.base?.[key] !== undefined) data.base[key] = Math.max(0, Number(raw.data.base[key] ?? 0));
    }
    data = normalizeImprovementsData(data, this.actor);
    await this.actor.setFlag(MODULE_ID, "improvements", data);
    await syncImprovementEffects(this.actor, data);
    await this.render();
  }

  async #saveVisibleForm() {
    try { await this.submit(); } catch (error) { console.warn(`${MODULE_ID} | Échec d'enregistrement des améliorations`, error); }
  }

  static async #selectImprovement(event) {
    const id = event.target.closest("[data-improvement-id]")?.dataset.improvementId;
    if (!getImprovementDefinition(id)) return;
    let data = getImprovementsData(this.actor);
    data.selectedId = id;
    await this.actor.setFlag(MODULE_ID, "improvements", data);
    await this.render();
  }

  static async #installImprovement(event) {
    await this.#saveVisibleForm();
    const id = event.target.closest("[data-improvement-id]")?.dataset.improvementId ?? getImprovementsData(this.actor).selectedId;
    const def = getImprovementDefinition(id);
    if (!def) return;
    let data = getImprovementsData(this.actor);
    const quantity = installedQuantity(data, id);
    if (def.single && quantity > 0) return ui.notifications.warn(`${def.name} est déjà installée.`);
    if (def.constructionOnly && !data.constructionMode) return ui.notifications.warn(`${def.name} doit être ajoutée lors de la construction initiale. Active le mode « construction initiale » si c’est bien le cas.`);

    const builderKey = data.builderUuid || "__manual__";
    if ((data.failedBuilders?.[id] ?? []).includes(builderKey)) {
      return ui.notifications.warn(`Ce constructeur a déjà échoué à installer ${def.name}. Les règles exigent un autre constructeur.`);
    }

    const builder = actorByUuid(data.builderUuid);
    if (def.magic && builder && !hasWondrousFeat(builder)) {
      return ui.notifications.warn(`${def.name} exige le don « Création d’objets merveilleux » pour le constructeur sélectionné.`);
    }
    const skill = builderSkill(builder, data.builderSkillId, data.manualModifier);
    const otherBuilderPenalty = getBuilderPenalty(data, builderKey);
    const dc = def.dc + otherBuilderPenalty;
    const price = getInstallationPrice(def, data, this.actor);
    const roll = await new Roll(`1d20 + ${Number(skill.mod ?? 0)}`).evaluate();
    const total = Number(roll.total ?? 0);
    const success = total >= dc;

    if (!success) {
      data.spentGp += price / 2;
      data.failedBuilders[id] ??= [];
      if (!data.failedBuilders[id].includes(builderKey)) data.failedBuilders[id].push(builderKey);
      await this.actor.setFlag(MODULE_ID, "improvements", data);
      await post(this.actor, `Échec d’installation — ${def.name}`,
        `<p><strong>${esc(builder?.name ?? "Constructeur manuel")}</strong> utilise ${esc(skill.name)} (${signed(skill.mod)}) contre DD <strong>${dc}</strong>${otherBuilderPenalty ? " (+2 car un autre constructeur a déjà modifié le navire)" : ""}.</p>` +
        `<p>Résultat : <strong>${total}</strong>. L’installation échoue et <strong>${esc(formatGp(price / 2))}</strong> sont dépensées sans résultat. Ce constructeur ne peut pas terminer cette modification.</p>`, roll);
      await this.render();
      return;
    }

    data.spentGp += price;
    data.builderHistory ??= [];
    if (!data.builderHistory.includes(builderKey)) data.builderHistory.push(builderKey);
    data.installed[id] = {
      quantity: quantity + 1,
      builderUuid: data.builderUuid,
      builderName: builder?.name ?? "Constructeur manuel",
      legacy: false,
      installedAt: Date.now()
    };
    await this.actor.setFlag(MODULE_ID, "improvements", data);
    await syncImprovementEffects(this.actor, data);
    await post(this.actor, `Amélioration installée — ${def.name}`,
      `<p><strong>${esc(builder?.name ?? "Constructeur manuel")}</strong> réussit ${esc(skill.name)} : <strong>${total}</strong> contre DD <strong>${dc}</strong>.</p>` +
      `<p>Coût : <strong>${esc(formatGp(price))}</strong>. ${esc(def.summary)}</p>`, roll);
    await this.render();
  }

  static async #removeImprovement(event) {
    await this.#saveVisibleForm();
    const id = event.target.closest("[data-improvement-id]")?.dataset.improvementId;
    const def = getImprovementDefinition(id);
    if (!def) return;
    const accepted = window.confirm(`Retirer une occurrence de « ${def.name} » ?\n\nAucun remboursement n’est calculé. Cette action sert surtout aux corrections du MJ.`);
    if (!accepted) return;
    let data = getImprovementsData(this.actor);
    const quantity = installedQuantity(data, id);
    if (!quantity) return;
    if (quantity <= 1) delete data.installed[id];
    else data.installed[id].quantity = quantity - 1;
    await this.actor.setFlag(MODULE_ID, "improvements", data);
    if (id === "ram" && !installedQuantity(data, "ram")) {
      const ss = foundry.utils.deepClone(this.actor.getFlag(MODULE_ID, "ship") ?? {});
      ss.combat ??= {};
      ss.combat.ramEquipped = false;
      await this.actor.setFlag(MODULE_ID, "ship", ss);
    }
    await syncImprovementEffects(this.actor, data);
    ui.notifications.info(`${def.name} retirée des données du navire.`);
    await this.render();
  }

  static async #clearFailure(event) {
    await this.#saveVisibleForm();
    const id = event.target.closest("[data-improvement-id]")?.dataset.improvementId ?? getImprovementsData(this.actor).selectedId;
    let data = getImprovementsData(this.actor);
    delete data.failedBuilders[id];
    await this.actor.setFlag(MODULE_ID, "improvements", data);
    ui.notifications.info("Historique d’échec du constructeur effacé pour cette amélioration.");
    await this.render();
  }

  static async #resetBaseline() {
    await this.#saveVisibleForm();
    const ss = this.actor.getFlag(MODULE_ID, "ship") ?? {};
    if (!getShipProfile(ss.profileId)) return ui.notifications.warn("Ce navire n’utilise pas un profil officiel : modifie les valeurs de base manuellement plutôt que de les réinitialiser.");
    const accepted = window.confirm("Recharger les valeurs de base depuis le profil officiel du navire puis réappliquer toutes les améliorations ?");
    if (!accepted) return;
    let data = getImprovementsData(this.actor);
    data.base = makeBaseSnapshot(this.actor);
    await this.actor.setFlag(MODULE_ID, "improvements", data);
    await syncImprovementEffects(this.actor, data, { announce: true });
    await this.render();
  }

  static async #recalculate() {
    await this.#saveVisibleForm();
    await syncImprovementEffects(this.actor, getImprovementsData(this.actor), { announce: true });
    await this.render();
  }

  static async #openDashboard() {
    game.modules.get(MODULE_ID)?.api?.openDashboard?.(this.actor);
  }
}
