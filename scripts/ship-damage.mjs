import {
  MODULE_ID,
  NAVAL_SQUARE_FEET,
  getSSShipData,
  normalizeSSShipData,
  deriveShipState,
  effectiveVehicleCombatValues,
  getDriverData
} from "./ship-data.mjs";

export const SHIP_COMPONENTS = Object.freeze({
  structure: { label: "Structure / coque" },
  sails: { label: "Voiles et gréement", baseAc: 6 },
  oars: { label: "Rames", baseAc: 12 },
  steering: { label: "Dispositif de pilotage", baseAc: 10 }
});

export const DAMAGE_TYPES = Object.freeze({
  physical: { label: "Normal" },
  fire: { label: "Feu" },
  acid: { label: "Acide" }
});

export function getComponentLabel(component) {
  return SHIP_COMPONENTS[component]?.label ?? component ?? "Composant";
}

export function getDamageTypeLabel(type) {
  return DAMAGE_TYPES[type]?.label ?? type ?? "Normal";
}

export function getComponentInfo(actor, component, ss = getSSShipData(actor)) {
  const driverMod = Number(getDriverData(actor).modifier ?? 0);
  if (component === "structure") {
    return {
      component,
      label: getComponentLabel(component),
      value: Number(actor.system?.attributes?.hp?.value ?? actor.system?.attributes?.hp?.max ?? 0),
      max: Number(actor.system?.attributes?.hp?.max ?? 0),
      hardness: Math.max(0, Number(actor.system?.attributes?.hardness?.total ?? 0)),
      ac: Number(actor.system?.attributes?.ac?.normal?.total ?? 0)
    };
  }

  if (component === "sails") {
    return {
      component,
      label: getComponentLabel(component),
      value: Number(ss.sails?.value ?? 0),
      max: Number(ss.sails?.max ?? 0),
      hardness: Math.max(0, Number(ss.sails?.hardness ?? 0)),
      ac: 6 + driverMod
    };
  }

  if (component === "oars") {
    return {
      component,
      label: getComponentLabel(component),
      value: Number(ss.oars?.value ?? 0),
      max: Number(ss.oars?.max ?? 0),
      hardness: Math.max(0, Number(ss.oars?.hardness ?? 5)),
      ac: 12 + driverMod
    };
  }

  return {
    component: "steering",
    label: getComponentLabel("steering"),
    value: Number(ss.steering?.value ?? 0),
    max: Number(ss.steering?.max ?? 0),
    hardness: Math.max(0, Number(ss.steering?.hardness ?? 5)),
    ac: Math.max(0, Number(ss.steering?.ac ?? 10))
  };
}

function currentRound() {
  return Math.max(0, Number(game.combat?.round ?? 0));
}

async function clampSpeedToEffectiveMaximum(actor) {
  const state = deriveShipState(actor, getSSShipData(actor));
  const current = Math.max(0, Number(actor.system?.details?.currentSpeed ?? 0));
  const maximum = Math.max(0, Number(state.effectiveMaxSpeed ?? 0));
  if (current > maximum) await actor.update({ "system.details.currentSpeed": maximum });
  if (state.sinking || state.sunk) await actor.update({ "system.details.currentSpeed": 0 });
}

/**
 * Synchronise l'état de naufrage avec les PV de structure.
 * Un navire passe à 10 rounds lorsqu'il tombe à 0 PV ou moins.
 */
export async function syncSinkingState(actor, { announce = false } = {}) {
  if (!actor || actor.type !== "vehicle") return null;
  const ss = getSSShipData(actor);
  const hp = Number(actor.system?.attributes?.hp?.value ?? actor.system?.attributes?.hp?.max ?? 0);
  let changed = false;
  let started = false;
  let recovered = false;

  if (!ss.sinking.sunk && hp <= 0 && !ss.sinking.active) {
    ss.sinking.active = true;
    ss.sinking.roundsRemaining = 10;
    ss.sinking.startedRound = currentRound();
    ss.sinking.lastProcessedRound = currentRound();
    started = true;
    changed = true;
  } else if (!ss.sinking.sunk && hp > 0 && ss.sinking.active) {
    ss.sinking.active = false;
    ss.sinking.roundsRemaining = 10;
    ss.sinking.startedRound = 0;
    ss.sinking.lastProcessedRound = 0;
    recovered = true;
    changed = true;
  }

  if (changed) await actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
  if (started) await actor.update({ "system.details.currentSpeed": 0 });

  if (announce && (started || recovered)) {
    const esc = foundry.utils.escapeHTML;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: started
        ? `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-water"></i> En plein naufrage — ${esc(actor.name)}</h3><p>Le navire est tombé à 0 PV ou moins. Il ne peut plus se déplacer ni attaquer et sombrera dans <strong>10 rounds</strong> s'il n'est pas ramené au-dessus de 0 PV par magie.</p></div>`
        : `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-hammer"></i> Naufrage interrompu — ${esc(actor.name)}</h3><p>La structure est revenue au-dessus de 0 PV avant que le navire ne sombre.</p></div>`
    });
  }

  return { changed, started, recovered, ss: getSSShipData(actor) };
}

export async function reduceSinkingTimer(actor, amount = 1, { reason = "Dégâts supplémentaires" } = {}) {
  const ss = getSSShipData(actor);
  if (!ss.sinking.active || ss.sinking.sunk) return { changed: false, remaining: ss.sinking.roundsRemaining };

  const before = Math.max(0, Number(ss.sinking.roundsRemaining ?? 10));
  const after = Math.max(0, before - Math.max(0, Math.trunc(Number(amount ?? 1))));
  ss.sinking.roundsRemaining = after;
  if (after <= 0) {
    ss.sinking.active = false;
    ss.sinking.sunk = true;
    ss.fire.active = false;
    ss.fire.roundsElapsed = 0;
  }
  await actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
  if (after <= 0) await actor.update({ "system.details.currentSpeed": 0 });
  if (before !== after) {
    const esc = foundry.utils.escapeHTML;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: after <= 0
        ? `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-skull-crossbones"></i> ${esc(actor.name)} coule</h3><p>${esc(reason)} réduit le compteur de naufrage de ${before} à 0. Le navire sombre complètement et est détruit.</p></div>`
        : `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-water"></i> Naufrage accéléré — ${esc(actor.name)}</h3><p>${esc(reason)} réduit le compteur de ${before} à <strong>${after} round(s)</strong>.</p></div>`
    });
  }
  return { changed: before !== after, before, remaining: after, sunk: after <= 0, reason };
}

/** Applique un jet de dégâts déjà résolu à un composant du navire. */
export async function applyComponentDamage(actor, component, rawDamage, {
  damageType = "physical",
  ignoreHardness = false,
  source = ""
} = {}) {
  const ss = getSSShipData(actor);
  const beforeState = deriveShipState(actor, ss);
  const beforeInfo = getComponentInfo(actor, component, ss);
  const baseRaw = Math.max(0, Math.trunc(Number(rawDamage ?? 0)));
  const sailsVulnerable = component === "sails" && ["fire", "acid"].includes(damageType);
  const multiplier = sailsVulnerable ? 2 : 1;
  const multipliedDamage = baseRaw * multiplier;
  const hardness = ignoreHardness ? 0 : beforeInfo.hardness;
  const effective = Math.max(0, multipliedDamage - hardness);
  const before = beforeInfo.value;
  let after = before;

  if (component === "structure") {
    after = before - effective;
    await actor.update({ "system.attributes.hp.value": after });
  } else {
    after = Math.max(0, before - effective);
    if (component === "sails") ss.sails.value = after;
    else if (component === "oars") ss.oars.value = after;
    else {
      ss.steering.value = after;
      ss.steering.destroyed = ss.steering.max > 0 && after <= 0;
      ss.steering.broken = ss.steering.destroyed || (ss.steering.max > 0 && after <= ss.steering.max / 2);
    }
    await actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
  }

  let sinkingChange = null;
  if (component === "structure") {
    sinkingChange = await syncSinkingState(actor, { announce: true });
    // Un coup supplémentaire de plus de 25 dégâts sur un navire déjà en plein naufrage accélère la fin d'un round.
    if (beforeState.sinking && !beforeState.sunk && effective > 25) {
      sinkingChange = await reduceSinkingTimer(actor, 1, { reason: source || "Coup de plus de 25 dégâts" });
    }
  }

  await clampSpeedToEffectiveMaximum(actor);
  const afterSS = getSSShipData(actor);
  const afterState = deriveShipState(actor, afterSS);

  return {
    component,
    componentLabel: getComponentLabel(component),
    damageType,
    damageTypeLabel: getDamageTypeLabel(damageType),
    rawDamage: baseRaw,
    multiplier,
    multipliedDamage,
    ignoreHardness: Boolean(ignoreHardness),
    hardness: beforeInfo.hardness,
    appliedHardness: hardness,
    effective,
    before,
    after,
    beforeState,
    afterState,
    sinkingChange
  };
}

export async function applyComponentRepair(actor, component, amount, { magical = false } = {}) {
  const ss = getSSShipData(actor);
  const state = deriveShipState(actor, ss);
  const info = getComponentInfo(actor, component, ss);
  const healing = Math.max(0, Math.trunc(Number(amount ?? 0)));

  if (state.sunk) return { applied: false, reason: "Le navire a déjà coulé et est détruit.", before: info.value, after: info.value };
  if (!magical && component === "structure" && state.sinking) {
    return {
      applied: false,
      reason: "Les réparations non-magiques prennent trop de temps pour empêcher un navire déjà en plein naufrage de sombrer.",
      before: info.value,
      after: info.value
    };
  }

  const before = info.value;
  const after = Math.min(info.max, before + healing);
  if (component === "structure") {
    await actor.update({ "system.attributes.hp.value": after });
  } else {
    if (component === "sails") ss.sails.value = after;
    else if (component === "oars") ss.oars.value = after;
    else {
      ss.steering.value = after;
      ss.steering.destroyed = false;
      ss.steering.broken = ss.steering.max > 0 && after <= ss.steering.max / 2;
    }
    await actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
  }

  if (component === "structure" && magical && after > 0) await syncSinkingState(actor, { announce: true });
  return { applied: true, component, componentLabel: getComponentLabel(component), amount: healing, before, after, magical };
}

export async function setShipOnFire(actor, active = true) {
  const ss = getSSShipData(actor);
  if (ss.sinking.sunk) return { changed: false, active: false };
  const wasActive = Boolean(ss.fire.active);
  ss.fire.active = Boolean(active);
  if (!active || !wasActive) ss.fire.roundsElapsed = 0;
  await actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
  return { changed: wasActive !== Boolean(active), active: Boolean(active) };
}

export async function advanceFireRound(actor) {
  const ss = getSSShipData(actor);
  ss.fire.active = true;
  ss.fire.roundsElapsed = Math.max(0, Number(ss.fire.roundsElapsed ?? 0)) + 1;
  await actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
  return ss.fire.roundsElapsed;
}

export async function extinguishFire(actor) {
  const ss = getSSShipData(actor);
  ss.fire.active = false;
  ss.fire.roundsElapsed = 0;
  await actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
}

export async function applyUncontrolledSlowdown(actor) {
  const before = Math.max(0, Number(actor.system?.details?.currentSpeed ?? 0));
  const after = Math.max(0, before - NAVAL_SQUARE_FEET);
  await actor.update({ "system.details.currentSpeed": after });
  return { before, after };
}

export function getShipGenericSave(actor) {
  const ss = getSSShipData(actor);
  const state = deriveShipState(actor, ss);
  return effectiveVehicleCombatValues(actor, state).save;
}

/** Décrémente automatiquement le compteur de naufrage au changement de round. */
export async function processSinkingRound(actor, round) {
  if (!actor || actor.type !== "vehicle") return null;
  await syncSinkingState(actor, { announce: false });
  const ss = getSSShipData(actor);
  if (!ss.sinking.active || ss.sinking.sunk) return null;

  const current = Math.max(0, Math.trunc(Number(round ?? 0)));
  if (current <= 0 || current <= Number(ss.sinking.lastProcessedRound ?? 0)) return null;

  const previousRound = Math.max(0, Number(ss.sinking.lastProcessedRound ?? ss.sinking.startedRound ?? 0));
  const delta = Math.max(1, current - previousRound);
  const before = Math.max(0, Number(ss.sinking.roundsRemaining ?? 10));
  const after = Math.max(0, before - delta);
  ss.sinking.roundsRemaining = after;
  ss.sinking.lastProcessedRound = current;

  let sunk = false;
  if (after <= 0) {
    ss.sinking.active = false;
    ss.sinking.sunk = true;
    ss.fire.active = false;
    ss.fire.roundsElapsed = 0;
    sunk = true;
  }

  await actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
  await actor.update({ "system.details.currentSpeed": 0 });

  const esc = foundry.utils.escapeHTML;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: sunk
      ? `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-skull-crossbones"></i> ${esc(actor.name)} coule</h3><p>Le compteur de naufrage atteint 0. Le navire sombre complètement : il est <strong>détruit et ne peut plus être réparé</strong>.</p></div>`
      : `<div class="pf1-ss-chat-card"><h3><i class="fa-solid fa-water"></i> Naufrage — ${esc(actor.name)}</h3><p>Il reste <strong>${after} round${after === 1 ? "" : "s"}</strong> avant que le navire ne sombre complètement.</p></div>`
  });

  return { before, after, sunk };
}
