import { spawn, execFile } from 'node:child_process';
import fs from 'node:fs';
import { promisify } from 'node:util';
export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
export const now = () => Date.now() / 1000;
export const mono = () => performance.now() / 1000;
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const clone = <T>(x: T): T => structuredClone(x);
export const bool = (v: any, fallback = false) => typeof v === 'boolean' ? v : typeof v === 'string' ? ['true','yes','1','on'].includes(v.toLowerCase()) : v == null ? fallback : Boolean(v);
export function number(v: any): number | undefined { if (v == null || typeof v === 'boolean') return undefined; if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : undefined; const m = String(v).replace(/,/g,'.').match(/-?\d+(?:\.\d+)?/); return m ? Math.round(Number(m[0])) : undefined; }
export function seconds(v: any): number | undefined { if (typeof v === 'number') return v; const s = String(v ?? ''); if (s.includes(':')) { const p = s.split(':').map(Number); return p.every(Number.isFinite) ? p.reduce((a,b) => a * 60 + b, 0) : undefined; } return s.trim() && Number.isFinite(Number(s)) ? Number(s) : undefined; }
export const clock = (s: number) => { s = Math.max(0, Math.floor(s)); const s2 = String(s % 60).padStart(2,'0'), m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}:${s2}` : `${m}:${s2}`; };
export const slug = (s: string) => s.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/^-|-$/g,'').slice(0,40) || 'task';
export const title = (s: string) => { s = s.replace(/\s+/g,' ').trim(); return s.length <= 70 ? s : s.slice(0,67).trimEnd() + '…'; };
export const stripFences = (s: string) => s.trim().replace(/^```[\w+-]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
export function parseJson(text: string): any { try { return JSON.parse(stripFences(text).replace(/^json\s*\n/i,'')); } catch { const m = text.match(/[{\[][\s\S]*[}\]]/); if (m) { try { return JSON.parse(m[0]); } catch {} } return null; } }
export const pexec = promisify(execFile);
export async function run(args: string[], options: { cwd?: string; timeout?: number; input?: string; env?: NodeJS.ProcessEnv; maxBuffer?: number } = {}): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise(resolve => { const child = spawn(args[0], args.slice(1), { cwd: options.cwd, env: { ...process.env, ...options.env }, windowsHide: true, shell: false, stdio: ['pipe','pipe','pipe'] }); let stdout='',stderr='',done=false; const limit = options.maxBuffer ?? 4_000_000;
    const finish = (code: number) => { if (done) return; done=true; clearTimeout(timer); resolve({ code, stdout, stderr }); };
    const timer = setTimeout(() => { stderr += '\nProcess timed out.'; child.kill('SIGKILL'); }, Math.max(100, options.timeout ?? 30000));
    child.stdout.on('data', b => { if (stdout.length < limit) stdout += b.toString(); }); child.stderr.on('data', b => { if (stderr.length < limit) stderr += b.toString(); }); child.on('error', e => { stderr += String(e); finish(-1); }); child.on('close', code => finish(code ?? -1)); child.stdin.on('error', ()=>{}); child.stdin.end(options.input || '');
  });
}
export function detach(args: string[], cwd?: string): number | undefined { const child = spawn(args[0], args.slice(1), { cwd, detached: true, stdio: 'ignore', windowsHide: true, shell: false }); child.on('error', e => console.error('[Process]', args[0], String(e))); child.unref(); return child.pid; }
export async function which(name: string): Promise<string | undefined> { if (name.includes('/') || name.includes('\\')) return fs.existsSync(name) ? name : undefined; const paths = (process.env.PATH || '').split(require('node:path').delimiter); const exts = process.platform === 'win32' ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';') : ['']; for (const dir of paths) for (const ext of exts) { const p = require('node:path').join(dir, name + ext); try { fs.accessSync(p, fs.constants.X_OK); if (fs.statSync(p).isFile()) return p; } catch {} } return undefined; }
export async function bounded<T>(fn: () => Promise<T>, ms: number): Promise<T | undefined> { let timer: NodeJS.Timeout; return Promise.race([fn().catch(()=>undefined), new Promise<undefined>(r => { timer=setTimeout(()=>r(undefined),ms); })]).finally(()=>clearTimeout(timer)); }
export function localDate(d = new Date()): string { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function localTime(d = new Date()): string { return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
export function parseLocal(text: string): Date | undefined { const m = text.trim().replace('T',' ').match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/); if (!m) return undefined; const [,y,mo,da,h,mi]=m.map(Number); const d=new Date(y,mo-1,da,h,mi); return d.getFullYear()===y && d.getMonth()===mo-1 && d.getDate()===da && d.getHours()===h && d.getMinutes()===mi ? d : undefined; }
