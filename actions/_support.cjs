const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const declarations=require('../src/actions/declarations.json');
function tool(name,handler,extra={}){const d=declarations.find(d=>d.name===name);if(!d)throw Error(`Missing declaration: ${name}`);return {...d,...extra,handler};}
const home=()=>process.env.ICEEBURG_HOME_DIR||os.homedir();
const folder=name=>path.join(home(),name[0].toUpperCase()+name.slice(1));
function resolvePath(raw='home',name=''){let p=String(raw||'home').trim().replace(/^["']|["']$/g,'');const shortcuts={home:home(),desktop:folder('desktop'),downloads:folder('downloads'),documents:folder('documents'),pictures:folder('pictures'),music:folder('music'),videos:folder('videos')};const [head,...rest]=p.split(/[\\/]/);p=shortcuts[head.toLowerCase()]?path.join(shortcuts[head.toLowerCase()],...rest):p.startsWith('~')?path.join(home(),p.slice(1)):path.resolve(p);return name?path.join(p,name):p;}
const safe=p=>{const r=path.relative(home(),path.resolve(p));return r===''||!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r);};
const size=b=>{let i=0;for(;b>=1024&&i<4;i++)b/=1024;return `${b.toFixed(1)} ${['B','KB','MB','GB','TB'][i]}`;};
const entries=p=>fs.readdirSync(p,{withFileTypes:true});
function walk(root,maxDirs=500){const out=[];let dirs=0;const visit=p=>{if(dirs++>maxDirs)return;let es;try{es=entries(p);}catch{return;}for(const e of es){const f=path.join(p,e.name);if(e.isDirectory())visit(f);else if(e.isFile())out.push(f);}};visit(root);return out;}
const quotePS=s=>"'"+String(s).replace(/'/g,"''")+"'";
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
module.exports={tool,home,folder,resolvePath,safe,size,entries,walk,quotePS,xml};
