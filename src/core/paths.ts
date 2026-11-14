import fs from 'node:fs';
import path from 'node:path';
let root = process.env.ICEEBURG_DATA_DIR || process.cwd();
let resources = process.cwd();
export function configurePaths(data: string, assetRoot = process.cwd()) { root = data; resources = assetRoot; fs.mkdirSync(root, { recursive: true }); }
export const baseDir = () => root;
export const resourceDir = () => resources;
export const dataPath = (...parts: string[]) => path.join(root, ...parts);
export const resourcePath = (...parts: string[]) => path.join(resources, ...parts);
export function expandPath(raw: string): string { const s = String(raw || '').trim().replace(/^["']|["']$/g, ''); return s.startsWith('~') ? path.join(process.env.HOME || process.env.USERPROFILE || '.', s.slice(1)) : path.resolve(s); }
export function inside(rootPath: string, target: string): boolean { const rel = path.relative(path.resolve(rootPath), path.resolve(target)); return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel)); }
export function readJson<T>(file: string, fallback: T): T { try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return fallback; } }
export function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  for (let i = 0; ; i++) { try { fs.renameSync(tmp, file); return; } catch (e: any) { if (i >= 19 || !['EPERM','EACCES','EBUSY'].includes(e.code)) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50); } }
}
export function uniquePath(file: string): string { if (!fs.existsSync(file)) return file; const p = path.parse(file); let i = 1; while (fs.existsSync(path.join(p.dir, `${p.name}_${i}${p.ext}`))) i++; return path.join(p.dir, `${p.name}_${i}${p.ext}`); }
