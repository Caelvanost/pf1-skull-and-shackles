import { MODULE_ID } from "./ship-data.mjs";

const WATER_REGION_FLAG = "waterRegion";
const UNDERWATER_SCOPE = "world";
const UNDERWATER_KEY = "underwater";

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
    const movementChanged = ["x", "y", "elevation", "width", "height"].some((key) =>
      Object.prototype.hasOwnProperty.call(changes ?? {}, key)
    );

    // Ignore nos propres écritures de flags afin d'éviter une boucle.
    if (!movementChanged) return;

    try {
      await syncTokenUnderwaterFlag(token);
    } catch (error) {
      console.warn(`${MODULE_ID} | Erreur de mise à jour underwater pour ${token.name}`, error);
    }
  });

  Hooks.on("createToken", async (token) => {
    try { await syncTokenUnderwaterFlag(token, { force: true }); }
    catch (error) { console.warn(`${MODULE_ID} | Erreur d'initialisation underwater`, error); }
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
  syncToken: syncTokenUnderwaterFlag,
  syncScene: syncSceneUnderwaterFlags,
  configureSelectedRegions: configureSelectedWaterRegions,
  clearSelectedRegions: clearSelectedWaterRegions
});
