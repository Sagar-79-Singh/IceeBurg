const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {setup,compile,cleanup}=require('./helpers.cjs');const root=setup('engines');const b=require('../build/runtime.js');
test.after(()=>cleanup(root));

test('task engine runs a fake model to completion and writes a report',async()=>{
  const {TaskEngine}=compile('src/core/tasks/engine.ts','task-engine');const dir=path.join(root,'tasks'),reports=path.join(root,'reports');const events=[];
  const e=new TaskEngine(dir,reports,[path.join(process.cwd(),'agents')],(ev,t)=>events.push(ev),2,()=>Date.now()/1000,1,()=>{},async()=>({text:'The answer is 42.',calls:[]}));
  const t=e.start('What is the answer?',{agent:'general',minutes:1,deliver:'silent'});await e.dispatch();await Promise.all([...e.workers.values()]);
  const done=e.get(t.id);assert.equal(done.status,'done');assert.equal(done.result,'The answer is 42.');assert.ok(fs.existsSync(done.report));assert.match(fs.readFileSync(done.report,'utf8'),/42/);assert.ok(events.includes('done'));e.shutdown();
});

test('task engine recovers interrupted work, steers and cancels',async()=>{
  const {TaskEngine}=compile('src/core/tasks/engine.ts','task-engine2');const dir=path.join(root,'tasks2');const e=new TaskEngine(dir,path.join(root,'reports2'),[],()=>{},1,()=>Date.now()/1000,1,()=>{},async()=>({text:'ok',calls:[]}));
  const t=e.start('Long work',{minutes:5});e.store.update(t.id,{status:'running'});e.shutdown();const e2=new TaskEngine(dir,path.join(root,'reports2'),[],()=>{},1,()=>Date.now()/1000,1,()=>{},async()=>({text:'ok',calls:[]}));
  assert.equal(e2.get(t.id).status,'queued');assert.equal(e2.get(t.id).attempts,1);assert.equal(e2.steer(t.id,'focus on tests'),true);assert.deepEqual(e2.get(t.id).notes_in,['focus on tests']);assert.equal(e2.cancel(t.id),true);assert.equal(e2.get(t.id).status,'cancelled');e2.shutdown();
});

test('OpenAI-compatible provider speaks models, completion, tools and SSE',async()=>{
  const {OpenAICompatLLM}=compile('src/providers/llm_openai.ts','llm');let sawTool=false;
  const server=http.createServer((req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{res.setHeader('Content-Type','application/json');if(req.url==='/v1/models'){res.end(JSON.stringify({data:[{id:'test-model'}]}));return;}const parsed=JSON.parse(body||'{}');sawTool=Boolean(parsed.tools?.length);if(parsed.stream){res.setHeader('Content-Type','text/event-stream');res.write('data: '+JSON.stringify({choices:[{delta:{content:'Hel'}}]})+'\n\n');res.write('data: '+JSON.stringify({choices:[{delta:{content:'lo'}}]})+'\n\n');res.write('data: [DONE]\n\n');res.end();return;}res.end(JSON.stringify({choices:[{message:{content:'',tool_calls:[{id:'c1',type:'function',function:{name:'test_tool',arguments:'{"x":1}'}}]}}]}));});});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;const llm=new OpenAICompatLLM({base_url:`http://127.0.0.1:${port}/v1`,model:'test-model'});
  try{assert.deepEqual(await llm.models(),['test-model']);const [text,calls]=await llm.complete([{role:'user',content:'hi'}],{tools:[{type:'function',function:{name:'test_tool',parameters:{type:'object'}}}]});assert.equal(text,'');assert.equal(calls[0].name,'test_tool');assert.deepEqual(calls[0].args,{x:1});assert.ok(sawTool);
    let streamed='';for await(const ev of llm.stream([{role:'user',content:'hi'}]))if(ev.text)streamed+=ev.text;assert.equal(streamed,'Hello');
  }finally{await new Promise(r=>server.close(r));}
});

test('pipeline engine streams speech, handles tools and transcribes base64 mic audio',async()=>{
  const {PipelineEngine}=compile('src/providers/engine_pipeline.ts','pipeline');const {functionCall}=compile('src/providers/base.ts','base2');let round=0;const heard=[];
  const llm={caps:{tools:true,tool_format:'openai',vision:false,audio_out:false,audio_in:false,barge_in:false,non_blocking:false,resumption:false,max_tools:null,max_tool_chars:null},async complete(){return ['ok',[]];},async *stream(){if(round++===0){yield {calls:[functionCall('test_tool',{x:1},'c1')]};}else{yield {text:'All '};yield {text:'done.'};}}};
  const stt={async transcribe(pcm){heard.push(pcm);return 'hello';}};const tts={async *speak(text){yield b.audio.toPcm16(new Array(2400).fill(0).map((_,i)=>Math.sin(i/10)*.3));}};
  const decl={name:'test_tool',description:'test',parameters:{type:'OBJECT',properties:{x:{type:'INTEGER'}}}};
  const e=new PipelineEngine(llm,stt,tts,{config:{systemInstruction:'sys',tools:[{functionDeclarations:[decl]}]},log:()=>{}});
  await e.sendClientContent({turns:{role:'user',parts:[{text:'hi'}]}});const msgs=[];let toolCall;
  for await(const m of e.receive()){msgs.push(m);if(m.kind==='tools'){toolCall=m.calls[0];await e.sendToolResponse({functionResponses:[{id:toolCall.id,name:toolCall.name,response:{result:'42'}}]});}if(m.kind==='turn_end')break;}
  assert.equal(toolCall.name,'test_tool');assert.ok(msgs.some(m=>m.kind==='audio'));assert.ok(msgs.some(m=>m.kind==='said'&&m.text.includes('done')));
  const pcm=b.audio.toPcm16(new Array(1600).fill(0).map((_,i)=>Math.sin(i/5)*.2));await e.sendRealtimeInput({audio:{data:pcm.toString('base64'),mimeType:'audio/pcm;rate=16000'}});assert.equal(await e.flushMicrophone(16000),'hello');assert.deepEqual(heard[0],pcm);await e.close();
});

test('echo guard recognises its own output and ignores silence',()=>{
  const {EchoGuard}=compile('src/core/echo.ts','echo');const g=new EchoGuard();const pcm=b.audio.toPcm16(new Array(4800).fill(0).map((_,i)=>Math.sin(i/8)*.5));g.begin();g.feedOutput(pcm,24000);assert.equal(g.isEcho(pcm,24000),true);assert.equal(g.isEcho(Buffer.alloc(4800),24000),false);g.end(0);g.reset();assert.equal(g.active,false);
});
