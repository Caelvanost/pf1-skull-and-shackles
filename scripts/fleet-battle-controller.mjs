import { MODULE_ID } from "./ship-data.mjs";
import {
  FLEET_ADVANTAGES,
  getFleetData,
  setFleetData,
  getBattleState,
  setBattleState,
  getAdmiralData,
  getAdvantageCounts,
  deriveSquadron,
  isSquadronEliminated,
  getFleetBattleStatus,
  applyFleetDamage,
  repairFleetDamage
} from "./fleet-data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function signed(value) {
  const n = Number(value ?? 0);
  return `${n >= 0 ? "+" : ""}${n}`;
}

async function evalRoll(formula, data = {}) {
  const roll = await new Roll(formula, data).evaluate();
  return roll;
}

function naturalD20(roll) {
  try { return Number(roll.dice?.[0]?.results?.[0]?.result ?? 0); } catch { return 0; }
}

async function chat(content, rolls = []) {
  const rollList = rolls.filter(Boolean);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker(),
    content,
    rolls: rollList.map((roll) => JSON.stringify(roll.toJSON()))
  });
}

function escapeHtml(value) {
  return foundry.utils.escapeHTML(String(value ?? ""));
}

function selectionValues(element, side) {
  const out = {};
  for (const select of element?.querySelectorAll?.(`select[data-phase-choice-side="${side}"]`) ?? []) {
    if (select.value) out[select.dataset.choiceKey] = select.value;
  }
  return out;
}

function selectedIds(selections, prefix) {
  return Object.entries(selections ?? {}).filter(([key, value]) => key.startsWith(prefix) && value).map(([, value]) => value);
}

function sideProp(side, suffix) {
  return `${suffix}${side.toUpperCase()}`;
}

export class FleetBattleController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-fleet-battle", "standard-form"],
    tag: "form",
    position: { width: 1180, height: 820 },
    window: { icon: "fa-solid fa-ship", resizable: true },
    actions: {
      newRound: this.#newRound,
      applyPhaseAdvantages: this.#applyPhaseAdvantages,
      attack: this.#attack,
      rapidRepair: this.#rapidRepair,
      routPhase: this.#routPhase,
      victoryMorale: this.#victoryMorale,
      flee: this.#flee,
      resetBattle: this.#resetBattle,
      openFleetA: this.#openFleetA,
      openFleetB: this.#openFleetB
    }
  };

  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/fleet-battle-controller.hbs` } };

  constructor(actorA, actorB, options = {}) {
    super({
      id: `pf1-ss-fleet-battle-${actorA.id}-${actorB.id}`,
      ...options,
      window: { ...(options.window ?? {}), title: `Affrontement entre flottes — ${actorA.name} / ${actorB.name}` }
    });
    this.actorA = actorA;
    this.actorB = actorB;
  }

  static open(actorA, actorB) {
    if (!actorA || !actorB || actorA.type !== "vehicle" || actorB.type !== "vehicle") {
      ui.notifications.warn("Skull & Shackles : il faut deux Vehicles PF1 portant chacun une fiche de flotte.");
      return null;
    }
    const app = new FleetBattleController(actorA, actorB);
    app.render({ force: true });
    return app;
  }

  #buildSide(actor, fleet, state, side) {
    const advantages = getAdvantageCounts(fleet);
    const admiral = getAdmiralData(fleet);
    const acted = new Set(state[sideProp(side, "acted")] ?? []);
    const selections = state[sideProp(side, "selections")] ?? {};
    const vengeance = Boolean(state[sideProp(side, "vengeance")]);
    const opponentFleet = side === "a" ? getFleetData(this.actorB) : getFleetData(this.actorA);
    const targetChoices = opponentFleet.squadrons.filter((s) => !isSquadronEliminated(s)).map((s) => ({ value: s.id, label: s.name }));

    const phaseChoiceRows = [];
    const addRows = (adv, count, maxRows = count) => {
      for (let i = 0; i < Math.min(count, maxRows); i++) {
        const key = `${adv}:${i}`;
        phaseChoiceRows.push({
          key,
          advantage: adv,
          label: FLEET_ADVANTAGES[adv].label,
          description: FLEET_ADVANTAGES[adv].description,
          choices: fleet.squadrons.filter((s) => !isSquadronEliminated(s)).map((s) => ({ value: s.id, label: s.name, selected: selections[key] === s.id }))
        });
      }
    };
    addRows("advancedTactics", advantages.advancedTactics ?? 0, 1);
    addRows("defensiveTactics", advantages.defensiveTactics ?? 0);
    addRows("divineProtection", advantages.divineProtection ?? 0);
    addRows("recklessManeuver", advantages.recklessManeuver ?? 0);
    addRows("ruthlessAdvance", advantages.ruthlessAdvance ?? 0, 1);

    const squadrons = fleet.squadrons.map((s) => {
      const d = deriveSquadron(actor, fleet, s);
      const attackMods = this.#phaseAttackBonus(side, s.id, state, advantages);
      const defenseMods = this.#phaseDefenseBonus(side, s.id, state);
      const damageMods = this.#phaseDamageBonus(side, s.id, state, advantages);
      const moraleMods = this.#phaseMoraleBonus(side, state, advantages);
      return {
        ...s,
        derived: d,
        attackTotal: d.attack + attackMods,
        defenseTotal: d.defense + defenseMods,
        damageBonusTotal: d.damageBonus + damageMods,
        moraleModTotal: d.moraleMod + moraleMods,
        attackDisplay: signed(d.attack + attackMods),
        moraleModDisplay: signed(d.moraleMod + moraleMods),
        acted: acted.has(s.id),
        canAttack: state.phase === "battle" && !acted.has(s.id) && !d.eliminated,
        statusLabel: s.mutinied || s.morale <= 0 ? "Mutiné" : d.counts.active === 0 ? "Éliminé" : d.counts.disabled || d.counts.sunk ? "Endommagé" : "Opérationnel",
        targetChoices
      };
    });

    return {
      actor,
      fleet,
      admiral,
      advantages,
      vengeance,
      squadrons,
      phaseChoiceRows,
      initiative: state[sideProp(side, "initiative")],
      winner: state.initiativeWinner === side,
      rapidRepairsAvailable: (advantages.rapidRepairs ?? 0) > 0 && !state[sideProp(side, "rapidRepairsUsed")],
      repairChoices: fleet.squadrons.filter((s) => !isSquadronEliminated(s)).map((s) => ({ value: s.id, label: s.name })),
      defeated: getFleetBattleStatus(fleet).defeated
    };
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const fleetA = getFleetData(this.actorA);
    const fleetB = getFleetData(this.actorB);
    const state = getBattleState(this.actorA, this.actorB.uuid);
    return {
      ...context,
      actorA: this.actorA,
      actorB: this.actorB,
      state,
      sideA: this.#buildSide(this.actorA, fleetA, state, "a"),
      sideB: this.#buildSide(this.actorB, fleetB, state, "b"),
      phaseLabel: state.phase === "battle" ? "Phase de bataille" : state.phase === "rout" ? "Phase de déroute" : state.phase === "ended" ? "Bataille terminée" : "Préparation",
      battleActive: state.phase === "battle",
      routActive: state.phase === "rout",
      ended: state.phase === "ended",
      log: [...(state.log ?? [])].reverse()
    };
  }

  #phaseAttackBonus(side, squadronId, state, advantages) {
    let bonus = state.initiativeWinner === side ? 1 : 0;
    const selections = state[sideProp(side, "selections")] ?? {};
    if (selectedIds(selections, "advancedTactics:").includes(squadronId)) bonus += 2;
    if (selectedIds(selections, "recklessManeuver:").includes(squadronId)) bonus += 4;
    if (selectedIds(selections, "ruthlessAdvance:").includes(squadronId)) bonus += 2;
    if (state[sideProp(side, "vengeance")] && (advantages.vengeance ?? 0) > 0) bonus += 2;
    return bonus;
  }

  #phaseDefenseBonus(side, squadronId, state) {
    let bonus = 0;
    const selections = state[sideProp(side, "selections")] ?? {};
    if (selectedIds(selections, "defensiveTactics:").includes(squadronId)) bonus += 2;
    const recklessMap = state[sideProp(side, "recklessMap")] ?? {};
    if (recklessMap[squadronId] != null) bonus -= 2;
    return bonus;
  }

  #phaseDamageBonus(side, squadronId, state, advantages) {
    let bonus = (advantages.magicArtillery ?? 0) > 0 ? 1 : 0;
    const selections = state[sideProp(side, "selections")] ?? {};
    if (selectedIds(selections, "ruthlessAdvance:").includes(squadronId)) bonus += 2;
    return bonus;
  }

  #phaseMoraleBonus(side, state, advantages) {
    let bonus = (advantages.magicArtillery ?? 0) > 0 ? 1 : 0;
    if (state[sideProp(side, "vengeance")] && (advantages.vengeance ?? 0) > 0) bonus += 2;
    return bonus;
  }

  async #saveState(state) {
    await setBattleState(this.actorA, state);
  }

  #pushLog(state, text) {
    state.log ??= [];
    state.log.push({ at: new Date().toLocaleTimeString(), text });
    state.log = state.log.slice(-30);
  }

  static async #newRound() {
    let state = getBattleState(this.actorA, this.actorB.uuid);
    const fleetA = getFleetData(this.actorA);
    const fleetB = getFleetData(this.actorB);
    const admA = getAdmiralData(fleetA);
    const admB = getAdmiralData(fleetB);
    const advA = getAdvantageCounts(fleetA);
    const advB = getAdvantageCounts(fleetB);
    const modA = admA.profession + Number(fleetA.admiralInitiativeManual ?? 0) + (advA.eagerToFight ?? 0) * 4;
    const modB = admB.profession + Number(fleetB.admiralInitiativeManual ?? 0) + (advB.eagerToFight ?? 0) * 4;

    let rollA, rollB, totalA, totalB;
    for (let tries = 0; tries < 5; tries++) {
      rollA = await evalRoll("1d20 + @mod", { mod: modA });
      rollB = await evalRoll("1d20 + @mod", { mod: modB });
      totalA = rollA.total; totalB = rollB.total;
      if (totalA !== totalB) break;
    }
    const winner = totalA >= totalB ? "a" : "b";
    state = {
      ...state,
      opponentUuid: this.actorB.uuid,
      round: Number(state.round ?? 0) + 1,
      phase: "battle",
      initiativeWinner: winner,
      initiativeA: totalA,
      initiativeB: totalB,
      actedA: [], actedB: [],
      selectionsA: {}, selectionsB: {},
      phaseAdvantagesAppliedA: false, phaseAdvantagesAppliedB: false,
      rapidRepairsUsedA: false, rapidRepairsUsedB: false,
      vengeanceA: false, vengeanceB: false
    };
    this.#pushLog(state, `Round ${state.round} : ${winner === "a" ? fleetA.name : fleetB.name} prend l'ascendant.`);
    await this.#saveState(state);
    await chat(`<h3>Affrontement entre flottes — round ${state.round}</h3><p><strong>${escapeHtml(fleetA.name)}</strong> : ${totalA} (${signed(modA)})<br><strong>${escapeHtml(fleetB.name)}</strong> : ${totalB} (${signed(modB)})</p><p><strong>${escapeHtml(winner === "a" ? fleetA.name : fleetB.name)}</strong> prend l'ascendant : +1 aux jets d'attaque de ses escadrons pendant cette phase.</p>`, [rollA, rollB]);
    await this.render();
  }

  static async #applyPhaseAdvantages() {
    const state = getBattleState(this.actorA, this.actorB.uuid);
    if (state.phase !== "battle") return;
    const fleetA = getFleetData(this.actorA);
    const fleetB = getFleetData(this.actorB);
    state.selectionsA = selectionValues(this.element, "a");
    state.selectionsB = selectionValues(this.element, "b");

    for (const [side, fleet, actor] of [["a", fleetA, this.actorA], ["b", fleetB, this.actorB]]) {
      const propApplied = sideProp(side, "phaseAdvantagesApplied");
      const selections = state[sideProp(side, "selections")] ?? {};
      if (!state[propApplied]) {
        for (const squadId of selectedIds(selections, "ruthlessAdvance:")) {
          const s = fleet.squadrons.find((x) => x.id === squadId);
          if (s && !isSquadronEliminated(s)) s.morale = Math.min(10, Number(s.morale ?? 0) + 1);
        }
        state[propApplied] = true;
      }
      const recklessProp = sideProp(side, "recklessMap");
      state[recklessProp] ??= {};
      for (const squadId of selectedIds(selections, "recklessManeuver:")) state[recklessProp][squadId] = state.round;
      await setFleetData(actor, fleet);
    }

    this.#pushLog(state, `Round ${state.round} : avantages de phase appliqués.`);
    await this.#saveState(state);
    ui.notifications.info("Avantages de vaisseau amiral appliqués pour cette phase.");
    await this.render();
  }

  static async #attack(event) {
    let state = getBattleState(this.actorA, this.actorB.uuid);
    if (state.phase !== "battle") { ui.notifications.warn("L'attaque d'escadron se fait pendant la phase de bataille."); return; }
    const row = event.target.closest("[data-side][data-squadron-id]");
    const side = row?.dataset.side;
    const squadronId = row?.dataset.squadronId;
    const targetId = row?.querySelector('select[data-role="target"]')?.value;
    if (!side || !squadronId || !targetId) { ui.notifications.warn("Choisis un escadron ennemi comme cible."); return; }

    const ownActor = side === "a" ? this.actorA : this.actorB;
    const enemyActor = side === "a" ? this.actorB : this.actorA;
    const enemySide = side === "a" ? "b" : "a";
    const ownFleet = getFleetData(ownActor);
    const enemyFleet = getFleetData(enemyActor);
    const ownAdvantages = getAdvantageCounts(ownFleet);
    const enemyAdvantages = getAdvantageCounts(enemyFleet);
    const attacker = ownFleet.squadrons.find((s) => s.id === squadronId);
    const target = enemyFleet.squadrons.find((s) => s.id === targetId);
    if (!attacker || !target || isSquadronEliminated(attacker) || isSquadronEliminated(target)) return;

    const actedProp = sideProp(side, "acted");
    if ((state[actedProp] ?? []).includes(squadronId)) { ui.notifications.warn("Cet escadron a déjà attaqué pendant cette phase."); return; }

    const aDerived = deriveSquadron(ownActor, ownFleet, attacker);
    const tDerived = deriveSquadron(enemyActor, enemyFleet, target);
    const attackMod = aDerived.attack + this.#phaseAttackBonus(side, squadronId, state, ownAdvantages);
    const defense = tDerived.defense + this.#phaseDefenseBonus(enemySide, targetId, state);
    const attackRoll = await evalRoll("1d20 + @mod", { mod: attackMod });
    const natural = naturalD20(attackRoll);
    const hit = natural === 20 || (natural !== 1 && attackRoll.total >= defense);
    const crit = natural === 20;
    const fumble = natural === 1;
    let damageRoll = null;
    let damage = 0;

    if (fumble) {
      attacker.morale = Math.max(0, Number(attacker.morale ?? 0) - 1);
      if (attacker.morale <= 0) attacker.mutinied = true;
    } else if (hit) {
      const damageBonus = aDerived.damageBonus + this.#phaseDamageBonus(side, squadronId, state, ownAdvantages);
      damageRoll = await evalRoll("1d6 + @bonus", { bonus: damageBonus });
      damage = Math.max(0, Math.floor(damageRoll.total));
      if (crit) attacker.morale = Math.min(10, Number(attacker.morale ?? 0) + 1);
    } else {
      damageRoll = await evalRoll("1d4 - 1");
      damage = Math.max(0, Math.floor(damageRoll.total));
    }

    const targetSelections = state[sideProp(enemySide, "selections")] ?? {};
    const protectedTarget = selectedIds(targetSelections, "divineProtection:").includes(targetId);
    if (protectedTarget && damage > 0) damage -= 1;

    const ownSelections = state[sideProp(side, "selections")] ?? {};
    const tacticalAssignment = selectedIds(ownSelections, "advancedTactics:").includes(squadronId);
    const aggressive = crit || tacticalAssignment;
    const result = applyFleetDamage(target, damage, { aggressive });

    if (result.sunkNow > 0 && (enemyAdvantages.vengeance ?? 0) > 0 && !state[sideProp(enemySide, "vengeance")]) {
      state[sideProp(enemySide, "vengeance")] = true;
      this.#pushLog(state, `${enemyFleet.name} déclenche Vengeance après la perte de son premier bateau.`);
    }

    state[actedProp] = [...new Set([...(state[actedProp] ?? []), squadronId])];
    // La pénalité de Manœuvre téméraire disparaît quand l'escadron agit lors d'une phase ultérieure.
    const recklessProp = sideProp(side, "recklessMap");
    if (state[recklessProp]?.[squadronId] != null && Number(state[recklessProp][squadronId]) < Number(state.round)) delete state[recklessProp][squadronId];

    const enemyDefeated = getFleetBattleStatus(enemyFleet).defeated;
    if (enemyDefeated) {
      state.phase = "ended";
      state.winner = side;
      this.#pushLog(state, `${ownFleet.name} remporte l'affrontement.`);
    }

    await setFleetData(ownActor, ownFleet);
    await setFleetData(enemyActor, enemyFleet);
    await this.#saveState(state);

    const outcome = fumble ? "ÉCHEC CRITIQUE — aucun dégât" : hit ? (crit ? "COUP CRITIQUE" : "Touché") : "Raté (dégâts résiduels)";
    await chat(`<h3>${escapeHtml(attacker.name)} → ${escapeHtml(target.name)}</h3><p>Jet d'attaque : <strong>${attackRoll.total}</strong> contre VD ${defense} — ${outcome}.</p><p>Dégâts assignés : <strong>${result.applied}</strong>${protectedTarget ? " (Protection divine : −1)" : ""}${aggressive ? " — assignation offensive" : " — assignation défensive"}.</p><p>${result.events.map(escapeHtml).join("<br>") || "Aucun bateau mis hors de combat."}</p>`, [attackRoll, damageRoll]);
    await this.render();
  }

  static async #rapidRepair(event) {
    let state = getBattleState(this.actorA, this.actorB.uuid);
    const box = event.target.closest("[data-side]");
    const side = box?.dataset.side;
    const squadronId = box?.querySelector('select[data-role="repair-target"]')?.value;
    if (!side || !squadronId) return;
    const usedProp = sideProp(side, "rapidRepairsUsed");
    if (state[usedProp]) { ui.notifications.warn("Réparations rapides a déjà été utilisé pendant cette phase."); return; }
    const actor = side === "a" ? this.actorA : this.actorB;
    const fleet = getFleetData(actor);
    if ((getAdvantageCounts(fleet).rapidRepairs ?? 0) <= 0) return;
    const squad = fleet.squadrons.find((s) => s.id === squadronId);
    if (!squad) return;
    const roll = await evalRoll("1d6");
    const result = repairFleetDamage(squad, roll.total);
    state[usedProp] = true;
    this.#pushLog(state, `${fleet.name} répare ${result.repaired} dégâts dans ${squad.name}.`);
    await setFleetData(actor, fleet);
    await this.#saveState(state);
    await chat(`<h3>Réparations rapides — ${escapeHtml(fleet.name)}</h3><p>${escapeHtml(squad.name)} retire <strong>${result.repaired}</strong> dégâts.</p>`, [roll]);
    await this.render();
  }

  static async #routPhase() {
    let state = getBattleState(this.actorA, this.actorB.uuid);
    if (state.phase !== "battle") return;
    state.phase = "rout";
    const rolls = [];
    const lines = [];

    for (const [side, actor] of [["a", this.actorA], ["b", this.actorB]]) {
      const fleet = getFleetData(actor);
      const advantages = getAdvantageCounts(fleet);
      for (const squad of fleet.squadrons) {
        if (isSquadronEliminated(squad)) continue;
        const d = deriveSquadron(actor, fleet, squad);
        const mod = d.moraleMod + this.#phaseMoraleBonus(side, state, advantages);
        const roll = await evalRoll("1d20 + @mod", { mod });
        rolls.push(roll);
        if (roll.total < 10) {
          const lossRoll = await evalRoll("1d4");
          rolls.push(lossRoll);
          squad.morale = Math.max(0, Number(squad.morale ?? 0) - Math.floor(lossRoll.total));
          if (squad.morale <= 0) squad.mutinied = true;
          lines.push(`${squad.name} : ${roll.total} — échec, −${lossRoll.total} moral${squad.mutinied ? " ; MUTINERIE" : ""}.`);
        } else {
          lines.push(`${squad.name} : ${roll.total} — tient bon.`);
        }
      }
      await setFleetData(actor, fleet);
    }

    const fleetA = getFleetData(this.actorA);
    const fleetB = getFleetData(this.actorB);
    if (getFleetBattleStatus(fleetA).defeated || getFleetBattleStatus(fleetB).defeated) {
      state.phase = "ended";
      state.winner = getFleetBattleStatus(fleetB).defeated ? "a" : "b";
    }
    this.#pushLog(state, `Round ${state.round} : phase de déroute résolue.`);
    await this.#saveState(state);
    await chat(`<h3>Phase de déroute — DD 10</h3><p>${lines.map(escapeHtml).join("<br>")}</p>`, rolls);
    await this.render();
  }


  static async #victoryMorale() {
    let state = getBattleState(this.actorA, this.actorB.uuid);
    if (state.phase !== "ended" || !["a", "b"].includes(state.winner) || state.victoryApplied) return;
    const actor = state.winner === "a" ? this.actorA : this.actorB;
    const fleet = getFleetData(actor);
    const rolls = [];
    const lines = [];
    for (const squad of fleet.squadrons) {
      if (isSquadronEliminated(squad)) continue;
      const roll = await evalRoll("1d4");
      rolls.push(roll);
      const sunk = squad.ships.filter((ship) => ship.status === "sunk").length;
      const gain = Math.max(0, Math.floor(roll.total) - sunk);
      squad.morale = Math.min(10, Number(squad.morale ?? 0) + gain);
      lines.push(`${squad.name} : +${gain} moral (1d4=${roll.total}, −${sunk} bateau(x) coulé(s)).`);
    }
    state.victoryApplied = true;
    this.#pushLog(state, `${fleet.name} applique les gains de moral de la victoire.`);
    await setFleetData(actor, fleet);
    await this.#saveState(state);
    await chat(`<h3>Victoire — ${escapeHtml(fleet.name)}</h3><p>${lines.map(escapeHtml).join("<br>")}</p><p>Les dégâts des bateaux encore opérationnels se réparent ensuite à raison de 1 point par heure. Les bateaux hors de combat doivent être remorqués jusqu'au port.</p>`, rolls);
    await this.render();
  }

  static async #flee(event) {
    let state = getBattleState(this.actorA, this.actorB.uuid);
    const side = event.target.closest("[data-side]")?.dataset.side;
    if (!side || !["rout", "battle"].includes(state.phase)) return;
    const fleeingActor = side === "a" ? this.actorA : this.actorB;
    const enemyActor = side === "a" ? this.actorB : this.actorA;
    const fleeingFleet = getFleetData(fleeingActor);
    const enemyFleet = getFleetData(enemyActor);
    const fAdm = getAdmiralData(fleeingFleet);
    const eAdm = getAdmiralData(enemyFleet);
    ui.notifications.warn("Règle de fuite : la flotte ennemie a d'abord droit à une attaque gratuite avec l'escadron de son choix. Le module résout ensuite le test opposé.");
    const fRoll = await evalRoll("1d20 + @mod - 4", { mod: fAdm.profession });
    const eRoll = await evalRoll("1d20 + @mod", { mod: eAdm.profession });
    const escaped = fRoll.total > eRoll.total;
    if (escaped) {
      state.phase = "ended";
      state.winner = "escaped";
      state.escapedSide = side;
      for (const squad of fleeingFleet.squadrons) {
        if (isSquadronEliminated(squad)) continue;
        const loss = await evalRoll("1d8");
        squad.morale = Math.max(0, Number(squad.morale ?? 0) - Math.floor(loss.total));
        if (squad.morale <= 0) squad.mutinied = true;
      }
    } else {
      for (const squad of fleeingFleet.squadrons) {
        if (!isSquadronEliminated(squad)) {
          squad.morale = Math.max(0, Number(squad.morale ?? 0) - 1);
          if (squad.morale <= 0) squad.mutinied = true;
        }
      }
    }
    await setFleetData(fleeingActor, fleeingFleet);
    this.#pushLog(state, escaped ? `${fleeingFleet.name} réussit à fuir.` : `${fleeingFleet.name} échoue à fuir ; chaque escadron perd 1 moral.`);
    await this.#saveState(state);
    await chat(`<h3>Fuite — ${escapeHtml(fleeingFleet.name)}</h3><p>${fRoll.total} contre ${eRoll.total} : <strong>${escaped ? "fuite réussie" : "fuite échouée"}</strong>.</p>${escaped ? "<p>Conformément aux règles de défaite/fuite, les escadrons survivants perdent chacun 1d8 moral.</p>" : "<p>Chaque escadron survivant perd 1 moral et la bataille continue.</p>"}`, [fRoll, eRoll]);
    await this.render();
  }

  static async #resetBattle() {
    const { defaultBattleState } = await import("./fleet-data.mjs");
    await this.actorA.setFlag(MODULE_ID, "fleetBattle", defaultBattleState(this.actorB.uuid));
    await this.render();
  }

  static async #openFleetA() {
    const { FleetController } = await import("./fleet-controller.mjs");
    FleetController.open(this.actorA);
  }

  static async #openFleetB() {
    const { FleetController } = await import("./fleet-controller.mjs");
    FleetController.open(this.actorB);
  }
}
