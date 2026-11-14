import fs from 'node:fs';import path from 'node:path';
import type { Action,Declaration } from './types';
import { resourcePath } from './paths';
export { stripMeta } from '../providers/schema';
export const VALID_NAME=/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;
export function discoverActions(dir=resourcePath('actions'),log:(s:string)=>void=console.log):Action[]{const out:Action[]=[];if(!fs.existsSync(dir))return out;for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.cjs')&&!f.startsWith('_')).sort()){try{const mod=require(path.join(dir,file));const t=mod.TOOL;if(!t)continue;if(!VALID_NAME.test(t.name)||typeof t.handler!=='function'){log(`WRN: invalid action ${file}`);continue;}if(out.some(x=>x.name===t.name)){log(`WRN: duplicate action ${t.name}`);continue;}out.push({...t,file});}catch(e:any){log(`WRN: action ${file}: ${e.message}`);}}return out;}
export const declarations=(actions:Action[]):Declaration[]=>actions.map(({handler,file,...d})=>d as Declaration);
