import { MODULE_ID } from "./ship-data.mjs";

const WATER_REGION_FLAG = "waterRegion";
const UNDERWATER_SCOPE = "world";
const UNDERWATER_KEY = "underwater";
const WATER_MOVEMENT_FLAG = "waterMovement";
const WATER_MOVEMENT_UPDATES = new Set();

function n(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function isPrimaryActiveGM() {
  if (!game.user?.isGM) return false;
  const activeGM = game.users?.activeGM;
  return !activeGM || activeGM.id === game.user.id;
}

function canPersistTokenState(token) {
  const activeGM = game.users?.activeGM;
  if (activeGM) return activeGM.id === game.user.id;
  return Boolean(token?.isOwner);
}

function selectedRegionDocuments() {
  return (canvas?.regions?.controlled ?? [])
    .map((placeable) => placeable?.document)
    .filter(Boolean);
}

export function getWaterRegionData(region) {
  const raw = region?.getFlag?.(MODULE_ID, WATER_REGION_FLAG) ?? {};
  return {
    enabled: Boolean(raw?.enabled),
    surface: n(raw?.surface, 0)
  };
}

export function isWaterRegion(region) {
  return getWaterRegionData(region).enabled;
}

function tokenCenter(token) {
  const scene = token?.parent ?? canvas?.scene;
  const gridSize = n(scene?.grid?.size ?? canvas?.grid?.size ?? canvas?.dimensions?.size, 0);
  const objectCenter = token?.object?.center;
  if (objectCenter && Number.isFinite(objectCenter.x) && Number.isFinite(objectCenter.y)) {
    return { x: objectCenter.x, y: objectCenter.y };
  }
  return {
    x: n(token?.x) + n(token?.width, 1) * gridSize / 2,
    y: n(token?.y) + n(token?.height, 1) * gridSize / 2
  };
}

/**
 * Teste uniquement l'emprise 2D d'une Region.
 * On fournit l'élévation propre de la Region à testPoint afin que le test de
 * géométrie horizontale ne soit pas invalidé par l'altitude courante du token.
 */
function tokenInsideWaterRegion2D(token, region) {
  if (!token || !region || token.parent?.id !== region.parent?.id) return false;
  const center = tokenCenter(token);
  const testElevation = n(region.elevation, 0);
  try {
    return Boolean(region.testPoint({ x: center.x, y: center.y, elevation: testElevation }));
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible de tester la Region d'eau ${region.name}`, error);
    return false;
  }
}

export function getTokenPhysicalHeight(token) {
  const scene = token?.parent ?? canvas?.scene;
  const gridDistance = n(scene?.grid?.distance, 0);
  if (gridDistance <= 0) return 0;

  // PF1AE uses the same convention for 3D token bodies:
  // the vertical body height equals the larger horizontal grid footprint.
  const footprint = Math.max(n(token?.width, 1), n(token?.height, 1));
  return Math.max(0, footprint * gridDistance);
}

export function getTokenSwimElevation(token, region) {
  const data = getWaterRegionData(region);
  const height = getTokenPhysicalHeight(token);
  return data.surface - height / 2;
}

function waterRegionAtToken2D(token) {
  const scene = token?.parent;
  if (!scene) return null;

  const candidates = [...(scene.regions ?? [])]
    .filter(isWaterRegion)
    .filter(region => tokenInsideWaterRegion2D(token, region));

  if (!candidates.length) return null;

  // If overlapping water regions exist, use the highest surface the token
  // physically occupies. This matches the first water surface encountered.
  return candidates.sort((a, b) =>
    getWaterRegionData(b).surface - getWaterRegionData(a).surface
  )[0] ?? null;
}

function isFlyingMovement(token) {
  return String(token?.movementAction ?? "").toLowerCase() === "fly";
}

function validMovementAction(action) {
  if (action == null || action === "") return null;
  const key = String(action);
  return CONFIG?.Token?.movement?.actions?.[key] ? key : null;
}


function normalizeLabel(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function nativeSwimmingStatusId() {
  const statuses = Array.isArray(CONFIG?.statusEffects) ? CONFIG.statusEffects : [];
  const direct = statuses.find((effect) =>
    ["swim", "swimming"].includes(String(effect?.id ?? "").toLowerCase())
  );
  if (direct?.id) return direct.id;

  const byKey = statuses.find((effect) => {
    const name = String(effect?.name ?? effect?.label ?? "");
    return /swim/i.test(name);
  });
  if (byKey?.id) return byKey.id;

  const byLocalizedName = statuses.find((effect) => {
    const raw = effect?.name ?? effect?.label ?? "";
    let localized = raw;
    try { localized = game.i18n?.localize?.(raw) ?? raw; } catch (_) {}
    const label = normalizeLabel(localized);
    return ["nager", "nage", "natation", "swim", "swimming"].includes(label);
  });
  return byLocalizedName?.id ?? null;
}

function actorHasStatus(actor, statusId) {
  if (!actor || !statusId) return false;
  return actor.statuses?.has?.(statusId) === true ||
    [...(actor.effects ?? [])].some((effect) => effect.statuses?.has?.(statusId));
}

async function setNativeSwimmingStatus(token, active, { onlyIfManaged = false } = {}) {
  const actor = token?.actor;
  const statusId = nativeSwimmingStatusId();
  if (!actor || !statusId || typeof actor.toggleStatusEffect !== "function") {
    return { available: false, statusId: null, changed: false, wasActive: false };
  }

  const wasActive = actorHasStatus(actor, statusId);
  if (onlyIfManaged && !active && !wasActive) {
    return { available: true, statusId, changed: false, wasActive };
  }
  if (wasActive === active) {
    return { available: true, statusId, changed: false, wasActive };
  }

  await actor.toggleStatusEffect(statusId, {
    active,
    overlay: false,
    interaction: false
  });
  return { available: true, statusId, changed: true, wasActive };
}

/**
 * Gère la posture de nage d'un Token.
 *
 * - À l'entrée dans une zone d'eau, un token non volant est placé au plus
 *   à la hauteur de nage (moitié de son corps immergée).
 * - S'il est déjà plus profond, son élévation est conservée.
 * - Dans l'eau, une tentative de remonter au-dessus de la hauteur de nage
 *   est limitée à cette hauteur.
 * - Le mode natif Foundry devient "swim".
 * - "fly" désactive totalement ces contraintes.
 * - En quittant l'eau, l'ancien mode de mouvement est restauré si le module
 *   avait lui-même imposé "swim".
 */
export async function syncTokenWaterMovement(token, { force = false } = {}) {
  if (!token || !canPersistTokenState(token)) return null;
  if (WATER_MOVEMENT_UPDATES.has(token.uuid)) return null;

  const region = waterRegionAtToken2D(token);
  const stored = token.getFlag(MODULE_ID, WATER_MOVEMENT_FLAG) ?? {};
  const wasInWater = Boolean(stored.inWater);
  const flying = isFlyingMovement(token);

  if (flying) {
    // Un token en vol traverse librement une zone d'eau sans être happé
    // par la surface et sans basculer en nage.
    if (wasInWater || stored.forcedSwim) {
      WATER_MOVEMENT_UPDATES.add(token.uuid);
      try {
        if (stored.forcedStatus) {
          await setNativeSwimmingStatus(token, false, { onlyIfManaged: true });
        }
        await token.setFlag(MODULE_ID, WATER_MOVEMENT_FLAG, {
          inWater: Boolean(region),
          forcedSwim: false,
          forcedStatus: false,
          previousAction: stored.previousAction ?? null
        });
      } finally {
        WATER_MOVEMENT_UPDATES.delete(token.uuid);
      }
    }
    return {
      inWater: Boolean(region),
      flying: true,
      swimElevation: region ? getTokenSwimElevation(token, region) : null
    };
  }

  if (!region) {
    if (!wasInWater && !stored.forcedSwim) return { inWater: false, flying: false };

    const update = {};
    const currentAction = String(token.movementAction ?? "");
    if (stored.forcedSwim && currentAction === "swim") {
      const previous = validMovementAction(stored.previousAction);
      update.movementAction = previous ?? CONFIG?.Token?.movement?.defaultAction ?? "walk";
    }

    WATER_MOVEMENT_UPDATES.add(token.uuid);
    try {
      if (Object.keys(update).length) await token.update(update);
      if (stored.forcedStatus) {
        await setNativeSwimmingStatus(token, false, { onlyIfManaged: true });
      }
      await token.unsetFlag(MODULE_ID, WATER_MOVEMENT_FLAG);
    } finally {
      WATER_MOVEMENT_UPDATES.delete(token.uuid);
    }
    return { inWater: false, flying: false };
  }

  const swimElevation = getTokenSwimElevation(token, region);
  const currentElevation = n(token.elevation, 0);
  const entering = !wasInWater;
  const update = {};

  // À l'entrée, on ne remonte jamais un token qui est déjà plus profond.
  // Ensuite, toute altitude <= swimElevation reste libre.
  if (currentElevation > swimElevation + 1e-6 ||
      (entering && currentElevation >= swimElevation - 1e-6)) {
    update.elevation = swimElevation;
  }

  const currentAction = String(token.movementAction ?? "");
  const forcedSwim = currentAction !== "swim";
  if (forcedSwim) update.movementAction = "swim";

  const previousAction = entering
    ? (validMovementAction(currentAction) ?? null)
    : (stored.previousAction ?? null);

  const nativeStatusId = nativeSwimmingStatusId();
  const statusAlreadyActive = actorHasStatus(token.actor, nativeStatusId);
  let forcedStatus = Boolean(stored.forcedStatus);
  if (!statusAlreadyActive) {
    const statusResult = await setNativeSwimmingStatus(token, true);
    forcedStatus = Boolean(statusResult.changed);
  }

  const nextStored = {
    inWater: true,
    forcedSwim: Boolean(stored.forcedSwim || forcedSwim),
    forcedStatus,
    previousAction,
    regionId: region.id,
    surface: getWaterRegionData(region).surface,
    swimElevation
  };

  WATER_MOVEMENT_UPDATES.add(token.uuid);
  try {
    if (Object.keys(update).length) await token.update(update);
    await token.setFlag(MODULE_ID, WATER_MOVEMENT_FLAG, nextStored);
  } finally {
    WATER_MOVEMENT_UPDATES.delete(token.uuid);
  }

  return {
    inWater: true,
    flying: false,
    region,
    swimElevation,
    elevation: Object.hasOwn(update, "elevation") ? update.elevation : currentElevation,
    movementAction: update.movementAction ?? currentAction
  };
}

export function getTokenWaterState(token) {
  const scene = token?.parent;
  if (!scene) return { underwater: false, region: null, surface: null, elevation: n(token?.elevation, 0) };

  const elevation = n(token?.elevation, 0);
  const waterRegions = [...(scene.regions ?? [])].filter(isWaterRegion);

  for (const region of waterRegions) {
    const data = getWaterRegionData(region);
    if (!tokenInsideWaterRegion2D(token, region)) continue;

    // Un token dont la base est strictement sous la surface est considéré dans l'eau.
    // À l'altitude exacte de surface il reste hors de l'état underwater, ce qui permet
    // par exemple à un pont situé exactement au niveau de l'eau de ne pas être marqué.
    if (elevation < data.surface) {
      return { underwater: true, region, surface: data.surface, elevation };
    }
  }

  return { underwater: false, region: null, surface: null, elevation };
}

function sceneDistance2D(scene, a, b) {
  const grid = scene?.grid;
  const canvasGrid = globalThis.canvas?.grid;
  try {
    if (scene?.id === canvas?.scene?.id && typeof canvasGrid?.measurePath === "function") {
      const measured = Number(canvasGrid.measurePath([a, b])?.distance);
      if (Number.isFinite(measured) && measured >= 0) return measured;
    }
  } catch (_) {}

  const size = n(grid?.size ?? canvas?.dimensions?.size, 0);
  const distance = n(grid?.distance, 0);
  if (size <= 0 || distance <= 0) return null;
  return Math.hypot(b.x - a.x, b.y - a.y) / size * distance;
}

function pointInsideWaterRegion2D(point, region) {
  if (!region || !point) return false;
  try {
    return Boolean(region.testPoint({
      x: point.x,
      y: point.y,
      elevation: n(region.elevation, 0)
    }));
  } catch (_) {
    return false;
  }
}

/**
 * Mesure la longueur 3D du trajet d'un projectile située dans l'eau.
 * Le segment relie le centre horizontal des deux tokens et interpole
 * linéairement leurs élévations Foundry/Levels.
 *
 * Retourne une distance dans l'unité de grille de la scène.
 */
export function measureProjectileWaterDistance({ source, target, samplesPerGrid = 8 } = {}) {
  const sourceDoc = source?.document ?? source;
  const targetDoc = target?.document ?? target;
  const scene = sourceDoc?.parent;

  if (!sourceDoc || !targetDoc || !scene || targetDoc.parent?.id !== scene.id) {
    return { distance: 0, unit: null, fraction: 0, totalDistance: 0, samples: 0 };
  }

  const a = tokenCenter(sourceDoc);
  const b = tokenCenter(targetDoc);
  const z0 = n(sourceDoc.elevation, 0);
  const z1 = n(targetDoc.elevation, 0);
  const horizontal = sceneDistance2D(scene, a, b);
  if (!Number.isFinite(horizontal)) {
    return { distance: 0, unit: scene.grid?.units ?? null, fraction: 0, totalDistance: 0, samples: 0 };
  }

  const totalDistance = Math.hypot(horizontal, z1 - z0);
  if (totalDistance <= 0) {
    return { distance: 0, unit: scene.grid?.units ?? null, fraction: 0, totalDistance: 0, samples: 0 };
  }

  const waterRegions = [...(scene.regions ?? [])].filter(isWaterRegion);
  if (!waterRegions.length) {
    return { distance: 0, unit: scene.grid?.units ?? null, fraction: 0, totalDistance, samples: 0 };
  }

  const gridSize = n(scene.grid?.size ?? canvas?.dimensions?.size, 100);
  const projectedPixels = Math.hypot(b.x - a.x, b.y - a.y);
  const requested = Math.max(1, Math.ceil((projectedPixels / Math.max(1, gridSize)) * Math.max(1, samplesPerGrid)));
  const samples = Math.min(2048, Math.max(16, requested));

  let underwaterSamples = 0;
  const touchedRegionIds = new Set();

  for (let i = 0; i < samples; i++) {
    const t = (i + 0.5) / samples;
    const point = {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t
    };
    const elevation = z0 + (z1 - z0) * t;

    let submerged = false;
    for (const region of waterRegions) {
      const data = getWaterRegionData(region);
      if (elevation >= data.surface) continue;
      if (!pointInsideWaterRegion2D(point, region)) continue;
      submerged = true;
      touchedRegionIds.add(region.id);
      break;
    }
    if (submerged) underwaterSamples++;
  }

  const fraction = underwaterSamples / samples;
  return {
    distance: totalDistance * fraction,
    unit: scene.grid?.units ?? null,
    fraction,
    totalDistance,
    samples,
    touchedRegionIds: [...touchedRegionIds]
  };
}

export function isTokenUnderwater(token) {
  return Boolean(token?.getFlag?.(UNDERWATER_SCOPE, UNDERWATER_KEY));
}

export async function syncTokenUnderwaterFlag(token, { force = false } = {}) {
  if (!token || !canPersistTokenState(token)) return false;

  const state = getTokenWaterState(token);
  const current = Boolean(token.getFlag(UNDERWATER_SCOPE, UNDERWATER_KEY));
  if (!force && current === state.underwater) return state.underwater;

  await token.setFlag(UNDERWATER_SCOPE, UNDERWATER_KEY, state.underwater);
  return state.underwater;
}

export async function syncSceneUnderwaterFlags(scene = canvas?.scene) {
  if (!scene) return;
  if (game.users?.activeGM && !isPrimaryActiveGM()) return;

  for (const token of scene.tokens ?? []) {
    try {
      await syncTokenWaterMovement(token);
      await syncTokenUnderwaterFlag(token);
    } catch (error) {
      console.warn(`${MODULE_ID} | Impossible de synchroniser underwater pour ${token.name}`, error);
    }
  }
}

export async function configureSelectedWaterRegions() {
  if (!game.user?.isGM) return ui.notifications.warn("Seul le MJ peut définir les niveaux d'eau.");

  const regions = selectedRegionDocuments();
  if (!regions.length) {
    return ui.notifications.warn("Sélectionne au moins une Region Foundry sur la couche Regions.");
  }

  const first = getWaterRegionData(regions[0]);
  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Skull & Shackles — Niveau de l’eau" },
    content: `
      <div class="standard-form">
        <p>La Region sélectionnée sera considérée comme une zone d’eau. Un token situé dans cette zone avec une élévation <strong>strictement inférieure</strong> au niveau de surface recevra <code>flags.world.underwater = true</code>.</p>
        <div class="form-group">
          <label>Niveau de la surface</label>
          <div class="form-fields">
            <input name="surface" type="number" step="0.1" value="${first.surface}">
            <span class="units">${foundry.utils.escapeHTML(canvas?.scene?.grid?.units ?? "")}</span>
          </div>
          <p class="hint">Utilise la même unité et la même référence d’élévation que Levels.</p>
        </div>
      </div>
    `,
    ok: {
      label: "Définir comme zone d’eau",
      icon: "fa-solid fa-water",
      callback: (_event, button) => {
        const value = Number(button.form.elements.surface.value);
        if (!Number.isFinite(value)) throw new Error("Le niveau de l’eau doit être un nombre.");
        return value;
      }
    },
    rejectClose: false,
    modal: true
  });

  if (result === null || result === undefined) return;

  for (const region of regions) {
    await region.setFlag(MODULE_ID, WATER_REGION_FLAG, {
      enabled: true,
      surface: Number(result)
    });
  }

  await syncSceneUnderwaterFlags(canvas?.scene);
  ui.notifications.info(`${regions.length} zone(s) d’eau configurée(s) à l’élévation ${result}.`);
}

export async function clearSelectedWaterRegions() {
  if (!game.user?.isGM) return ui.notifications.warn("Seul le MJ peut modifier les zones d'eau.");

  const regions = selectedRegionDocuments();
  if (!regions.length) {
    return ui.notifications.warn("Sélectionne au moins une Region Foundry sur la couche Regions.");
  }

  for (const region of regions) {
    await region.unsetFlag(MODULE_ID, WATER_REGION_FLAG);
  }

  await syncSceneUnderwaterFlags(canvas?.scene);
  ui.notifications.info(`${regions.length} zone(s) ne sont plus considérée(s) comme de l’eau.`);
}

export function registerWaterRegionHooks() {
  Hooks.on("updateToken", async (token, changes) => {
    const movementChanged = ["x", "y", "elevation", "width", "height", "movementAction"].some((key) =>
      Object.prototype.hasOwnProperty.call(changes ?? {}, key)
    );

    if (!movementChanged || WATER_MOVEMENT_UPDATES.has(token.uuid)) return;

    try {
      await syncTokenWaterMovement(token);
      await syncTokenUnderwaterFlag(token);
    } catch (error) {
      console.warn(`${MODULE_ID} | Erreur de mise à jour de l'état aquatique pour ${token.name}`, error);
    }
  });

  Hooks.on("createToken", async (token) => {
    try {
      await syncTokenWaterMovement(token, { force: true });
      await syncTokenUnderwaterFlag(token, { force: true });
    } catch (error) {
      console.warn(`${MODULE_ID} | Erreur d'initialisation aquatique`, error);
    }
  });

  const resyncScene = async (region) => {
    if (region?.parent?.id !== canvas?.scene?.id) return;
    await syncSceneUnderwaterFlags(region.parent);
  };

  Hooks.on("createRegion", resyncScene);
  Hooks.on("updateRegion", resyncScene);
  Hooks.on("deleteRegion", resyncScene);
  Hooks.on("canvasReady", () => syncSceneUnderwaterFlags(canvas?.scene));
}

export function registerWaterRegionSceneControls(controls) {
  const regionControls = controls?.regions;
  if (!regionControls?.tools) return;

  regionControls.tools.pf1SsWaterLevel = {
    name: "pf1SsWaterLevel",
    title: "Définir le niveau de l’eau",
    icon: "fa-solid fa-water",
    order: Object.keys(regionControls.tools).length,
    button: true,
    visible: Boolean(game.user?.isGM),
    onChange: () => configureSelectedWaterRegions()
  };

  regionControls.tools.pf1SsClearWater = {
    name: "pf1SsClearWater",
    title: "Retirer le niveau de l’eau",
    icon: "fa-solid fa-ban",
    order: Object.keys(regionControls.tools).length + 1,
    button: true,
    visible: Boolean(game.user?.isGM),
    onChange: () => clearSelectedWaterRegions()
  };
}

export const WATER_AUTOMATION = Object.freeze({
  flagScope: UNDERWATER_SCOPE,
  flagKey: UNDERWATER_KEY,
  getState: getTokenWaterState,
  isUnderwater: isTokenUnderwater,
  getTokenPhysicalHeight,
  getSwimElevation: getTokenSwimElevation,
  getNativeSwimmingStatusId: nativeSwimmingStatusId,
  syncMovement: syncTokenWaterMovement,
  measureProjectileWaterDistance,
  syncToken: syncTokenUnderwaterFlag,
  syncScene: syncSceneUnderwaterFlags,
  configureSelectedRegions: configureSelectedWaterRegions,
  clearSelectedRegions: clearSelectedWaterRegions
});
