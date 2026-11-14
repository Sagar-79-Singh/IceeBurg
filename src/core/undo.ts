export const MAX_DEPTH=10;
const stack: {label:string; undo:()=>string|Promise<string>}[]=[];
export function pushUndo(label:string,undo:()=>string|Promise<string>){stack.push({label:label.slice(0,120),undo});while(stack.length>MAX_DEPTH)stack.shift();}
export const canUndo=()=>stack.length>0;
export const peek=()=>stack.at(-1)?.label||'';
export const history=()=>stack.map(x=>x.label).reverse();
export const clear=()=>{stack.length=0;};
export async function undoLast(){const entry=stack.pop();if(!entry)return 'There is nothing to undo. I only track things I changed myself — files I moved or wrote, and settings I adjusted.';try{return `Undone: ${entry.label}. ${await entry.undo()||''}`.trim();}catch(e:any){return `Could not undo '${entry.label}': ${e.message}`;}}
