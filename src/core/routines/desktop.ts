import { RoutineEngine, type RoutineHost } from './engine';
import { dataPath } from '../paths';
import { getBriefEnabled, saveBriefEnabled } from '../../memory/config_manager';
import { ensure as ensureTasks } from '../tasks/desktop';
export const DEFAULT_FOCUSES=["The user's active projects or goals, if any are stored: ask how something is going, or offer a relevant tip.","The time of day and the user's wellbeing: a warm check-in, a reminder to take a break, or something timely.",'Something genuinely interesting or useful — a fact, a suggestion, or a question based on what you know about this person.'];
let current:RoutineEngine|undefined;
export const engine=()=>current;
export function attach(host:RoutineHost){if(current){current.host=host;return current;}current=new RoutineEngine(dataPath('memory','routines.json'),host);seedDefaults(current,getBriefEnabled());current.start();return current;}
export function seedDefaults(e:RoutineEngine,brief:boolean){if(e.seeded)return;if(!e.findBuiltin('briefing'))e.add({name:'Opening briefing',kind:'builtin',builtin:'briefing',trigger:{type:'startup'},system:true,enabled:brief,options:{news:true,news_topic:'top world news today',extra:''}});if(!e.findBuiltin('checkin'))e.add({name:'Check-in',kind:'builtin',builtin:'checkin',trigger:{type:'idle',minutes:15,cooldown:20},system:true,quiet:true,options:{focuses:DEFAULT_FOCUSES}});if(!e.findBuiltin('news_watch'))e.add({name:'News watch',kind:'builtin',builtin:'news_watch',trigger:{type:'time',rule:{type:'interval',minutes:30,start:'00:00',end:'23:59'}},system:true,quiet:true});e.markSeeded();}
export const mirrorBriefSwitch=saveBriefEnabled;
export function setBuiltinEnabled(name:string,enabled:boolean){const r=current?.findBuiltin(name);if(r&&r.enabled!==enabled)current!.update(r.id,{enabled});}
export const hostWithReady=(host:Omit<RoutineHost,'startTask'>):RoutineHost=>({...host,startTask:(text,agent,minutes,deliver)=>{ensureTasks().start(text,{agent,minutes,deliver,origin:'routine'});}});
