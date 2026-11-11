import { MODULE_ID } from "./ship-data.mjs";
import { getEntertainmentData, setEntertainmentData, createPigParticipant, createDrinkParticipant, actorByUuid, abilityMod } from "./entertainment-data.mjs";
import { DAY_ACTIONS, NIGHT_ACTIONS, getLifeData, setLifeData } from "./life-data.mjs";

const CHANNEL = `module.${MODULE_ID}`;
const n = (v,f=0) => Number.isFinite(Number(v)) ? Number(v) : f;
const escape = foundry.utils.escapeHTML;

function primaryGM() {
  return game.users?.activeGM ?? game.users?.find(u => u.active && u.isGM) ?? null;
}
function isHandlingGM() { const gm = primaryGM(); return Boolean(game.user?.isGM && (!gm || gm.id === game.user.id)); }
function userOwnsActor(user, actor) { return Boolean(user?.isGM || actor?.testUserPermission?.(user, "OWNER")); }

export function emitGameRequest(payload) {
  game.socket.emit(CHANNEL, { type:"gameRequest", userId:game.user.id, ...payload });
}
export function emitGameRoll(payload) {
  game.socket.emit(CHANNEL, { type:"gameRoll", userId:game.user.id, ...payload });
}
export function broadcastHudRefresh() { game.socket.emit(CHANNEL, { type:"refreshHud", userId:game.user.id }); }

async function resolveShip(uuid) { try { const doc = await fromUuid(uuid); return doc?.type === "vehicle" ? doc : null; } catch { return null; } }

async function handleRequest(msg) {
  const user = game.users.get(msg.userId); const ship = await resolveShip(msg.shipUuid); const actor = actorByUuid(msg.actorUuid);
  if (!user || !ship || !actor || !userOwnsActor(user,actor)) return;
  const data = getEntertainmentData(ship); const join = Boolean(msg.join), key = String(msg.gameKey||"");
  if (key === "drinking") {
    if (!data.drinking.open) return;
    const existing = data.drinking.participants.find(p => p.actorUuid === actor.uuid || p.userId === user.id);
    if (join && !existing) data.drinking.participants.push({ ...createDrinkParticipant(), actorUuid:actor.uuid, userId:user.id });
    if (!join) data.drinking.participants = data.drinking.participants.filter(p => !(p.actorUuid === actor.uuid || p.userId === user.id));
  } else if (key === "pig") {
    if (!data.pig.open) return;
    const existing = data.pig.participants.find(p => p.actorUuid === actor.uuid || p.userId === user.id);
    if (join && !existing) data.pig.participants.push({ ...createPigParticipant(), actorUuid:actor.uuid, userId:user.id });
    if (!join) data.pig.participants = data.pig.participants.filter(p => !(p.actorUuid === actor.uuid || p.userId === user.id));
  } else if (key === "arm") {
    if (!data.arm.open) return;
    const isA = data.arm.actorAUuid === actor.uuid, isB = data.arm.actorBUuid === actor.uuid;
    if (!join) {
      if (isA) { data.arm.actorAUuid=""; data.arm.userAId=""; data.arm.lastTotalA=null; }
      if (isB) { data.arm.actorBUuid=""; data.arm.userBId=""; data.arm.lastTotalB=null; }
    } else if (!isA && !isB) {
      if (!data.arm.actorAUuid) { data.arm.actorAUuid=actor.uuid; data.arm.userAId=user.id; data.arm.lastTotalA=null; }
      else if (!data.arm.actorBUuid) { data.arm.actorBUuid=actor.uuid; data.arm.userBId=user.id; data.arm.lastTotalB=null; }
      else return ui.notifications.info("Bras de fer : les deux places sont déjà prises.");
    }
  }
  await setEntertainmentData(ship,data); broadcastHudRefresh();
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
  const user = game.users.get(msg.userId); const ship=await resolveShip(msg.shipUuid); const actor=actorByUuid(msg.actorUuid);
  if (!user || !ship || !actor || !userOwnsActor(user,actor)) return;
  const data=getEntertainmentData(ship), key=String(msg.gameKey||""), result=msg.result??{};
  if (key === "drinking") {
    const p=data.drinking.participants.find(x=>x.actorUuid===actor.uuid && (!x.userId || x.userId===user.id)); if(!p||!data.drinking.open)return;
    const round=n(data.drinking.round,0); if(!round || n(result.round)!==round || n(p.lastRolledRound,0)>=round)return;
    p.lastRolledRound=round; p.drinks+=1; p.conDamage+=Math.max(0,n(result.conDamage)); p.lastFortTotal=n(result.fortTotal); p.lastDc=Math.max(15,n(result.dc)); if(n(result.addictionTotal)>=0&&n(result.addictionTotal)<5)p.failedAddictionSaves+=1;
  } else if (key === "pig") {
    const p=data.pig.participants.find(x=>x.actorUuid===actor.uuid && (!x.userId || x.userId===user.id)); if(!p||!data.pig.open)return;
    const round=n(data.pig.round,1); if(n(result.round)!==round || n(p.lastRolledRound,0)>=round)return; p.lastRolledRound=round; p.lastTotal=n(result.total);
  } else if (key === "arm") {
    if(!data.arm.open)return; if(data.arm.actorAUuid===actor.uuid){data.arm.lastTotalA=n(result.total);data.arm.userAId=user.id;} else if(data.arm.actorBUuid===actor.uuid){data.arm.lastTotalB=n(result.total);data.arm.userBId=user.id;} else return;
  }
  await setEntertainmentData(ship,data); if(key==="arm") await finishArmIfReady(ship,data); broadcastHudRefresh();
}


async function handleLifeUpdate(msg) {
  const user=game.users.get(msg.userId), ship=await resolveShip(msg.shipUuid), actor=actorByUuid(msg.actorUuid);
  if(!user||!ship||!actor||!userOwnsActor(user,actor)) return;
  const life=getLifeData(ship), member=life.members.find(m=>m.actorUuid===actor.uuid); if(!member)return;
  const op=String(msg.op||""), d=msg.data??{};
  member.player={...(member.player??{})};
  if(op==="choice") {
    if(d.phase==="day" && DAY_ACTIONS[d.value]) member.dayAction=d.value;
    else if(d.phase==="night" && NIGHT_ACTIONS[d.value]) member.nightAction=d.value;
    else return;
  } else if(op==="task") {
    if(Number(member.player.taskRolledDay||0)>=life.day || Number(d.day)!==life.day) return;
    member.lastTask={passed:Boolean(d.passed),worstMargin:Number(d.worstMargin??0),text:String(d.text??"")};
    member.fatigued=Boolean(d.fatigued);
    member.consecutiveTaskFailures=Math.max(0,Number(d.consecutiveTaskFailures??member.consecutiveTaskFailures));
    if(d.punishment) member.punishmentQueue.push(String(d.punishment));
    member.player.taskRolledDay=life.day;
  } else if(op==="dayResolved") {
    if(Number(d.day)!==life.day)return; member.player.dayResolvedDay=life.day;
  } else if(op==="nightResolved") {
    if(Number(d.day)!==life.day)return; member.player.nightResolvedDay=life.day;
    if(d.rest){member.fatigued=false;member.fatiguedNextDay=false;}
  } else if(op==="rum") {
    if(Number(d.day)!==life.day || Number(member.player.rumResolvedDay||0)>=life.day)return;
    member.rum={...member.rum,...(d.rum??{})}; member.fatigued=d.fatigued===true?true:member.fatigued;
    if(d.rumDumpOffenses!==undefined)member.rumDumpOffenses=Math.max(0,Number(d.rumDumpOffenses));
    if(d.punishment)member.punishmentQueue.push(String(d.punishment));
    member.player.rumResolvedDay=life.day;
  } else return;
  await setLifeData(ship,life); broadcastHudRefresh();
}

export function initMultiplayerSocket() {
  game.socket.on(CHANNEL, async msg => {
    if (msg?.type === "refreshHud") { const { refreshCampaignHud } = await import("./campaign-hud.mjs"); return refreshCampaignHud(); }
    if (!isHandlingGM()) return;
    try {
      if (msg?.type === "gameRequest") await handleRequest(msg);
      if (msg?.type === "gameRoll") await handleRoll(msg);
      if (msg?.type === "lifeUpdate") await handleLifeUpdate(msg);
    } catch (error) { console.warn(`${MODULE_ID} | Erreur socket multijoueur`, error); }
  });
}
