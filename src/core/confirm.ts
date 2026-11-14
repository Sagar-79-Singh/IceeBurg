import { mono } from './util';
export const TIMEOUT_SECONDS=90;
type Pending={key:string;title:string;detail:string;run:()=>string|Promise<string>;at:number};
let pending:Pending|undefined;let show:((title:string,detail:string)=>void)|undefined;let hide:(()=>void)|undefined;let log:((s:string)=>void)|undefined;
export function bind(s:typeof show,h:typeof hide,l:typeof log){show=s;hide=h;log=l;}
export function request(key:string,title:string,detail:string,run:()=>string|Promise<string>){if(!show)return `I cannot confirm '${title}' right now because the interface is not available, so I have not done it.`;pending={key,title,detail,run,at:mono()};try{show(title,detail);}catch(e:any){pending=undefined;return `Could not ask for confirmation: ${e.message}. Nothing was done.`;}log?.(`SYS: Awaiting confirmation — ${title}`);return `[CONFIRMATION_PENDING] I have put a confirmation on screen for: ${title}. Say ONE short sentence in the user's own language telling them you need them to confirm it on the HUD before you do it. Do not claim it is done.`;}
export function resolve(accepted:boolean){const p=pending;pending=undefined;hide?.();if(!p)return;if(mono()-p.at>TIMEOUT_SECONDS){log?.(`SYS: Confirmation expired — ${p.title}`);return;}if(!accepted){log?.(`SYS: Cancelled — ${p.title}`);return;}void Promise.resolve().then(p.run).then(r=>log?.(`SYS: Confirmed — ${p.title}. ${r||'Done.'}`)).catch(e=>log?.(`ERR: ${p.title} failed — ${e.message}`));}
export const pendingTitle=()=>pending&&mono()-pending.at<=TIMEOUT_SECONDS?pending.title:'';
