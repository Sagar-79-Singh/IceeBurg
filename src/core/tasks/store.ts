import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import type { Dict,Turn } from '../types';import { readJson,writeJson } from '../paths';import { localDate } from '../util';
export const MAX_EVENTS=200,KEEP_FINISHED=100;
export const newId=()=>`t${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}${crypto.randomBytes(3).toString('hex')}`;
export class TaskStore {
 tasks:Record<string,Dict>={};
 constructor(public root:string){fs.mkdirSync(root,{recursive:true});for(const f of fs.readdirSync(root).filter(f=>f.endsWith('.json')&&!f.endsWith('.turns.json'))){const d=readJson<Dict|null>(path.join(root,f),null);if(d?.id)this.tasks[d.id]=d;}}
 file(id:string){return path.join(this.root,`${id}.json`);}workdir(id:string){return path.join(this.root,id);}
 create(t:Dict){this.tasks[t.id]=structuredClone(t);this.save(t.id);this.prune();return this.get(t.id)!;}
 get(id:string){const t=this.tasks[id];return t?structuredClone(t):undefined;}all(){return Object.values(this.tasks).sort((a,b)=>a.created-b.created).map(t=>structuredClone(t));}
 save(id:string){const t=this.tasks[id];if(t){if(t.events?.length>MAX_EVENTS)t.events=t.events.slice(-MAX_EVENTS);writeJson(this.file(id),t);}}
 update(id:string,fields:Dict){if(this.tasks[id]){Object.assign(this.tasks[id],fields);this.save(id);}return this.get(id);}
 mutate(id:string,fn:(t:Dict)=>void){if(this.tasks[id]){fn(this.tasks[id]);this.save(id);}return this.get(id);}
 turnsFile(id:string,key=''){return path.join(this.root,key?`${id}.${key}.turns.json`:`${id}.turns.json`);}
 loadTurns(id:string,key=''):Turn[]{const v=readJson<any>(this.turnsFile(id,key),[]);return Array.isArray(v)?v:[];}
 saveTurns(id:string,turns:Turn[],key=''){writeJson(this.turnsFile(id,key),turns);}
 prune(){const finished=this.all().filter(t=>['done','failed','cancelled'].includes(t.status));for(const t of finished.slice(0,Math.max(0,finished.length-KEEP_FINISHED))){delete this.tasks[t.id];try{fs.unlinkSync(this.file(t.id));for(const f of fs.readdirSync(this.root))if(f.startsWith(t.id+'.')&&f.endsWith('.turns.json'))fs.unlinkSync(path.join(this.root,f));fs.rmSync(this.workdir(t.id),{recursive:true,force:true});}catch{}}}
}
