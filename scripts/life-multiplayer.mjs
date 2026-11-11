import { MODULE_ID } from "./ship-data.mjs";
import { DAY_ACTIONS, NIGHT_ACTIONS, getLifeData, getTaskById, actorByUuid, bestAlternative, getUnderstaffedTaskDcBonus, getTaskModifier, findSkill, abilityMod, saveMod } from "./life-data.mjs";

const escape = foundry.utils.escapeHTML;
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const signed=v=>`${n(v)>=0?"+":""}${n(v)}`;

export function ownedLifeMember(ship, actorUuid, user=game.user) {
  const actor=actorByUuid(actorUuid); if(!actor || !(user?.isGM || actor.testUserPermission?.(user,"OWNER"))) return null;
  const life=getLifeData(ship); const member=life.members.find(m=>m.actorUuid===actorUuid); return member?{life,member,actor}:null;
}

export function lifeHudState(ship, actorUuid) {
  const found=ownedLifeMember(ship,actorUuid); if(!found) return null;
  const {life,member,actor}=found; const task=getTaskById(member.taskId);
  return { life,member,actor,task,
    canRollTask:Boolean(task && n(member.player?.taskRolledDay)<life.day),
    canResolveDay:n(member.player?.dayResolvedDay)<life.day,
    canResolveNight:n(member.player?.nightResolvedDay)<life.day,
    canResolveRum:n(member.player?.rumResolvedDay)<life.day && !member.rum?.drankToday && !member.rum?.dumpedToday
  };
}

function effectiveChecks(task,life){
  const checks=(task?.checks??[]).filter(c=>!c.onlyIfKroopDrunk||life.kroopDrunk).map(c=>({...c}));
  if(life.kroopDrunk && ["cook-3","cook-4"].includes(task?.id)) checks.push({label:"Préparer aussi le repas (Kroop saoul)",dc:10,alternatives:[{type:"skill",label:"Profession (cuisinier)",patterns:[/profession.*cuisin/i,/cook/i],ability:"wis"},{type:"ability",label:"Intelligence",ability:"int"}]});
  return checks;
}

export async function playerChooseLifeAction(ship, actorUuid, phase, value) {
  const found=ownedLifeMember(ship,actorUuid); if(!found) return ui.notifications.warn("Tu ne contrôles pas ce personnage ou il n'est pas inscrit à la vie à bord.");
  const {life,member,actor}=found;
  if(phase==="day" && DAY_ACTIONS[value]) member.dayAction=value;
  else if(phase==="night" && NIGHT_ACTIONS[value]) member.nightAction=value;
  else return;
  game.socket.emit(`module.${MODULE_ID}`,{type:"lifeUpdate",userId:game.user.id,shipUuid:ship.uuid,actorUuid,op:"choice",data:{phase,value}});
  ui.notifications.info(`${actor.name} : ${phase==="day"?"action diurne":"action nocturne"} = ${(phase==="day"?DAY_ACTIONS:NIGHT_ACTIONS)[value].label}.`);
}

export async function playerRollLifeTask(ship, actorUuid) {
  const found=ownedLifeMember(ship,actorUuid); if(!found) return;
  const {life,member,actor}=found; const task=getTaskById(member.taskId); if(!task) return ui.notifications.warn("Aucune tâche n'a encore été attribuée.");
  if(n(member.player?.taskRolledDay)>=life.day) return ui.notifications.warn("Tu as déjà résolu ta tâche aujourd'hui.");
  const under=getUnderstaffedTaskDcBonus(ship,life), dcMod=n(life.taskDcManualModifier)+under;
  let taskMod=getTaskModifier(member); const hunting=life.kroopDrunk&&["cook-3","cook-4","cook-6"].includes(task.id); if(hunting)taskMod-=4;
  const forcedFailure=hunting&&member.dayAction!=="diligent"; if(hunting&&member.dayAction==="diligent")taskMod-=4;
  let passed=true,worst=Infinity,fatigueFailed=false; const rows=[];
  if(forcedFailure){passed=false;worst=-5;rows.push(`<li><strong>Échec automatique :</strong> Kroop est saoul et cette tâche exige de se consacrer au travail.</li>`);} else {
    const checks=effectiveChecks(task,life);
    if(!checks.length) rows.push(`<li>Cette tâche ne demande pas de test.</li>`);
    for(const check of checks){ const alt=bestAlternative(actor,check.alternatives); const mod=n(alt.mod)+(check.fatigueOnly?0:taskMod),dc=n(check.dc,10)+dcMod; const roll=await new Roll(`1d20 + ${mod}`).evaluate(); await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:`S&S — ${escape(task.name)} : ${escape(check.label)}`}); const margin=n(roll.total)-dc,ok=margin>=0; if(check.fatigueOnly){if(!ok)fatigueFailed=true;} else {passed&&=ok;worst=Math.min(worst,margin);} rows.push(`<li>${escape(check.label)} — ${escape(alt.label)} ${signed(mod)} : <strong>${roll.total}</strong> / DD ${dc} → ${ok?"réussite":"échec"}.</li>`); }
  }
  if(task.alwaysFatigued||fatigueFailed)member.fatigued=true;
  let punishment=""; if(passed)member.consecutiveTaskFailures=0; else {member.consecutiveTaskFailures++; punishment=worst>=-4?"Réprimande sévère ; au pire un coup de corde.":`${3*member.consecutiveTaskFailures} coup(s) de fouet.`; member.punishmentQueue.push(punishment);}
  member.lastTask={passed,worstMargin:Number.isFinite(worst)?worst:0,text:task.name}; member.player={...(member.player??{}),taskRolledDay:life.day};
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<div class="pf1-ss-chat-card"><h3>⚒ Tâche — ${escape(task.name)}</h3><p>Action diurne : <strong>${escape(DAY_ACTIONS[member.dayAction]?.label??member.dayAction)}</strong>.</p><ul>${rows.join("")}</ul><p><strong>${passed?"RÉUSSITE":"ÉCHEC"}</strong>${punishment?` — ${escape(punishment)}`:""}</p></div>`});
  game.socket.emit(`module.${MODULE_ID}`,{type:"lifeUpdate",userId:game.user.id,shipUuid:ship.uuid,actorUuid,op:"task",data:{day:life.day,passed,worstMargin:Number.isFinite(worst)?worst:0,text:task.name,fatigued:member.fatigued,consecutiveTaskFailures:member.consecutiveTaskFailures,punishment}});
}

export async function playerResolveDayAction(ship,actorUuid){
  const found=ownedLifeMember(ship,actorUuid); if(!found)return; const {life,member,actor}=found;
  if(n(member.player?.dayResolvedDay)>=life.day)return ui.notifications.warn("Action diurne déjà résolue aujourd'hui.");
  const action=DAY_ACTIONS[member.dayAction]; let body=`<p>${escape(action?.description??"")}</p>`;
  if(member.dayAction==="shirk"){const sk=findSkill(actor,[/discr[eé]tion/i,/stealth/i])??{name:"Dextérité",mod:abilityMod(actor,"dex")};const r=await new Roll(`1d20 + ${n(sk.mod)}`).evaluate();await r.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:"S&S — Dérobade"});const margin=n(r.total)-15;body+=`<p>${escape(sk.name)} : <strong>${r.total}</strong> / DD 15 — ${margin>=0?"non découvert":margin>=-4?"dérangé":"pris sur le fait"}.</p>`;}
  if(member.dayAction==="influence")body+=`<p><strong>Influence :</strong> choisis avec le MJ le PNJ visé ; le jet social reste ensuite effectué par ton personnage.</p>`;
  member.player={...(member.player??{}),dayResolvedDay:life.day}; game.socket.emit(`module.${MODULE_ID}`,{type:"lifeUpdate",userId:game.user.id,shipUuid:ship.uuid,actorUuid,op:"dayResolved",data:{day:life.day}}); await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<div class="pf1-ss-chat-card"><h3>☀ Action diurne — ${escape(action?.label??"")}</h3>${body}</div>`});
}

export async function playerResolveNightAction(ship,actorUuid){
  const found=ownedLifeMember(ship,actorUuid); if(!found)return; const {life,member,actor}=found;
  if(n(member.player?.nightResolvedDay)>=life.day)return ui.notifications.warn("Action nocturne déjà résolue aujourd'hui.");
  const action=NIGHT_ACTIONS[member.nightAction]; let body=`<p>${escape(action?.description??"")}</p>`;
  if(member.nightAction==="rest"){member.fatigued=false;member.fatiguedNextDay=false;}
  if(["sneak","larceny"].includes(member.nightAction)){const sk=findSkill(actor,[/discr[eé]tion/i,/stealth/i,/escamotage/i,/sleight/i])??{name:"Dextérité",mod:abilityMod(actor,"dex")};const dc=n(life.stealth?.dc,15);const r=await new Roll(`1d20 + ${n(sk.mod)}`).evaluate();await r.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:`S&S — ${action.label}`});const margin=n(r.total)-dc;body+=`<p>${escape(sk.name)} : <strong>${r.total}</strong> / DD ${dc} — ${margin>=0?"réussite":margin>=-4?"dérangé":"pris sur le fait"}.</p>`;}
  if(member.nightAction==="game"||member.nightAction==="entertain") body+=`<p>Utilise le panneau <strong>Jeux ouverts</strong> du HUD pour participer et lancer toi-même tes dés.</p>`;
  if(member.nightAction==="influence")body+=`<p><strong>Influence :</strong> le PNJ cible est choisi avec le MJ.</p>`;
  member.player={...(member.player??{}),nightResolvedDay:life.day}; game.socket.emit(`module.${MODULE_ID}`,{type:"lifeUpdate",userId:game.user.id,shipUuid:ship.uuid,actorUuid,op:"nightResolved",data:{day:life.day,rest:member.nightAction==="rest"}}); await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<div class="pf1-ss-chat-card"><h3>🌙 Action nocturne — ${escape(action?.label??"")}</h3>${body}</div>`}); 
}

export async function playerResolveRum(ship,actorUuid,mode="drink"){
  const found=ownedLifeMember(ship,actorUuid);if(!found)return;const {life,member,actor}=found;if(n(member.player?.rumResolvedDay)>=life.day)return ui.notifications.warn("Ration déjà résolue aujourd'hui.");
  let punishment="";
  if(mode==="dump"){
    const sk=findSkill(actor,[/discr[eé]tion/i,/stealth/i])??{name:"Dextérité",mod:abilityMod(actor,"dex")};const r=await new Roll(`1d20 + ${n(sk.mod)}`).evaluate();await r.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:"S&S — Jeter la ration de rhum"});const ok=n(r.total)>=10;member.rum.dumpedToday=true;member.rum.drankToday=false;
    if(!ok){member.rumDumpOffenses++; punishment=member.rumDumpOffenses===1?"6 coups de fouet":"6 coups de chat à neuf queues";}
    await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<div class="pf1-ss-chat-card"><h3>🍾 Ration de rhum</h3><p>${escape(sk.name)} : <strong>${r.total}</strong> / DD 10 — ${ok?"ration jetée discrètement":`repéré — ${escape(punishment)}`}.</p></div>`});
  } else {
    const fort=saveMod(actor,"fort"),add=await new Roll(`1d20 + ${fort}`).evaluate(),cha=await new Roll("1d4").evaluate(),hours=await new Roll("1d8").evaluate(),con=await new Roll("1d3").evaluate();await add.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:"S&S — Ration de rhum : dépendance"});member.rum={...member.rum,drankToday:true,dumpedToday:false,chaBonus:n(cha.total),fatigueHours:n(hours.total),conDamage:n(con.total),addictionFailed:n(add.total)<5};member.fatigued=true;await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<div class="pf1-ss-chat-card"><h3>🍺 Ration de rhum</h3><p>Dépendance : ${add.total}/DD 5 ; +${cha.total} Cha ; fatigue ${hours.total} h ; <strong>${con.total} Con</strong>.</p></div>`});
  }
  member.player={...(member.player??{}),rumResolvedDay:life.day}; game.socket.emit(`module.${MODULE_ID}`,{type:"lifeUpdate",userId:game.user.id,shipUuid:ship.uuid,actorUuid,op:"rum",data:{day:life.day,rum:member.rum,fatigued:member.fatigued,rumDumpOffenses:member.rumDumpOffenses,punishment}});
}
