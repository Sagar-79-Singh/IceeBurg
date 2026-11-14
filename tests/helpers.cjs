const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const esbuild=require('esbuild');
function setup(name='test'){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),`iceeburg-${name}-`));
  fs.mkdirSync(path.join(root,'data'),{recursive:true});
  fs.mkdirSync(path.join(root,'home'),{recursive:true});
  process.env.ICEEBURG_DATA_DIR=path.join(root,'data');
  process.env.ICEEBURG_HOME_DIR=path.join(root,'home');
  return root;
}
function compile(entry,name){
  const out=path.join(process.cwd(),'.arena','tests',`${name}.cjs`);
  fs.mkdirSync(path.dirname(out),{recursive:true});
  esbuild.buildSync({entryPoints:[entry],outfile:out,bundle:true,platform:'node',target:'node22',format:'cjs',packages:'external',logLevel:'silent'});
  return require(out);
}
function cleanup(root){try{fs.rmSync(root,{recursive:true,force:true});}catch{}}
module.exports={setup,compile,cleanup};
