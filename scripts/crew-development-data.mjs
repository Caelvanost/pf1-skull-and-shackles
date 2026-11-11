const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const arr=(v)=>Array.isArray(v)?v:(v&&typeof v==="object"?Object.keys(v).sort((a,b)=>Number(a)-Number(b)).map(k=>v[k]):[]);
const uid=()=>{try{return foundry.utils.randomID();}catch{return Math.random().toString(36).slice(2,10);}};

export const CREW_XP_THRESHOLDS = Object.freeze({
  recruits:0,
  seasoned:3,
  veterans:8,
  elite:15,
  exceptional:24
});

export const MUTINY_STATES = Object.freeze({
  calm:{label:"Calme",className:"ok",order:0},
  tense:{label:"Tensions",className:"warning",order:1},
  dangerous:{label:"Mutinerie menaçante",className:"danger",order:2},
  mutiny:{label:"Mutinerie ouverte",className:"danger",order:3}
});

export function defaultCrewDevelopment(quality="seasoned"){
  const q=["recruits","seasoned","veterans","elite","exceptional"].includes(quality)?quality:"seasoned";
  return{
    xp:CREW_XP_THRESHOLDS[q]??0,
    loyalty:0,
    unrest:0,
    mutinyState:"calm",
    lastTrainingDay:-1,
    lastTrainingTotal:0,
    lastTrainingLabel:"",
    lastMutinyCheckAt:0,
    lastMutinyTotal:0,
    lastMutinyDc:0,
    history:[]
  };
}

export function normalizeCrewDevelopment(raw,quality="seasoned"){
  const hasRaw=raw&&typeof raw==="object"&&Object.keys(raw).length;
  const base=defaultCrewDevelopment(quality),d={...base,...(raw??{})};
  if(!hasRaw)d.xp=CREW_XP_THRESHOLDS[["recruits","seasoned","veterans","elite","exceptional"].includes(quality)?quality:"seasoned"]??0;
  d.xp=Math.max(0,Math.floor(n(d.xp)));
  d.loyalty=Math.max(-5,Math.min(5,Math.floor(n(d.loyalty))));
  d.unrest=Math.max(0,Math.min(10,Math.floor(n(d.unrest))));
  d.mutinyState=MUTINY_STATES[d.mutinyState]?d.mutinyState:"calm";
  d.lastTrainingDay=Math.max(-1,Math.floor(n(d.lastTrainingDay,-1)));
  d.lastTrainingTotal=Math.floor(n(d.lastTrainingTotal));
  d.lastTrainingLabel=String(d.lastTrainingLabel??"");
  d.lastMutinyCheckAt=Math.max(0,Math.floor(n(d.lastMutinyCheckAt)));
  d.lastMutinyTotal=Math.floor(n(d.lastMutinyTotal));
  d.lastMutinyDc=Math.floor(n(d.lastMutinyDc));
  d.history=arr(d.history).slice(-50).map(x=>({
    id:String(x?.id||uid()),
    at:Math.max(0,Math.floor(n(x?.at,Date.now()))),
    day:Math.max(0,Math.floor(n(x?.day))),
    type:String(x?.type??"event"),
    label:String(x?.label??"Événement"),
    xp:Math.floor(n(x?.xp)),
    loyalty:Math.floor(n(x?.loyalty)),
    unrest:Math.floor(n(x?.unrest)),
    note:String(x?.note??"")
  }));
  return d;
}

export function qualityForXp(xp){
  xp=Math.max(0,Math.floor(n(xp)));
  let result="recruits";
  for(const key of ["recruits","seasoned","veterans","elite","exceptional"]){
    if(xp>=(CREW_XP_THRESHOLDS[key]??0))result=key;
  }
  return result;
}

export function nextQualityProgress(xp){
  xp=Math.max(0,Math.floor(n(xp)));
  const keys=["recruits","seasoned","veterans","elite","exceptional"];
  const current=qualityForXp(xp),index=keys.indexOf(current),next=keys[index+1]??null;
  if(!next)return{current,next:null,currentThreshold:CREW_XP_THRESHOLDS[current],nextThreshold:null,remaining:0,percent:100};
  const a=CREW_XP_THRESHOLDS[current],b=CREW_XP_THRESHOLDS[next],percent=Math.max(0,Math.min(100,Math.round(((xp-a)/(b-a))*100)));
  return{current,next,currentThreshold:a,nextThreshold:b,remaining:Math.max(0,b-xp),percent};
}

export function applyDevelopmentDelta(dev,{xp=0,loyalty=0,unrest=0,label="Événement",note="",day=0,type="event"}={}){
  const d=normalizeCrewDevelopment(dev);
  d.xp=Math.max(0,d.xp+Math.trunc(n(xp)));
  d.loyalty=Math.max(-5,Math.min(5,d.loyalty+Math.trunc(n(loyalty))));
  d.unrest=Math.max(0,Math.min(10,d.unrest+Math.trunc(n(unrest))));
  d.history.push({id:uid(),at:Date.now(),day:Math.max(0,Math.floor(n(day))),type:String(type),label:String(label||"Événement"),xp:Math.trunc(n(xp)),loyalty:Math.trunc(n(loyalty)),unrest:Math.trunc(n(unrest)),note:String(note??"")});
  d.history=d.history.slice(-50);
  return d;
}

export function mutinyRiskLabel(dev,morale="steady"){
  const d=normalizeCrewDevelopment(dev),moralePenalty=morale==="routed"?4:morale==="shaken"?2:morale==="steady"?0:-1;
  const score=d.unrest*2-d.loyalty+moralePenalty;
  if(d.mutinyState==="mutiny")return{label:"Mutinerie ouverte",className:"danger",score};
  if(score>=16)return{label:"Critique",className:"danger",score};
  if(score>=10)return{label:"Élevé",className:"danger",score};
  if(score>=5)return{label:"Modéré",className:"warning",score};
  return{label:"Faible",className:"ok",score};
}

function shiftMoraleLocal(current,delta){
  const keys=["routed","shaken","steady","confident","exalted"];let i=Math.max(0,keys.indexOf(current));i=Math.max(0,Math.min(keys.length-1,i+Math.trunc(n(delta))));return keys[i];
}

export function applyMutinyOutcome(dev,profile,margin){
  const d=normalizeCrewDevelopment(dev,profile?.quality),m=Math.floor(n(margin));
  let label="";
  if(m>=10){d.mutinyState="calm";d.unrest=Math.max(0,d.unrest-2);profile.morale=shiftMoraleLocal(profile.morale,1);label="Autorité renforcée";}
  else if(m>=0){d.mutinyState="calm";d.unrest=Math.max(0,d.unrest-1);label="Tensions contenues";}
  else if(m>=-4){d.mutinyState="tense";d.unrest=Math.min(10,d.unrest+1);label="Mécontentement";}
  else if(m>=-9){d.mutinyState="dangerous";d.unrest=Math.min(10,d.unrest+1);profile.morale=shiftMoraleLocal(profile.morale,-1);label="Mutinerie menaçante";}
  else{d.mutinyState="mutiny";d.unrest=10;profile.morale="routed";label="Mutinerie ouverte";}
  d.history.push({id:uid(),at:Date.now(),day:0,type:"mutiny",label,xp:0,loyalty:0,unrest:0,note:`Marge ${m>=0?"+":""}${m}`});
  d.history=d.history.slice(-50);
  return{development:d,label};
}
