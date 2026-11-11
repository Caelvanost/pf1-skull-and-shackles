import {
  MODULE_ID,
  deriveShipState,
  effectiveVehicleCombatValues,
  getRelativeNavalGeometry
} from "./ship-data.mjs";
import {
  getComponentInfo,
  applyComponentDamage,
  setShipOnFire,
  getShipGenericSave
} from "./ship-damage.mjs";
import {
  SIEGE_WEAPONS,
  SIEGE_AMMUNITION,
  SIEGE_SIDES,
  SIEGE_COMPONENTS,
  getSiegeData,
  setSiegeData,
  getWeaponModel,
  weaponIsBroken,
  effectiveAimActions,
  compatibleAmmo,
  rangePenalty,
  indirectConditionModifier,
  averageDamage
} from "./siege-data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function esc(value) {
  return foundry.utils.escapeHTML(String(value ?? ""));
}

function sign(value) {
  const n = Number(value ?? 0);
  return `${n >= 0 ? "+" : ""}${n}`;
}

function d20Natural(roll) {
  return Number(roll?.dice?.[0]?.results?.[0]?.result ?? roll?.terms?.find?.((t) => t?.faces === 20)?.results?.[0]?.result ?? 0);
}

function rollFormula(base, modifier = 0) {
  const mod = Number(modifier ?? 0);
  return `${base}${mod ? ` ${mod >= 0 ? "+" : "-"} ${Math.abs(mod)}` : ""}`;
}

function mFromFeet(feet) {
  const m = Number(feet ?? 0) * 0.3;
  return Number.isInteger(m) ? `${m} m` : `${Math.round(m * 10) / 10} m`;
}

function modeLabel(mode) {
  if (mode === "direct") return "Tir direct";
  if (mode === "indirect") return "Tir indirect";
  if (mode === "area") return "Zone / souffle";
  return mode;
}

function componentAc(actor, component) {
  if (!actor) return null;
  if (component === "structure") {
    const state = deriveShipState(actor);
    return effectiveVehicleCombatValues(actor, state).ac;
  }
  return getComponentInfo(actor, component).ac;
}

function compatible(ammoId, modelId) {
  const ammo = SIEGE_AMMUNITION[ammoId];
  return Boolean(ammo && (ammo.compatible.includes("*") || ammo.compatible.includes(modelId)));
}

/** Règle de munition spéciale, sans ajouter d'effet absent du Guide du joueur. */
function ammunitionSpec(weapon, model, component) {
  const ammoId = compatible(weapon.ammunitionId, model.id) ? weapon.ammunitionId : "normal";
  const ammo = SIEGE_AMMUNITION[ammoId] ?? SIEGE_AMMUNITION.normal;
  const spec = {
    ammoId,
    ammoName: ammo.name,
    formula: model.damage,
    postMultiplier: 1,
    postDivisor: 1,
    damageType: model.damageType === "feu" ? "fire" : "physical",
    ignoreHardness: false,
    igniteAutomatically: false,
    note: ""
  };

  if (ammoId === "diseasedBundle") {
    spec.postDivisor = 2;
    spec.note = "Le ballot pestiféré inflige la moitié des dégâts ; les créatures touchées sont exposées à la fièvre des marais.";
  } else if (ammoId === "greekFire") {
    spec.formula = "4d6";
    spec.damageType = "fire";
    spec.ignoreHardness = true;
    spec.igniteAutomatically = true;
    spec.note = "Feu grégeois : les objets en bois dans la zone prennent automatiquement feu ; ce feu ignore leur solidité.";
  } else if (ammoId === "smoke") {
    spec.formula = "2d6";
    spec.note = "Fumée : un nuage de 9 m de rayon produit les effets d'une nappe de brouillard.";
  } else if (ammoId === "liquidIce") {
    spec.formula = "4d6";
    spec.note = "Glace liquide : Vigueur DD 20 pour éviter d'être enchevêtré 1 round ; les créatures plus éloignées peuvent réduire les dégâts de moitié selon la zone.";
  } else if (ammoId === "chainShot") {
    if (component === "sails") {
      spec.postMultiplier = 2;
      spec.note = "Tir de chaîne : dégâts doublés contre les voiles et le gréement.";
    } else {
      spec.formula = model.id === "lightCatapult" ? "2d6" : "4d6";
      spec.note = "Tir de chaîne : dégâts réduits contre la structure du navire ; une créature touchée doit réussir Vigueur DD 20 ou tomber à terre.";
    }
  }

  return spec;
}

function weaponAttackModifiers(weapon, model, data) {
  const broken = weaponIsBroken(weapon);
  const proficiency = weapon.proficient ? 0 : -4;
  const brokenPenalty = broken ? -2 : 0;
  const range = rangePenalty(data.distanceFt, model);
  const direct = Number(weapon.directModifier ?? 0) + Number(weapon.enhancementBonus ?? 0) + Number(weapon.sizePenalty ?? 0) + proficiency + brokenPenalty + range;
  const indirect = Number(weapon.indirectModifier ?? 0) + Number(weapon.enhancementBonus ?? 0) + proficiency + brokenPenalty + range + indirectConditionModifier(weapon);
  return { broken, proficiency, brokenPenalty, range, direct, indirect };
}

export class SiegeController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "standard-form", "pf1-ss-siege-window"],
    tag: "form",
    position: { width: 900, height: "auto" },
    window: { icon: "fa-solid fa-crosshairs", resizable: true },
    actions: {
      addWeapon: this.#addWeapon,
      removeWeapon: this.#removeWeapon,
      workLoad: this.#workLoad,
      workAim: this.#workAim,
      resetLoad: this.#resetLoad,
      resetAim: this.#resetAim,
      fireWeapon: this.#fireWeapon,
      repairWeapon: this.#repairWeapon,
      broadside: this.#broadside,
      openShipController: this.#openShipController
    },
    form: { handler: this.#onSubmit, closeOnSubmit: false }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/siege-controller.hbs` }
  };

  constructor(actor, options = {}) {
    super({
      id: `pf1-ss-siege-${actor.id}`,
      ...options,
      window: { ...(options.window ?? {}), title: `Artillerie — ${actor.name}` }
    });
    this.actor = actor;
  }

  static open(actor) {
    if (!actor || actor.type !== "vehicle") {
      ui.notifications.warn("Skull & Shackles : l'artillerie doit être liée à un Vehicle PF1.");
      return null;
    }
    const app = new SiegeController(actor);
    app.render({ force: true });
    return app;
  }

  #getTargetVehicle() {
    const targets = Array.from(game.user?.targets ?? [])
      .map((token) => token.actor)
      .filter((actor) => actor?.type === "vehicle" && actor.id !== this.actor.id);
    return targets.length === 1 ? targets[0] : null;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const data = getSiegeData(this.actor);
    const target = this.#getTargetVehicle();
    const targetAc = target ? componentAc(target, data.targetComponent) : null;
    const assignedCrew = data.weapons.reduce((sum, w) => sum + Number(w.crewAssigned ?? 0), 0);
    const shipCrew = Number(this.actor.system?.crew?.value ?? 0);

    const weapons = data.weapons.map((weapon) => {
      const model = getWeaponModel(weapon);
      const broken = weaponIsBroken(weapon);
      const requiredAim = effectiveAimActions(weapon);
      const modifiers = weaponAttackModifiers(weapon, model, data);
      return {
        ...weapon,
        model,
        displayName: weapon.customName || model.name,
        sideLabel: SIEGE_SIDES[weapon.side],
        modeLabel: modeLabel(model.mode),
        rangeLabel: model.rangeFt ? mFromFeet(model.rangeFt) : "—",
        minRangeLabel: model.minRangeFt ? mFromFeet(model.minRangeFt) : "—",
        isBroken: broken,
        destroyed: Number(weapon.hp ?? 0) <= 0,
        requiredAim,
        loadReady: Number(weapon.loadProgress ?? 0) >= Number(model.loadActions ?? 0),
        aimReady: Number(weapon.aimProgress ?? 0) >= requiredAim,
        ammoChoices: compatibleAmmo(model.id).map((ammo) => ({ ...ammo, selected: ammo.id === weapon.ammunitionId })),
        sideChoices: Object.entries(SIEGE_SIDES).map(([value, label]) => ({ value, label, selected: value === weapon.side })),
        successiveChoices: [
          ["none", "Aucun"],
          ["visibleMiss", "Échecs observés (+2/échec, max +10)"],
          ["spotterMiss", "Échecs signalés (+1/échec, max +5)"],
          ["afterHit", "Tir successif après un coup au but (+10)"]
        ].map(([value, label]) => ({ value, label, selected: value === weapon.successiveMode })),
        modifiers,
        directTotal: sign(modifiers.direct),
        indirectTotal: sign(modifiers.indirect),
        engineerActionLabel: weapon.siegeEngineer ? "action de mouvement" : "action complexe"
      };
    });

    const modelChoices = Object.values(SIEGE_WEAPONS).map((model) => ({
      ...model,
      addSelected: model.id === data.addModelId,
      broadsideSelected: model.id === data.broadsideModelId,
      modeLabel: modeLabel(model.mode)
    }));
    const sideChoices = Object.entries(SIEGE_SIDES).map(([value, label]) => ({
      value, label,
      broadsideSelected: value === data.broadsideSide
    }));
    const componentChoices = Object.entries(SIEGE_COMPONENTS).map(([value, label]) => ({
      value, label, selected: value === data.targetComponent
    }));

    const broadsideCandidates = weapons.filter((w) => w.modelId === data.broadsideModelId && w.side === data.broadsideSide && w.model.mode !== "area");
    const broadsideReady = broadsideCandidates.filter((w) => w.loadReady && w.aimReady && !w.destroyed && !w.sabotaged && w.crewAssigned > 0 && w.ammunitionId === "normal");

    return {
      ...context,
      actor: this.actor,
      data,
      target,
      targetAc,
      weapons,
      modelChoices,
      sideChoices,
      componentChoices,
      assignedCrew,
      shipCrew,
      crewOverbooked: assignedCrew > shipCrew,
      broadsideCandidates: broadsideCandidates.length,
      broadsideReady: broadsideReady.length,
      targetComponentLabel: SIEGE_COMPONENTS[data.targetComponent],
      distanceLabel: mFromFeet(data.distanceFt)
    };
  }

  static async #onSubmit(event, form, formData) {
    const rawObject = formData.object ?? formData.toObject?.() ?? Object.fromEntries(formData.entries());
    const raw = foundry.utils.expandObject(rawObject);
    const current = getSiegeData(this.actor);
    const top = raw.siege ?? {};
    const submittedWeapons = raw.weapons ?? {};

    const merged = {
      ...current,
      ...top,
      autoApplyDamage: Boolean(form.elements.namedItem("siege.autoApplyDamage")?.checked),
      weapons: current.weapons.map((weapon) => {
        const update = submittedWeapons[weapon.id] ?? {};
        return {
          ...weapon,
          ...update,
          proficient: Boolean(form.elements.namedItem(`weapons.${weapon.id}.proficient`)?.checked),
          siegeEngineer: Boolean(form.elements.namedItem(`weapons.${weapon.id}.siegeEngineer`)?.checked),
          broken: Boolean(form.elements.namedItem(`weapons.${weapon.id}.broken`)?.checked),
          sabotaged: Boolean(form.elements.namedItem(`weapons.${weapon.id}.sabotaged`)?.checked),
          noLineOfSight: Boolean(form.elements.namedItem(`weapons.${weapon.id}.noLineOfSight`)?.checked)
        };
      })
    };

    await setSiegeData(this.actor, merged);
    await this.render();
  }

  async #saveVisibleForm() {
    try { await this.submit(); }
    catch (error) { console.warn(`${MODULE_ID} | Enregistrement artillerie impossible`, error); }
  }

  #actionWeaponId(event, target) {
    const el = event?.currentTarget ?? target ?? event?.target?.closest?.("[data-weapon-id]");
    return String(el?.dataset?.weaponId ?? "");
  }

  async #mutateWeapon(id, mutator) {
    const data = getSiegeData(this.actor);
    const index = data.weapons.findIndex((w) => w.id === id);
    if (index < 0) return null;
    await mutator(data.weapons[index], data);
    await setSiegeData(this.actor, data);
    return data.weapons[index];
  }

  static async #addWeapon() {
    await this.#saveVisibleForm();
    const data = getSiegeData(this.actor);
    const model = SIEGE_WEAPONS[data.addModelId] ?? SIEGE_WEAPONS.lightBallista;
    data.weapons.push({
      id: foundry.utils.randomID(), modelId: model.id, customName: "", side: "port",
      crewAssigned: model.crew, loadProgress: 0, aimProgress: 0,
      hp: model.hp, maxHp: model.hp, hardness: model.hardness,
      broken: false, sabotaged: false, proficient: true, siegeEngineer: false,
      directModifier: 0, indirectModifier: 0, sizePenalty: 0, enhancementBonus: 0,
      aimDc: model.aimDc, noLineOfSight: false, successiveMode: "none", successiveCount: 0,
      ammunitionId: "normal", ammunitionCount: 20, repairModifier: 0
    });
    await setSiegeData(this.actor, data);
    ui.notifications.info(`${model.name} ajouté à ${this.actor.name}.`);
    await this.render();
  }

  static async #removeWeapon(event, target) {
    await this.#saveVisibleForm();
    const id = this.#actionWeaponId(event, target);
    const data = getSiegeData(this.actor);
    const weapon = data.weapons.find((w) => w.id === id);
    if (!weapon) return;
    if (!window.confirm(`Retirer ${weapon.customName || getWeaponModel(weapon).name} de la fiche d'artillerie ?`)) return;
    data.weapons = data.weapons.filter((w) => w.id !== id);
    await setSiegeData(this.actor, data);
    await this.render();
  }

  static async #workLoad(event, target) {
    await this.#saveVisibleForm();
    const id = this.#actionWeaponId(event, target);
    await this.#mutateWeapon(id, (weapon) => { weapon.loadProgress += 1; });
    await this.render();
  }

  static async #workAim(event, target) {
    await this.#saveVisibleForm();
    const id = this.#actionWeaponId(event, target);
    await this.#mutateWeapon(id, (weapon) => { weapon.aimProgress += 1; });
    await this.render();
  }

  static async #resetLoad(event, target) {
    await this.#saveVisibleForm();
    const id = this.#actionWeaponId(event, target);
    await this.#mutateWeapon(id, (weapon) => { weapon.loadProgress = 0; });
    await this.render();
  }

  static async #resetAim(event, target) {
    await this.#saveVisibleForm();
    const id = this.#actionWeaponId(event, target);
    await this.#mutateWeapon(id, (weapon) => {
      weapon.aimProgress = 0;
      weapon.successiveMode = "none";
      weapon.successiveCount = 0;
    });
    await this.render();
  }

  async #applyHitDamage(target, component, weapon, model, criticalMultiplier = 1, { areaSave = false } = {}) {
    const spec = ammunitionSpec(weapon, model, component);
    const broken = weaponIsBroken(weapon);
    const damageRoll = await new Roll(spec.formula).evaluate();
    let raw = Number(damageRoll.total ?? 0);
    raw = Math.floor(raw * spec.postMultiplier / spec.postDivisor);
    if (broken) raw = Math.max(0, raw - 2);
    raw *= Math.max(1, Number(criticalMultiplier ?? 1));

    let saveRoll = null;
    let saveText = "";
    if (areaSave && target) {
      const save = getShipGenericSave(target);
      saveRoll = await new Roll(rollFormula("1d20", save)).evaluate();
      const success = Number(saveRoll.total ?? 0) >= 15;
      if (success) raw = Math.floor(raw / 2);
      else spec.igniteAutomatically = true;
      saveText = `<p><strong>Réflexes du navire :</strong> ${Number(saveRoll.total ?? 0)} contre DD 15 — ${success ? "réussite, dégâts divisés par deux" : "échec, dégâts complets et la cible prend feu"}.</p>`;
    }

    let applied = null;
    if (target && getSiegeData(this.actor).autoApplyDamage) {
      applied = await applyComponentDamage(target, component, raw, {
        damageType: spec.damageType,
        ignoreHardness: spec.ignoreHardness,
        source: `${model.name} — ${spec.ammoName}`
      });
      if (spec.igniteAutomatically) await setShipOnFire(target, true);
    }

    return { spec, damageRoll, raw, applied, saveRoll, saveText };
  }

  async #consumeShot(weaponId, { hit = null } = {}) {
    await this.#mutateWeapon(weaponId, (weapon) => {
      weapon.loadProgress = 0;
      weapon.ammunitionCount = Math.max(0, Number(weapon.ammunitionCount ?? 0) - 1);
      if (hit === true) {
        weapon.successiveMode = "afterHit";
        weapon.successiveCount = 0;
      } else if (hit === false && ["visibleMiss", "spotterMiss"].includes(weapon.successiveMode)) {
        weapon.successiveCount = Math.max(0, Number(weapon.successiveCount ?? 0) + 1);
      }
    });
  }

  async #mishap(weaponId, weapon, model, natural) {
    if (natural !== 1) return { mishap: false, prevented: false, explosionRoll: null };
    if (weapon.siegeEngineer) return { mishap: false, prevented: true, explosionRoll: null };
    const wasBroken = weaponIsBroken(weapon);
    let explosionRoll = null;
    await this.#mutateWeapon(weaponId, (w) => { w.broken = true; });
    if (model.id === "fireDrake" && wasBroken) explosionRoll = await new Roll("6d6").evaluate();
    return { mishap: true, prevented: false, explosionRoll };
  }

  static async #fireWeapon(event, targetEl) {
    await this.#saveVisibleForm();
    const id = this.#actionWeaponId(event, targetEl);
    const data = getSiegeData(this.actor);
    const weapon = data.weapons.find((w) => w.id === id);
    if (!weapon) return;
    const model = getWeaponModel(weapon);
    const target = this.#getTargetVehicle();
    const requiredAim = effectiveAimActions(weapon);

    if (Number(weapon.hp ?? 0) <= 0) return ui.notifications.warn("Cet engin de siège est détruit.");
    if (weapon.sabotaged) return ui.notifications.warn("Cet engin est saboté et ne peut pas tirer tant qu'il n'est pas réparé.");
    if (Number(weapon.crewAssigned ?? 0) <= 0) return ui.notifications.warn("Aucun membre d'équipe n'est affecté à cet engin.");
    if (Number(weapon.loadProgress ?? 0) < Number(model.loadActions ?? 0)) return ui.notifications.warn("L'engin n'est pas encore chargé.");
    if (Number(weapon.aimProgress ?? 0) < requiredAim) return ui.notifications.warn("L'engin n'est pas encore suffisamment visé.");
    if (Number(weapon.ammunitionCount ?? 0) <= 0) return ui.notifications.warn("Il ne reste plus de munitions pour cet engin.");
    if (!compatible(weapon.ammunitionId, model.id)) return ui.notifications.warn("Cette munition n'est pas compatible avec cet engin.");
    if (model.minRangeFt && Number(data.distanceFt ?? 0) < model.minRangeFt) return ui.notifications.warn(`La cible est trop proche : portée minimale ${mFromFeet(model.minRangeFt)}.`);

    const modifiers = weaponAttackModifiers(weapon, model, data);
    const targetAc = target ? componentAc(target, data.targetComponent) : null;
    const rolls = [];
    let attackRoll = null;
    let confirmRoll = null;
    let scatterDirection = null;
    let scatterDistance = null;
    let hit = false;
    let critical = false;
    let details = "";
    let damage = null;

    if (model.mode === "area") {
      damage = await this.#applyHitDamage(target, data.targetComponent, weapon, model, 1, { areaSave: true });
      hit = true;
      details = `<p>Le drake de feu projette une ligne de <strong>18 m</strong> ou un cône de <strong>9 m</strong>. ${target ? `Le navire ciblé effectue un jet de Réflexes DD 15.` : "Résous les Réflexes DD 15 des créatures dans la zone."}</p>${damage.saveText}`;
    } else if (model.mode === "direct") {
      attackRoll = await new Roll(rollFormula("1d20", modifiers.direct)).evaluate();
      rolls.push(JSON.stringify(attackRoll.toJSON()));
      const nat = d20Natural(attackRoll);
      hit = nat === 20 || (nat !== 1 && (targetAc == null || Number(attackRoll.total ?? 0) >= targetAc));
      const mishap = await this.#mishap(id, weapon, model, nat);
      if (mishap.prevented) details += "<p><strong>1 naturel :</strong> Ingénieur de siège empêche l'avarie.</p>";
      else if (mishap.mishap) details += "<p><strong>AVARIE :</strong> 1 naturel ; l'engin devient Brisé.</p>";

      if (hit && nat >= model.critThreshold && model.critMultiplier > 1 && targetAc != null) {
        confirmRoll = await new Roll(rollFormula("1d20", modifiers.direct)).evaluate();
        rolls.push(JSON.stringify(confirmRoll.toJSON()));
        const cNat = d20Natural(confirmRoll);
        critical = cNat === 20 || (cNat !== 1 && Number(confirmRoll.total ?? 0) >= targetAc);
      }
      if (hit) damage = await this.#applyHitDamage(target, data.targetComponent, weapon, model, critical ? model.critMultiplier : 1);
    } else {
      const dc = Number(weapon.aimDc ?? model.aimDc ?? 0);
      if (dc <= 0) return ui.notifications.warn("Le Guide du joueur ne fournit pas de DD de visée pour cet engin : renseigne le DD dans sa fiche avant de tirer.");
      attackRoll = await new Roll(rollFormula("1d20", modifiers.indirect)).evaluate();
      rolls.push(JSON.stringify(attackRoll.toJSON()));
      const nat = d20Natural(attackRoll);
      hit = nat === 20 || (nat !== 1 && Number(attackRoll.total ?? 0) >= dc);
      const mishap = await this.#mishap(id, weapon, model, nat);
      if (mishap.prevented) details += "<p><strong>1 naturel :</strong> Ingénieur de siège empêche l'avarie.</p>";
      else if (mishap.mishap) details += "<p><strong>AVARIE :</strong> 1 naturel ; l'engin devient Brisé.</p>";

      if (hit && nat === 20 && model.critMultiplier > 1) {
        confirmRoll = await new Roll(rollFormula("1d20", modifiers.indirect)).evaluate();
        rolls.push(JSON.stringify(confirmRoll.toJSON()));
        critical = Number(confirmRoll.total ?? 0) >= dc;
      }

      if (hit) {
        damage = await this.#applyHitDamage(target, data.targetComponent, weapon, model, critical ? model.critMultiplier : 1);
      } else {
        scatterDirection = await new Roll("1d8").evaluate();
        const factors = Math.max(1, Math.ceil(Math.max(1, Number(data.distanceFt ?? 0)) / Math.max(1, model.rangeFt)));
        scatterDistance = await new Roll(`${factors}d4`).evaluate();
        rolls.push(JSON.stringify(scatterDirection.toJSON()), JSON.stringify(scatterDistance.toJSON()));
        details += `<p><strong>Déviation :</strong> d8 = ${scatterDirection.total} (1 = trop court, puis sens horaire) ; distance = <strong>${scatterDistance.total} case(s)</strong> pour ${factors} facteur(s) de portée.</p>`;
      }
    }

    await this.#consumeShot(id, { hit });
    if (damage?.damageRoll) rolls.push(JSON.stringify(damage.damageRoll.toJSON()));
    if (damage?.saveRoll) rolls.push(JSON.stringify(damage.saveRoll.toJSON()));

    const targetLine = target ? `<p><strong>Cible :</strong> ${esc(target.name)} — ${esc(SIEGE_COMPONENTS[data.targetComponent])}${targetAc != null && model.mode === "direct" ? `, CA ${targetAc}` : ""}.</p>` : `<p><strong>Aucune cible Vehicle unique :</strong> le résultat est publié sans application automatique.</p>`;
    const attackLine = attackRoll
      ? `<p><strong>${model.mode === "indirect" ? "Test de visée" : "Jet d'attaque"} :</strong> ${Number(attackRoll.total ?? 0)} (${model.mode === "direct" ? `modificateur ${sign(modifiers.direct)}` : `modificateur ${sign(modifiers.indirect)}, DD ${weapon.aimDc || model.aimDc}`}).</p>`
      : "";
    const damageLine = hit && damage
      ? `<p><strong>Dégâts :</strong> ${damage.raw}${critical ? ` (critique ×${model.critMultiplier})` : ""} avec ${esc(damage.spec.ammoName)}.${damage.applied ? ` ${esc(damage.applied.componentLabel)} : ${damage.applied.before} → ${damage.applied.after} PV après solidité.` : ""}</p>${damage.spec.note ? `<p>${esc(damage.spec.note)}</p>` : ""}`
      : "";

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-crosshairs"></i> ${esc(weapon.customName || model.name)} — ${esc(this.actor.name)}</h3>${targetLine}<p><strong>Mode :</strong> ${esc(modeLabel(model.mode))} ; <strong>distance déclarée :</strong> ${esc(mFromFeet(data.distanceFt))} ; <strong>munition :</strong> ${esc(SIEGE_AMMUNITION[weapon.ammunitionId]?.name || "Munition normale")}.</p>${attackLine}<p class="pf1-ss-result ${hit ? "success" : "failure"}">${hit ? (critical ? "COUP CRITIQUE" : "TOUCHÉ") : "RATÉ"}</p>${damageLine}${details}</div>`,
      rolls
    });
    await this.render();
  }

  static async #repairWeapon(event, targetEl) {
    await this.#saveVisibleForm();
    const id = this.#actionWeaponId(event, targetEl);
    const data = getSiegeData(this.actor);
    const weapon = data.weapons.find((w) => w.id === id);
    if (!weapon) return;
    const model = getWeaponModel(weapon);
    const roll = await new Roll(rollFormula("1d20", weapon.repairModifier)).evaluate();
    const success = Number(roll.total ?? 0) >= 20;
    if (success) {
      await this.#mutateWeapon(id, (w) => { w.broken = false; w.sabotaged = false; });
    }
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-screwdriver-wrench"></i> Réparer ${esc(weapon.customName || model.name)}</h3><p>Test DD 20 : <strong>${Number(roll.total ?? 0)}</strong>. La réparation demande 10 minutes et peut utiliser Artisanat (engins de siège), Sabotage ou Connaissances (ingénierie).</p><p class="pf1-ss-result ${success ? "success" : "failure"}">${success ? "RÉPARATION RÉUSSIE" : "ÉCHEC — une nouvelle tentative est possible"}</p>${success && Number(weapon.hp) <= Number(weapon.maxHp) / 2 ? "<p>Les PV de l'engin restent à la moitié ou moins : vérifie/répare aussi ses dégâts matériels si nécessaire.</p>" : ""}</div>`,
      rolls: [JSON.stringify(roll.toJSON())]
    });
    await this.render();
  }

  static async #broadside() {
    await this.#saveVisibleForm();
    const data = getSiegeData(this.actor);
    const model = SIEGE_WEAPONS[data.broadsideModelId];
    const target = this.#getTargetVehicle();
    if (!model || model.mode === "area") return ui.notifications.warn("Le drake de feu n'est pas géré comme une bordée dans cette version.");
    if (!target) return ui.notifications.warn("Cible exactement un token Vehicle adverse avant de tirer une bordée.");
    if (!["structure", "sails", "oars"].includes(data.targetComponent)) return ui.notifications.warn("Une bordée ne peut viser que la structure ou un système de propulsion (voiles/rames).");

    const geometry = getRelativeNavalGeometry(this.actor, target);
    const expectedArc = data.broadsideSide === "port" ? "port" : data.broadsideSide === "starboard" ? "starboard" : null;
    if (geometry.calculable && expectedArc && geometry.arc !== expectedArc) {
      ui.notifications.warn(`Aide de placement : ${target.name} est dans le secteur ${geometry.arcLabel.toLowerCase()}, pas du côté ${SIEGE_SIDES[data.broadsideSide].toLowerCase()}. Le tir reste autorisé car les règles ne définissent pas ici un arc géométrique strict pour chaque engin.`);
    }

    const candidates = data.weapons.filter((w) => w.modelId === model.id && w.side === data.broadsideSide);
    const ready = candidates.filter((w) => Number(w.hp) > 0 && !w.sabotaged && w.crewAssigned > 0 && w.loadProgress >= model.loadActions && w.aimProgress >= effectiveAimActions(w) && w.ammunitionId === "normal" && w.ammunitionCount > 0);
    if (!ready.length) return ui.notifications.warn("Aucun engin prêt, de ce type et de ce bord, avec une munition normale.");
    if (ready.length !== candidates.length) ui.notifications.warn(`La bordée utilise seulement ${ready.length}/${candidates.length} engin(s) actuellement prêts.`);

    const first = ready[0];
    const mods = weaponAttackModifiers(first, model, data);
    const targetAc = componentAc(target, data.targetComponent);
    let roll;
    let hit;
    let dc = null;
    if (model.mode === "direct") {
      roll = await new Roll(rollFormula("1d20", mods.direct)).evaluate();
      const nat = d20Natural(roll);
      hit = nat === 20 || (nat !== 1 && Number(roll.total ?? 0) >= targetAc);
    } else {
      dc = Number(first.aimDc || model.aimDc || 0);
      if (dc <= 0) return ui.notifications.warn("Renseigne d'abord le DD de visée de l'engin utilisé pour la bordée.");
      roll = await new Roll(rollFormula("1d20", mods.indirect)).evaluate();
      const nat = d20Natural(roll);
      hit = nat === 20 || (nat !== 1 && Number(roll.total ?? 0) >= dc);
    }

    let totalDamage = 0;
    let applied = null;
    if (hit) {
      for (const w of ready) {
        const avg = averageDamage(model.damage);
        if (avg == null) return ui.notifications.warn("Impossible de calculer les dégâts moyens de cette arme.");
        totalDamage += Math.max(0, avg - (weaponIsBroken(w) ? 2 : 0));
      }
      totalDamage = Math.floor(totalDamage);
      if (data.autoApplyDamage) {
        applied = await applyComponentDamage(target, data.targetComponent, totalDamage, {
          damageType: "physical", ignoreHardness: false, source: `Bordée de ${model.name}`
        });
      }
    }

    const updated = getSiegeData(this.actor);
    for (const w of updated.weapons) {
      if (ready.some((r) => r.id === w.id)) {
        w.loadProgress = 0;
        w.ammunitionCount = Math.max(0, Number(w.ammunitionCount ?? 0) - 1);
      }
    }
    await setSiegeData(this.actor, updated);

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-angles-right"></i> Bordée ${esc(SIEGE_SIDES[data.broadsideSide])} — ${esc(this.actor.name)}</h3><p><strong>${ready.length} × ${esc(model.name)}</strong> font feu ensemble contre ${esc(target.name)} (${esc(SIEGE_COMPONENTS[data.targetComponent])}).</p>${geometry.calculable ? `<p class="hint"><strong>Position :</strong> ${esc(geometry.arcLabel)}, ${geometry.distanceSquares} case(s) navale(s) entre les coques.</p>` : ""}<p><strong>Jet unique :</strong> ${Number(roll.total ?? 0)} ${model.mode === "direct" ? `contre CA ${targetAc}` : `contre DD de visée ${dc}`}.</p><p class="pf1-ss-result ${hit ? "success" : "failure"}">${hit ? "BORDÉE AU BUT" : "BORDÉE RATÉE"}</p>${hit ? `<p>Dégâts moyens cumulés : <strong>${totalDamage}</strong>.${applied ? ` ${esc(applied.componentLabel)} : ${applied.before} → ${applied.after} PV après solidité.` : ""}</p>` : ""}<p><em>La bordée utilise une munition normale. Les coups critiques et avaries collectives ne sont pas automatisés, car la règle de bordée ne précise pas comment les propager à l'ensemble des armes.</em></p></div>`,
      rolls: [JSON.stringify(roll.toJSON())]
    });
    await this.render();
  }

  static async #openShipController() {
    const module = game.modules.get(MODULE_ID);
    module?.api?.openShip?.(this.actor);
  }
}
