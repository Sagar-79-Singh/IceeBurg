const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=process.cwd();
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=3000){const end=Date.now()+timeout;while(Date.now()<end){if(fn())return;await sleep(25);}throw new Error('condition not met before timeout');}

function canvasContext(){
  const calls={draw:0};
  const gradient=new Proxy({},{get:()=>()=>{},set:()=>true});
  const ctx=new Proxy({canvas:null},{
    get(target,prop){
      if(prop==='canvas')return target.canvas;
      if(prop==='createLinearGradient'||prop==='createRadialGradient')return ()=>gradient;
      if(prop==='measureText')return ()=>({width:0});
      if(prop==='getImageData')return ()=>({data:new Uint8ClampedArray(4)});
      return (...args)=>{if(['stroke','fill','fillRect','strokeRect','beginPath','arc','ellipse','moveTo','lineTo'].includes(prop))calls.draw++;return undefined;};
    },
    set(target,prop,value){target[prop]=value;return true;}
  });
  return {ctx,calls};
}

test('renderer bundle boots in a DOM, draws the HUD, syncs settings and accepts commands',async()=>{
  const html=read('build/index.html');
  const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'file:///iceeburg/build/index.html'});
  const {window}=dom;
  const sent=[],invoked=[];let listener=()=>{};
  const mesh=Array.from({length:468},(_,i)=>`v ${(i%24-12)/20} ${(Math.floor(i/24)-10)/20} 0`).join('\n')+'\nf 1 2 3\n';
  window.jarvis={
    invoke:async(channel,...args)=>{invoked.push([channel,...args]);switch(channel){
      case'face-mesh':return mesh;
      case'system-status':return {cpu_percent:12,ram_percent:34,cpu_temp_c:45,uptime:'00:01'};
      case'settings':return {assistant_name:'JARVIS',mode:'gemini',push_to_talk_enabled:true};
      case'clipboard-read':return '';
      default:return null;
    }},
    send:(channel,...args)=>sent.push([channel,...args]),
    on:cb=>{listener=cb;return ()=>{};}
  };
  const {ctx,calls}=canvasContext();
  window.HTMLCanvasElement.prototype.getContext=function(){ctx.canvas=this;return ctx;};
  Object.defineProperty(window.navigator,'mediaDevices',{value:{getUserMedia:async()=>{throw new Error('no microphone in test');}},configurable:true});
  window.eval(read('build/renderer.js'));
  assert.ok(sent.some(x=>x[0]==='ready'),'renderer must announce ready');
  await until(()=>calls.draw>0);
  await until(()=>window.document.getElementById('clock').textContent.length>0);
  assert.equal(window.document.getElementById('cpu-value').textContent,'12%');
  assert.equal(window.document.getElementById('ram-value').textContent,'34%');
  listener('settings',{assistant_name:'JARVIS',mode:'pipeline',push_to_talk_enabled:true,hud_style:'face'});
  listener('state',{state:'LISTENING'});
  assert.equal(window.document.getElementById('state').textContent,'LISTENING');
  assert.equal(window.document.getElementById('engine-label').textContent,'LOCAL PIPELINE');
  assert.equal(window.document.getElementById('ptt-toggle').checked,true);
  const input=window.document.getElementById('command-input');input.value='hello';
  window.document.getElementById('command-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  await until(()=>invoked.some(x=>x[0]==='command'&&x[1]==='hello'));
  window.dispatchEvent(new window.ErrorEvent('error',{message:'test failure'}));
  assert.equal(window.document.getElementById('state').textContent,'HUD ERROR');
  window.close();
});

test('preload bundle runs in a sandbox without module/exports and exposes the allowlisted bridge',()=>{
  let exposed;const ipcCalls=[],ipcSends=[],listeners=[];
  const electron={contextBridge:{exposeInMainWorld:(name,api)=>{assert.equal(name,'jarvis');exposed=api;}},ipcRenderer:{invoke:(...a)=>{ipcCalls.push(a);return Promise.resolve('ok');},send:(...a)=>ipcSends.push(a),on:(ch,fn)=>listeners.push([ch,fn]),removeListener:()=>{}}};
  const sandbox={require:name=>{assert.equal(name,'electron');return electron;},console,Proxy,Error,Set,Object,Array,Promise,String,Boolean,Number,Math,JSON,Reflect,Symbol,Map,WeakMap,Uint8Array,setTimeout,clearTimeout};
  vm.runInNewContext(read('build/preload.js'),sandbox,{filename:'preload.js'});
  assert.ok(exposed);
  return exposed.invoke('settings').then(async()=>{
    assert.deepEqual(ipcCalls[0],['hud:settings']);
    await assert.rejects(()=>exposed.invoke('not-allowed'),/Unknown IPC channel/);
    exposed.send('ready');exposed.send('mic',new Uint8Array([1,2]));exposed.send('evil');
    assert.deepEqual(ipcSends,[['hud:ready'],['hud:mic',new Uint8Array([1,2])]]);
    let received;exposed.on((ch,data)=>{received=[ch,data];});
    const stateListener=listeners.find(([ch])=>ch==='hud:state');assert.ok(stateListener);
    stateListener[1]({}, {state:'LISTENING'});assert.deepEqual(received,['state',{state:'LISTENING'}]);
  });
});
