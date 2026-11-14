const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=process.cwd();
test('build artifacts exist and pass syntax checks',()=>{
  for(const f of ['main.js','runtime.js','preload.js','renderer.js','index.html','style.css','prompt.txt','mic-worklet.js'])assert.ok(fs.existsSync(path.join(root,'build',f)),f);
  for(const f of ['build/main.js','build/runtime.js','build/preload.js','build/renderer.js','build/mic-worklet.js',...fs.readdirSync(path.join(root,'actions')).filter(f=>f.endsWith('.cjs')).map(f=>'actions/'+f)])execFileSync(process.execPath,['--check',path.join(root,f)],{stdio:'pipe'});
});
test('main bundle loads against a stubbed Electron host',()=>{
  const script=`const Module=require('module');const orig=Module._load;const electron={app:{requestSingleInstanceLock:()=>true,on:()=>{},whenReady:()=>new Promise(()=>{}),quit:()=>{},getPath:()=>require('node:os').tmpdir(),getAppPath:()=>process.cwd()},protocol:{registerSchemesAsPrivileged:()=>{},handle:()=>{}},BrowserWindow:class{},ipcMain:{handle:()=>{},on:()=>{}},dialog:{},shell:{},clipboard:{},session:{defaultSession:{setPermissionRequestHandler:()=>{},setPermissionCheckHandler:()=>{}}},globalShortcut:{register:()=>false,unregisterAll:()=>{}},desktopCapturer:{},screen:{},net:{}};Module._load=function(r,p,m){if(r==='electron')return electron;return orig.apply(this,arguments);};require(${JSON.stringify(path.join(root,'build','main.js'))});setTimeout(()=>process.exit(0),150);`;
  execFileSync(process.execPath,['-e',script],{stdio:'pipe',env:{...process.env,ICEEBURG_DATA_DIR:path.join(require('node:os').tmpdir(),'iceeburg-main-test-'+Date.now())}});
});
test('packaging includes every runtime resource directory',()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));const files=pkg.build.files;for(const need of ['build/**/*','actions/**/*','src/actions/declarations.json','assets/**/*','agents/**/*','dashboard/static/**/*','plugins/*.cjs'])assert.ok(files.includes(need),need);
  assert.equal(pkg.main,'build/main.js');assert.ok(fs.existsSync(path.join(root,'assets','jarvis.png')));assert.ok(fs.existsSync(path.join(root,'assets','jarvis.ico')));assert.ok(fs.existsSync(path.join(root,'assets','face_model.obj')));assert.ok(fs.existsSync(path.join(root,'plugins','_template.cjs')));
});
test('HUD markup exposes the controls the renderer binds at startup',()=>{
  const html=fs.readFileSync(path.join(root,'build','index.html'),'utf8');const ids=['logo','assistant-name','state','clock','settings-btn','mic-btn','wake-btn','wake-toggle','ptt-toggle','ptt-hold','remote-btn','attach-btn','folder-btn','memory-btn','tasks-btn','routines-btn','clipboard-btn','avatar','avatar-name','avatar-state','connection-label','session-time','confirm-banner','confirm-title','confirm-detail','confirm-yes','confirm-no','camera-box','camera-video','camera-close','media-box','media-title','media-close','media-video','media-audio','media-image','media-pause','media-back','media-forward','media-mute','media-time','waveform','wave-label','level-label','command-form','command-input','interrupt-btn','send-btn','file-strip','file-name','file-clear','activity-log','clear-log','content-title','content-body','copy-content','code-title','code-status','code-body','shutdown-btn','footer-state','modal-backdrop','modal-title','modal-close','modal-tabs','modal-body','modal-status','modal-done','toast','style-btn','hud-mode','cpu-value','ram-value','temp-value','uptime-value','cpu-bar','ram-bar','cpu-spark','ram-spark','engine-label'];
  for(const id of ids)assert.ok(html.includes(`id="${id}"`),id);assert.match(html,/Content-Security-Policy/);assert.ok(!html.includes('unsafe-eval'));
});
test('tool declarations cover the inline and action surfaces without duplicates',()=>{
  const inline=JSON.parse(fs.readFileSync(path.join(root,'src','actions','inline.json'),'utf8'));const all=JSON.parse(fs.readFileSync(path.join(root,'src','actions','declarations.json'),'utf8'));assert.equal(inline.length,8);assert.equal(all.length,27);assert.equal(new Set(all.map(d=>d.name)).size,27);
  for(const d of inline)assert.ok(all.some(a=>a.name===d.name),d.name);
  for(const d of all){assert.ok(d.description);assert.equal(d.parameters.type,'OBJECT');}
});
