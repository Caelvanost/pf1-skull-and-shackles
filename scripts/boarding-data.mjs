import { MODULE_ID } from "./ship-data.mjs";
import { defaultCrewDevelopment, normalizeCrewDevelopment } from "./crew-development-data.mjs";

export const BOARDING_FLAG = "boarding";
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const uid=()=>{try{return foundry.utils.randomID();}catch{return Math.random().toString(36).slice(2,10);}};
const arr=(v)=>Array.isArray(v)?v:(v&&typeof v==="object"?Object.keys(v).sort((a,b)=>Number(a)-Number(b)).map(k=>v[k]):[]);

export const CREW_QUALITY = Object.freeze({
  recruits:{label:"Recrues",bonus:0},
  seasoned:{label:"Aguerris",bonus:1},
  veterans:{label:"Vétérans",bonus:2},
  elite:{label:"Élite",bonus:3},
  exceptional:{label:"Exceptionnels",bonus:4}
});

export const CREW_MORALE = Object.freeze({
  routed:{label:"En déroute",bonus:null,order:0},
  shaken:{label:"Ébranlé",bonus:-2,order:1},
  steady:{label:"Stable",bonus:0,order:2},
  confident:{label:"Confiant",bonus:1,order:3},
  exalted:{label:"Exalté",bonus:2,order:4}
});

export const OFFICER_ROLES = Object.freeze({
  captain:"Capitaine",
  masterAtArms:"Maître d’armes",
  bosun:"Maître d’équipage / Bosco",
  gunner:"Maître artilleur",
  surgeon:"Charpentier / chirurgien",
  quartermaster:"Quartier-maître"
});

export const BATTLE_EVENTS = Object.freeze({
  enemyCaptainDown:{label:"Capitaine ennemi vaincu",bonus:4,moraleDelta:0},
  enemyOfficerDown:{label:"Officier ennemi vaincu",bonus:2,moraleDelta:0},
  allyPcDown:{label:"PJ allié hors combat",bonus:-2,moraleDelta:0},
  allyCaptainDown:{label:"Capitaine allié hors combat",bonus:-4,moraleDelta:-1},
  spectacularCritical:{label:"Critique spectaculaire",bonus:1,moraleDelta:0},
  heroicManeuver:{label:"Manœuvre héroïque",bonus:1,moraleDelta:0},
  enemyFlagDown:{label:"Pavillon ennemi abattu",bonus:2,moraleDelta:0},
  strategicArea:{label:"Zone stratégique conquise",bonus:2,moraleDelta:0},
  reinforcements:{label:"Renforts",bonus:2,moraleDelta:0},
  shipOnFire:{label:"Navire en feu",bonus:-2,moraleDelta:-1},
  custom:{label:"Événement personnalisé",bonus:0,moraleDelta:0}
});

export const LOSS_FORMULAS = Object.freeze({
  stalemate:{winner:"1d3",loser:"1d3",tie:"1d3"},
  advantage:{winner:"1d3",loser:"1d6"},
  dominance:{winner:"1d3",loser:"2d4"},
  collapse:{winner:"1d2",loser:"2d6"}
});

export const CRITICAL_INJURIES = Object.freeze([
  {min:1,max:5,id:"superficialScar",label:"Cicatrice superficielle",effect:"Ornementale."},
  {min:6,max:8,id:"moderateScar",label:"Cicatrice modérée",effect:"Première cicatrice : +1 aux tests basés sur le Charisme ; les suivantes deviennent importantes."},
  {min:9,max:10,id:"majorScar",label:"Cicatrice importante",effect:"−1 aux tests basés sur le Charisme ; le MJ peut accorder +1 à Bluff, Diplomatie et Intimidation envers des pirates."},
  {min:11,max:14,id:"lostFinger",label:"Perte d’un doigt",effect:"−1 Dex par tranche de 3 doigts perdus."},
  {min:15,max:16,id:"impressiveWound",label:"Blessure impressionnante",effect:"−1 Con."},
  {min:17,max:17,id:"lostEye",label:"Perte d’un œil",effect:"−4 aux tests de Perception basés sur la vue."},
  {min:18,max:18,id:"lostLeg",label:"Perte d’une jambe",effect:"Vitesse réduite de moitié ; charge impossible."},
  {min:19,max:19,id:"lostHand",label:"Perte d’une main",effect:"Impossible de manier des objets à deux mains."},
  {min:20,max:20,id:"lostArm",label:"Perte d’un bras",effect:"−1 For ; impossible de manier des objets à deux mains."}
]);

export function createNamedCrewMember(actorUuid=""){
  return {id:uid(),actorUuid:String(actorUuid||""),exposed:true,captured:false,status:"ok",injuryId:"",injuryLabel:"",lastSurvivalTotal:0,lastSurvivalDc:0};
}

export function defaultCrewCombatProfile(){
  return {
    quality:"seasoned",
    morale:"steady",
    commandBonus:0,
    circumstanceBonus:0,
    manualCombatBonus:0,
    casualties:{light:0,severe:0,dead:0,missing:0},
    recovery:{day:0,triageBonus:0,lastTriageDay:-1,lastTriageTotal:0,lastTriageSkill:"",lastRecovered:0,lastImproved:0,history:[]},
    officers:{captain:"",masterAtArms:"",bosun:"",gunner:"",surgeon:"",quartermaster:""},
    namedCrew:[],
    events:[],
    development:defaultCrewDevelopment("seasoned")
  };
}

export function defaultBoardingData(){return{
  active:false,targetUuid:"",startedRound:0,attackersCommitted:0,defendersCommitted:0,
  attackerLosses:0,defenderLosses:0,notes:"",resolved:false,winner:"",
  phase:0,lastOutcome:null,history:[],profile:defaultCrewCombatProfile(),
  aftermath:{
    status:"pending",winnerShipUuid:"",loserShipUuid:"",winnerSide:"",
    healthyPool:0,woundedPool:0,replacementsTaken:0,prisonersHealthy:0,prisonersWounded:0,
    prisonerLevels:0,released:0,namedTransferredIds:[],resolvedAt:0
  }
};}

export function normalizeCrewCombatProfile(raw={}){
  const base=defaultCrewCombatProfile(),d={...base,...(raw??{})};
  d.quality=CREW_QUALITY[d.quality]?d.quality:base.quality;
  d.morale=CREW_MORALE[d.morale]?d.morale:base.morale;
  d.commandBonus=n(d.commandBonus);d.circumstanceBonus=n(d.circumstanceBonus);d.manualCombatBonus=n(d.manualCombatBonus);
  d.casualties={...base.casualties,...(d.casualties??{})};
  for(const k of ["light","severe","dead","missing"])d.casualties[k]=Math.max(0,Math.floor(n(d.casualties[k])));
  d.recovery={...base.recovery,...(d.recovery??{})};
  for(const k of ["day","lastTriageTotal","lastRecovered","lastImproved"])d.recovery[k]=Math.max(0,Math.floor(n(d.recovery[k])));
  d.recovery.lastTriageDay=Math.max(-1,Math.floor(n(d.recovery.lastTriageDay,-1)));
  d.recovery.triageBonus=Math.max(0,Math.min(4,Math.floor(n(d.recovery.triageBonus))));
  d.recovery.lastTriageSkill=String(d.recovery.lastTriageSkill??"");
  d.recovery.history=arr(d.recovery.history).slice(-30).map(x=>({
    day:Math.max(0,Math.floor(n(x?.day))),
    type:String(x?.type??"recovery"),
    label:String(x?.label??"Récupération"),
    recovered:Math.max(0,Math.floor(n(x?.recovered))),
    improved:Math.max(0,Math.floor(n(x?.improved))),
    total:Math.max(0,Math.floor(n(x?.total))),
    bonus:Math.floor(n(x?.bonus))
  }));
  d.officers={...base.officers,...(d.officers??{})};for(const k of Object.keys(base.officers))d.officers[k]=String(d.officers[k]??"");
  d.namedCrew=arr(d.namedCrew).map(x=>({
    ...createNamedCrewMember(),...(x??{}),id:String(x?.id||uid()),actorUuid:String(x?.actorUuid??""),exposed:Boolean(x?.exposed??true),captured:Boolean(x?.captured??false),
    status:String(x?.status??"ok"),injuryId:String(x?.injuryId??""),injuryLabel:String(x?.injuryLabel??""),
    lastSurvivalTotal:n(x?.lastSurvivalTotal),lastSurvivalDc:n(x?.lastSurvivalDc)
  })).filter(x=>x.actorUuid);
  d.events=arr(d.events).map(x=>({id:String(x?.id||uid()),key:String(x?.key??"custom"),label:String(x?.label??"Événement"),bonus:n(x?.bonus),moraleDelta:Math.trunc(n(x?.moraleDelta)),round:Math.max(0,Math.floor(n(x?.round)))}));
  d.development=normalizeCrewDevelopment(raw?.development,d.quality);
  return d;
}

export function normalizeBoardingData(raw={}){
  const d={...defaultBoardingData(),...(raw??{})};d.active=Boolean(d.active);d.targetUuid=String(d.targetUuid??"");d.startedRound=Math.max(0,Math.floor(n(d.startedRound)));
  for(const k of ["attackersCommitted","defendersCommitted","attackerLosses","defenderLosses","phase"])d[k]=Math.max(0,Math.floor(n(d[k])));
  d.notes=String(d.notes??"");d.resolved=Boolean(d.resolved);d.winner=String(d.winner??"");d.profile=normalizeCrewCombatProfile(d.profile);
  d.history=arr(d.history).slice(-30).map(x=>({...x}));
  if(!d.lastOutcome||typeof d.lastOutcome!=="object")d.lastOutcome=null;
  const a={...defaultBoardingData().aftermath,...(d.aftermath??{})};
  a.status=["pending","surrender","retreat","fled","released","processed"].includes(String(a.status))?String(a.status):"pending";
  a.winnerShipUuid=String(a.winnerShipUuid??"");a.loserShipUuid=String(a.loserShipUuid??"");a.winnerSide=String(a.winnerSide??"");
  for(const k of ["healthyPool","woundedPool","replacementsTaken","prisonersHealthy","prisonersWounded","prisonerLevels","released","resolvedAt"])a[k]=Math.max(0,Math.floor(n(a[k])));
  a.namedTransferredIds=arr(a.namedTransferredIds).map(String);d.aftermath=a;
  return d;
}

export function getBoardingData(ship){return normalizeBoardingData(ship?.getFlag?.(MODULE_ID,BOARDING_FLAG)??{});}
export async function setBoardingData(ship,data){const d=normalizeBoardingData(data);await ship.setFlag(MODULE_ID,BOARDING_FLAG,d);return d;}

export function qualityBonus(profile){return n(CREW_QUALITY[profile?.quality]?.bonus);}
export function moraleBonus(profile){return CREW_MORALE[profile?.morale]?.bonus;}
export function eventBonus(profile){return (profile?.events??[]).reduce((s,e)=>s+n(e?.bonus),0);}
export function shiftMorale(current,delta){
  const keys=Object.keys(CREW_MORALE).sort((a,b)=>CREW_MORALE[a].order-CREW_MORALE[b].order);let i=Math.max(0,keys.indexOf(current));i=Math.max(0,Math.min(keys.length-1,i+Math.trunc(n(delta))));return keys[i];
}
export function numericalModifier(own,enemy){
  own=Math.max(0,n(own));enemy=Math.max(0,n(enemy));if(enemy<=0)return 6;if(own<=0)return -6;const r=own/enemy;
  if(r>=3)return 6;if(r>=2)return 4;if(r>=1.5)return 2;if(r>=1.25)return 1;if(r<=1/3)return -6;if(r<=1/2)return -4;if(r<=1/1.5)return -2;if(r<=1/1.25)return -1;return 0;
}
export function outcomeDegree(a,b){const margin=Math.abs(n(a)-n(b));return{winner:a===b?"":(a>b?"attacker":"defender"),margin,degree:margin<=4?"stalemate":margin<=9?"advantage":margin<=14?"dominance":"collapse"};}
export function distributeLosses(total){
  const out={light:0,severe:0,dead:0,missing:0};for(let i=0;i<Math.max(0,Math.floor(n(total)));i++){const r=Math.random();if(r<.20)out.dead++;else if(r<.50)out.severe++;else if(r<.90)out.light++;else out.missing++;}return out;
}
export function injuryForRoll(value){const v=Math.max(1,Math.min(20,Math.floor(n(value,1))));return CRITICAL_INJURIES.find(x=>v>=x.min&&v<=x.max)??CRITICAL_INJURIES[0];}
