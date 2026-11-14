const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,cleanup}=require('./helpers.cjs');const root=setup('actions');const b=require('../build/runtime.js');
const home=process.env.ICEEBURG_HOME_DIR;const action=name=>require(path.join(process.cwd(),'actions',name+'.cjs')).TOOL;
test.after(()=>cleanup(root));

test('all 19 actions load with unique valid declarations',()=>{
  const logs=[];const tools=b.actions.discoverActions(path.join(process.cwd(),'actions'),s=>logs.push(s));assert.deepEqual(logs,[]);assert.equal(tools.length,19);
  const names=tools.map(t=>t.name);assert.equal(new Set(names).size,19);for(const t of tools){assert.match(t.name,/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/);assert.equal(typeof t.handler,'function');assert.equal(t.parameters.type,'OBJECT');}
  const inline=require('../src/actions/inline.json');assert.equal(inline.length,8);assert.equal(new Set([...names,...inline.map(d=>d.name)]).size,27);
});

test('file_controller writes, reads, lists, copies, renames and undoes inside home',async()=>{
  const fc=action('file_controller');b.undo.clear();const dir=path.join(home,'Documents');fs.mkdirSync(dir,{recursive:true});
  assert.match(await fc.handler({action:'write',path:dir,name:'a.txt',content:'hello'},{}) ,/Written to: a.txt/);
  assert.match(await fc.handler({action:'read',path:dir,name:'a.txt'},{}),/hello/);
  assert.match(await fc.handler({action:'list',path:dir},{}),/a.txt/);
  assert.match(await fc.handler({action:'copy',path:path.join(dir,'a.txt'),destination:path.join(dir,'b.txt')},{}),/Copied/);
  assert.match(await fc.handler({action:'rename',path:path.join(dir,'b.txt'),new_name:'c.txt'},{}),/Renamed/);
  assert.ok(fs.existsSync(path.join(dir,'c.txt')));assert.match(await b.undo.undoLast(),/Undone: rename/);assert.ok(fs.existsSync(path.join(dir,'b.txt')));
  assert.match(await b.undo.undoLast(),/Undone: copy/);assert.ok(!fs.existsSync(path.join(dir,'b.txt')));
  assert.match(await fc.handler({action:'write',path:dir,name:'a.txt',content:'changed'},{}),/Written/);assert.match(await b.undo.undoLast(),/Undone: wrote/);assert.equal(fs.readFileSync(path.join(dir,'a.txt'),'utf8'),'hello');
  const outside=await fc.handler({action:'read',path:'/etc/passwd'},{});assert.match(outside,/Access denied/);
});

test('file_processor handles csv, json and zip without a model',async()=>{
  const fp=action('file_processor');const dir=path.join(home,'Documents');fs.mkdirSync(dir,{recursive:true});
  const csvFile=path.join(dir,'data.csv');fs.writeFileSync(csvFile,'name,score\nAda,9\nGrace,10\n');
  assert.match(await fp.handler({file_path:csvFile,action:'info'},{}),/2 rows, 2 columns/);
  assert.match(await fp.handler({file_path:csvFile,action:'stats'},{}),/score: count=2, min=9, max=10/);
  const filtered=await fp.handler({file_path:csvFile,action:'filter',column:'name',value:'Ada',format:'csv'},{});assert.match(filtered,/Saved:/);const out=path.join(dir,'data_filter.csv');assert.match(fs.readFileSync(out,'utf8'),/Ada,9/);assert.ok(!fs.readFileSync(out,'utf8').includes('Grace'));
  const jsonFile=path.join(dir,'data.json');fs.writeFileSync(jsonFile,'[{"a":1},{"a":2}]');assert.match(await fp.handler({file_path:jsonFile,action:'validate'},{}),/Valid JSON/);assert.match(await fp.handler({file_path:jsonFile,action:'to_csv'},{}),/CSV saved/);
  const AdmZip=require('adm-zip'),zip=new AdmZip();zip.addFile('inner.txt',Buffer.from('zipped'));const zipFile=path.join(dir,'test.zip');zip.writeZip(zipFile);assert.match(await fp.handler({file_path:zipFile,action:'list'},{}),/inner.txt/);assert.match(await fp.handler({file_path:zipFile,action:'extract',destination:path.join(dir,'unzipped')},{}),/Extracted/);assert.equal(fs.readFileSync(path.join(dir,'unzipped','inner.txt'),'utf8'),'zipped');
});

test('desktop organize groups files and undo restores them',async()=>{
  const dc=action('desktop');const desktop=path.join(home,'Desktop');fs.mkdirSync(desktop,{recursive:true});fs.writeFileSync(path.join(desktop,'photo.png'),'x');fs.writeFileSync(path.join(desktop,'notes.txt'),'y');b.undo.clear();
  const result=await dc.handler({action:'organize'},{});assert.match(result,/status=done/);assert.ok(fs.existsSync(path.join(desktop,'Images','photo.png')));assert.ok(fs.existsSync(path.join(desktop,'Documents','notes.txt')));
  assert.match(await b.undo.undoLast(),/Undone: organize desktop/);assert.ok(fs.existsSync(path.join(desktop,'photo.png')));assert.ok(fs.existsSync(path.join(desktop,'notes.txt')));
});

test('reminder rejects past and malformed times before touching the OS',async()=>{
  const r=action('reminder');assert.match(await r.handler({date:'2000-01-01',time:'09:00',message:'old'},{}),/already passed/);assert.match(await r.handler({date:'not-a-date',time:'09:00',message:'bad'},{}),/couldn't parse/);
});

test('video_player reports missing local files and stop without a display',async()=>{
  const vp=action('video_player');const logs=[];const player={writeLog:s=>logs.push(s),stopVideo(){logs.push('stop');},showVideo(){},showImage(){},videoState:async()=>({kind:'none'}),videoIsPlaying:async()=>false};
  assert.match(await vp.handler({action:'play',source:'/definitely/missing.mp4',source_type:'file'},{player}),/status=failed/);assert.match(await vp.handler({action:'stop'},{player}),/Closed/);assert.ok(logs.includes('stop'));
});

test('background_tasks and routines actions use the shared engines',async()=>{
  const bt=action('background_tasks');const engine=b.tasks.ensure();const t=engine.start('Write a test note',{agent:'general',minutes:1,deliver:'silent'});
  assert.match(await bt.handler({action:'status',task_id:t.id},{}),new RegExp(t.id));assert.match(await bt.handler({action:'cancel',task_id:t.id},{}),/cancelled=true/);engine.shutdown();
  const calls=[];const host={ready:()=>true,idleSeconds:()=>0,say:x=>calls.push(x),prompt(){},builtin(){},startTask(){},log(){}};const re=b.routines.attach(host);const rt=action('routines');
  const added=await rt.handler({action:'add',kind:'say',text:'hello',on:'startup',name:'Action routine'},{});assert.match(added,/status=done/);const id=added.match(/id=(r[0-9a-f]+)/)[1];
  assert.match(await rt.handler({action:'list'},{}),/Action routine/);assert.match(await rt.handler({action:'run_now',id},{}),/result=ran/);assert.deepEqual(calls,['hello']);
  assert.match(await rt.handler({action:'quiet_hours',between:'23:00-08:00'},{}),/23:00-08:00/);assert.match(await rt.handler({action:'remove',id},{}),/removed=/);re.shutdown();
});
