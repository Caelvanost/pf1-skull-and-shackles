import { MODULE_ID } from "./ship-data.mjs";
import { getEntertainmentData, setEntertainmentData, createPigParticipant, createDrinkParticipant, actorByUuid, abilityMod } from "./entertainment-data.mjs";
import { DAY_ACTIONS, NIGHT_ACTIONS, getLifeData, setLifeData } from "./life-data.mjs";
import { appendMultiplayerAudit } from "./multiplayer-state.mjs";
import { getSetting, SETTINGS } from "./settings.mjs";

const CHANNEL = `module.${MODULE_ID}`;
const n = (v,f=0) => Number.isFinite(Number(v)) ? Number(v) : f;
const escape = foundry.utils.escapeHTML;
const pendingRequests = new Map();
const processedRequestIds = new Map();
const processingKeys = new Set();
let recoveryHooksInstalled = false;
let lastSyncAt = 0;
let lastAckAt = 0;

const requestId = () => {
  try { return foundry.utils.randomID(); }
  catch { return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
};

function primaryGM() {
  return game.users?.activeGM ?? game.users?.find(u => u.active && u.isGM) ?? null;
}
function isHandlingGM() { const gm = primaryGM(); return Boolean(game.user?.isGM && (!gm || gm.id === game.user.id)); }
function userOwnsActor(user, actor) { return Boolean(user?.isGM || actor?.testUserPermission?.(user, "OWNER")); }
function configuredShip(ship) { return Boolean(ship?.type === "vehicle" && ship?.getFlag?.(MODULE_ID, "ship")); }
function clone(value) { return foundry.utils.deepClone(value ?? {}); }

export function multiplayerActionKey(kind, shipUuid, actorUuid, suffix = "") {
  return [String(kind||"action"), String(shipUuid||""), String(actorUuid||""), String(suffix||"")].join(":");
}
export function isMultiplayerPending(key) { return Boolean(key && pendingRequests.has(key)); }
export function beginMultiplayerLocalAction(key, label = "Action en cours") {
  if (!key || pendingRequests.has(key)) return false;
  const localId = `local-${requestId()}`;
  const timeout = setTimeout(() => {
    const row = pendingRequests.get(key);
    if (row?.requestId === localId) { pendingRequests.delete(key); refreshHudSoon(); }
  }, 15000);
  pendingRequests.set(key, { requestId:localId, type:"local", label, startedAt:Date.now(), timeout, local:true });
  refreshHudSoon();
  return true;
}
export function cancelMultiplayerLocalAction(key) {
  const row = pendingRequests.get(key);
  if (!row?.local) return;
  clearTimeout(row.timeout); pendingRequests.delete(key); refreshHudSoon();
}
export function getMultiplayerConnectionState() {
  const gm = primaryGM();
  return {
    hasGM: Boolean(gm),
    gmName: gm?.name ?? "",
    pendingCount: pendingRequests.size,
    lastAckAt,
    lastSyncAt,
    state: !gm ? "offline" : pendingRequests.size ? "pending" : "ready"
  };
}

function refreshHudSoon() {
  queueMicrotask(async () => {
    try { const { refreshCampaignHud } = await import("./campaign-hud.mjs"); await refreshCampaignHud(); }
    catch { /* HUD absent */ }
  });
}

function quietToast(message, level = "info") {
  if (!message) return;
  if (!getSetting(SETTINGS.multiplayerQuietNotifications, true)) {
    const fn = level === "error" ? ui.notifications.error : level === "warn" ? ui.notifications.warn : ui.notifications.info;
    fn.call(ui.notifications, message);
    return;
  }
  let root = document.getElementById("pf1-ss-mp-toasts");
  if (!root) {
    root = document.createElement("div"); root.id = "pf1-ss-mp-toasts"; document.body.appendChild(root);
  }
  const toast = document.createElement("div");
  toast.className = `pf1-ss-mp-toast ${level}`;
  toast.textContent = message;
  root.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("visible"));
  setTimeout(() => { toast.classList.remove("visible"); setTimeout(() => toast.remove(), 220); }, 2400);
}

function rememberProcessed(id) {
  if (!id) return;
  processedRequestIds.set(id, Date.now());
  if (processedRequestIds.size > 500) {
    const entries = [...processedRequestIds.entries()].sort((a,b)=>a[1]-b[1]);
    for (const [key] of entries.slice(0, entries.length - 400)) processedRequestIds.delete(key);
  }
}

function trackedEmit(type, payload = {}, pendingKey = "", label = "Action envoyée") {
  const id = requestId();
  if (pendingKey && pendingRequests.has(pendingKey)) {
    const existing = pendingRequests.get(pendingKey);
    if (existing?.local) { clearTimeout(existing.timeout); pendingRequests.delete(pendingKey); }
    else {
      quietToast("Cette action est déjà en attente de validation.", "warn");
      return null;
    }
  }
  const timeout = setTimeout(() => {
    const row = pendingRequests.get(pendingKey);
    if (!row || row.requestId !== id) return;
    pendingRequests.delete(pendingKey);
    quietToast("Réponse du MJ retardée : synchronisation relancée.", "warn");
    requestMultiplayerSync();
    refreshHudSoon();
  }, 12000);
  if (pendingKey) pendingRequests.set(pendingKey, { requestId:id, type, label, startedAt:Date.now(), timeout });
  game.socket.emit(CHANNEL, { type, requestId:id, userId:game.user.id, ...payload });
  refreshHudSoon();
  return id;
}

export function emitGameRequest(payload, pendingKey = "") {
  return trackedEmit("gameRequest", payload, pendingKey, "Inscription mise à jour");
}
export function emitGameRoll(payload, pendingKey = "") {
  return trackedEmit("gameRoll", payload, pendingKey, "Jet envoyé");
}
export function emitLifeUpdate(payload, pendingKey = "") {
  return trackedEmit("lifeUpdate", payload, pendingKey, "Action de bord envoyée");
}
export function broadcastHudRefresh() { game.socket.emit(CHANNEL, { type:"refreshHud", userId:game.user.id, at:Date.now() }); }
export function requestMultiplayerSync() {
  const id = requestId();
  lastSyncAt = Date.now();
  game.socket.emit(CHANNEL, { type:"syncRequest", requestId:id, userId:game.user.id, sceneId:canvas?.scene?.id ?? "" });
  refreshHudSoon();
  return id;
}

function ack(msg, accepted, reason = "", message = "") {
  game.socket.emit(CHANNEL, {
    type:"ack", targetUserId:msg.userId, requestId:String(msg.requestId??""), accepted:Boolean(accepted),
    reason:String(reason??""), message:String(message??""), at:Date.now()
  });
}
function syncTo(userId, request = "") {
  game.socket.emit(CHANNEL, { type:"syncState", targetUserId:userId, requestId:request, at:Date.now(), sceneId:canvas?.scene?.id ?? "" });
}

async function resolveShip(uuid) { try { const doc = await fromUuid(uuid); return configuredShip(doc) ? doc : null; } catch { return null; } }

function validateBase(msg) {
  const user = game.users.get(msg.userId);
  if (!user || (!user.active && !user.isGM)) return { ok:false, reason:"Utilisateur non connecté." };
  if (!msg.requestId) return { ok:false, reason:"Soumission sans identifiant de requête." };
  return { ok:true, user };
}

function entertainmentLabel(key, join = null) {
  const gameLabel = key === "arm" ? "Bras de fer" : key === "pig" ? "Lancer de cochon" : key === "drinking" ? "Haut les cœurs !" : "Jeu";
  if (join === true) return `Inscription — ${gameLabel}`;
  if (join === false) return `Retrait — ${gameLabel}`;
  return `Jet — ${gameLabel}`;
}

async function handleRequest(msg) {
  const user = game.users.get(msg.userId), ship = await resolveShip(msg.shipUuid), actor = actorByUuid(msg.actorUuid);
  if (!user || !ship || !actor) return { accepted:false, reason:"Navire ou personnage introuvable." };
  if (!userOwnsActor(user, actor)) return { accepted:false, reason:"Tu ne contrôles pas ce personnage." };
  const before = getEntertainmentData(ship), data = clone(before), join = Boolean(msg.join), key = String(msg.gameKey||"");
  let summary = "";
  if (key === "drinking") {
    if (!data.drinking.open) return { accepted:false, reason:"Le jeu à boire n'est plus ouvert." };
    const existing = data.drinking.participants.find(p => p.actorUuid === actor.uuid || p.userId === user.id);
    if (join && existing && existing.actorUuid !== actor.uuid) return { accepted:false, reason:"Tu participes déjà à ce jeu avec un autre personnage." };
    if (join && !existing) data.drinking.participants.push({ ...createDrinkParticipant(), actorUuid:actor.uuid, userId:user.id });
    if (!join) data.drinking.participants = data.drinking.participants.filter(p => !(p.actorUuid === actor.uuid || p.userId === user.id));
    summary = join ? `${actor.name} rejoint Haut les cœurs !` : `${actor.name} quitte Haut les cœurs !`;
  } else if (key === "pig") {
    if (!data.pig.open) return { accepted:false, reason:"Le lancer de cochon n'est plus ouvert." };
    const existing = data.pig.participants.find(p => p.actorUuid === actor.uuid || p.userId === user.id);
    if (join && existing && existing.actorUuid !== actor.uuid) return { accepted:false, reason:"Tu participes déjà à ce jeu avec un autre personnage." };
    if (join && !existing) data.pig.participants.push({ ...createPigParticipant(), actorUuid:actor.uuid, userId:user.id });
    if (!join) data.pig.participants = data.pig.participants.filter(p => !(p.actorUuid === actor.uuid || p.userId === user.id));
    summary = join ? `${actor.name} rejoint le lancer de cochon.` : `${actor.name} quitte le lancer de cochon.`;
  } else if (key === "arm") {
    if (!data.arm.open) return { accepted:false, reason:"Le bras de fer n'est plus ouvert." };
    const isA = data.arm.actorAUuid === actor.uuid, isB = data.arm.actorBUuid === actor.uuid;
    const userAlreadySeated = (data.arm.userAId === user.id && !isA) || (data.arm.userBId === user.id && !isB);
    if (join && userAlreadySeated) return { accepted:false, reason:"Tu occupes déjà une place au bras de fer avec un autre personnage." };
    if (!join) {
      if (isA) { data.arm.actorAUuid=""; data.arm.userAId=""; data.arm.lastTotalA=null; }
      if (isB) { data.arm.actorBUuid=""; data.arm.userBId=""; data.arm.lastTotalB=null; }
    } else if (!isA && !isB) {
      if (!data.arm.actorAUuid) { data.arm.actorAUuid=actor.uuid; data.arm.userAId=user.id; data.arm.lastTotalA=null; }
      else if (!data.arm.actorBUuid) { data.arm.actorBUuid=actor.uuid; data.arm.userBId=user.id; data.arm.lastTotalB=null; }
      else return { accepted:false, reason:"Les deux places du bras de fer sont déjà prises." };
    }
    summary = join ? `${actor.name} s'inscrit au bras de fer.` : `${actor.name} se retire du bras de fer.`;
  } else return { accepted:false, reason:"Jeu multijoueur inconnu." };
  const after = await setEntertainmentData(ship, data);
  return { accepted:true, ship, user, actor, scope:"entertainment", kind:"action", label:entertainmentLabel(key, join), summary, before, after };
}

async function finishArmIfReady(ship,data) {
  const ta = data.arm.lastTotalA, tb = data.arm.lastTotalB;
  if (ta === null || ta === undefined || tb === null || tb === undefined) return;
  const a = actorByUuid(data.arm.actorAUuid), b = actorByUuid(data.arm.actorBUuid); if (!a || !b) return;
  let body = `<p>${escape(a.name)} : <strong>${ta}</strong> ; ${escape(b.name)} : <strong>${tb}</strong>.</p>`;
  if (n(ta) === n(tb)) body += `<p><strong>Égalité.</strong> Le texte ne précise pas de départage : relancez les tests.</p>`;
  else {
    const winner = n(ta)>n(tb)?a:b, loser=n(ta)>n(tb)?b:a, str=abilityMod(winner,"str"), dmg=await new Roll(`1d2 + ${str}`).evaluate();
    body += `<p><strong>${escape(winner.name)}</strong> l'emporte. ${escape(loser.name)} subit <strong>${dmg.total}</strong> dégâts (1d2 ${str>=0?"+":""}${str}).</p>`;
  }
  await ChatMessage.create({ content:`<div class="pf1-ss-chat-card"><h3>💪 Bras de fer — résultat</h3>${body}</div>` });
}

async function handleRoll(msg) {
  const user = game.users.get(msg.userId), ship=await resolveShip(msg.shipUuid), actor=actorByUuid(msg.actorUuid);
  if (!user || !ship || !actor) return { accepted:false, reason:"Navire ou personnage introuvable." };
  if (!userOwnsActor(user,actor)) return { accepted:false, reason:"Tu ne contrôles pas ce personnage." };
  const before=getEntertainmentData(ship), data=clone(before), key=String(msg.gameKey||""), result=msg.result??{};
  let summary = "";
  if (key === "drinking") {
    const p=data.drinking.participants.find(x=>x.actorUuid===actor.uuid && (!x.userId || x.userId===user.id)); if(!p||!data.drinking.open)return {accepted:false,reason:"Participation au jeu à boire invalide."};
    const round=n(data.drinking.round,0); if(!round || n(result.round)!==round)return {accepted:false,reason:"Cette ronde n'est plus active."};
    if(n(p.lastRolledRound,0)>=round)return {accepted:false,reason:"Jet déjà soumis pour cette ronde."};
    p.lastRolledRound=round; p.drinks+=1; p.conDamage+=Math.max(0,n(result.conDamage)); p.lastFortTotal=n(result.fortTotal); p.lastDc=Math.max(15,n(result.dc)); if(n(result.addictionTotal)>=0&&n(result.addictionTotal)<5)p.failedAddictionSaves+=1;
    summary = `${actor.name} : Vigueur ${n(result.fortTotal)} / DD ${Math.max(15,n(result.dc))}, ${Math.max(0,n(result.conDamage))} dégât(s) de Con.`;
  } else if (key === "pig") {
    const p=data.pig.participants.find(x=>x.actorUuid===actor.uuid && (!x.userId || x.userId===user.id)); if(!p||!data.pig.open)return {accepted:false,reason:"Participation au lancer de cochon invalide."};
    const round=n(data.pig.round,1); if(n(result.round)!==round)return {accepted:false,reason:"Cette manche n'est plus active."};
    if(n(p.lastRolledRound,0)>=round)return {accepted:false,reason:"Jet déjà soumis pour cette manche."};
    p.lastRolledRound=round; p.lastTotal=n(result.total);
    summary = `${actor.name} obtient ${n(result.total)} m à la manche ${round}.`;
  } else if (key === "arm") {
    if(!data.arm.open)return {accepted:false,reason:"Le bras de fer n'est plus ouvert."};
    if(data.arm.actorAUuid===actor.uuid){ if(data.arm.userAId&&data.arm.userAId!==user.id&&!user.isGM)return {accepted:false,reason:"Cette place de bras de fer appartient à un autre joueur."}; if(data.arm.lastTotalA!==null&&data.arm.lastTotalA!==undefined)return {accepted:false,reason:"Jet déjà soumis pour ce bras de fer."}; data.arm.lastTotalA=n(result.total);data.arm.userAId=user.id; }
    else if(data.arm.actorBUuid===actor.uuid){ if(data.arm.userBId&&data.arm.userBId!==user.id&&!user.isGM)return {accepted:false,reason:"Cette place de bras de fer appartient à un autre joueur."}; if(data.arm.lastTotalB!==null&&data.arm.lastTotalB!==undefined)return {accepted:false,reason:"Jet déjà soumis pour ce bras de fer."}; data.arm.lastTotalB=n(result.total);data.arm.userBId=user.id; }
    else return {accepted:false,reason:"Ce personnage n'est pas inscrit au bras de fer."};
    summary = `${actor.name} obtient ${n(result.total)} au test de Force.`;
  } else return {accepted:false,reason:"Jeu multijoueur inconnu."};
  const after=await setEntertainmentData(ship,data); if(key==="arm") await finishArmIfReady(ship,after);
  return { accepted:true, ship, user, actor, scope:"entertainment", kind:"roll", label:entertainmentLabel(key), summary, before, after };
}

async function handleLifeUpdate(msg) {
  const user=game.users.get(msg.userId), ship=await resolveShip(msg.shipUuid), actor=actorByUuid(msg.actorUuid);
  if(!user||!ship||!actor)return {accepted:false,reason:"Navire ou personnage introuvable."};
  if(!userOwnsActor(user,actor))return {accepted:false,reason:"Tu ne contrôles pas ce personnage."};
  const before=getLifeData(ship), life=clone(before), member=life.members.find(m=>m.actorUuid===actor.uuid); if(!member)return {accepted:false,reason:"Ce personnage n'est pas inscrit à la vie à bord."};
  const op=String(msg.op||""), d=msg.data??{}; member.player={...(member.player??{})}; let label="Vie à bord",summary="";
  if(op==="choice") {
    if(d.phase==="day" && DAY_ACTIONS[d.value]) { member.dayAction=d.value; label="Choix d'action diurne"; summary=`${actor.name} choisit ${DAY_ACTIONS[d.value].label}.`; }
    else if(d.phase==="night" && NIGHT_ACTIONS[d.value]) { member.nightAction=d.value; label="Choix d'action nocturne"; summary=`${actor.name} choisit ${NIGHT_ACTIONS[d.value].label}.`; }
    else return {accepted:false,reason:"Choix d'action invalide."};
  } else if(op==="task") {
    if(Number(member.player.taskRolledDay||0)>=life.day || Number(d.day)!==life.day) return {accepted:false,reason:"Tâche déjà soumise ou journée différente."};
    member.lastTask={passed:Boolean(d.passed),worstMargin:Number(d.worstMargin??0),text:String(d.text??"")}; member.fatigued=Boolean(d.fatigued); member.consecutiveTaskFailures=Math.max(0,Number(d.consecutiveTaskFailures??member.consecutiveTaskFailures)); if(d.punishment) member.punishmentQueue.push(String(d.punishment)); member.player.taskRolledDay=life.day;
    label="Jet de tâche"; summary=`${actor.name} : ${String(d.text??"Tâche")} — ${d.passed?"réussite":"échec"}.`;
  } else if(op==="dayResolved") {
    if(Number(d.day)!==life.day || Number(member.player.dayResolvedDay||0)>=life.day)return {accepted:false,reason:"Action diurne déjà résolue ou journée différente."}; member.player.dayResolvedDay=life.day; label="Action diurne"; summary=`${actor.name} résout son action diurne.`;
  } else if(op==="nightResolved") {
    if(Number(d.day)!==life.day || Number(member.player.nightResolvedDay||0)>=life.day)return {accepted:false,reason:"Action nocturne déjà résolue ou journée différente."}; member.player.nightResolvedDay=life.day; if(d.rest){member.fatigued=false;member.fatiguedNextDay=false;} label="Action nocturne"; summary=`${actor.name} résout son action nocturne.`;
  } else if(op==="rum") {
    if(Number(d.day)!==life.day || Number(member.player.rumResolvedDay||0)>=life.day)return {accepted:false,reason:"Ration de rhum déjà résolue ou journée différente."}; member.rum={...member.rum,...(d.rum??{})}; member.fatigued=d.fatigued===true?true:member.fatigued; if(d.rumDumpOffenses!==undefined)member.rumDumpOffenses=Math.max(0,Number(d.rumDumpOffenses)); if(d.punishment)member.punishmentQueue.push(String(d.punishment)); member.player.rumResolvedDay=life.day; label="Ration de rhum"; summary=`${actor.name} résout sa ration de rhum.`;
  } else return {accepted:false,reason:"Action de vie à bord inconnue."};
  const after=await setLifeData(ship,life);
  return { accepted:true, ship, user, actor, scope:"life", kind:op==="task"?"roll":"action", label, summary, before, after };
}

async function processPlayerMessage(msg) {
  const base = validateBase(msg);
  if (!base.ok) { ack(msg,false,base.reason); return; }
  const id=String(msg.requestId); if(processedRequestIds.has(id)){ack(msg,false,"Cette soumission a déjà été traitée.");return;}
  const processKey=[msg.type,msg.shipUuid,msg.actorUuid,msg.gameKey??msg.op??""].join(":");
  if(processingKeys.has(processKey)){ack(msg,false,"Une soumission identique est déjà en cours de traitement.");return;}
  processingKeys.add(processKey);
  try {
    let result;
    if(msg.type==="gameRequest") result=await handleRequest(msg);
    else if(msg.type==="gameRoll") result=await handleRoll(msg);
    else if(msg.type==="lifeUpdate") result=await handleLifeUpdate(msg);
    else result={accepted:false,reason:"Type de requête inconnu."};
    rememberProcessed(id);
    if(result.accepted){
      await appendMultiplayerAudit(result.ship,{ requestId:id,userId:result.user.id,userName:result.user.name,actorUuid:result.actor.uuid,actorName:result.actor.name,scope:result.scope,kind:result.kind,label:result.label,summary:result.summary,before:result.before,after:result.after });
      ack(msg,true,"",result.label);
      broadcastHudRefresh();
    } else ack(msg,false,result.reason||"Action refusée.");
  } catch(error) {
    console.warn(`${MODULE_ID} | Erreur de traitement multijoueur`,error);
    ack(msg,false,"Erreur interne pendant le traitement de l'action.");
  } finally { processingKeys.delete(processKey); }
}

function handleClientAck(msg) {
  if(msg.targetUserId!==game.user.id)return;
  lastAckAt=Date.now();
  for(const [key,row] of pendingRequests.entries()){
    if(row.requestId!==msg.requestId)continue;
    clearTimeout(row.timeout); pendingRequests.delete(key); break;
  }
  if(msg.accepted) quietToast(msg.message||"Action validée.","info");
  else quietToast(msg.reason||"Action refusée.","warn");
  refreshHudSoon();
}
function handleSyncState(msg) {
  if(msg.targetUserId!==game.user.id)return;
  lastSyncAt=Date.now(); lastAckAt=Date.now();
  for(const row of pendingRequests.values()) clearTimeout(row.timeout);
  pendingRequests.clear();
  refreshHudSoon();
}

export function initMultiplayerSocket() {
  game.socket.on(CHANNEL, async msg => {
    if(msg?.type==="ack") return handleClientAck(msg);
    if(msg?.type==="syncState") return handleSyncState(msg);
    if(msg?.type==="refreshHud") { const { refreshCampaignHud } = await import("./campaign-hud.mjs"); return refreshCampaignHud(); }
    if(msg?.type==="syncRequest") {
      if(isHandlingGM()) syncTo(msg.userId,msg.requestId);
      return;
    }
    if(!isHandlingGM())return;
    if(["gameRequest","gameRoll","lifeUpdate"].includes(msg?.type)) await processPlayerMessage(msg);
  });
}

export function installMultiplayerRecoveryHooks() {
  if(recoveryHooksInstalled)return; recoveryHooksInstalled=true;
  Hooks.on("canvasReady",()=>{ requestMultiplayerSync(); refreshHudSoon(); });
  Hooks.on("userConnected",(user,connected)=>{ if(isHandlingGM()&&connected) syncTo(user?.id??""); });
  window.addEventListener("focus",()=>requestMultiplayerSync());
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible") requestMultiplayerSync(); });
  window.addEventListener("online",()=>requestMultiplayerSync());
}
