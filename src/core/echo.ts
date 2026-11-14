import { mono } from './util';
const edges=[200,400,700,1100,1700,2600,3800,5200,7000];
export function rms(pcm:Buffer){if(!pcm.length)return 0;let sum=0,n=0;for(let i=0;i+1<pcm.length;i+=2){const v=pcm.readInt16LE(i)/32768;sum+=v*v;n++;}return Math.sqrt(sum/(n||1));}
export function bandEnergies(pcm:Buffer,rate:number){const n=Math.floor(pcm.length/2);if(n<64)return Array(8).fill(0);const x=Float64Array.from({length:n},(_,i)=>pcm.readInt16LE(i*2)/32768);const mean=x.reduce((a,b)=>a+b,0)/n;for(let i=0;i<n;i++)x[i]-=mean;const out=Array(8).fill(0),N=512;for(let k=1;k<=N/2;k++){const f=k*rate/N;let re=0,im=0;for(let t=0;t<Math.min(n,N);t++){const w=.5-.5*Math.cos(2*Math.PI*t/(N-1));const a=2*Math.PI*k*t/N;re+=x[t]*w*Math.cos(a);im-=x[t]*w*Math.sin(a);}const mag=Math.hypot(re,im);for(let b=0;b<8;b++)if(f>=edges[b]&&f<edges[b+1])out[b]+=mag;}const sum=out.reduce((a,b)=>a+b,0)||1;return out.map(v=>v/sum);}
export class EchoGuard {
 speaking=false;tailUntil=0;head:number[]=[];history:{at:number;bands:number[]}[]=[];floor=.22;blocks=0;warmup=0;relearn=0;lastLevel=0;
 begin(){this.speaking=true;this.head=[];this.blocks=0;this.relearn=0;}
 feedOutput(pcm:Buffer,rate=24000){const b=bandEnergies(pcm,rate);this.history.push({at:mono(),bands:b});if(this.head.length<97)this.head.push(...b.map(v=>v*1.15));this.history=this.history.filter(h=>mono()-h.at<1.5);}
 end(tail=.25){this.speaking=false;this.tailUntil=mono()+tail;}
 get active(){return this.speaking||mono()<this.tailUntil;}
 isEcho(pcm:Buffer,rate=16000){const level=rms(pcm);this.lastLevel=level;if(!this.active)return false;if(level<.06)return false;if(!this.head.length)return true;const b=bandEnergies(pcm,rate);let best=0;for(const h of this.history){let dot=0,a=0,c=0;for(let i=0;i<8;i++){dot+=b[i]*h.bands[i];a+=b[i]*b[i];c+=h.bands[i]*h.bands[i];}best=Math.max(best,dot/(Math.sqrt(a*c)||1));}if(best>.78){this.blocks++;if(this.blocks>12)this.relearn++;if(this.relearn>28){this.head=b;this.relearn=0;}return true;}this.blocks=0;this.warmup++;if(this.warmup>16&&level>this.floor)this.floor+=(level-this.floor)*.02;return level<Math.max(.15,this.floor*1.5)&&best>.5;}
 reset(){this.speaking=false;this.tailUntil=0;this.history=[];this.head=[];this.blocks=0;}
}
