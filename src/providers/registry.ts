import type { Dict } from '../core/types';import { CATALOG,OpenAICompatLLM } from './llm_openai';import { PROVIDER as whisper } from './stt_whisper';import { PROVIDER as system } from './tts_system';import { PROVIDER as eleven } from './tts_elevenlabs';import { PROVIDER as piper } from './tts_piper';
const extras=[whisper,system,eleven,piper];const instances=new Map<string,any>();
export const providerCatalog=()=>CATALOG;
export const splitId=(id:string)=>{const [base,entry]=id.split('@');return [base,entry||base];};
export const getDeclaration=(id:string)=>extras.find(d=>d.id===splitId(id)[0]);
export const catalogEntry=(id:string)=>getDeclaration(id)?.catalog.find((e:any)=>e.id===splitId(id)[1])||{};
export const discover=(kind='')=>[...(kind===''||kind==='llm'?CATALOG.map(p=>({...p,kind:'llm',needs:[{key:'base_url',label:'Address',default:p.values.base_url||''},{key:'model',label:'Model',default:p.values.model||''},{key:'api_key',label:'API key',kind:'secret',default:'',required:p.local===false&&p.id!=='gemini'}],caps:{tools:true,vision:false}})):[]),...extras.filter(d=>!kind||d.kind===kind)].map(d=>({...d,_available:true}));
export function missingFields(id:string,cfg:Dict){const extra=getDeclaration(id);if(extra){const out=extra.needs.filter((f:any)=>f.required!==false&&!String(cfg[f.key]??f.default??'').trim()).map((f:any)=>f.label);if((catalogEntry(id) as any).local===false&&!cfg.api_key)out.push('API key');return [...new Set(out)];}const p=CATALOG.find(p=>p.id===splitId(id)[0]);if(!p)return ['provider'];const missing=[];if(!cfg.base_url&&!p.values.base_url)missing.push('address');if(!cfg.model&&!p.values.model)missing.push('model');if(p.local===false&&id!=='gemini'&&!cfg.api_key)missing.push('API key');return missing;}
export function build(id:string,cfg:Dict){const key=id+'|'+JSON.stringify(Object.entries(cfg).filter(([k])=>k!=='log').sort(([a],[b])=>a.localeCompare(b)));if(instances.has(key))return instances.get(key);const extra=getDeclaration(id),values={...extra?.needs.reduce((o:any,f:any)=>({...o,[f.key]:f.default}),{}),...(catalogEntry(id) as any).values,...cfg};const instance=extra?extra.factory(values):new OpenAICompatLLM({...CATALOG.find(p=>p.id===splitId(id)[0])?.values,...values});instances.set(key,instance);return instance;}
export const buildSTT=(id:string,cfg:Dict)=>build(id.startsWith('whisper')?id:'whisper@'+id,cfg);
export const buildTTS=(id:string,cfg:Dict)=>build(id.includes('@')?id:id+'@'+id,cfg);
export const reset=()=>instances.clear();
export const defaults=(id:string)=>Object.fromEntries((getDeclaration(id)?.needs||[]).map((f:any)=>[f.key,f.default]));
export const providerLabel=(id:string)=>id.includes('@')?getDeclaration(id)?.label||splitId(id)[0]:CATALOG.find(p=>p.id===id)?.label||id;
