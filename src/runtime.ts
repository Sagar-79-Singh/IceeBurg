/** The stable CommonJS namespace used by actions and plugins. Bundled separately
 * so the Electron host and every tool share the same task/routine engines. */
import * as util from './core/util';
import * as outcome from './core/outcome';
import * as paths from './core/paths';
import * as config from './memory/config_manager';
import * as gemini from './core/gemini';
import * as providers from './providers/registry';
import * as tasks from './core/tasks/desktop';
import * as routines from './core/routines/desktop';
import * as routineRules from './core/routines/rules';
import * as screenact from './core/screenact';
import * as appidentity from './core/appidentity';
import * as confirm from './core/confirm';
import { pushUndo } from './core/undo';
import * as memory from './memory/memory_manager';
import * as undo from './core/undo';
import * as action_loader from './core/action_loader';
import * as plugin_loader from './core/plugin_loader';
import * as audio from './providers/audio';
const loadMemory=memory.loadMemory;
export { util,outcome,paths,config,gemini,providers,tasks,routines,routineRules,screenact,appidentity,confirm,pushUndo,loadMemory,memory,undo,audio };
export async function captureScreen():Promise<Buffer>{const {desktopCapturer,screen}=require('electron');const display=screen.getPrimaryDisplay(),sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:1920,height:1080}});const source=sources.find((s:any)=>String(s.display_id)===String(display.id))||sources[0];if(!source)throw Error('No screen is available to capture');return source.thumbnail.toPNG();}
export let cloudMirrorReminder:undefined|((message:string,at:string)=>Promise<void>);
export function setCloudMirrorReminder(fn:typeof cloudMirrorReminder){cloudMirrorReminder=fn;}
export { action_loader as actions, plugin_loader as plugins };
