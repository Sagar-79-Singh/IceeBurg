import fs from 'node:fs';
import { dataPath, readJson, writeJson } from '../core/paths';
import type { Dict } from '../core/types';
import { bool, clamp } from '../core/util';
export const configFile = () => dataPath('config','api_keys.json');
export const configExists = () => fs.existsSync(configFile());
export function loadApiKeys(): Dict { const value=readJson<Dict>(configFile(),{}); return value && typeof value==='object' && !Array.isArray(value) ? value : {}; }
export function updateConfig(fields: Dict): void { const data=loadApiKeys(); if (fs.existsSync(configFile())) { try { JSON.parse(fs.readFileSync(configFile(),'utf8')); } catch { fs.copyFileSync(configFile(),`${configFile()}.broken-${Date.now()}`); } } writeJson(configFile(),{...data,...fields}); }
export function saveApiKeys(key: string) { const d=loadApiKeys(); d.gemini_api_key=key.trim(); if(d.gemini_api_key) delete d.local_only; writeJson(configFile(),d); }
export const getGeminiKey = () => String(loadApiKeys().gemini_api_key || '');
export const isConfigured = () => getGeminiKey().length>15;
export const getAssistantName = () => String(loadApiKeys().assistant_name || 'JARVIS');
export const getUserName = () => String(loadApiKeys().user_name || '');
export const saveAssistantConfig = (assistantName: string,userName: string) => updateConfig({assistant_name:assistantName.trim()||'JARVIS',user_name:userName.trim()});
export const AVAILABLE_VOICES=['Charon','Puck','Kore','Fenrir','Aoede']; export const DEFAULT_VOICE='Charon';
export const getVoice = () => { const v=loadApiKeys().voice_name; return AVAILABLE_VOICES.includes(v)?v:DEFAULT_VOICE; };
export const saveVoice = (v: string) => updateConfig({voice_name:AVAILABLE_VOICES.includes(v)?v:DEFAULT_VOICE});
export const getWakeWordEnabled = () => bool(loadApiKeys().wake_word_enabled);
export const saveWakeWordEnabled = (v: boolean) => updateConfig({wake_word_enabled:v});
export const getPushToTalkEnabled = () => bool(loadApiKeys().push_to_talk_enabled);
export const savePushToTalkEnabled = (v: boolean) => updateConfig({push_to_talk_enabled:v});
export const getHudStyle = () => loadApiKeys().hud_style==='core'?'core':'face';
export const saveHudStyle = (v: string) => updateConfig({hud_style:v==='core'?'core':'face'});
export const getUiScale = () => { const n=Number(loadApiKeys().ui_scale)||0; return n>=.5?Math.min(n,3):0; };
export const saveUiScale = (v: number) => updateConfig({ui_scale:v});
export const getThinkingEnabled = () => bool(loadApiKeys().thinking_enabled);
export const saveThinkingEnabled = (v: boolean) => updateConfig({thinking_enabled:v});
export function getTurnTuning(): Dict { const c=loadApiKeys().turn_tuning||{}; const i=(k:string,d:number,l:number,h:number)=>Number.isFinite(Number(c[k]))?clamp(Math.trunc(Number(c[k])),l,h):d; return {enabled:bool(c.enabled),silence_ms:i('silence_ms',550,200,3000),prefix_ms:i('prefix_ms',150,0,1000),end_sensitivity:['high','low'].includes(c.end_sensitivity)?c.end_sensitivity:'default',start_sensitivity:['high','low'].includes(c.start_sensitivity)?c.start_sensitivity:'default'}; }
export const saveTurnTuning = (v: Dict) => updateConfig({turn_tuning:{...getTurnTuning(),...v}});
export const getProactiveAudioEnabled = () => bool(loadApiKeys().proactive_audio_enabled,true);
export const saveProactiveAudioEnabled = (v: boolean) => updateConfig({proactive_audio_enabled:v});
export const getMediaResolution = () => { const v=loadApiKeys().media_resolution||'medium'; return ['default','low','medium','high'].includes(v)?v:'medium'; };
export const saveMediaResolution = (v: string) => updateConfig({media_resolution:v});
export const getBriefEnabled = () => bool(loadApiKeys().brief_enabled,true);
export const saveBriefEnabled = (v: boolean) => updateConfig({brief_enabled:v});
export const getInputDevice = () => String(loadApiKeys().input_device||'');
export const saveInputDevice = (v: string) => updateConfig({input_device:v});
export const getOutputDevice = () => String(loadApiKeys().output_device||'');
export const saveOutputDevice = (v: string) => updateConfig({output_device:v});
export const getPluginEnabled = (name: string) => bool(loadApiKeys().plugins_enabled?.[name],true);
export const savePluginEnabled = (name: string,v: boolean) => updateConfig({plugins_enabled:{...loadApiKeys().plugins_enabled,[name]:v}});
export const getPluginConfig = (ns: string) => ({...(loadApiKeys().plugin_config?.[ns]||{})});
export const getPluginSetting = (ns:string,key:string,fallback:any=null) => getPluginConfig(ns)[key]??fallback;
export const savePluginConfig = (ns:string,v:Dict) => updateConfig({plugin_config:{...loadApiKeys().plugin_config,[ns]:{...getPluginConfig(ns),...v}}});
export function upgradeIds(block: Dict): Dict { const creds={...(block.creds||{})}; const moved:Dict={}; for(const [pid,cfg] of Object.entries<any>(creds)){if(pid.includes('@')||!cfg?.catalog)continue;const id=`${pid}@${cfg.catalog}`;creds[id]??={...cfg};delete creds[pid];moved[pid]=id;} if(!Object.keys(moved).length)return block; const out: Dict={...block,creds}; if(out.pipeline)out.pipeline=Object.fromEntries(Object.entries(out.pipeline).map(([k,v])=>[k,moved[String(v)]||v]));for(const k of ['sidecar','coding'])if(moved[out[k]])out[k]=moved[out[k]];return out; }
export const getProviders = (): Dict => upgradeIds(loadApiKeys().providers||{});
export const getProviderMode = () => getProviders().mode==='pipeline'?'pipeline':'gemini';
export const getProviderConfig = (id:string) => ({...(getProviders().creds?.[id]||{})});
export const getPipeline = () => ({...getProviders().pipeline});
export const getSidecarProvider = () => String(getProviders().sidecar||'');
export const getCodingProvider = () => String(getProviders().coding||'');
export const getSidecarFirst = () => bool(getProviders().sidecar_first);
export function saveProviders(fields: Dict) { const p=getProviders(); if(fields.mode)p.mode=fields.mode==='pipeline'?'pipeline':'gemini';if(fields.pipeline)p.pipeline={...p.pipeline,...fields.pipeline};if(fields.creds){p.creds??={};for(const [id,v] of Object.entries(fields.creds))p.creds[id]={...p.creds[id],...(v as Dict)};}for(const k of ['sidecar','coding','sidecar_first'])if(fields[k]!==undefined)p[k]=fields[k];updateConfig({providers:p}); }
export const saveProviderMode = (mode:string) => saveProviders({mode});
export const saveProviderConfig = (id:string,values:Dict) => saveProviders({creds:{[id]:values}});
export const savePipeline = (v:Dict) => saveProviders({pipeline:v});
export const saveSidecarProvider = (sidecar:string) => saveProviders({sidecar});
export const saveCodingProvider = (coding:string) => saveProviders({coding});
export const saveSidecarFirst = (sidecar_first:boolean) => saveProviders({sidecar_first});
