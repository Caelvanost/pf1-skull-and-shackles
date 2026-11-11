import { MODULE_ID } from "./ship-data.mjs";
import { getDisguiseData, setDisguiseData, addDisguiseHistory } from "./ship-disguise-data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
function n(v, f=0){const x=Number(v);return Number.isFinite(x)?x:f;}

export class ShipDisguiseController extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["pf1-ss", "pf1-ss-disguise", "standard-form"],
    tag: "form",
    position: { width: 760, height: 720 },
    window: { icon: "fa-solid fa-masks-theater", resizable: true },
    actions: {
      rollDuration: this.#rollDuration,
      startWork: this.#startWork,
      completeWork: this.#completeWork,
      negotiateFinancing: this.#negotiateFinancing,
      resetIdentity: this.#resetIdentity,
      addPayment: this.#addPayment
    },
    form: { handler: this.#onSubmit, closeOnSubmit: false }
  };
  static PARTS = { main: { template: `modules/${MODULE_ID}/templates/ship-disguise-controller.hbs` } };

  constructor(actor, options={}) {
    super({ id:`pf1-ss-disguise-${actor.id}`, ...options, window:{ ...(options.window??{}), title:`Pétardage & identité — ${actor.name}` } });
    this.actor = actor;
  }
  static open(actor) {
    if (!actor || actor.type !== "vehicle") { ui.notifications.warn("Sélectionne un Vehicle PF1."); return null; }
    const app = new ShipDisguiseController(actor); app.render({force:true}); return app;
  }
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const data = getDisguiseData(this.actor);
    return {
      ...context, actor:this.actor, data,
      friendly: data.attitude === "friendly",
      indifferent: data.attitude === "indifferent",
      statusLabel: ({none:"Non commencé", planned:"Devis établi", working:"En cale sèche", complete:"Pétardage terminé", failed:"Échec du pétardage"})[data.status],
      canComplete: data.status === "working" || data.status === "planned",
      historyRows: [...data.history].reverse().map(h=>({ ...h, date:new Date(h.timestamp).toLocaleString() })),
      financingRemaining: data.financing.enabled ? Math.max(0, Math.round(data.totalCost * data.financing.repaymentPercent / 100 - data.financing.paid)) : 0,
      isGM: Boolean(game.user?.isGM)
    };
  }
  static async #onSubmit(event, form, formData) {
    const obj=formData.object ?? formData.toObject?.() ?? Object.fromEntries(formData.entries());
    const incoming=foundry.utils.expandObject(obj).disguise ?? {};
    const d=getDisguiseData(this.actor);
    foundry.utils.mergeObject(d,incoming,{inplace:true,overwrite:true,insertKeys:true,insertValues:true});
    d.purchasePrice=Math.max(0,n(incoming.purchasePrice,d.purchasePrice));
    d.hiddenCompartments=Math.max(0,Math.floor(n(incoming.hiddenCompartments,d.hiddenCompartments)));
    d.builderModifier=n(incoming.builderModifier,d.builderModifier);
    await setDisguiseData(this.actor,d); await this.render();
  }
  async #save(){ try{await this.submit();}catch(e){console.warn(`${MODULE_ID} | disguise save`,e);} }

  static async #rollDuration(){ await this.#save(); const d=getDisguiseData(this.actor); const roll=await(new Roll("1d4+4")).evaluate(); d.durationDays=n(roll.total,5); d.status="planned"; await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:this.actor}),flavor:`Délai de pétardage de ${this.actor.name}`}); await setDisguiseData(this.actor,d); await this.render(); }
  static async #startWork(){ await this.#save(); const d=getDisguiseData(this.actor); if(!d.durationDays){ const r=await(new Roll("1d4+4")).evaluate(); d.durationDays=n(r.total,5); } d.status="working"; addDisguiseHistory(d,{type:"start",text:`Pétardage commencé : ${d.durationDays} jour(s), devis ${d.totalCost} po.`}); await setDisguiseData(this.actor,d); ui.notifications.info(`Le navire entre en cale sèche pour ${d.durationDays} jour(s).`); await this.render(); }
  static async #completeWork(){
    await this.#save(); const d=getDisguiseData(this.actor);
    const roll=await(new Roll(`1d20 + ${n(d.builderModifier,14)}`)).evaluate(); d.lastCraftTotal=n(roll.total); const ok=d.lastCraftTotal>=15;
    await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:this.actor}),flavor:`Pétardage — Artisanat (bateaux) DD 15`});
    if(ok){
      const oldName=this.actor.name; const newName=String(d.proposedName||oldName).trim()||oldName;
      d.status="complete"; d.currentIdentity=newName;
      addDisguiseHistory(d,{type:"identity",from:oldName,to:newName,flag:d.flagDescription,notes:d.appearanceNotes,text:`${oldName} devient ${newName}.`});
      if(newName!==oldName) await this.actor.update({name:newName});
      ui.notifications.info(`Pétardage réussi. Reconnaître le navire exige Perception DD 20 après au moins 2 minutes d'observation attentive.`);
    } else { d.status="failed"; addDisguiseHistory(d,{type:"failure",text:`Échec du pétardage (${d.lastCraftTotal} contre DD 15).`}); ui.notifications.warn("Le test d'Artisanat (bateaux) DD 15 a échoué."); }
    await setDisguiseData(this.actor,d); await this.render();
  }
  static async #negotiateFinancing(){
    await this.#save(); const d=getDisguiseData(this.actor); const mod=n(d.financing?.diplomacyModifier,0); const roll=await(new Roll(`1d20 + ${mod}`)).evaluate();
    const total=n(roll.total); d.financing.enabled=true; d.financing.negotiated=total>=20; d.financing.repaymentPercent=d.financing.negotiated?133:150;
    await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:this.actor}),flavor:`Négociation du financement de Frêle Colin — Diplomatie DD 20`});
    await ChatMessage.create({content:`<div class="pf1-ss-chat-card"><h3>Négociation du financement</h3><p>Diplomatie : <strong>${total}</strong> contre DD 20 — ${total>=20?"réussite : remboursement à 133 %":"échec : remboursement à 150 %"}.</p></div>`});
    await setDisguiseData(this.actor,d); await this.render();
  }
  static async #addPayment(){ await this.#save(); const d=getDisguiseData(this.actor); if(!d.financing.enabled)return; const amount=n(d.financing?.paymentAmount,0); if(amount<=0)return ui.notifications.warn("Indique un montant de paiement supérieur à 0."); d.financing.paid+=amount; d.financing.paymentAmount=0; addDisguiseHistory(d,{type:"payment",text:`Paiement à Frêle Colin : ${amount} po.`}); await setDisguiseData(this.actor,d); await this.render(); }
  static async #resetIdentity(){ await this.#save(); const d=getDisguiseData(this.actor); d.proposedName=this.actor.name; d.flagDescription=""; d.appearanceNotes=""; d.durationDays=0; d.status="none"; d.lastCraftTotal=null; await setDisguiseData(this.actor,d); await this.render(); }
}
