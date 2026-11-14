class JarvisMic extends AudioWorkletProcessor {
  constructor(){super();this.buf=new Int16Array(1024);this.n=0;}
  process(inputs){const c=inputs[0]?.[0];if(!c)return true;for(let i=0;i<c.length;i++){const s=Math.max(-1,Math.min(1,c[i]));this.buf[this.n++]=Math.round(s<0?s*32768:s*32767);if(this.n===1024){this.port.postMessage(this.buf.buffer,[this.buf.buffer]);this.buf=new Int16Array(1024);this.n=0;}}return true;}
}
registerProcessor('jarvis-mic',JarvisMic);
