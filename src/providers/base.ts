import type { Dict, Answer, ToolCall } from '../core/types';
export type Caps={tools:boolean;tool_format:string|null;vision:boolean;audio_out:boolean;audio_in:boolean;barge_in:boolean;non_blocking:boolean;resumption:boolean;max_tools:number|null;max_tool_chars:number|null};
export const DEFAULT_CAPS:Caps={tools:false,tool_format:null,vision:false,audio_out:false,audio_in:false,barge_in:false,non_blocking:false,resumption:false,max_tools:null,max_tool_chars:null};
export interface LLM {caps:Caps;complete(messages:Dict[],opts?:{tools?:any;timeout?:number;temperature?:number}):Promise<[string,ToolCall[]]>;stream?(messages:Dict[],opts?:Dict):AsyncGenerator<any>;models?():Promise<string[]>;}
export interface STT {caps?:Dict;transcribe(pcm:Buffer,rate?:number):Promise<string>;}
export interface TTS {caps?:Dict;sampleRate:number;synthesize(text:string):AsyncGenerator<Buffer>|Promise<Buffer>;voices?():Promise<any[]>;}
export class AsyncQueue<T>{items:T[]=[];waiters:((v:IteratorResult<T>)=>void)[]=[];closed=false;push(v:T){if(this.closed)return;const w=this.waiters.shift();if(w)w({value:v,done:false});else this.items.push(v);}close(){if(this.closed)return;this.closed=true;for(const w of this.waiters.splice(0))w({value:undefined,done:true});}async*[Symbol.asyncIterator]():AsyncGenerator<T>{while(true){if(this.items.length){yield this.items.shift()!;continue;}if(this.closed)return;const next=await new Promise<IteratorResult<T>>(r=>this.waiters.push(r));if(next.done)return;yield next.value;}}}
export const functionCall=(name:string,args:Dict={},id=''):ToolCall=>({id:id||`call_${Math.random().toString(36).slice(2,10)}`,name,args});
export const answer=(text='',calls:ToolCall[]=[]):Answer=>({text,calls});
