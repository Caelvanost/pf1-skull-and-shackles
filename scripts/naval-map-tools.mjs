import {
  MODULE_ID,
  CARDINAL_DIRECTIONS,
  getSSShipData,
  normalizeSSShipData,
  getActorCanvasToken,
  getNavalScaleInfo,
  getSceneWindDirection,
  getDirectionLabel,
  getRelativeNavalGeometry,
  getShipNavalLengthSquares
} from "./ship-data.mjs";
import { getSetting, SETTINGS } from "./settings.mjs";
import { refreshNavalVisualOverlay } from "./naval-visuals.mjs";

const HEADING_ROTATIONS = Object.freeze({ N: 0, E: 90, S: 180, W: 270 });
const WIND_ARROWS = Object.freeze({ N: "↑", E: "→", S: "↓", W: "←" });

export function headingToTokenRotation(heading, offset = 0) {
  const base = HEADING_ROTATIONS[String(heading ?? "N").toUpperCase()] ?? 0;
  return ((base + Number(offset ?? 0)) % 360 + 360) % 360;
}

export async function syncTokenHeading(actor, ssData = getSSShipData(actor), { notify = false } = {}) {
  const token = getActorCanvasToken(actor);
  if (!token?.document) {
    if (notify) ui.notifications.warn("Aucun token de ce navire n'est présent sur la scène active.");
    return false;
  }
  if (!token.document.isOwner && !game.user?.isGM) {
    if (notify) ui.notifications.warn("Tu n'as pas la permission de faire pivoter ce token.");
    return false;
  }
  const rotation = headingToTokenRotation(ssData.navigation?.heading, ssData.map?.rotationOffset ?? 0);
  await token.document.update({ rotation });
  return true;
}

export function getMovementVector(heading, relative = "forward") {
  const forward = CARDINAL_DIRECTIONS[heading] ?? CARDINAL_DIRECTIONS.N;
  const right = { dx: -forward.dy, dy: forward.dx };
  switch (relative) {
    case "forwardPort": return { dx: forward.dx - right.dx, dy: forward.dy - right.dy };
    case "forwardStarboard": return { dx: forward.dx + right.dx, dy: forward.dy + right.dy };
    case "port": return { dx: -right.dx, dy: -right.dy };
    case "starboard": return { dx: right.dx, dy: right.dy };
    case "backward": return { dx: -forward.dx, dy: -forward.dy };
    case "backwardPort": return { dx: -forward.dx - right.dx, dy: -forward.dy - right.dy };
    case "backwardStarboard": return { dx: -forward.dx + right.dx, dy: -forward.dy + right.dy };
    default: return { dx: forward.dx, dy: forward.dy };
  }
}

function clampTokenPosition(tokenDocument, x, y, scene, gridSize) {
  const width = Number(tokenDocument.width ?? 1) * gridSize;
  const height = Number(tokenDocument.height ?? 1) * gridSize;
  const sceneWidth = Number(scene?.width ?? canvas?.dimensions?.sceneWidth ?? canvas?.dimensions?.width ?? 0);
  const sceneHeight = Number(scene?.height ?? canvas?.dimensions?.sceneHeight ?? canvas?.dimensions?.height ?? 0);
  return {
    x: sceneWidth > 0 ? Math.max(0, Math.min(x, Math.max(0, sceneWidth - width))) : x,
    y: sceneHeight > 0 ? Math.max(0, Math.min(y, Math.max(0, sceneHeight - height))) : y
  };
}

/** Déplace le token exactement d'une case navale (9 m / 30 ft) dans une direction relative à sa proue. */
export async function moveTokenOneNavalSquare(actor, relative = "forward", ssData = getSSShipData(actor)) {
  const token = getActorCanvasToken(actor);
  const scene = canvas?.scene;
  const scale = getNavalScaleInfo(scene);
  if (!token?.document || !scene || !scale.valid) {
    throw new Error("Le navire doit avoir un token sur une scène quadrillée dont la distance de grille est définie.");
  }
  if (!token.document.isOwner && !game.user?.isGM) throw new Error("Tu n'as pas la permission de déplacer ce token.");
  if (token.document.locked && !game.user?.isGM) throw new Error("Le token est verrouillé.");

  const vector = getMovementVector(ssData.navigation?.heading ?? "N", relative);
  const x = Number(token.document.x ?? 0) + vector.dx * scale.pixels;
  const y = Number(token.document.y ?? 0) + vector.dy * scale.pixels;
  const bounded = clampTokenPosition(token.document, x, y, scene, scale.size);

  if (Math.abs(bounded.x - x) > 0.5 || Math.abs(bounded.y - y) > 0.5) {
    throw new Error("Ce déplacement ferait sortir le navire des limites de la scène.");
  }

  await token.document.update({ x: bounded.x, y: bounded.y });
  refreshNavalVisualOverlay(actor);
  return { token, scale, relative, x: bounded.x, y: bounded.y };
}

export async function setShipHeading(actor, heading, { syncToken = true } = {}) {
  const direction = String(heading ?? "N").toUpperCase();
  if (!CARDINAL_DIRECTIONS[direction]) throw new Error(`Cap inconnu : ${direction}`);
  const ss = getSSShipData(actor);
  ss.navigation.heading = direction;
  ss.navigation.headToWind = false;
  await actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
  if (syncToken) await syncTokenHeading(actor, ss);
  refreshNavalVisualOverlay(actor);
  return ss;
}

export async function configureNavalSceneScale(scene = canvas?.scene) {
  if (!scene) throw new Error("Aucune scène active.");
  if (!scene.isOwner && !game.user?.isGM) throw new Error("Tu n'as pas la permission de modifier cette scène.");
  const info = getNavalScaleInfo(scene);
  const distance = info.metric ? 9 : 30;
  const units = info.metric ? "m" : "ft";
  await scene.update({ "grid.distance": distance, "grid.units": units });
  refreshNavalVisualOverlay();
  return { distance, units };
}

function tokenCenter(actor) {
  const token = getActorCanvasToken(actor);
  if (!token) return null;
  return token.center ?? {
    x: Number(token.document?.x ?? token.x ?? 0),
    y: Number(token.document?.y ?? token.y ?? 0)
  };
}

export async function beginShearPlan(actor, target) {
  if (!actor || !target) throw new Error("Sélectionne un navire et cible exactement un navire adverse.");
  const ss = getSSShipData(actor);
  const targetSS = getSSShipData(target);
  if (!targetSS.oars?.max || Number(targetSS.oars.max) <= 0) throw new Error("La cible ne possède pas de rames configurées.");
  if (!["muscles", "mixed"].includes(targetSS.navigation?.propulsionMode)) throw new Error("La cible n'utilise pas actuellement ses rames pour se propulser.");

  // La règle exige que L'ATTAQUANT soit adjacent à la proue ou à la poupe de la cible.
  const geometry = getRelativeNavalGeometry(target, actor, targetSS);
  if (!geometry.calculable) throw new Error(geometry.note || "La géométrie des deux navires n'est pas calculable.");
  if (Number(geometry.distanceSquares ?? 99) !== 0 || !["bow", "stern"].includes(geometry.arc)) {
    throw new Error("Le cisaillement doit commencer avec le navire attaquant directement adjacent à la proue ou à la poupe de la cible.");
  }

  const center = tokenCenter(actor);
  const requiredSquares = getShipNavalLengthSquares(target, targetSS);
  ss.map.shearPlan = {
    active: true,
    targetUuid: target.uuid,
    targetName: target.name,
    requiredSquares,
    progress: 0,
    startArc: geometry.arc,
    side: "",
    valid: true,
    complete: false,
    reason: "",
    visitedSegments: [],
    points: center ? [center] : []
  };
  await actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
  refreshNavalVisualOverlay(actor);
  return ss.map.shearPlan;
}

export async function cancelShearPlan(actor, { notify = false } = {}) {
  const ss = getSSShipData(actor);
  ss.map.shearPlan = {
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
  };
  await actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
  refreshNavalVisualOverlay(actor);
  if (notify) ui.notifications.info("Préparation du cisaillement annulée.");
}

/** Met à jour le trajet visuel après chaque case déplacée via le contrôleur naval. */
export async function updateShearPlanAfterMove(actor) {
  let ss = getSSShipData(actor);
  const plan = ss.map?.shearPlan;
  if (!plan?.active) return plan;
  const target = await fromUuid(plan.targetUuid).catch(() => null);
  if (!target || target.type !== "vehicle") {
    plan.valid = false;
    plan.complete = false;
    plan.reason = "La cible du cisaillement n'est plus disponible.";
  } else {
    const targetSS = getSSShipData(target);
    const geometry = getRelativeNavalGeometry(target, actor, targetSS);
    if (!geometry.calculable || Number(geometry.distanceSquares ?? 99) !== 0) {
      plan.valid = false;
      plan.complete = false;
      plan.reason = "Le navire attaquant a quitté les cases directement adjacentes à la cible.";
    } else if (["port", "starboard"].includes(geometry.arc) && plan.valid) {
      if (!plan.side) plan.side = geometry.arc;
      if (plan.side !== geometry.arc) {
        plan.valid = false;
        plan.complete = false;
        plan.reason = "Le trajet a changé de flanc autour de la cible.";
      } else {
        const segment = `${geometry.arc}:${Math.round(Number(geometry.forwardProjection ?? 0) / Number(geometry.scale?.pixels || 1))}`;
        plan.visitedSegments ??= [];
        if (!plan.visitedSegments.includes(segment)) {
          plan.visitedSegments.push(segment);
          plan.progress = Math.min(Number(plan.requiredSquares ?? 0), Number(plan.progress ?? 0) + 1);
        }
        plan.complete = plan.valid && Number(plan.progress ?? 0) >= Number(plan.requiredSquares ?? 0);
        if (plan.complete) plan.reason = "La longueur requise a été longée : le test de cisaillement peut être résolu.";
      }
    }
  }

  const center = tokenCenter(actor);
  plan.points ??= [];
  if (center) plan.points.push(center);
  // Évite de gonfler les flags si un trajet devient très long.
  if (plan.points.length > 32) plan.points = plan.points.slice(-32);
  ss.map.shearPlan = plan;
  await actor.setFlag(MODULE_ID, "ship", normalizeSSShipData(ss));
  refreshNavalVisualOverlay(actor);
  return plan;
}

function sceneHasSSShip(scene = canvas?.scene) {
  if (!scene) return false;
  for (const doc of scene.tokens ?? []) {
    const actor = doc.actor;
    if (actor?.type === "vehicle" && actor.getFlag(MODULE_ID, "ship")) return true;
  }
  return false;
}

export function removeWindOverlay() {
  document.getElementById("pf1-ss-wind-overlay")?.remove();
}

/** Petit indicateur HTML non intrusif : il n'altère ni la scène ni ses dessins. */
export function refreshWindOverlay() {
  removeWindOverlay();
  if (!canvas?.ready || !canvas?.scene) return;
  if (!getSetting(SETTINGS.showWindOverlay, true)) return;
  if (!sceneHasSSShip(canvas.scene)) return;

  const wind = getSceneWindDirection(canvas.scene);
  const scale = getNavalScaleInfo(canvas.scene);
  const el = document.createElement("div");
  el.id = "pf1-ss-wind-overlay";
  el.className = "pf1-ss-wind-overlay";
  el.innerHTML = `
    <div class="pf1-ss-wind-arrow">${WIND_ARROWS[wind] ?? "↑"}</div>
    <div><strong>Vent vers ${foundry.utils.escapeHTML(getDirectionLabel(wind))}</strong><small>1 case navale = ${scale.metric ? "9 m" : "30 ft"}</small></div>`;
  document.body.appendChild(el);
}
