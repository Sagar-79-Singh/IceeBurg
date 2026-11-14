import { build } from 'esbuild';
import { mkdir, copyFile, cp } from 'node:fs/promises';
await mkdir('build', { recursive: true });
const runtimeExternal={name:'shared-runtime',setup(build){build.onResolve({filter:/^\.\/runtime$/},()=>({path:'./runtime.js',external:true}));}};
const cjsExternal={name:'dynamic-actions',setup(build){build.onResolve({filter:/\.cjs$/},args=>({path:args.path,external:true}));}};
const common = { bundle: true, platform: 'node', target: 'node22', format: 'cjs', sourcemap: true, logLevel: 'info' };
await build({ ...common, entryPoints: ['src/main.ts'], outfile: 'build/main.js', packages: 'external', plugins:[runtimeExternal] });
await build({ ...common, entryPoints: ['src/runtime.ts'], outfile: 'build/runtime.js', packages: 'external', plugins:[cjsExternal] });
await build({ ...common, entryPoints: ['src/preload.ts'], outfile: 'build/preload.js', packages: 'external' });
await build({ ...common, entryPoints: ['src/gui/renderer.ts'], outfile: 'build/renderer.js', platform: 'browser', target: 'chrome140', define: { 'process.env.NODE_ENV': '"production"' } });
await copyFile('src/gui/index.html', 'build/index.html');
await copyFile('src/gui/style.css', 'build/style.css');
await copyFile('src/core/prompt.txt', 'build/prompt.txt');

await copyFile('src/gui/mic-worklet.js', 'build/mic-worklet.js');
