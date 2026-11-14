/** Copy to plugins/my_plugin.cjs (no leading underscore) and restart IceeBurg.
 * A plugin runs in the Electron main process. Never create a BrowserWindow here;
 * use ctx.player to show content, log, play media or request speech. Long work
 * should return an outcome.started() line and continue asynchronously.
 * Model calls go through runtime.gemini so they inherit deadlines and fallbacks.
 */
exports.NAME='my_plugin';
exports.DESCRIPTION='One or two sentences the model uses to decide when to call this plugin.';
exports.register=ctx=>{
  ctx.addTool({
    name:'my_plugin',
    description:exports.DESCRIPTION,
    parameters:{type:'OBJECT',properties:{example_arg:{type:'STRING',description:'What this argument means'}},required:[]},
  },async(parameters)=>{
    const b=require('../build/runtime.js');
    try{
      const value=String(parameters.example_arg||'');
      const answer=await b.gemini.text(`Reply briefly to: ${value}`,b.gemini.FAST);
      const result=answer||`Received: ${value}`;
      ctx.player?.writeLog?.('SYS: my_plugin finished');
      return result;
    }catch(e){return b.outcome.failed('my_plugin',e.message);}
  });
};
