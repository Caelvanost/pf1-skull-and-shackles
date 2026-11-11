import { MODULE_ID } from "./ship-data.mjs";
import { getReputationData } from "./reputation-data.mjs";
import { getEntertainmentData, actorByUuid, saveMod, actorCmb, hasImprovisedThrow } from "./entertainment-data.mjs";
import { getSetting, SETTINGS } from "./settings.mjs";
import { emitGameRequest, emitGameRoll, multiplayerActionKey, isMultiplayerPending, beginMultiplayerLocalAction, cancelMultiplayerLocalAction, getMultiplayerConnectionState, requestMultiplayerSync } from "./multiplayer.mjs";
import { DAY_ACTIONS, NIGHT_ACTIONS } from "./life-data.mjs";
import { lifeHudState, playerChooseLifeAction, playerRollLifeTask, playerResolveDayAction, playerResolveNightAction, playerResolveRum } from "./life-multiplayer.mjs";
import { MultiplayerHistory } from "./multiplayer-history.mjs";

const escape = foundry.utils.escapeHTML;
const n = (v, f = 0) => Number.isFinite(Number(v)) ? Number(v) : f;
let viewportListenerReady = false;

function ownedCharacters() {
  return (game.actors?.contents ?? [])
    .filter(a => a.type !== "vehicle" && a.testUserPermission?.(game.user, "OWNER"))
    .sort((a,b) => a.name.localeCompare(b.name, game.i18n.lang));
}

function selectedVehicle() {
  const actor = canvas?.tokens?.controlled?.[0]?.actor ?? null;
  return actor?.type === "vehicle" ? actor : null;
}

export async function getPrimaryShip() {
  const uuid = String(getSetting(SETTINGS.primaryShipUuid, "") ?? "");
  if (uuid) {
    try {
      const doc = await fromUuid(uuid);
      if (doc?.type === "vehicle") return doc;
    } catch {}
  }
  const selected = selectedVehicle();
  if (selected?.getFlag?.(MODULE_ID, "ship")) return selected;
  const sceneShips = (canvas?.scene?.tokens ?? []).map(t => t.actor).filter(a => a?.type === "vehicle" && a.getFlag?.(MODULE_ID, "ship"));
  if (sceneShips.length === 1) return sceneShips[0];
  const worldShips = (game.actors?.contents ?? []).filter(a => a.type === "vehicle" && a.getFlag?.(MODULE_ID, "ship"));
  return worldShips.length === 1 ? worldShips[0] : null;
}

export async function setPrimaryShip(actor) {
  if (!game.user?.isGM) return;
  if (!actor || actor.type !== "vehicle" || !actor.getFlag?.(MODULE_ID, "ship")) return ui.notifications.warn("Sélectionne un Vehicle PF1 déjà configuré par Skull & Shackles.");
  await game.settings.set(MODULE_ID, SETTINGS.primaryShipUuid, actor.uuid);
  await refreshCampaignHud();
  ui.notifications.info(`${actor.name} est maintenant le navire de campagne affiché dans le HUD S&S.`);
}

function gameState(ent) {
  return {
    armOpen: Boolean(ent.arm?.open),
    pigOpen: Boolean(ent.pig?.open),
    drinkOpen: Boolean(ent.drinking?.open),
    drinkRound: n(ent.drinking?.round, 0),
    pigRound: n(ent.pig?.round, 1)
  };
}

function userParticipant(ent, actorUuid, userId) {
  const same = p => p?.actorUuid === actorUuid || (p?.userId && p.userId === userId);
  return {
    arm: [ent.arm?.actorAUuid, ent.arm?.actorBUuid].includes(actorUuid),
    pig: (ent.pig?.participants ?? []).find(same) ?? null,
    drinking: (ent.drinking?.participants ?? []).find(same) ?? null
  };
}

function clampHudPosition(root, x, y) {
  const width = root.offsetWidth || 330;
  const height = root.offsetHeight || 80;
  const maxX = Math.max(0, window.innerWidth - Math.min(width, window.innerWidth));
  const maxY = Math.max(0, window.innerHeight - Math.min(height, window.innerHeight));
  return { x: Math.max(0, Math.min(Number(x) || 0, maxX)), y: Math.max(0, Math.min(Number(y) || 0, maxY)) };
}

function applyHudPosition(root) {
  const dockSmall = getSetting(SETTINGS.hudSmallScreenDock, true) && window.innerWidth <= 760;
  root.classList.toggle("pf1-ss-hud-mobile-dock", dockSmall);
  if (dockSmall) {
    root.style.left = ""; root.style.top = ""; root.style.right = "";
    return;
  }
  const x = Number(getSetting(SETTINGS.hudPositionX, -1));
  const y = Number(getSetting(SETTINGS.hudPositionY, -1));
  if (x >= 0 && y >= 0) {
    const pos = clampHudPosition(root, x, y);
    root.style.left = `${pos.x}px`; root.style.top = `${pos.y}px`; root.style.right = "auto";
  } else {
    root.style.left = ""; root.style.top = ""; root.style.right = "";
  }
}

function ensureViewportListener() {
  if (viewportListenerReady) return;
  viewportListenerReady = true;
  const refresh = () => {
    const root = document.getElementById("pf1-ss-campaign-hud");
    if (root) applyHudPosition(root);
  };
  window.addEventListener("resize", refresh, { passive:true });
  window.visualViewport?.addEventListener?.("resize", refresh, { passive:true });
}

async function resetHudPosition(root) {
  await game.settings.set(MODULE_ID, SETTINGS.hudPositionX, -1);
  await game.settings.set(MODULE_ID, SETTINGS.hudPositionY, -1);
  root.style.left = ""; root.style.top = ""; root.style.right = "";
  await refreshCampaignHud();
}

function enableHudDragging(root) {
  const handle = root.querySelector(".pf1-ss-hud-head");
  if (!handle) return;
  handle.classList.add("pf1-ss-hud-drag-handle");
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button,select,input,a")) return;
    event.preventDefault();
    const rect = root.getBoundingClientRect();
    const dx = event.clientX - rect.left, dy = event.clientY - rect.top;
    root.style.right = "auto";
    handle.setPointerCapture?.(event.pointerId);
    const move = (ev) => {
      const pos = clampHudPosition(root, ev.clientX - dx, ev.clientY - dy);
      root.style.left = `${pos.x}px`; root.style.top = `${pos.y}px`;
    };
    const up = async (ev) => {
      handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); handle.removeEventListener("pointercancel", up);
      const rect2 = root.getBoundingClientRect(); const pos = clampHudPosition(root, rect2.left, rect2.top);
      await game.settings.set(MODULE_ID, SETTINGS.hudPositionX, Math.round(pos.x));
      await game.settings.set(MODULE_ID, SETTINGS.hudPositionY, Math.round(pos.y));
    };
    handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up); handle.addEventListener("pointercancel", up);
  });
}

async function renderHud(ship) {
  ensureViewportListener();
  let root = document.getElementById("pf1-ss-campaign-hud");
  if (!root) {
    root = document.createElement("section");
    root.id = "pf1-ss-campaign-hud";
    document.body.appendChild(root);
  }
  if (!ship) {
    root.innerHTML = game.user?.isGM
      ? `<div class="pf1-ss-hud-shell"><div class="pf1-ss-hud-empty"><i class="fa-solid fa-anchor"></i> Aucun navire S&S lié.<button type="button" data-hud-action="bind-selected">Lier le navire sélectionné</button></div></div>`
      : "";
    applyHudPosition(root);
    bindHudEvents(root, ship);
    enableHudDragging(root);
    return;
  }

  const rep = getReputationData(ship);
  const ent = getEntertainmentData(ship);
  const chars = ownedCharacters();
  const savedActorUuid = String(getSetting(SETTINGS.hudActorUuid, "") ?? "");
  const selectedActorUuid = savedActorUuid && chars.some(a => a.uuid === savedActorUuid)
    ? savedActorUuid
    : (game.user?.character?.uuid && chars.some(a => a.uuid === game.user.character.uuid) ? game.user.character.uuid : chars[0]?.uuid ?? "");
  root.dataset.actorUuid = selectedActorUuid;
  const p = userParticipant(ent, selectedActorUuid, game.user.id);
  const gs = gameState(ent);
  const defaultSectionsCollapsed = getSetting(SETTINGS.hudAutoCollapseSections, true);
  const collapsed = Boolean(getSetting(SETTINGS.hudCollapsed, false));
  const gameCollapsed = Boolean(getSetting(SETTINGS.hudGamesCollapsed, defaultSectionsCollapsed));
  const density = String(getSetting(SETTINGS.hudDensity, "compact"));
  const connection = getMultiplayerConnectionState();
  const connectionLabel = connection.state === "offline" ? "MJ hors ligne" : connection.state === "pending" ? `${connection.pendingCount} en attente` : "Prêt";
  const connectionClass = connection.state === "offline" ? "offline" : connection.state === "pending" ? "waiting" : "ready";

  const charOptions = chars.map(a => `<option value="${escape(a.uuid)}" ${a.uuid === selectedActorUuid ? "selected" : ""}>${escape(a.name)}</option>`).join("");
  let gameHtml = "";
  if (gs.armOpen || gs.pigOpen || gs.drinkOpen) {
    const a = actorByUuid(selectedActorUuid);
    const armSide = ent.arm?.actorAUuid === selectedActorUuid ? "A" : ent.arm?.actorBUuid === selectedActorUuid ? "B" : "";
    const armCanRoll = Boolean(armSide && (ent.arm?.[`lastTotal${armSide}`] === null || ent.arm?.[`lastTotal${armSide}`] === undefined));
    const drink = p.drinking;
    const drinkCanRoll = Boolean(drink?.active && gs.drinkRound > 0 && n(drink.lastRolledRound, 0) < gs.drinkRound);
    const pig = p.pig;
    const pigCanRoll = Boolean(pig && n(pig.lastRolledRound, 0) < gs.pigRound);
    const armRequestKey = multiplayerActionKey("game-request", ship.uuid, selectedActorUuid, "arm");
    const pigRequestKey = multiplayerActionKey("game-request", ship.uuid, selectedActorUuid, "pig");
    const drinkRequestKey = multiplayerActionKey("game-request", ship.uuid, selectedActorUuid, "drinking");
    const armRollKey = multiplayerActionKey("game-roll", ship.uuid, selectedActorUuid, "arm");
    const pigRollKey = multiplayerActionKey("game-roll", ship.uuid, selectedActorUuid, `pig-${gs.pigRound}`);
    const drinkRollKey = multiplayerActionKey("game-roll", ship.uuid, selectedActorUuid, `drinking-${gs.drinkRound}`);
    const armPending = isMultiplayerPending(armRequestKey) || isMultiplayerPending(armRollKey);
    const pigPending = isMultiplayerPending(pigRequestKey) || isMultiplayerPending(pigRollKey);
    const drinkPending = isMultiplayerPending(drinkRequestKey) || isMultiplayerPending(drinkRollKey);
    gameHtml = `<div class="pf1-ss-hud-games ${gameCollapsed ? "collapsed" : ""}">
      <button type="button" class="pf1-ss-hud-games-title" data-hud-action="toggle-games"><i class="fa-solid fa-dice"></i> Jeux ouverts <i class="fa-solid fa-chevron-${gameCollapsed ? "down" : "up"}"></i></button>
      <div class="pf1-ss-hud-games-body">
        ${chars.length ? `<label class="pf1-ss-hud-character"><span>Mon personnage</span><select data-hud-action="select-actor">${charOptions}</select></label>` : `<p class="hint">Aucun personnage dont tu es propriétaire.</p>`}
        ${gs.armOpen ? `<div class="pf1-ss-hud-game"><strong>💪 Bras de fer</strong><span class="pf1-ss-hud-state ${armPending?"waiting":armCanRoll?"ready":p.arm?"done":"ready"}">${armPending?"En attente":armCanRoll?"Prêt":p.arm?"Envoyé":"Ouvert"}</span><button type="button" data-hud-action="${p.arm ? "leave-arm" : "join-arm"}" ${!selectedActorUuid||armPending ? "disabled" : ""}>${armPending?"Envoi…":p.arm ? "Se retirer" : "Participer"}</button>${p.arm ? `<button type="button" data-hud-action="roll-arm" ${armCanRoll&&!armPending?"":"disabled"}>${armPending?"Validation…":armCanRoll?"Lancer ma Force":"Dé déjà lancé"}</button>` : ""}</div>` : ""}
        ${gs.pigOpen ? `<div class="pf1-ss-hud-game"><strong>🐷 Lancer de cochon</strong><span class="pf1-ss-hud-state ${pigPending?"waiting":pigCanRoll?"ready":"done"}">${pigPending?"En attente":pigCanRoll?"Prêt":pig?"Envoyé":"Ouvert"}</span><span class="pf1-ss-hud-detail">Manche ${gs.pigRound}${pig?.lastTotal !== null && pig?.lastTotal !== undefined ? ` — ${pig.lastTotal} m` : ""}</span><button type="button" data-hud-action="${pig ? "leave-pig" : "join-pig"}" ${!selectedActorUuid||pigPending ? "disabled" : ""}>${pigPending?"Envoi…":pig ? "Se retirer" : "Participer"}</button>${pig ? `<button type="button" data-hud-action="roll-pig" ${pigCanRoll&&!pigPending ? "" : "disabled"}>${pigPending?"Validation…":pigCanRoll ? "Lancer mon dé" : "Dé déjà lancé"}</button>` : ""}</div>` : ""}
        ${gs.drinkOpen ? `<div class="pf1-ss-hud-game"><strong>🍺 Haut les cœurs !</strong><span class="pf1-ss-hud-state ${drinkPending?"waiting":drinkCanRoll?"ready":"done"}">${drinkPending?"En attente":drinkCanRoll?"Prêt":drink?"Envoyé":"Ouvert"}</span><span class="pf1-ss-hud-detail">Ronde ${gs.drinkRound}${drink ? ` — ${drink.drinks} rasade(s)` : ""}</span><button type="button" data-hud-action="${drink ? "leave-drink" : "join-drink"}" ${!selectedActorUuid||drinkPending ? "disabled" : ""}>${drinkPending?"Envoi…":drink ? "Se retirer" : "Participer"}</button>${drink ? `<button type="button" data-hud-action="roll-drink" ${drinkCanRoll&&!drinkPending ? "" : "disabled"}>${drinkPending?"Validation…":drinkCanRoll ? "Boire et lancer" : (gs.drinkRound ? "Déjà lancé" : "En attente du MJ")}</button>` : ""}</div>` : ""}
      </div>
    </div>`;
  }

  const lifeState = selectedActorUuid ? lifeHudState(ship, selectedActorUuid) : null;
  let lifeHtml = "";
  if (lifeState) {
    const { life, member, task } = lifeState;
    const lifeCollapsed = Boolean(getSetting(SETTINGS.hudLifeCollapsed, defaultSectionsCollapsed));
    const taskPending=isMultiplayerPending(multiplayerActionKey("life-task",ship.uuid,selectedActorUuid,life.day));
    const dayPending=isMultiplayerPending(multiplayerActionKey("life-day",ship.uuid,selectedActorUuid,life.day));
    const nightPending=isMultiplayerPending(multiplayerActionKey("life-night",ship.uuid,selectedActorUuid,life.day));
    const rumPending=isMultiplayerPending(multiplayerActionKey("life-rum",ship.uuid,selectedActorUuid,life.day));
    const dayOptions = Object.entries(DAY_ACTIONS).map(([v,d])=>`<option value="${v}" ${member.dayAction===v?"selected":""}>${escape(d.label)}</option>`).join("");
    const nightOptions = Object.entries(NIGHT_ACTIONS).map(([v,d])=>`<option value="${v}" ${member.nightAction===v?"selected":""}>${escape(d.label)}</option>`).join("");
    lifeHtml = `<div class="pf1-ss-hud-life ${lifeCollapsed ? "collapsed" : ""}">
      <button type="button" class="pf1-ss-hud-life-title" data-hud-action="toggle-life"><i class="fa-solid fa-broom"></i> Vie à bord — jour ${life.day}<i class="fa-solid fa-chevron-${lifeCollapsed?"down":"up"}"></i></button>
      <div class="pf1-ss-hud-life-body">
        ${chars.length > 1 ? `<label><span>Mon personnage</span><select data-hud-action="select-actor">${charOptions}</select></label>` : ""}
        <div class="pf1-ss-hud-life-task"><strong>${task ? escape(task.name) : "Tâche non attribuée"}</strong><span class="pf1-ss-hud-state ${taskPending?"waiting":lifeState.canRollTask?"ready":"done"}">${taskPending?"En attente":lifeState.canRollTask?"Prêt":"Fait"}</span><span class="pf1-ss-hud-detail">${escape(member.role ?? "")}${member.fatigued ? " — Fatigué" : ""}</span><button type="button" data-hud-action="life-roll-task" ${lifeState.canRollTask&&!taskPending?"":"disabled"}>${taskPending?"Validation…":lifeState.canRollTask?"Lancer ma tâche":"Tâche résolue"}</button></div>
        <label><span>Action diurne</span><select data-life-choice="day">${dayOptions}</select></label>
        <button type="button" data-hud-action="life-resolve-day" ${lifeState.canResolveDay&&!dayPending?"":"disabled"}>${dayPending?"Action diurne en attente…":lifeState.canResolveDay?"Résoudre mon action diurne":"Action diurne faite"}</button>
        <label><span>Action nocturne</span><select data-life-choice="night">${nightOptions}</select></label>
        <button type="button" data-hud-action="life-resolve-night" ${lifeState.canResolveNight&&!nightPending?"":"disabled"}>${nightPending?"Action nocturne en attente…":lifeState.canResolveNight?"Résoudre mon action nocturne":"Action nocturne faite"}</button>
        <div class="pf1-ss-hud-life-rum"><span class="pf1-ss-hud-state ${rumPending?"waiting":lifeState.canResolveRum?"ready":"done"}">Rhum : ${rumPending?"en attente":member.rum?.drankToday?"bu":member.rum?.dumpedToday?"jeté":"prêt"}</span><button type="button" data-hud-action="life-rum-drink" ${lifeState.canResolveRum&&!rumPending?"":"disabled"}>Boire</button><button type="button" data-hud-action="life-rum-dump" ${lifeState.canResolveRum&&!rumPending?"":"disabled"}>Jeter</button></div>
      </div>
    </div>`;
  }

  root.innerHTML = `<div class="pf1-ss-hud-shell density-${escape(density)} ${collapsed ? "collapsed" : ""}">
    <div class="pf1-ss-hud-head">
      <button type="button" class="pf1-ss-hud-anchor" data-hud-action="open-reputation" title="Ouvrir la réputation"><i class="fa-solid fa-skull-crossbones"></i></button>
      <span class="pf1-ss-hud-ship" title="${escape(ship.name)}">${escape(ship.name)}</span>
      ${game.user?.isGM ? `<button type="button" data-hud-action="bind-selected" title="Utiliser le Vehicle sélectionné comme navire de campagne"><i class="fa-solid fa-link"></i></button>` : ""}
      <span class="pf1-ss-hud-connection ${connectionClass}" title="État de synchronisation multijoueur">${connectionLabel}</span>
      ${game.user?.isGM ? `<button type="button" data-hud-action="open-history" title="Historique, annulation et correction multijoueur"><i class="fa-solid fa-clock-rotate-left"></i></button>` : ""}
      <button type="button" data-hud-action="sync-now" title="Resynchroniser l'état multijoueur"><i class="fa-solid fa-arrows-rotate"></i></button>
      <button type="button" data-hud-action="reset-position" title="Réinitialiser la position du HUD"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></button>
      <button type="button" data-hud-action="toggle-hud" title="Réduire"><i class="fa-solid fa-chevron-${collapsed ? "down" : "up"}"></i></button>
    </div>
    <div class="pf1-ss-hud-resources">
      <button type="button" data-hud-action="open-reputation" class="plunder"><span>Butin</span><strong>${n(rep.plunder,0)}</strong></button>
      <button type="button" data-hud-action="open-reputation" class="infamy"><span>Infamie</span><strong>${n(rep.infamy,0)}</strong></button>
      <button type="button" data-hud-action="open-reputation" class="disrepute"><span>Déshonneur</span><strong>${n(rep.disrepute,0)}</strong></button>
    </div>
    ${lifeHtml}
    ${gameHtml}
  </div>`;
  applyHudPosition(root);
  bindHudEvents(root, ship);
  enableHudDragging(root);
}

function bindHudEvents(root, ship) {
  root.querySelectorAll("[data-hud-action]").forEach(el => {
    el.addEventListener("click", async event => {
      const action = event.currentTarget.dataset.hudAction;
      if (action === "toggle-hud") { await game.settings.set(MODULE_ID, SETTINGS.hudCollapsed, !getSetting(SETTINGS.hudCollapsed,false)); return; }
      if (action === "toggle-games") { await game.settings.set(MODULE_ID, SETTINGS.hudGamesCollapsed, !getSetting(SETTINGS.hudGamesCollapsed,true)); return; }
      if (action === "toggle-life") { await game.settings.set(MODULE_ID, SETTINGS.hudLifeCollapsed, !getSetting(SETTINGS.hudLifeCollapsed,true)); return; }
      if (action === "bind-selected") return setPrimaryShip(selectedVehicle());
      if (action === "reset-position") return resetHudPosition(root);
      if (action === "sync-now") return requestMultiplayerSync();
      if (action === "open-history" && ship) return MultiplayerHistory.open(ship);
      if (action === "open-reputation" && ship) {
        if (game.user.isGM || ship.isOwner) game.modules.get(MODULE_ID)?.api?.openReputation?.(ship);
        else ui.notifications.info(`Butin ${getReputationData(ship).plunder} — Infamie ${getReputationData(ship).infamy} — Déshonneur ${getReputationData(ship).disrepute}`);
        return;
      }
      const actorUuid = root.dataset.actorUuid;
      if (!ship || !actorUuid) return;
      if (["join-arm","leave-arm","join-pig","leave-pig","join-drink","leave-drink"].includes(action)) {
        const [verb, gameKey] = action.split("-");
        const normalizedKey=gameKey==="drink"?"drinking":gameKey;
        const pendingKey=multiplayerActionKey("game-request",ship.uuid,actorUuid,normalizedKey);
        return emitGameRequest({ shipUuid: ship.uuid, actorUuid, gameKey:normalizedKey, join: verb === "join" },pendingKey);
      }
      if (action === "roll-arm") return playerRollArm(ship, actorUuid);
      if (action === "roll-pig") return playerRollPig(ship, actorUuid);
      if (action === "roll-drink") return playerRollDrink(ship, actorUuid);
      if (action === "life-roll-task") return playerRollLifeTask(ship, actorUuid);
      if (action === "life-resolve-day") return playerResolveDayAction(ship, actorUuid);
      if (action === "life-resolve-night") return playerResolveNightAction(ship, actorUuid);
      if (action === "life-rum-drink") return playerResolveRum(ship, actorUuid, "drink");
      if (action === "life-rum-dump") return playerResolveRum(ship, actorUuid, "dump");
    });
  });
  root.querySelectorAll('select[data-hud-action="select-actor"]').forEach(el => el.addEventListener("change", async e => { root.dataset.actorUuid = e.currentTarget.value; await game.settings.set(MODULE_ID, SETTINGS.hudActorUuid, e.currentTarget.value); }));
  root.querySelectorAll('select[data-life-choice]').forEach(el => el.addEventListener("change", e => { const actorUuid=root.dataset.actorUuid; if (!ship||!actorUuid) return; playerChooseLifeAction(ship, actorUuid, e.currentTarget.dataset.lifeChoice, e.currentTarget.value); }));
}

function canUseActor(actor) { return actor?.testUserPermission?.(game.user, "OWNER") || game.user?.isGM; }

async function playerRollArm(ship, actorUuid) {
  const actor = actorByUuid(actorUuid); if (!canUseActor(actor)) return ui.notifications.warn("Tu ne contrôles pas ce personnage.");
  const ent = getEntertainmentData(ship); if (!ent.arm.open) return ui.notifications.warn("Le bras de fer n'est plus ouvert.");
  const side = ent.arm.actorAUuid === actorUuid ? "A" : ent.arm.actorBUuid === actorUuid ? "B" : "";
  if (!side) return ui.notifications.warn("Ce personnage n'est pas inscrit au bras de fer.");
  if (ent.arm?.[`lastTotal${side}`] !== null && ent.arm?.[`lastTotal${side}`] !== undefined) return ui.notifications.warn("Tu as déjà lancé pour ce bras de fer. Le MJ doit relancer/réouvrir la partie pour recommencer.");
  const pendingKey=multiplayerActionKey("game-roll",ship.uuid,actorUuid,"arm"); if(!beginMultiplayerLocalAction(pendingKey,"Jet de bras de fer"))return;
  try {
    const mod = n(ent.arm?.[`manual${side}`], 0);
    const totalMod = n(actor.system?.abilities?.str?.mod, 0) + n(mod, 0);
    const roll = await new Roll(`1d20 + ${totalMod}`).evaluate();
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `<div class="pf1-ss-chat-card"><h3>💪 Bras de fer — ${escape(actor.name)}</h3><p>Test de Force : <strong>${roll.total}</strong>.</p></div>` });
    if(!emitGameRoll({ shipUuid: ship.uuid, actorUuid, gameKey: "arm", result: { total: n(roll.total), formula: roll.formula } },pendingKey)) cancelMultiplayerLocalAction(pendingKey);
  } catch(error) { cancelMultiplayerLocalAction(pendingKey); throw error; }
}

async function playerRollPig(ship, actorUuid) {
  const actor = actorByUuid(actorUuid); if (!canUseActor(actor)) return ui.notifications.warn("Tu ne contrôles pas ce personnage.");
  const ent = getEntertainmentData(ship); const p = ent.pig.participants.find(x => x.actorUuid === actorUuid); if (!ent.pig.open || !p) return ui.notifications.warn("Ce personnage n'est pas inscrit.");
  if (n(p.lastRolledRound,0) >= n(ent.pig.round,1)) return ui.notifications.warn("Tu as déjà lancé pour cette manche.");
  const pendingKey=multiplayerActionKey("game-roll",ship.uuid,actorUuid,`pig-${n(ent.pig.round,1)}`); if(!beginMultiplayerLocalAction(pendingKey,"Jet de lancer de cochon"))return;
  try {
    const detected = hasImprovisedThrow(actor), cmb = actorCmb(actor), penalty = (detected || p.improvisedThrowOverride) ? 0 : -4, mod = cmb + penalty + n(p.manualModifier);
    const roll = await new Roll(`1d20 + ${mod}`).evaluate();
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `<div class="pf1-ss-chat-card"><h3>🐷 Lancer de cochon — ${escape(actor.name)}</h3><p>BMO ${cmb >= 0 ? "+" : ""}${cmb}${penalty ? " −4 arme improvisée" : ""} : <strong>${roll.total} m</strong>.</p></div>` });
    if(!emitGameRoll({ shipUuid: ship.uuid, actorUuid, gameKey: "pig", result: { total: n(roll.total), round: n(ent.pig.round,1) } },pendingKey)) cancelMultiplayerLocalAction(pendingKey);
  } catch(error) { cancelMultiplayerLocalAction(pendingKey); throw error; }
}

async function playerRollDrink(ship, actorUuid) {
  const actor = actorByUuid(actorUuid); if (!canUseActor(actor)) return ui.notifications.warn("Tu ne contrôles pas ce personnage.");
  const ent = getEntertainmentData(ship); const p = ent.drinking.participants.find(x => x.actorUuid === actorUuid); if (!ent.drinking.open || !p?.active) return ui.notifications.warn("Ce personnage n'est pas inscrit ou n'est plus debout.");
  const round = n(ent.drinking.round,0); if (!round) return ui.notifications.warn("Le MJ n'a pas encore ouvert la première rasade.");
  if (n(p.lastRolledRound,0) >= round) return ui.notifications.warn("Tu as déjà lancé pour cette ronde.");
  const pendingKey=multiplayerActionKey("game-roll",ship.uuid,actorUuid,`drinking-${round}`); if(!beginMultiplayerLocalAction(pendingKey,"Jet de Haut les cœurs !"))return;
  try {
    const fort = saveMod(actor,"fort"), dc = 15 + 3 * n(p.drinks,0);
    const fortRoll = await new Roll(`1d20 + ${fort}`).evaluate(); const failed = n(fortRoll.total) < dc;
    const addiction = await new Roll(`1d20 + ${fort}`).evaluate();
    const con = await new Roll(`1d3${failed ? " + 1" : ""}`).evaluate();
    const cha = await new Roll("1d4").evaluate(); const hours = await new Roll("1d8").evaluate();
    const body = `<div class="pf1-ss-chat-card"><h3>🍺 Haut les cœurs ! — ${escape(actor.name)}</h3><p>Rasade ${n(p.drinks,0)+1} : Vigueur <strong>${fortRoll.total}</strong> contre DD ${dc} — <strong>${failed ? "échec" : "réussite"}</strong>.</p><p>Ration : <strong>${con.total} dégâts de Con</strong>, +${cha.total} Cha, fatigué ${hours.total} h. Dépendance : ${addiction.total} contre DD 5.</p></div>`;
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: body });
    if(!emitGameRoll({ shipUuid: ship.uuid, actorUuid, gameKey: "drinking", result: { round, fortTotal:n(fortRoll.total), dc, conDamage:n(con.total), addictionTotal:n(addiction.total), cha:n(cha.total), fatigueHours:n(hours.total) } },pendingKey)) cancelMultiplayerLocalAction(pendingKey);
  } catch(error) { cancelMultiplayerLocalAction(pendingKey); throw error; }
}

export async function refreshCampaignHud() {
  if (!getSetting(SETTINGS.showResourceHud, true)) {
    document.getElementById("pf1-ss-campaign-hud")?.remove();
    return;
  }
  const ship = await getPrimaryShip();
  await renderHud(ship);
}

export async function autoBindPrimaryShip() {
  if (!game.user?.isGM) return;
  const current = String(getSetting(SETTINGS.primaryShipUuid, "") ?? "");
  if (current) return;
  const sceneShips = (canvas?.scene?.tokens ?? []).map(t => t.actor).filter(a => a?.type === "vehicle" && a.getFlag?.(MODULE_ID, "ship"));
  const worldShips = (game.actors?.contents ?? []).filter(a => a.type === "vehicle" && a.getFlag?.(MODULE_ID, "ship"));
  const ship = sceneShips.length === 1 ? sceneShips[0] : (worldShips.length === 1 ? worldShips[0] : null);
  if (ship) await game.settings.set(MODULE_ID, SETTINGS.primaryShipUuid, ship.uuid);
}
