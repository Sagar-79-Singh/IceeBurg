const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,compile,cleanup}=require('./helpers.cjs');const root=setup('network');process.env.HOME=path.join(root,'home');const b=require('../build/runtime.js');
test.after(()=>cleanup(root));

test('dashboard pairing, auth, commands, uploads and encryption',async()=>{
  const dash=compile('src/dashboard/server.ts','dashboard');const key=dash.deriveKey('ABCD2345');const enc=dash.encrypt(key,'secret command');assert.equal(dash.decrypt(key,enc),'secret command');assert.throws(()=>dash.decrypt(key,enc.slice(0,-4)+'AAAA'));
  const d=new dash.DashboardServer();assert.equal(await d.serve(),true,d.bindError);const base='http://127.0.0.1:8000';
  try{const pin=d.newKey();assert.match(await (await fetch(base+'/login')).text(),/<html|<!doctype/i);
    assert.equal((await fetch(base+'/api/files')).status,401);
    const login=await fetch(base+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin})});assert.equal(login.status,200);const {token}=await login.json();assert.ok(token);
    const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
    const cmd=await fetch(base+'/api/command',{method:'POST',headers,body:JSON.stringify({text:'hello from phone'})});assert.equal(cmd.status,200);assert.equal(await d.nextCommand(),'hello from phone');
    const encCmd=await fetch(base+'/api/command',{method:'POST',headers,body:JSON.stringify({enc:dash.encrypt(d.aes(pin),'encrypted hi')})});assert.equal(encCmd.status,200);assert.equal(await d.nextCommand(),'encrypted hi');
    const form=new FormData();form.append('file',new Blob(['phone upload'],{type:'text/plain'}),'note.txt');const up=await fetch(base+'/api/upload',{method:'POST',headers:{Authorization:'Bearer '+token},body:form});assert.equal(up.status,200);const uploaded=await up.json();assert.equal(uploaded.name,'note.txt');
    const files=await (await fetch(base+'/api/files',{headers})).json();assert.ok(files.files.some(f=>f.name==='note.txt'));
    const dl=await fetch(base+'/uploads/note.txt?token='+encodeURIComponent(token));assert.equal(await dl.text(),'phone upload');
    const auto=await fetch(base+'/auto-login?key='+d.newKey());assert.equal(auto.status,200);assert.match(await auto.text(),/jarvis_token/);
    const revoke=await fetch(base+'/api/revoke-devices',{method:'POST',headers});assert.equal(revoke.status,200);
  }finally{await d.stop();}
});

test('cloud pairing pins the certificate and mirrors reminders/events',async()=>{
  const cloud=compile('src/core/cloud.ts','cloud');const port=17443;const {doc,cert}=cloud.initLink('127.0.0.1',port);const pem=fs.readFileSync(cert,'utf8');const code=cloud.makePairCode('127.0.0.1',port,doc.secret,cloud.fingerprint(pem));
  assert.deepEqual(cloud.parsePairCode(code).secret,doc.secret);assert.throws(()=>cloud.parsePairCode('jarvis-cloud://host/?s=bad&f=bad'));
  const service=new cloud.CloudService(()=>{});await service.start('127.0.0.1',port);
  try{const client=cloud.CloudClient.fromCode(code);const reminder=await client.request('POST','reminder',{message:'call Ada',at:'2030-01-01 09:00'});assert.equal(reminder.ok,true);assert.ok(service.state.reminders.some(r=>r.message==='call Ada'));
    await client.request('POST','event',{kind:'test',text:'hello'});const poll=await client.request('POST','poll',{info:{name:'test'}});assert.ok(poll.events.some(e=>e.kind==='test'));
    const bad=new cloud.CloudClient('127.0.0.1',port,'0'.repeat(64),cloud.fingerprint(pem));await assert.rejects(()=>bad.request('POST','poll',{}),/Invalid pairing secret/);
  }finally{await service.stop();}
});

test('wake-on-lan builds a valid magic packet',()=>{
  const cloud=compile('src/core/cloud.ts','cloud2');assert.equal(cloud.normaliseMac('aa-bb-cc-dd-ee-ff'),'AA:BB:CC:DD:EE:FF');assert.throws(()=>cloud.normaliseMac('xyz'));
  const packet=cloud.magicPacket('AA:BB:CC:DD:EE:FF');assert.equal(packet.length,102);assert.deepEqual(packet.subarray(0,6),Buffer.alloc(6,255));assert.deepEqual(packet.subarray(6,12),Buffer.from('aabbccddeeff','hex'));assert.deepEqual(packet.subarray(96,102),Buffer.from('aabbccddeeff','hex'));
});
