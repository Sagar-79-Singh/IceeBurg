#!/usr/bin/env node
// Electron's binary is a GitHub release asset, not an npm tarball. Retrying
// its download explicitly keeps a restricted npm install understandable.
import { downloadArtifact } from '@electron/get';
import extract from 'extract-zip';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),electron=path.join(root,'node_modules/electron');
const pkg=JSON.parse(fs.readFileSync(path.join(electron,'package.json'),'utf8'));
try{
  const zip=await downloadArtifact({version:pkg.version,artifactName:'electron',platform:process.platform,arch:process.arch,force:false,checksums:JSON.parse(fs.readFileSync(path.join(electron,'checksums.json'),'utf8'))});
  const dest=path.join(electron,'dist');fs.mkdirSync(dest,{recursive:true});await extract(zip,{dir:dest});
  const type=path.join(dest,'electron.d.ts');if(fs.existsSync(type))fs.renameSync(type,path.join(electron,'electron.d.ts'));
  fs.writeFileSync(path.join(electron,'path.txt'),process.platform==='win32'?'electron.exe':process.platform==='darwin'?'Electron.app/Contents/MacOS/Electron':'electron');
  console.log(`Electron ${pkg.version} is ready.`);
}catch(e){console.error('Electron binary download failed:',e.message);console.error('Retry on an unrestricted network, or set ELECTRON_MIRROR to a trusted mirror.');process.exitCode=1;}
