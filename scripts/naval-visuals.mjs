import {
  MODULE_ID,
  CARDINAL_DIRECTIONS,
  NAVAL_SQUARE_FEET,
  getSSShipData,
  deriveShipState,
  getActorCanvasToken,
  getNavalScaleInfo
} from "./ship-data.mjs";
import { getSetting, SETTINGS } from "./settings.mjs";

const OVERLAY_NAME = "pf1-ss-naval-visual-overlay";
const COLORS = Object.freeze({
  bow: 0x3b82f6,
  stern: 0x64748b,
  port: 0xf59e0b,
  starboard: 0x22c55e,
  speed: 0xeab308,
  advantage: 0x38bdf8,
  shear: 0xef4444,
  shearOk: 0x22c55e
});

let overlay = null;

function currentRound() {
  return Math.max(0, Number(game.combat?.round ?? 0));
}

function getControlledSSActor() {
  const token = canvas?.tokens?.controlled?.find((t) => t.actor?.type === "vehicle" && t.actor?.getFlag(MODULE_ID, "ship"));
  return token?.actor ?? null;
}

function destroyOverlay() {
  if (!overlay) return;
  try { overlay.parent?.removeChild?.(overlay); } catch {}
  try { overlay.destroy?.({ children: true }); } catch {}
  overlay = null;
}

function graphicsRect(g, x, y, width, height, { fill, fillAlpha = 0.12, stroke = fill, strokeAlpha = 0.85, strokeWidth = 2 } = {}) {
  if (typeof g.rect === "function" && typeof g.fill === "function") {
    g.rect(x, y, width, height).fill({ color: fill, alpha: fillAlpha }).stroke({ color: stroke, alpha: strokeAlpha, width: strokeWidth });
    return;
  }
  g.lineStyle?.(strokeWidth, stroke, strokeAlpha);
  g.beginFill?.(fill, fillAlpha);
  g.drawRect?.(x, y, width, height);
  g.endFill?.();
}

function graphicsCircle(g, x, y, radius, { fill, fillAlpha = 0.2, stroke = fill, strokeAlpha = 0.95, strokeWidth = 2 } = {}) {
  if (typeof g.circle === "function" && typeof g.fill === "function") {
    g.circle(x, y, radius).fill({ color: fill, alpha: fillAlpha }).stroke({ color: stroke, alpha: strokeAlpha, width: strokeWidth });
    return;
  }
  g.lineStyle?.(strokeWidth, stroke, strokeAlpha);
  g.beginFill?.(fill, fillAlpha);
  g.drawCircle?.(x, y, radius);
  g.endFill?.();
}

function graphicsLine(g, points, { color, alpha = 0.95, width = 5 } = {}) {
  if (!Array.isArray(points) || points.length < 2) return;
  if (typeof g.moveTo === "function" && typeof g.stroke === "function") {
    g.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) g.lineTo(p.x, p.y);
    g.stroke({ color, alpha, width });
    return;
  }
  g.lineStyle?.(width, color, alpha);
  g.moveTo?.(points[0].x, points[0].y);
  for (const p of points.slice(1)) g.lineTo?.(p.x, p.y);
}

function rightVector(forward) {
  return { dx: -forward.dy, dy: forward.dx };
}

function tokenRect(token, scale) {
  const x = Number(token.document?.x ?? token.x ?? 0);
  const y = Number(token.document?.y ?? token.y ?? 0);
  const w = Number(token.document?.width ?? 1) * scale.size;
  const h = Number(token.document?.height ?? 1) * scale.size;
  const center = token.center ?? { x: x + w / 2, y: y + h / 2 };
  return { x, y, w, h, center };
}

function normalizeDegrees(value) {
  return ((Number(value ?? 0) % 360) + 360) % 360;
}

/**
 * Angle réel de la coque affichée sur le Canvas.
 *
 * rotationOffset représente le décalage nécessaire pour qu'une texture dont la
 * proue n'est pas orientée vers le haut à 0° soit correctement alignée.
 * La rotation du token peut ensuite être totalement libre.
 */
function getVisualHullRotation(token, ss) {
  const tokenRotation = Number(token?.document?.rotation ?? token?.rotation ?? 0);
  const offset = Number(ss?.map?.rotationOffset ?? 0);
  return normalizeDegrees(tokenRotation - offset);
}

function drawRotatingSectorOverlay(container, token, ss, scale) {
  if (!ss.map?.showZones) return;

  const rect = tokenRect(token, scale);
  const band = Math.max(scale.size * 0.55, Math.min(scale.pixels, Math.max(rect.w, rect.h) * 0.65));
  const gap = Math.max(2, scale.size * 0.04);

  // Le conteneur est centré sur le token : toute sa géométrie est exprimée dans
  // le repère local du navire, puis le conteneur entier est tourné.
  const local = new PIXI.Container();
  local.position.set(rect.center.x, rect.center.y);
  local.rotation = getVisualHullRotation(token, ss) * Math.PI / 180;
  local.eventMode = "none";
  local.interactiveChildren = false;

  const halfW = rect.w / 2;
  const halfH = rect.h / 2;

  const sectors = [
    {
      color: COLORS.bow,
      x: -halfW,
      y: -halfH - band - gap,
      w: rect.w,
      h: band
    },
    {
      color: COLORS.stern,
      x: -halfW,
      y: halfH + gap,
      w: rect.w,
      h: band
    },
    {
      color: COLORS.port,
      x: -halfW - band - gap,
      y: -halfH,
      w: band,
      h: rect.h
    },
    {
      color: COLORS.starboard,
      x: halfW + gap,
      y: -halfH,
      w: band,
      h: rect.h
    }
  ];

  for (const sector of sectors) {
    const g = new PIXI.Graphics();
    graphicsRect(g, sector.x, sector.y, sector.w, sector.h, {
      fill: sector.color,
      fillAlpha: 0.10,
      stroke: sector.color,
      strokeAlpha: 0.82,
      strokeWidth: Math.max(1.5, scale.size * 0.025)
    });
    local.addChild(g);
  }

  container.addChild(local);
}

function speedMovementRemaining(actor, ss) {
  const round = currentRound();
  const state = deriveShipState(actor, ss);
  const budget = Math.max(0, Math.floor(Number(state.speedCurrent ?? 0) / NAVAL_SQUARE_FEET));
  const spent = round > 0 && Number(ss.map?.movementRound ?? 0) === round ? Number(ss.map?.speedSquaresSpent ?? 0) : 0;
  return Math.max(0, budget - spent);
}

function advantageMovementRemaining(ss) {
  const round = currentRound();
  const valid = round > 0 && ss.advantage?.status === "won" && Number(ss.advantage?.lastRound ?? 0) === round;
  if (!valid) return 0;
  const spent = Number(ss.map?.movementRound ?? 0) === round ? Number(ss.map?.advantageSquaresSpent ?? 0) : 0;
  return Math.max(0, Number(ss.advantage?.moveSquares ?? 0) - spent);
}

function drawReachableCell(container, rect, scale, dxSquares, dySquares, color, alpha = 0.075) {
  const cx = rect.center.x + dxSquares * scale.pixels;
  const cy = rect.center.y + dySquares * scale.pixels;
  const cell = scale.pixels * 0.82;
  const g = new PIXI.Graphics();
  graphicsRect(g, cx - cell / 2, cy - cell / 2, cell, cell, {
    fill: color, fillAlpha: alpha, stroke: color, strokeAlpha: 0.52, strokeWidth: 1.5
  });
  container.addChild(g);
}

function drawReachable(container, token, actor, ss, scale) {
  if (!ss.map?.showReachable) return;
  const rect = tokenRect(token, scale);
  const heading = ss.navigation?.heading ?? "N";
  const forward = CARDINAL_DIRECTIONS[heading] ?? CARDINAL_DIRECTIONS.N;
  const right = rightVector(forward);
  const speedRemaining = Math.min(12, speedMovementRemaining(actor, ss));

  // Les cases atteignables restent fondées sur le cap logique PF1 du navire.
  // Seul l'overlay de secteurs suit actuellement la rotation libre du token.
  for (let depth = 1; depth <= speedRemaining; depth++) {
    for (let lateral = -depth; lateral <= depth; lateral++) {
      const dx = forward.dx * depth + right.dx * lateral;
      const dy = forward.dy * depth + right.dy * lateral;
      drawReachableCell(container, rect, scale, dx, dy, COLORS.speed, depth === speedRemaining ? 0.09 : 0.055);
    }
  }

  const advRemaining = Math.min(8, advantageMovementRemaining(ss));
  for (let dx = -advRemaining; dx <= advRemaining; dx++) {
    for (let dy = -advRemaining; dy <= advRemaining; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > advRemaining) continue;
      drawReachableCell(container, rect, scale, dx, dy, COLORS.advantage, 0.045);
    }
  }
}

function drawShearPlan(container, ss, scale) {
  const plan = ss.map?.shearPlan;
  if (!plan?.active || !Array.isArray(plan.points) || !plan.points.length) return;
  const points = plan.points
    .filter((p) => Number.isFinite(Number(p?.x)) && Number.isFinite(Number(p?.y)))
    .map((p) => ({ x: Number(p.x), y: Number(p.y) }));
  if (!points.length) return;
  const color = plan.complete && plan.valid ? COLORS.shearOk : COLORS.shear;
  const g = new PIXI.Graphics();
  graphicsLine(g, points, { color, alpha: 0.9, width: Math.max(3, scale.size * 0.05) });
  for (const p of points) {
    graphicsCircle(g, p.x, p.y, Math.max(4, scale.size * 0.07), {
      fill: color,
      fillAlpha: 0.28,
      stroke: color,
      strokeAlpha: 0.95,
      strokeWidth: 2
    });
  }
  container.addChild(g);
}

export function removeNavalVisualOverlay() {
  destroyOverlay();
}

/**
 * Dessine des aides entièrement client-side sur le groupe d'interface du Canvas.
 * Aucun Drawing ou Template n'est créé dans la scène.
 */
export function refreshNavalVisualOverlay(actor = null) {
  destroyOverlay();
  if (!canvas?.ready || !canvas?.scene || !canvas?.interface) return;
  if (!getSetting(SETTINGS.showNavalVisuals, true)) return;

  actor ??= getControlledSSActor();
  if (!actor || actor.type !== "vehicle" || !actor.getFlag(MODULE_ID, "ship")) return;
  const token = getActorCanvasToken(actor);
  const scale = getNavalScaleInfo();
  if (!token || !scale.valid) return;

  const ss = getSSShipData(actor);
  if (!ss.map?.showZones && !ss.map?.showReachable && !ss.map?.shearPlan?.active) return;

  const container = new PIXI.Container();
  container.name = OVERLAY_NAME;
  container.eventMode = "none";
  container.interactiveChildren = false;
  container.zIndex = 9999;
  try { canvas.interface.sortableChildren = true; } catch {}
  canvas.interface.addChild(container);
  overlay = container;

  drawRotatingSectorOverlay(container, token, ss, scale);
  drawReachable(container, token, actor, ss, scale);
  drawShearPlan(container, ss, scale);
}
