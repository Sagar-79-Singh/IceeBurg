import fs from 'node:fs';import path from 'node:path';
import { resourcePath } from './paths';
import { getPluginEnabled,getPluginSetting,savePluginConfig } from '../memory/config_manager';
import type { Dict } from './types';
export type Plugin={name:string;description?:string;DESCRIPTION?:string;file:string;register:(ctx:any)=>void};
export function discoverPlugins(dir=resourcePath('plugins'),log:(s:string)=>void=console.log):Plugin[]{const out:Plugin[]=[];if(!fs.existsSync(dir))return out;for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.cjs')&&!f.startsWith('_')).sort()){try{const p=require(path.join(dir,file));if(typeof p.register!=='function')continue;const name=String(p.NAME||path.parse(file).name);out.push({...p,name,file});}catch(e:any){log(`WRN: plugin ${file}: ${e.message}`);}}return out;}
export function registerPlugins(plugins:Plugin[],ctx:any,log:(s:string)=>void=console.log){const names:string[]=[];for(const p of plugins){if(!getPluginEnabled(p.name)){log(`SYS: Plugin disabled — ${p.name}`);continue;}try{p.register({...ctx,config:(key:string,fallback:any=null)=>getPluginSetting(p.name,key,fallback),setConfig:(values:Dict)=>savePluginConfig(p.name,values)});names.push(p.name);log(`SYS: Plugin loaded — ${p.name}`);}catch(e:any){log(`WRN: Plugin ${p.name} failed — ${e.message}`);}}return names;}
