import { MODULE_ID } from "./ship-data.mjs";
import {
  getEntertainmentData, setEntertainmentData, normalizeEntertainmentData,
  createPigParticipant, createDrinkParticipant, crewActorChoices,
  actorByUuid, abilityMod, saveMod, performanceSkills, recoverySkills,
  actorCmb, hasImprovisedThrow, worldTimeNow, cleanupPerformanceState
} from "./entertainment-data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const escape = foundry.utils.escapeHTML;
const n = (v, f=0) => Number.isFinite(Number(v)) ? Number(v) : f;
const signed = (v) => `${n(v) >= 0 ? "+" : ""}${n(v)}`;
const actorName = (a) => a?.name ?? "—";

function rowId(event, selector, key) {
  return event?.target?.closest?.(selector)?.dataset?.[key] ?? "";
}
function naturalD20(roll) {
  const die = roll?.dice?.find?.(d => Number(d.faces) === 20);
  return Number(die?.results?.find?.(r => r.active !== false)?.result ?? 0);
}
function speaker(actor) { return ChatMessage.getSpeaker({ actor: actor ?? null }); }
async function postChat(actor, title, body, icon="fa-solid fa-dice") {
  return ChatMessage.create({ speaker: speaker(actor), content: `<div class="pf1-ss-chat-card"><h3><i class="${icon}"></i> ${escape(title)}</h3>${body}</div>` });
}
function advisoryPayout(stake, count, lowRankWinner) {
  const pot = Math.max(1, n(stake, 1)) * Math.max(1, count);
  if (!lowRankWinner || pot <= 20) return { pot, note: "" };
  return { pot, note: ` Le pot théorique est de ${pot} po, mais le texte précise qu’un PNJ de rang inférieur ne peut espérer gagner plus de 20 po en liquide.` };
}

export class EntertainmentController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-entertainment", "standard-form"],
    tag: "form",
    position: { width: 920, height: "auto" },
    window: { icon: "fa-solid fa-masks-theater", resizable: true },
    actions: {
      openShipController: this.#openShipController,
      rollPerformance: this.#rollPerformance,
      recoverAudience: this.#recoverAudience,
      rollArmWrestling: this.#rollArmWrestling,
      toggleArmOpen: this.#toggleArmOpen,
      addPigParticipant: this.#addPigParticipant,
      removePigParticipant: this.#removePigParticipant,
      rollPigToss: this.#rollPigToss,
      togglePigOpen: this.#togglePigOpen,
      newPigRound: this.#newPigRound,
      addDrinkParticipant: this.#addDrinkParticipant,
      removeDrinkParticipant: this.#removeDrinkParticipant,
      toggleDrinkOpen: this.#toggleDrinkOpen,
      rollDrinkParticipant: this.#rollDrinkParticipant,
      nextDrinkRound: this.#nextDrinkRound,
      resetDrinking: this.#resetDrinking
    },
    form: { handler: this.#onSubmit, closeOnSubmit: false }
  };

  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/entertainment-controller.hbs` } };

  constructor(actor, options={}) {
    super({
      id: `pf1-ss-entertainment-${actor.id}`,
      ...options,
      window: { ...(options.window ?? {}), title: `Divertissements pirates — ${actor.name}` }
    });
    this.actor = actor;
  }

  static open(actor) {
    if (!actor || actor.type !== "vehicle") {
      ui.notifications.warn("Skull & Shackles : les divertissements doivent être rattachés à un Vehicle PF1.");
      return null;
    }
    const app = new EntertainmentController(actor);
    app.render({ force: true });
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const data = getEntertainmentData(this.actor);
    const expired = cleanupPerformanceState(data);
    if (expired && game.user?.isGM) setEntertainmentData(this.actor, data).catch(()=>{});
    const actors = crewActorChoices();
    const choices = actors.map(a=>({uuid:a.uuid,name:a.name}));

    const performer = actorByUuid(data.performance.actorUuid);
    const perfSkills = performanceSkills(performer);
    const recovery = recoverySkills(performer);
    const blocked = Boolean(data.performance.blocked?.[data.performance.actorUuid]);
    const activeEffect = data.performance.effects?.[data.performance.actorUuid] ?? null;
    const now = worldTimeNow();
    const remaining = activeEffect && n(activeEffect.expiresAt,0)>now ? Math.ceil((n(activeEffect.expiresAt)-now)/3600) : 0;

    const armA = actorByUuid(data.arm.actorAUuid);
    const armB = actorByUuid(data.arm.actorBUuid);

    const pigParticipants = data.pig.participants.map((p,index)=>{
      const a=actorByUuid(p.actorUuid); const detected=hasImprovisedThrow(a); const cmb=actorCmb(a); const penalty=(detected||p.improvisedThrowOverride)?0:-4;
      return { ...p,index,actor:a,actorName:actorName(a),cmb,penalty,totalMod:cmb+penalty+n(p.manualModifier),detected,
        actorChoices:choices.map(c=>({...c,selected:c.uuid===p.actorUuid})) };
    });

    const drinkParticipants = data.drinking.participants.map((p,index)=>{
      const a=actorByUuid(p.actorUuid); const fort=saveMod(a,"fort"); const nextDc=15+3*Math.max(0,p.drinks);
      return { ...p,index,actor:a,actorName:actorName(a),fort,nextDc,
        actorChoices:choices.map(c=>({...c,selected:c.uuid===p.actorUuid})) };
    });

    return {
      ...context,
      actor:this.actor,
      data,
      actors:choices,
      performanceActorChoices:choices.map(c=>({...c,selected:c.uuid===data.performance.actorUuid})),
      performanceSkills:perfSkills.map(s=>({...s,selected:s.id===data.performance.skillId,modDisplay:signed(s.mod)})),
      recoverySkills:recovery.map(s=>({...s,selected:s.id===data.performance.recoverySkillId,modDisplay:signed(s.mod)})),
      performerName:actorName(performer), performanceBlocked:blocked, performanceActive:Boolean(remaining), performanceHours:remaining,
      armAName:actorName(armA), armBName:actorName(armB), armAStr:abilityMod(armA,"str"), armBStr:abilityMod(armB,"str"),
      armAChoices:choices.map(c=>({...c,selected:c.uuid===data.arm.actorAUuid})), armBChoices:choices.map(c=>({...c,selected:c.uuid===data.arm.actorBUuid})),
      armPot:Math.max(1,n(data.arm.stake,1))*2,
      armOpen:data.arm.open, armLastA:data.arm.lastTotalA, armLastB:data.arm.lastTotalB,
      pigOpen:data.pig.open, pigRound:data.pig.round,
      pigParticipants, pigPot:Math.max(1,n(data.pig.stake,1))*Math.max(1,pigParticipants.filter(p=>p.actorUuid).length),
      drinkOpen:data.drinking.open,
      drinkParticipants, drinkingPot:Math.max(1,n(data.drinking.stake,1))*Math.max(1,drinkParticipants.filter(p=>p.actorUuid).length),
      activeDrinkers:drinkParticipants.filter(p=>p.active&&p.actorUuid).length
    };
  }

  static async #onSubmit(event, form, formData) {
    const asObject=formData.object??formData.toObject?.()??Object.fromEntries(formData.entries());
    const raw=foundry.utils.expandObject(asObject); const old=getEntertainmentData(this.actor); const incoming=raw.entertainment??{};
    // Les historiques de représentation restent conservés, tandis que les participants sont fusionnés par id.
    incoming.performance={...old.performance,...(incoming.performance??{}),blocked:old.performance.blocked,effects:old.performance.effects};
    for (const key of ["pig","drinking"]) {
      const submitted=incoming[key]?.participants??{}; const oldList=old[key].participants; const oldById=new Map(oldList.map(p=>[p.id,p]));
      const list=Object.keys(submitted).sort((a,b)=>Number(a)-Number(b)).map(k=>submitted[k]);
      incoming[key]={...old[key],...(incoming[key]??{}),participants:list.map(p=>{const prior=oldById.get(String(p.id??""));return prior?{...prior,...p}:p;})};
    }
    const data=normalizeEntertainmentData({...old,...incoming}); await setEntertainmentData(this.actor,data); await this.render();
  }

  async #saveVisibleForm() { try { await this.submit(); } catch(error) { console.warn(`${MODULE_ID} | sauvegarde divertissements impossible`,error); } }

  static async #openShipController() { const {ShipController}=await import("./ship-controller.mjs"); ShipController.open(this.actor); }

  static async #rollPerformance() {
    await this.#saveVisibleForm(); const data=getEntertainmentData(this.actor); const p=data.performance; const a=actorByUuid(p.actorUuid);
    if(!a){ui.notifications.warn("Choisis le personnage qui divertit l’équipage.");return;}
    if(p.blocked?.[a.uuid]){ui.notifications.warn(`${a.name} est ignoré par l’équipage : réussis d’abord Bluff ou Intimidation DD 15.`);return;}
    const skills=performanceSkills(a); const sk=skills.find(s=>s.id===p.skillId)??skills[0]; const base=sk?.mod??abilityMod(a,"cha"); const label=sk?.name??"Charisme";
    const mod=n(base)+n(p.manualModifier); const roll=await new Roll(`1d20 + ${mod}`).evaluate(); const total=n(roll.total);
    let text="Aucun effet particulier.";
    if(total>=20){p.effects[a.uuid]={expiresAt:worldTimeNow()+86400,bonus:2,audience:"crew"};text="Réussite : +2 de circonstance aux tests de compétence basés sur le Charisme quand le personnage interagit avec les auditeurs pendant les prochaines 24 heures.";}
    else if(total<=9){p.blocked[a.uuid]=true;delete p.effects[a.uuid];text="Résultat de 9 ou moins : lors de sa prochaine tentative, l’équipage l’ignorera jusqu’à ce qu’il réussisse d’abord Bluff ou Intimidation DD 15.";}
    await setEntertainmentData(this.actor,data);
    await postChat(a,"Divertir l’équipage",`<p>${escape(label)} ${signed(mod)} : <strong>${total}</strong> contre DD 20.</p><p>${escape(text)}</p>`,"fa-solid fa-music"); await this.render();
  }

  static async #recoverAudience() {
    await this.#saveVisibleForm(); const data=getEntertainmentData(this.actor); const p=data.performance; const a=actorByUuid(p.actorUuid);
    if(!a){ui.notifications.warn("Choisis le personnage concerné.");return;}
    const skills=recoverySkills(a); const sk=skills.find(s=>s.id===p.recoverySkillId)??skills[0]; if(!sk){ui.notifications.warn("Aucun Bluff ou Intimidation détecté sur cette fiche.");return;}
    const roll=await new Roll(`1d20 + ${n(sk.mod)}`).evaluate(); const ok=n(roll.total)>=15; if(ok)p.blocked[a.uuid]=false; await setEntertainmentData(this.actor,data);
    await postChat(a,"Reconquérir l’auditoire",`<p>${escape(sk.name)} ${signed(sk.mod)} : <strong>${roll.total}</strong> contre DD 15 → <strong>${ok?"réussite":"échec"}</strong>.</p><p>${ok?"L’équipage acceptera d’écouter une nouvelle représentation.":"L’équipage continue de l’ignorer pour ses tentatives de divertissement."}</p>`,"fa-solid fa-bullhorn"); await this.render();
  }

  static async #toggleArmOpen() {
    await this.#saveVisibleForm(); const d=getEntertainmentData(this.actor); d.arm.open=!d.arm.open; d.arm.lastTotalA=null; d.arm.lastTotalB=null; await setEntertainmentData(this.actor,d);
    game.modules.get(MODULE_ID)?.api?.broadcastHudRefresh?.(); await this.render();
  }

  static async #rollArmWrestling() {
    await this.#saveVisibleForm(); const d=getEntertainmentData(this.actor); const a=actorByUuid(d.arm.actorAUuid); const b=actorByUuid(d.arm.actorBUuid);
    if(!a||!b){ui.notifications.warn("Choisis les deux participants au bras de fer.");return;}
    const modA=abilityMod(a,"str")+n(d.arm.manualA); const modB=abilityMod(b,"str")+n(d.arm.manualB);
    const rA=d.arm.lastTotalA===null||d.arm.lastTotalA===undefined?await new Roll(`1d20 + ${modA}`).evaluate():null; const rB=d.arm.lastTotalB===null||d.arm.lastTotalB===undefined?await new Roll(`1d20 + ${modB}`).evaluate():null; const ta=rA?n(rA.total):n(d.arm.lastTotalA),tb=rB?n(rB.total):n(d.arm.lastTotalB);
    if(ta===tb){await postChat(null,"Bras de fer",`<p>${escape(a.name)} : <strong>${ta}</strong> ; ${escape(b.name)} : <strong>${tb}</strong>.</p><p><strong>Égalité.</strong> Le texte ne précise pas de départage ; rejouez le test opposé.</p>`,"fa-solid fa-hand-fist");return;}
    const winner=ta>tb?a:b, loser=ta>tb?b:a, winnerStr=abilityMod(winner,"str"); const dmg=await new Roll(`1d2 + ${winnerStr}`).evaluate(); const lowRank=winner===a?d.arm.aLowRankNpc:d.arm.bLowRankNpc; const wager=advisoryPayout(d.arm.stake,2,lowRank);
    const raw=n(dmg.total); const dmgText=raw<0?`${raw} (résultat brut ; le texte ne fixe pas de minimum de dégâts)`:String(raw);
    await postChat(winner,"Bras de fer",`<p>${escape(a.name)} : <strong>${ta}</strong> ; ${escape(b.name)} : <strong>${tb}</strong>.</p><p><strong>${escape(winner.name)}</strong> l’emporte. ${escape(loser.name)} subit <strong>${escape(dmgText)}</strong> dégâts (1d2 ${signed(winnerStr)}).</p><p>Mise : ${n(d.arm.stake,1)} po chacun ; pot théorique : <strong>${wager.pot} po</strong>.${escape(wager.note)}</p>`,"fa-solid fa-hand-fist");
  }

  static async #togglePigOpen() { await this.#saveVisibleForm(); const d=getEntertainmentData(this.actor); d.pig.open=!d.pig.open; await setEntertainmentData(this.actor,d); game.modules.get(MODULE_ID)?.api?.broadcastHudRefresh?.(); await this.render(); }
  static async #newPigRound() { await this.#saveVisibleForm(); const d=getEntertainmentData(this.actor); d.pig.round=Math.max(1,n(d.pig.round,1)+1); for(const p of d.pig.participants){p.lastTotal=null;p.lastRolledRound=0;} await setEntertainmentData(this.actor,d); game.modules.get(MODULE_ID)?.api?.broadcastHudRefresh?.(); await this.render(); }

  static async #addPigParticipant() { await this.#saveVisibleForm(); const d=getEntertainmentData(this.actor); d.pig.participants.push(createPigParticipant()); await setEntertainmentData(this.actor,d); await this.render(); }
  static async #removePigParticipant(event) { await this.#saveVisibleForm(); const id=rowId(event,"[data-pig-id]","pigId"); const d=getEntertainmentData(this.actor); d.pig.participants=d.pig.participants.filter(p=>p.id!==id); await setEntertainmentData(this.actor,d); await this.render(); }

  static async #rollPigToss() {
    await this.#saveVisibleForm(); const d=getEntertainmentData(this.actor); const rows=[]; const results=[];
    for(const p of d.pig.participants){const a=actorByUuid(p.actorUuid);if(!a)continue;const detected=hasImprovisedThrow(a);const cmb=actorCmb(a);const penalty=(detected||p.improvisedThrowOverride)?0:-4;const mod=cmb+penalty+n(p.manualModifier);let total,nat=0;if(n(p.lastRolledRound,0)>=n(d.pig.round,1)&&p.lastTotal!==null){total=n(p.lastTotal);}else{const roll=await new Roll(`1d20 + ${mod}`).evaluate();total=n(roll.total);nat=naturalD20(roll);p.lastTotal=total;p.lastRolledRound=n(d.pig.round,1);}results.push({p,a,total});rows.push(`<li>${escape(a.name)} : BMO ${signed(cmb)} ${penalty?"−4 arme improvisée":""} ${n(p.manualModifier)?`mod. ${signed(p.manualModifier)}`:""} → <strong>${total} m</strong>${nat?` (d20 naturel ${nat})`:""}${p.userId?" (jet joueur)":""}</li>`);}
    await setEntertainmentData(this.actor,d); if(!results.length){ui.notifications.warn("Ajoute au moins un participant au lancer de cochon.");return;}
    const max=Math.max(...results.map(r=>r.total));const winners=results.filter(r=>r.total===max);let winnerText=winners.length===1?`<strong>${escape(winners[0].a.name)}</strong> gagne avec ${max} m.`:`Égalité à <strong>${max} m</strong> entre ${winners.map(r=>escape(r.a.name)).join(", ")}. Le texte ne précise pas le départage.`;
    const lowRank=winners.length===1?winners[0].p.lowRankNpc:false;const wager=advisoryPayout(d.pig.stake,results.length,lowRank);
    await postChat(null,"Lancer de cochon",`<ul>${rows.join("")}</ul><p>${winnerText}</p><p>Mise : ${n(d.pig.stake,1)} po par participant ; pot théorique : <strong>${wager.pot} po</strong>.${escape(wager.note)}</p>`,"fa-solid fa-piggy-bank"); await this.render();
  }

  static async #addDrinkParticipant() { await this.#saveVisibleForm(); const d=getEntertainmentData(this.actor); d.drinking.participants.push(createDrinkParticipant()); await setEntertainmentData(this.actor,d); await this.render(); }
  static async #removeDrinkParticipant(event) { await this.#saveVisibleForm(); const id=rowId(event,"[data-drink-id]","drinkId"); const d=getEntertainmentData(this.actor); d.drinking.participants=d.drinking.participants.filter(p=>p.id!==id); await setEntertainmentData(this.actor,d); await this.render(); }

  static async #toggleDrinkOpen() { await this.#saveVisibleForm(); const d=getEntertainmentData(this.actor); d.drinking.open=!d.drinking.open; await setEntertainmentData(this.actor,d); game.modules.get(MODULE_ID)?.api?.broadcastHudRefresh?.(); await this.render(); }

  static async #rollDrinkParticipant(event) {
    await this.#saveVisibleForm(); const id=rowId(event,"[data-drink-id]","drinkId"); const d=getEntertainmentData(this.actor); const p=d.drinking.participants.find(x=>x.id===id); const a=actorByUuid(p?.actorUuid);
    if(!p||!a)return ui.notifications.warn("Participant introuvable."); if(!p.active)return ui.notifications.warn(`${a.name} n'est plus déclaré debout.`); if(!d.drinking.round)return ui.notifications.warn("Ouvre d'abord une ronde."); if(n(p.lastRolledRound,0)>=n(d.drinking.round,0))return ui.notifications.warn(`${a.name} a déjà lancé pour cette ronde.`);
    const fort=saveMod(a,"fort"),dc=15+3*p.drinks,fortRoll=await new Roll(`1d20 + ${fort}`).evaluate(),specialFail=n(fortRoll.total)<dc,addiction=await new Roll(`1d20 + ${fort}`).evaluate(),con=await new Roll(`1d3${specialFail?" + 1":""}`).evaluate(),cha=await new Roll("1d4").evaluate(),hours=await new Roll("1d8").evaluate();
    p.drinks+=1;p.conDamage+=Math.max(0,n(con.total));p.lastFortTotal=n(fortRoll.total);p.lastDc=dc;p.lastRolledRound=n(d.drinking.round);if(n(addiction.total)<5)p.failedAddictionSaves+=1; await setEntertainmentData(this.actor,d);
    await postChat(a,`Haut les cœurs ! — ronde ${d.drinking.round}`,`<p>Rasade ${p.drinks} : Vigueur <strong>${fortRoll.total}</strong> vs DD ${dc} — <strong>${specialFail?"échec":"réussite"}</strong>.</p><p>Ration : <strong>${con.total} Con</strong>, +${cha.total} Cha, fatigué ${hours.total} h ; dépendance : ${addiction.total} vs DD 5.</p>`,"fa-solid fa-martini-glass-citrus"); game.modules.get(MODULE_ID)?.api?.broadcastHudRefresh?.(); await this.render();
  }

  static async #nextDrinkRound() {
    await this.#saveVisibleForm(); const d=getEntertainmentData(this.actor); const active=d.drinking.participants.filter(p=>p.active&&p.actorUuid); if(active.length<1){ui.notifications.warn("Aucun buveur encore en lice.");return;}
    const enrolled=d.drinking.participants.filter(p=>p.actorUuid); if(active.length===1&&enrolled.length>1){const winner=actorByUuid(active[0].actorUuid);const wager=advisoryPayout(d.drinking.stake,enrolled.length,active[0].lowRankNpc);await postChat(winner,"Haut les cœurs ! — vainqueur",`<p><strong>${escape(winner?.name??"Le dernier pirate")}</strong> est le dernier encore debout et remporte le jeu.</p><p>Mise : ${n(d.drinking.stake,1)} po par participant ; pot théorique : <strong>${wager.pot} po</strong>.${escape(wager.note)}</p>`,"fa-solid fa-trophy");return;}
    d.drinking.round+=1; await setEntertainmentData(this.actor,d); await postChat(null,`Haut les cœurs ! — ronde ${d.drinking.round}`,`<p>La prochaine rasade est ouverte. Chaque joueur participant peut maintenant lancer lui-même les dés de son personnage depuis le HUD Skull & Shackles. Le MJ peut lancer pour les PNJ depuis la fenêtre Divertissements.</p>`,"fa-solid fa-wine-bottle"); game.modules.get(MODULE_ID)?.api?.broadcastHudRefresh?.(); await this.render();
  }

  static async #resetDrinking() { await this.#saveVisibleForm(); const d=getEntertainmentData(this.actor); d.drinking.round=0; for(const p of d.drinking.participants){p.active=true;p.drinks=0;p.conDamage=0;p.failedAddictionSaves=0;p.lastFortTotal=null;p.lastDc=15;p.lastRolledRound=0;} await setEntertainmentData(this.actor,d); game.modules.get(MODULE_ID)?.api?.broadcastHudRefresh?.(); await this.render(); }
}
