export const MODULE_ID = "pf1-skull-and-shackles";

/** Une case navale de Skull & Shackles vaut 9 m, soit 30 ft dans les données PF1. */
export const NAVAL_SQUARE_FEET = 30;

export const CARDINAL_DIRECTIONS = Object.freeze({
  N: { label: "Nord", short: "N", dx: 0, dy: -1 },
  E: { label: "Est", short: "E", dx: 1, dy: 0 },
  S: { label: "Sud", short: "S", dx: 0, dy: 1 },
  W: { label: "Ouest", short: "O", dx: -1, dy: 0 }
});

const VALID_DIRECTIONS = new Set(Object.keys(CARDINAL_DIRECTIONS));

/**
 * Données Skull & Shackles complémentaires au Vehicle Actor natif de PF1.
 * Les caractéristiques déjà prises en charge par PF1 restent dans actor.system.
 */
export const DEFAULT_SS_SHIP_DATA = Object.freeze({
  profileId: "",
  ramDamage: "",
  sails: {
    value: 0,
    max: 0,
    squares: 0,
    hardness: 0
  },
  speeds: {
    wind: 0,
    muscles: 0,
    current: 0,
    mixed: 0
  },
  crewMinimumOverride: 0,
  oars: {
    value: 0,
    max: 0,
    count: 0,
    hardness: 5
  },
  combat: {
    ramEquipped: false,
    autoApplyRamDamage: true,
    maneuverModifier: 0,
    usesCorvus: false,
    grappledWithUuid: "",
    grappledWithName: "",
    grappleSource: "",
    grappleEstablishedRound: 0
  },
  navigation: {
    dc: 20,
    context: "combat",
    propulsionMode: "wind",
    aid: false,
    manualModifier: 0,
    forcedDc: 0,
    forcedDcSource: "",
    experiencedDriver: false,
    heading: "N",
    windwardManual: false,
    // Conservé pour migration depuis la v0.2 ; la v0.3 calcule Vent debout depuis le cap et le vent.
    headToWind: false
  },
  steering: {
    type: "wheel",
    value: 25,
    max: 25,
    hardness: 5,
    ac: 10,
    broken: false,
    destroyed: false
  },
  damage: {
    formula: "1d6",
    component: "structure",
    type: "physical",
    ignoreHardness: false
  },
  fire: {
    active: false,
    roundsElapsed: 0
  },
  repair: {
    component: "structure",
    modifier: 0,
    casterLevel: 1
  },
  advantage: {
    status: "none",
    lastRound: 0,
    opponentUuid: "",
    opponentName: "",
    ownTotal: 0,
    opponentTotal: 0,
    margin: 0,
    moveSquares: 0,
    rotationDegrees: 0
  },
  map: {
    rotationOffset: 0,
    movementSource: "speed",
    movementRound: 0,
    speedSquaresSpent: 0,
    advantageSquaresSpent: 0,
    advantageRotationSpent: 0,
    reverseUsedRound: 0,
    showZones: true,
    showReachable: true,
    navalLengthOverride: 0,
    shearPlan: {
      active: false,
      targetUuid: "",
      targetName: "",
      requiredSquares: 0,
      progress: 0,
      startArc: "",
      side: "",
      valid: true,
      complete: false,
      reason: "",
      visitedSegments: [],
      points: []
    }
  },
  sinking: {
    active: false,
    roundsRemaining: 10,
    startedRound: 0,
    lastProcessedRound: 0,
    sunk: false
  }
});

/**
 * Profil générique « bateau à voiles » du Guide du joueur Skull & Shackles.
 * PF1 stocke les distances de combat en pieds : 90 ft ≈ 27 m ; 30 ft ≈ 9 m.
 * 108 cases de 1,50 m de côté × 15 pv de bois = 1620 pv.
 */
export const SAILING_SHIP_NATIVE_UPDATE = Object.freeze({
  "system.traits.type": "sea",
  "system.traits.size": "col",
  "system.squares": 108,
  "system.material.base": "wood",
  "system.material.magicallyHardened": false,
  "system.attributes.hp.bonus": 0,
  "system.attributes.hp.offset": 0,
  "system.attributes.hardness.bonus": 0,
  "system.attributes.ac.normal.bonus": 0,
  "system.attributes.ac.touch.bonus": 0,
  "system.attributes.ac.stopped.bonus": 0,
  "system.attributes.savingThrows.save.base": 6,
  "system.crew.value": 20,
  "system.crew.max": 20,
  "system.crew.passengers": 120,
  "system.details.cost": 10000,
  "system.details.currentSpeed": 0,
  "system.details.maxSpeed": 90,
  "system.details.acceleration": 30,
  "system.details.decks": 3,
  "system.details.drivingCheck": "Profession (marin)",
  "system.details.drivingDevice": "Barre",
  "system.details.forwardFacing": "Proue",
  "system.details.propulsion": "Vent ou courants"
});

export const SAILING_SHIP_SS_DATA = Object.freeze({
  profileId: "sailingShip",
  ramDamage: "8d8",
  sails: {
    value: 360,
    max: 360,
    squares: 90,
    hardness: 0
  },
  speeds: {
    wind: 90,
    muscles: 0,
    current: 0,
    mixed: 90
  },
  crewMinimumOverride: 0,
  oars: {
    value: 0,
    max: 0,
    count: 0,
    hardness: 5
  },
  combat: {
    ramEquipped: false,
    autoApplyRamDamage: true,
    maneuverModifier: 0,
    usesCorvus: false,
    grappledWithUuid: "",
    grappledWithName: "",
    grappleSource: "",
    grappleEstablishedRound: 0
  },
  navigation: {
    dc: 20,
    context: "combat",
    propulsionMode: "wind",
    aid: false,
    manualModifier: 0,
    forcedDc: 0,
    forcedDcSource: "",
    experiencedDriver: false,
    heading: "N",
    windwardManual: false,
    headToWind: false
  },
  steering: {
    type: "wheel",
    value: 25,
    max: 25,
    hardness: 5,
    ac: 10,
    broken: false,
    destroyed: false
  },
  damage: {
    formula: "1d6",
    component: "structure",
    type: "physical",
    ignoreHardness: false
  },
  fire: {
    active: false,
    roundsElapsed: 0
  },
  repair: {
    component: "structure",
    modifier: 0,
    casterLevel: 1
  },
  advantage: {
    status: "none",
    lastRound: 0,
    opponentUuid: "",
    opponentName: "",
    ownTotal: 0,
    opponentTotal: 0,
    margin: 0,
    moveSquares: 0,
    rotationDegrees: 0
  },
  map: {
    rotationOffset: 0,
    movementSource: "speed",
    movementRound: 0,
    speedSquaresSpent: 0,
    advantageSquaresSpent: 0,
    advantageRotationSpent: 0,
    reverseUsedRound: 0,
    showZones: true,
    showReachable: true,
    navalLengthOverride: 0,
    shearPlan: {
      active: false,
      targetUuid: "",
      targetName: "",
      requiredSquares: 0,
      progress: 0,
      startArc: "",
      side: "",
      valid: true,
      complete: false,
      reason: "",
      visitedSegments: [],
      points: []
    }
  },
  sinking: {
    active: false,
    roundsRemaining: 10,
    startedRound: 0,
    lastProcessedRound: 0,
    sunk: false
  }
});

export function getSSShipData(actor) {
  const defaults = foundry.utils.deepClone(DEFAULT_SS_SHIP_DATA);
  try {
    defaults.navigation.dc = Number(game.settings.get(MODULE_ID, "navigationCombatDc") ?? defaults.navigation.dc);
    defaults.combat.autoApplyRamDamage = Boolean(game.settings.get(MODULE_ID, "autoApplyRamDamage"));
  } catch {}
  const stored = foundry.utils.deepClone(actor.getFlag(MODULE_ID, "ship") ?? {});
  return foundry.utils.mergeObject(defaults, stored, {
    inplace: false,
    insertKeys: true,
    overwrite: true
  });
}

export function normalizeSSShipData(data) {
  const clean = foundry.utils.mergeObject(
    foundry.utils.deepClone(DEFAULT_SS_SHIP_DATA),
    foundry.utils.deepClone(data ?? {}),
    { inplace: false, insertKeys: true, overwrite: true }
  );

  const asNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  clean.sails.value = Math.max(0, asNumber(clean.sails.value));
  clean.sails.max = Math.max(0, asNumber(clean.sails.max));
  clean.sails.squares = Math.max(0, Math.trunc(asNumber(clean.sails.squares)));
  clean.sails.hardness = Math.max(0, asNumber(clean.sails.hardness));
  clean.speeds ??= {};
  clean.speeds.wind = Math.max(0, asNumber(clean.speeds.wind));
  clean.speeds.muscles = Math.max(0, asNumber(clean.speeds.muscles));
  clean.speeds.current = Math.max(0, asNumber(clean.speeds.current));
  clean.speeds.mixed = Math.max(0, asNumber(clean.speeds.mixed));
  clean.crewMinimumOverride = Math.max(0, Math.trunc(asNumber(clean.crewMinimumOverride)));
  clean.oars.value = Math.max(0, asNumber(clean.oars.value));
  clean.oars.max = Math.max(0, asNumber(clean.oars.max));
  clean.oars.count = Math.max(0, Math.trunc(asNumber(clean.oars.count)));
  clean.oars.hardness = Math.max(0, asNumber(clean.oars.hardness, 5));
  clean.combat.ramEquipped = Boolean(clean.combat.ramEquipped);
  clean.combat.autoApplyRamDamage = Boolean(clean.combat.autoApplyRamDamage);
  clean.combat.maneuverModifier = Math.trunc(asNumber(clean.combat.maneuverModifier));
  clean.combat.usesCorvus = Boolean(clean.combat.usesCorvus);
  clean.combat.grappledWithUuid = String(clean.combat.grappledWithUuid ?? "");
  clean.combat.grappledWithName = String(clean.combat.grappledWithName ?? "");
  clean.combat.grappleSource = String(clean.combat.grappleSource ?? "");
  clean.combat.grappleEstablishedRound = Math.max(0, Math.trunc(asNumber(clean.combat.grappleEstablishedRound)));
  clean.navigation.dc = Math.max(0, Math.trunc(asNumber(clean.navigation.dc, 20)));
  clean.navigation.manualModifier = Math.trunc(asNumber(clean.navigation.manualModifier));
  clean.navigation.forcedDc = Math.max(0, Math.trunc(asNumber(clean.navigation.forcedDc)));
  clean.navigation.forcedDcSource = String(clean.navigation.forcedDcSource ?? "");
  clean.navigation.aid = Boolean(clean.navigation.aid);
  clean.navigation.experiencedDriver = Boolean(clean.navigation.experiencedDriver);
  clean.navigation.windwardManual = Boolean(clean.navigation.windwardManual);
  clean.navigation.headToWind = Boolean(clean.navigation.headToWind);
  clean.navigation.heading = VALID_DIRECTIONS.has(String(clean.navigation.heading ?? "").toUpperCase())
    ? String(clean.navigation.heading).toUpperCase()
    : "N";
  clean.steering.type = ["wheel", "rudder", "oars"].includes(String(clean.steering.type ?? "")) ? String(clean.steering.type) : "wheel";
  clean.steering.value = Math.max(0, asNumber(clean.steering.value, 25));
  clean.steering.max = Math.max(0, asNumber(clean.steering.max, 25));
  clean.steering.hardness = Math.max(0, asNumber(clean.steering.hardness, 5));
  clean.steering.ac = Math.max(0, asNumber(clean.steering.ac, clean.steering.type === "oars" ? 12 : 10));
  clean.steering.broken = Boolean(clean.steering.broken);
  clean.steering.destroyed = Boolean(clean.steering.destroyed);
  clean.damage.formula = String(clean.damage.formula ?? "1d6").trim() || "1d6";
  clean.damage.component = ["structure", "sails", "oars", "steering"].includes(String(clean.damage.component ?? "")) ? String(clean.damage.component) : "structure";
  clean.damage.type = ["physical", "fire", "acid"].includes(String(clean.damage.type ?? "")) ? String(clean.damage.type) : "physical";
  clean.damage.ignoreHardness = Boolean(clean.damage.ignoreHardness);
  clean.fire.active = Boolean(clean.fire.active);
  clean.fire.roundsElapsed = Math.max(0, Math.trunc(asNumber(clean.fire.roundsElapsed)));
  clean.repair.component = ["structure", "sails", "oars", "steering"].includes(String(clean.repair.component ?? "")) ? String(clean.repair.component) : "structure";
  clean.repair.modifier = Math.trunc(asNumber(clean.repair.modifier));
  clean.repair.casterLevel = Math.max(1, Math.trunc(asNumber(clean.repair.casterLevel, 1)));

  clean.advantage.status = ["none", "won", "lost", "tie", "ineligible"].includes(clean.advantage.status)
    ? clean.advantage.status
    : "none";
  clean.advantage.lastRound = Math.max(0, Math.trunc(asNumber(clean.advantage.lastRound)));
  clean.advantage.opponentUuid = String(clean.advantage.opponentUuid ?? "");
  clean.advantage.opponentName = String(clean.advantage.opponentName ?? "");
  clean.advantage.ownTotal = Math.trunc(asNumber(clean.advantage.ownTotal));
  clean.advantage.opponentTotal = Math.trunc(asNumber(clean.advantage.opponentTotal));
  clean.advantage.margin = Math.max(0, Math.trunc(asNumber(clean.advantage.margin)));
  clean.advantage.moveSquares = Math.max(0, Math.trunc(asNumber(clean.advantage.moveSquares)));
  clean.advantage.rotationDegrees = Math.max(0, Math.trunc(asNumber(clean.advantage.rotationDegrees)));
  clean.map ??= {};
  clean.map.rotationOffset = Math.trunc(asNumber(clean.map.rotationOffset));
  clean.map.movementSource = ["speed", "advantage"].includes(String(clean.map.movementSource ?? "")) ? String(clean.map.movementSource) : "speed";
  clean.map.movementRound = Math.max(0, Math.trunc(asNumber(clean.map.movementRound)));
  clean.map.speedSquaresSpent = Math.max(0, Math.trunc(asNumber(clean.map.speedSquaresSpent)));
  clean.map.advantageSquaresSpent = Math.max(0, Math.trunc(asNumber(clean.map.advantageSquaresSpent)));
  clean.map.advantageRotationSpent = Math.max(0, Math.trunc(asNumber(clean.map.advantageRotationSpent)));
  clean.map.reverseUsedRound = Math.max(0, Math.trunc(asNumber(clean.map.reverseUsedRound)));
  clean.map.showZones = Boolean(clean.map.showZones);
  clean.map.showReachable = Boolean(clean.map.showReachable);
  clean.map.navalLengthOverride = Math.max(0, Math.trunc(asNumber(clean.map.navalLengthOverride)));
  clean.map.shearPlan ??= {};
  clean.map.shearPlan.active = Boolean(clean.map.shearPlan.active);
  clean.map.shearPlan.targetUuid = String(clean.map.shearPlan.targetUuid ?? "");
  clean.map.shearPlan.targetName = String(clean.map.shearPlan.targetName ?? "");
  clean.map.shearPlan.requiredSquares = Math.max(0, Math.trunc(asNumber(clean.map.shearPlan.requiredSquares)));
  clean.map.shearPlan.progress = Math.max(0, Math.trunc(asNumber(clean.map.shearPlan.progress)));
  clean.map.shearPlan.startArc = String(clean.map.shearPlan.startArc ?? "");
  clean.map.shearPlan.side = String(clean.map.shearPlan.side ?? "");
  clean.map.shearPlan.valid = clean.map.shearPlan.valid !== false;
  clean.map.shearPlan.complete = Boolean(clean.map.shearPlan.complete);
  clean.map.shearPlan.reason = String(clean.map.shearPlan.reason ?? "");
  clean.map.shearPlan.visitedSegments = Array.isArray(clean.map.shearPlan.visitedSegments)
    ? [...new Set(clean.map.shearPlan.visitedSegments.map((v) => String(v)))]
    : [];
  clean.map.shearPlan.points = Array.isArray(clean.map.shearPlan.points)
    ? clean.map.shearPlan.points.filter((p) => Number.isFinite(Number(p?.x)) && Number.isFinite(Number(p?.y))).map((p) => ({ x: Number(p.x), y: Number(p.y) }))
    : [];
  clean.sinking.active = Boolean(clean.sinking.active);
  clean.sinking.roundsRemaining = Math.max(0, Math.trunc(asNumber(clean.sinking.roundsRemaining, 10)));
  clean.sinking.startedRound = Math.max(0, Math.trunc(asNumber(clean.sinking.startedRound)));
  clean.sinking.lastProcessedRound = Math.max(0, Math.trunc(asNumber(clean.sinking.lastProcessedRound)));
  clean.sinking.sunk = Boolean(clean.sinking.sunk);

  return clean;
}


export function getImprovementNavigationModifier(actor) {
  const installed = actor?.getFlag?.(MODULE_ID, "improvements")?.installed ?? {};
  const has = (id) => Number(installed?.[id]?.quantity ?? 0) > 0;
  let value = 0;
  if (has("armor")) value -= 1;
  if (has("streamlinedHull")) value += 2;
  if (has("extendedKeel")) value += 1;
  if (has("enlargedRudder")) value += 1;
  if (has("quickDeploySails")) value += 1;
  return value;
}

export function getImprovementAdvantageBonus(actor) {
  const installed = actor?.getFlag?.(MODULE_ID, "improvements")?.installed ?? {};
  return Number(installed?.silkSails?.quantity ?? 0) > 0 ? 1 : 0;
}

export function getDirectionLabel(direction) {
  return CARDINAL_DIRECTIONS[direction]?.label ?? direction ?? "—";
}

export function getOppositeDirection(direction) {
  return ({ N: "S", E: "W", S: "N", W: "E" })[direction] ?? "S";
}

export function turnHeading(direction, side) {
  const order = ["N", "E", "S", "W"];
  const index = Math.max(0, order.indexOf(direction));
  const delta = side === "port" ? -1 : 1;
  return order[(index + delta + 4) % 4];
}

/**
 * La direction enregistrée est la direction VERS LAQUELLE souffle le vent.
 * 1 = Nord, 2 = Est, 3 = Sud, 4 = Ouest, comme pour l'orientation des navires.
 */
export function getSceneWindDirection(scene = canvas?.scene) {
  const raw = String(scene?.getFlag(MODULE_ID, "windDirection") ?? "N").toUpperCase();
  return VALID_DIRECTIONS.has(raw) ? raw : "N";
}

export function getWindState(actor, ssData = getSSShipData(actor), scene = canvas?.scene) {
  const heading = ssData.navigation?.heading ?? "N";
  const windDirection = getSceneWindDirection(scene);
  const usesWind = ["wind", "mixed"].includes(ssData.navigation?.propulsionMode);
  const withWind = usesWind && heading === windDirection;
  const headToWind = usesWind && heading === getOppositeDirection(windDirection);

  return {
    heading,
    headingLabel: getDirectionLabel(heading),
    windDirection,
    windDirectionLabel: getDirectionLabel(windDirection),
    usesWind,
    withWind,
    headToWind,
    speedMultiplier: withWind ? 2 : 1
  };
}

/**
 * Détermine quel navire est au vent à partir de la position de leurs tokens sur la scène.
 * Le vent est stocké comme un vecteur de déplacement ; le côté au vent est donc le côté opposé à ce vecteur.
 */
export function getWindwardBonuses(actorA, actorB, {
  ssA = getSSShipData(actorA),
  ssB = getSSShipData(actorB),
  scene = canvas?.scene
} = {}) {
  const direction = getSceneWindDirection(scene);
  const vector = CARDINAL_DIRECTIONS[direction] ?? CARDINAL_DIRECTIONS.N;
  const tokenA = getActorCanvasToken(actorA);
  const tokenB = getActorCanvasToken(actorB);

  let autoA = 0;
  let autoB = 0;
  let automatic = false;
  let note = "";

  if (tokenA && tokenB) {
    automatic = true;
    const centerA = tokenA.center ?? { x: tokenA.x, y: tokenA.y };
    const centerB = tokenB.center ?? { x: tokenB.x, y: tokenB.y };
    const projectionA = centerA.x * vector.dx + centerA.y * vector.dy;
    const projectionB = centerB.x * vector.dx + centerB.y * vector.dy;

    if (Math.abs(projectionA - projectionB) > 1) {
      // Plus la projection est faible, plus le navire est du côté d'où vient le vent.
      if (projectionA < projectionB) autoA = 2;
      else autoB = 2;
    }

    if (autoA) note = `${actorA.name} est au vent de ${actorB.name}.`;
    else if (autoB) note = `${actorB.name} est au vent de ${actorA.name}.`;
    else note = "Les deux navires sont sensiblement à la même hauteur par rapport au vent.";
  } else {
    note = "Position au vent non calculable automatiquement : les deux navires doivent avoir un token sur la scène active.";
  }

  const manualA = ssA.navigation?.windwardManual ? 2 : 0;
  const manualB = ssB.navigation?.windwardManual ? 2 : 0;

  return {
    direction,
    directionLabel: getDirectionLabel(direction),
    automatic,
    actorBonus: Math.max(autoA, manualA),
    targetBonus: Math.max(autoB, manualB),
    actorAutomatic: Boolean(autoA),
    targetAutomatic: Boolean(autoB),
    actorManual: Boolean(manualA),
    targetManual: Boolean(manualB),
    note
  };
}

export function getDriverData(actor) {
  const uuid = actor.system?.driver?.uuid ?? "";
  const skillId = actor.system?.driver?.skill ?? "";
  const driver = uuid ? fromUuidSync(uuid) : null;

  if (!driver) {
    return {
      actor: null,
      uuid: "",
      skillId,
      skillName: "Sagesse",
      modifier: 0,
      usingWisdom: true
    };
  }

  let modifier = Number(driver.system?.abilities?.wis?.mod ?? 0);
  let skillName = "Sagesse";
  let usingWisdom = true;

  if (skillId) {
    try {
      const skill = driver.getSkillInfo(skillId);
      modifier = Number(skill.mod ?? modifier);
      skillName = skill.fullName ?? skill.name ?? skillId;
      usingWisdom = false;
    } catch {
      // La règle autorise explicitement un test de Sagesse si la compétence n'est pas disponible.
    }
  }

  return { actor: driver, uuid, skillId, skillName, modifier, usingWisdom };
}

export function deriveShipState(actor, ssData = getSSShipData(actor)) {
  const hp = actor.system?.attributes?.hp ?? {};
  const hpMax = Number(hp.max ?? 0);
  const hpValue = Number(hp.value ?? hpMax);
  // Un navire est Brisé lorsqu’il a perdu plus de la moitié de ses PV : il faut donc être strictement sous la moitié.
  const hullBroken = hpMax > 0 && hpValue < hpMax / 2;
  const sunk = Boolean(ssData.sinking?.sunk);
  const sinking = !sunk && (Boolean(ssData.sinking?.active) || hpValue <= 0);

  const sailsMax = Number(ssData.sails?.max ?? 0);
  const sailsValue = Number(ssData.sails?.value ?? sailsMax);
  // Les voiles sont brisées dès qu’au moins la moitié de leurs cases/PV sont détruites.
  const sailsBroken = sailsMax > 0 && sailsValue <= sailsMax / 2;
  const sailsDestroyed = sailsMax > 0 && sailsValue <= 0;

  const oarsMax = Number(ssData.oars?.max ?? 0);
  const oarsValue = Number(ssData.oars?.value ?? oarsMax);
  const oarsBroken = oarsMax > 0 && oarsValue <= oarsMax / 2;
  const oarsDestroyed = oarsMax > 0 && oarsValue <= 0;

  const steeringMax = Number(ssData.steering?.max ?? 0);
  const steeringValue = Number(ssData.steering?.value ?? steeringMax);
  const steeringDestroyed = Boolean(ssData.steering?.destroyed) || (steeringMax > 0 && steeringValue <= 0);
  const steeringBroken = steeringDestroyed || Boolean(ssData.steering?.broken) || (steeringMax > 0 && steeringValue <= steeringMax / 2);

  const crewCurrent = Number(actor.system?.crew?.value ?? 0);
  const crewFull = Math.max(1, Number(actor.system?.crew?.max ?? 1));
  const crewMinimum = Number(ssData.crewMinimumOverride ?? 0) > 0
    ? Math.max(1, Number(ssData.crewMinimumOverride))
    : Math.ceil(crewFull / 2);
  const crewIncomplete = crewCurrent < crewFull && crewCurrent >= crewMinimum;
  const crewInsufficient = crewCurrent < crewMinimum;

  const speedCurrent = Number(actor.system?.details?.currentSpeed ?? 0);
  const configuredSpeedMax = Number(actor.system?.details?.maxSpeed ?? 0);
  const mode = ssData.navigation?.propulsionMode;
  const profileSpeeds = ssData.speeds ?? {};
  const speedMax = Math.max(0, Number(profileSpeeds?.[mode] ?? 0)) || configuredSpeedMax;
  const windPropulsionBroken = sailsBroken && ["wind", "mixed"].includes(mode);
  const musclePropulsionBroken = oarsBroken && ["muscles", "mixed"].includes(mode);
  const propulsionBroken = windPropulsionBroken || musclePropulsionBroken;
  const wind = getWindState(actor, ssData);
  const windAdjustedMax = speedMax * wind.speedMultiplier;
  const hazardData = actor.getFlag(MODULE_ID, "hazards") ?? {};
  const hazardActive = hazardData.active ?? {};
  const worldTime = Number(game.time?.worldTime ?? 0);
  const speedHalfUntil = Number(hazardActive.speedHalvedUntil ?? 0);
  const weatherSpeedHalved = Boolean(hazardActive.speedHalved) && (!speedHalfUntil || worldTime < speedHalfUntil);
  const weatherRudderJammed = Boolean(hazardActive.rudderJammed);
  const grounded = Boolean(hazardActive.grounded);
  const majorBreach = Boolean(hazardActive.majorBreach);

  let effectiveMaxSpeed = windAdjustedMax;
  if (mode === "wind" && sailsDestroyed) effectiveMaxSpeed = 0;
  else if (mode === "muscles" && oarsDestroyed) effectiveMaxSpeed = 0;
  else if (mode === "mixed" && sailsDestroyed && oarsDestroyed) effectiveMaxSpeed = 0;
  else if (hullBroken || propulsionBroken) effectiveMaxSpeed = Math.floor(windAdjustedMax / 2);
  if (weatherSpeedHalved) effectiveMaxSpeed = Math.floor(effectiveMaxSpeed / 2);
  if (grounded || sinking || sunk) effectiveMaxSpeed = 0;

  const canTakeAdvantage = !hullBroken && !propulsionBroken && !grounded && !sinking && !sunk;

  return {
    hpValue,
    hpMax,
    hullBroken,
    sinking,
    sunk,
    sinkingRoundsRemaining: Number(ssData.sinking?.roundsRemaining ?? 10),
    sailsValue,
    sailsMax,
    sailsBroken,
    sailsDestroyed,
    oarsValue,
    oarsMax,
    oarsBroken,
    oarsDestroyed,
    steeringValue,
    steeringMax,
    steeringBroken,
    steeringDestroyed,
    crewCurrent,
    crewFull,
    crewMinimum,
    crewIncomplete,
    crewInsufficient,
    speedCurrent,
    speedMax,
    windAdjustedMax,
    effectiveMaxSpeed,
    propulsionBroken,
    canTakeAdvantage,
    wind,
    weatherSpeedHalved,
    weatherRudderJammed,
    grounded,
    majorBreach,
    fireActive: Boolean(ssData.fire?.active),
    fireRoundsElapsed: Number(ssData.fire?.roundsElapsed ?? 0)
  };
}

export function getNavigationBreakdown(actor, ssData = getSSShipData(actor), { extraModifier = 0, ignoreHeadToWind = false } = {}) {
  const driver = getDriverData(actor);
  const state = deriveShipState(actor, ssData);
  const lines = [];
  let adjustment = 0;

  if (state.crewIncomplete) {
    adjustment -= 10;
    lines.push({ label: "Équipage incomplet", value: -10 });
  }

  if (ssData.navigation?.propulsionMode === "mixed") {
    adjustment -= 5;
    lines.push({ label: "Deux propulsions utilisées simultanément", value: -5 });
  }

  if (state.hullBroken) {
    adjustment -= 2;
    lines.push({ label: "Navire brisé", value: -2 });
  }

  if (state.steeringBroken) {
    adjustment -= 10;
    lines.push({ label: "Dispositif de pilotage brisé", value: -10 });
  } else if (state.weatherRudderJammed) {
    adjustment -= 10;
    lines.push({ label: "Gouvernail bloqué par la tempête", value: -10 });
  }

  if (ssData.navigation?.aid) {
    adjustment += 2;
    lines.push({ label: "Aider quelqu’un réussi", value: 2 });
  }

  const improvementModifier = getImprovementNavigationModifier(actor);
  if (improvementModifier) {
    adjustment += improvementModifier;
    lines.push({ label: "Améliorations du navire", value: improvementModifier });
  }

  const manual = Number(ssData.navigation?.manualModifier ?? 0);
  if (manual) {
    adjustment += manual;
    lines.push({ label: "Modificateur circonstanciel", value: manual });
  }

  const extra = Number(extraModifier ?? 0);
  if (extra) {
    adjustment += extra;
    lines.push({ label: extra === 2 ? "Position au vent (ascendant)" : "Modificateur de la manœuvre", value: extra });
  }

  let impossibleReason = "";
  if (!driver.actor) impossibleReason = "Aucun pilote n’est assigné au véhicule.";
  else if (state.sunk) impossibleReason = "Le navire a coulé et est détruit.";
  else if (state.sinking) impossibleReason = "Le navire est en plein naufrage.";
  else if (state.grounded) impossibleReason = "Le navire est échoué : il doit être déséchoué avant de reprendre sa navigation.";
  else if (state.crewInsufficient) impossibleReason = "Moins de la moitié de l’équipage requis est disponible : seule l’action Incontrôlé est possible.";
  else if (state.steeringDestroyed) impossibleReason = "Le dispositif de pilotage est détruit : le navire ne peut pas être piloté.";
  else if (ssData.combat?.grappledWithUuid) impossibleReason = `Le navire est agrippé à ${ssData.combat.grappledWithName || "un autre navire"} : il doit d’abord se libérer.`;
  else if (!ignoreHeadToWind && state.wind.headToWind) {
    impossibleReason = "Le navire est vent debout : il doit accomplir l’action Incontrôlé jusqu’à ce que son cap soit corrigé.";
  }

  return {
    driver,
    state,
    lines,
    adjustment,
    totalModifier: driver.modifier + adjustment,
    impossibleReason
  };
}

export function getNavigationDC(ssData) {
  const forced = Number(ssData.navigation?.forcedDc ?? 0);
  if (forced > 0) return { dc: forced, forced: true, source: ssData.navigation?.forcedDcSource ?? "" };
  const fallback = ssData.navigation?.context === "combat" ? 20 : 5;
  return { dc: Number(ssData.navigation?.dc ?? fallback), forced: false, source: "" };
}

export function getTurnPenalty(actor) {
  const speed = Math.max(0, Number(actor.system?.details?.currentSpeed ?? 0));
  const acceleration = Math.max(0, Number(actor.system?.details?.acceleration ?? 0));
  if (!acceleration || speed < acceleration * 2) return 0;
  if (speed >= acceleration * 4) return -20;
  if (speed >= acceleration * 3) return -10;
  return -5;
}

export function effectiveVehicleCombatValues(actor, state = deriveShipState(actor)) {
  const stopped = Number(actor.system?.details?.currentSpeed ?? 0) <= 0;
  const ac = Number(
    stopped
      ? actor.system?.attributes?.ac?.stopped?.total ?? actor.system?.attributes?.ac?.normal?.total ?? 0
      : actor.system?.attributes?.ac?.normal?.total ?? 0
  );
  const save = Number(actor.system?.attributes?.savingThrows?.save?.total ?? 0);
  const cmb = Number(actor.system?.attributes?.cmb?.total ?? 0);
  const cmd = Number(
    stopped
      ? actor.system?.attributes?.cmd?.stoppedTotal ?? actor.system?.attributes?.cmd?.total ?? 0
      : actor.system?.attributes?.cmd?.total ?? 0
  );
  const brokenPenalty = state.hullBroken ? -2 : 0;

  return {
    ac: ac + brokenPenalty,
    save: save + brokenPenalty,
    cmb: cmb + brokenPenalty,
    cmd: cmd + brokenPenalty,
    stopped
  };
}


/**
 * Décompose le bonus d'une manœuvre offensive navale.
 * Le Vehicle PF1 intègre déjà le bonus du pilote dans son BMO/DMD ; on part donc
 * du BMO préparé par le système, puis on applique seulement les ajustements
 * propres à Skull & Shackles qui ne sont pas natifs (équipage, état Brisé, etc.).
 */
export function getNavalManeuverBreakdown(actor, ssData = getSSShipData(actor), { extraModifier = 0, allowWhileGrappled = false } = {}) {
  const state = deriveShipState(actor, ssData);
  const combat = effectiveVehicleCombatValues(actor, state);
  const lines = [];
  let adjustment = 0;

  // effectiveVehicleCombatValues() applique déjà le -2 de l'état Brisé au BMO.
  if (state.hullBroken) lines.push({ label: "Navire brisé (déjà inclus dans le BMO)", value: -2, included: true });

  if (state.crewIncomplete) {
    adjustment -= 10;
    lines.push({ label: "Équipage incomplet", value: -10 });
  }

  const manual = Number(ssData.combat?.maneuverModifier ?? 0);
  if (manual) {
    adjustment += manual;
    lines.push({ label: "Modificateur de manœuvre", value: manual });
  }

  const extra = Number(extraModifier ?? 0);
  if (extra) {
    adjustment += extra;
    lines.push({ label: "Modificateur spécial", value: extra });
  }

  let impossibleReason = "";
  if (!getDriverData(actor).actor) impossibleReason = "Aucun pilote n’est assigné au véhicule.";
  else if (state.sunk) impossibleReason = "Le navire a coulé et est détruit.";
  else if (state.sinking) impossibleReason = "Le navire est en plein naufrage.";
  else if (state.grounded) impossibleReason = "Le navire est échoué : cette manœuvre est impossible.";
  else if (state.crewInsufficient) impossibleReason = "Moins de la moitié de l’équipage requis est disponible : cette manœuvre est impossible.";
  else if (state.steeringDestroyed) impossibleReason = "Le dispositif de pilotage est détruit : cette manœuvre est impossible.";
  else if (!allowWhileGrappled && ssData.combat?.grappledWithUuid) impossibleReason = `Le navire est déjà agrippé à ${ssData.combat.grappledWithName || "un autre navire"}.`;

  return {
    state,
    combat,
    baseCmb: combat.cmb,
    lines,
    adjustment,
    totalModifier: combat.cmb + adjustment,
    impossibleReason
  };
}

/** Retourne le token de scène actif correspondant à l'Actor, si possible. */
export function getActorCanvasToken(actor) {
  if (!canvas?.ready || !actor) return null;
  const placeables = canvas.tokens?.placeables ?? [];
  return placeables.find((token) => token.actor?.uuid === actor.uuid || token.actor?.id === actor.id) ?? null;
}

/**
 * Décrit l'échelle navale sur la scène active. Une case navale vaut 9 m / 30 ft,
 * indépendamment de l'échelle normale de la grille Foundry.
 */
export function getNavalScaleInfo(scene = canvas?.scene) {
  const grid = scene?.grid ?? canvas?.grid;
  const size = Number(grid?.size ?? canvas?.dimensions?.size ?? 0);
  const gridDistance = Number(grid?.distance ?? 0);
  const rawUnits = String(grid?.units ?? scene?.grid?.units ?? "").trim().toLowerCase();
  let metric = /(^|\b)(m|meter|meters|metre|metres|mètre|mètres)(\b|$)/i.test(rawUnits);
  if (!rawUnits) {
    try { metric = pf1.utils.getDistanceSystem() === "metric"; } catch {}
  }
  const units = rawUnits || (metric ? "m" : "ft");
  const navalDistance = metric ? 9 : NAVAL_SQUARE_FEET;
  const pixels = size > 0 && gridDistance > 0 ? size * (navalDistance / gridDistance) : 0;
  return {
    size,
    gridDistance,
    units: units || (metric ? "m" : "ft"),
    metric,
    navalDistance,
    pixels,
    valid: Boolean(size > 0 && gridDistance > 0 && pixels > 0)
  };
}

const PROFILE_NAVAL_LENGTHS = Object.freeze({
  sailingShip: 3,
  warship: 4,
  boat: 1,
  rowboat: 1,
  longship: 3,
  galley: 4,
  junk: 3,
  keelboat: 2,
  raft: 1
});

/** Nombre de cases navales de longueur. Une valeur manuelle du contrôleur prime sur le profil. */
export function getShipNavalLengthSquares(actor, ssData = getSSShipData(actor)) {
  const override = Math.max(0, Math.trunc(Number(ssData.map?.navalLengthOverride ?? 0)));
  if (override > 0) return override;
  return PROFILE_NAVAL_LENGTHS[String(ssData.profileId ?? "")] ?? 1;
}

/**
 * Secteur relatif de la cible par rapport à la proue du navire : avant, arrière,
 * bâbord ou tribord. Cette géométrie sert d'aide au placement et ne remplace pas
 * l'appréciation du MJ pour les cas où la forme du token ne suit pas exactement la coque.
 */
export function getRelativeNavalGeometry(actorA, actorB, ssA = getSSShipData(actorA)) {
  const tokenA = getActorCanvasToken(actorA);
  const tokenB = getActorCanvasToken(actorB);
  const scale = getNavalScaleInfo();
  if (!tokenA || !tokenB || !scale.valid) {
    return {
      calculable: false,
      arc: "unknown",
      arcLabel: "Indéterminé",
      distanceSquares: null,
      adjacent: null,
      ramPosition: null,
      note: "Géométrie non calculable : place les deux tokens sur la scène active et utilise une grille avec une distance définie."
    };
  }

  const centerA = tokenA.center ?? {
    x: Number(tokenA.document?.x ?? tokenA.x ?? 0) + Number(tokenA.document?.width ?? 1) * scale.size / 2,
    y: Number(tokenA.document?.y ?? tokenA.y ?? 0) + Number(tokenA.document?.height ?? 1) * scale.size / 2
  };
  const centerB = tokenB.center ?? {
    x: Number(tokenB.document?.x ?? tokenB.x ?? 0) + Number(tokenB.document?.width ?? 1) * scale.size / 2,
    y: Number(tokenB.document?.y ?? tokenB.y ?? 0) + Number(tokenB.document?.height ?? 1) * scale.size / 2
  };

  const heading = ssA.navigation?.heading ?? "N";
  const forward = CARDINAL_DIRECTIONS[heading] ?? CARDINAL_DIRECTIONS.N;
  const right = { dx: -forward.dy, dy: forward.dx };
  const delta = { x: centerB.x - centerA.x, y: centerB.y - centerA.y };
  const forwardProjection = delta.x * forward.dx + delta.y * forward.dy;
  const lateralProjection = delta.x * right.dx + delta.y * right.dy;

  let arc = "bow";
  if (Math.abs(forwardProjection) >= Math.abs(lateralProjection)) arc = forwardProjection >= 0 ? "bow" : "stern";
  else arc = lateralProjection >= 0 ? "starboard" : "port";
  const arcLabel = ({ bow: "Avant / proue", stern: "Arrière / poupe", port: "Bâbord", starboard: "Tribord" })[arc];

  const rectFor = (token) => {
    const x = Number(token.document?.x ?? token.x ?? 0);
    const y = Number(token.document?.y ?? token.y ?? 0);
    const w = Number(token.document?.width ?? 1) * scale.size;
    const h = Number(token.document?.height ?? 1) * scale.size;
    return { left: x, right: x + w, top: y, bottom: y + h };
  };
  const a = rectFor(tokenA);
  const b = rectFor(tokenB);
  const gapX = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right));
  const gapY = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom));
  const gapPixels = Math.max(gapX, gapY);
  const distanceSquares = Math.max(0, Math.ceil((gapPixels - 1) / scale.pixels));
  const adjacent = gapPixels <= scale.pixels + 1;
  const ramPosition = adjacent && arc === "bow";

  return {
    calculable: true,
    arc,
    arcLabel,
    heading,
    distanceSquares,
    adjacent,
    ramPosition,
    forwardProjection,
    lateralProjection,
    scale,
    note: `${actorB.name} se trouve dans le secteur ${arcLabel.toLowerCase()} de ${actorA.name}, à environ ${distanceSquares} case${distanceSquares === 1 ? "" : "s"} navale${distanceSquares === 1 ? "" : "s"} entre les bords des tokens.`
  };
}

/**
 * Proximité à l'échelle navale. Contrairement aux versions antérieures, ce calcul
 * tient compte de l'échelle de la scène : une case navale vaut toujours 9 m / 30 ft,
 * même si la grille de scène est réglée sur 1,50 m / 5 ft.
 */
export function getNavalProximity(actorA, actorB) {
  const geo = getRelativeNavalGeometry(actorA, actorB);
  if (!geo.calculable) return { calculable: false, adjacent: null, note: geo.note, distanceSquares: null, arc: "unknown", arcLabel: "Indéterminé", ramPosition: null };
  return {
    calculable: true,
    adjacent: geo.adjacent,
    distanceSquares: geo.distanceSquares,
    arc: geo.arc,
    arcLabel: geo.arcLabel,
    ramPosition: geo.ramPosition,
    note: geo.adjacent
      ? `${geo.note} Les navires sont à portée d'une case navale ou moins.`
      : `${geo.note} Les navires sont séparés de plus d'une case navale.`
  };
}

export function formatDistance(value) {
  const raw = Number(value ?? 0);
  try {
    const [converted] = pf1.utils.convertDistance(raw);
    const metric = pf1.utils.getDistanceSystem() === "metric";
    return `${converted} ${metric ? "m" : "ft"}`;
  } catch {
    return `${raw} ft`;
  }
}

export function formatNavalSquares(value) {
  const raw = Math.max(0, Number(value ?? 0));
  const squares = raw / NAVAL_SQUARE_FEET;
  const rounded = Number.isInteger(squares) ? squares : Math.round(squares * 10) / 10;
  return `${rounded} case${rounded === 1 ? "" : "s"} navale${rounded === 1 ? "" : "s"}`;
}
