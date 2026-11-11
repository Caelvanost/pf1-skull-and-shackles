import { MODULE_ID } from "./ship-data.mjs";
export const BOARDING_FLAG = "boarding";
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
export function defaultBoardingData(){return{active:false,targetUuid:"",startedRound:0,attackersCommitted:0,defendersCommitted:0,attackerLosses:0,defenderLosses:0,notes:"",resolved:false,winner:""};}
export function normalizeBoardingData(raw={}){const d={...defaultBoardingData(),...(raw??{})};d.active=Boolean(d.active);d.targetUuid=String(d.targetUuid??"");d.startedRound=Math.max(0,Math.floor(n(d.startedRound)));for(const k of ["attackersCommitted","defendersCommitted","attackerLosses","defenderLosses"])d[k]=Math.max(0,Math.floor(n(d[k])));d.notes=String(d.notes??"");d.resolved=Boolean(d.resolved);d.winner=String(d.winner??"");return d;}
export function getBoardingData(ship){return normalizeBoardingData(ship?.getFlag?.(MODULE_ID,BOARDING_FLAG)??{});}
export async function setBoardingData(ship,data){const d=normalizeBoardingData(data);await ship.setFlag(MODULE_ID,BOARDING_FLAG,d);return d;}
