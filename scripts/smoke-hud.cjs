// Real Electron HUD smoke test. Run with: npm run smoke:hud
// On headless Linux: xvfb-run -a npm run smoke:hud
const { app, BrowserWindow, ipcMain, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const errors = [];
let win, ready = false, finished = false;
const timer = setTimeout(() => fail('HUD did not become ready within 20s'), 20000);
function fail(message) {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  console.error('HUD_SMOKE_FAIL: ' + message);
  for (const e of errors) console.error('  ' + e);
  app.exit(1);
}
function ok(result) {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  console.log('HUD_SMOKE_OK ' + JSON.stringify(result));
  app.exit(0);
}
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  ipcMain.handle('hud:face-mesh', () => fs.readFileSync(path.join(root, 'assets', 'face_model.obj'), 'utf8'));
  ipcMain.handle('hud:system-status', () => ({ cpu_percent: 1, ram_percent: 2, cpu_temp_c: 3, uptime: '00:00' }));
  ipcMain.handle('hud:settings', () => ({ assistant_name: 'JARVIS', mode: 'gemini' }));
  ipcMain.on('hud:ready', () => {
    ready = true;
    win.webContents.send('hud:settings', { assistant_name: 'JARVIS', mode: 'gemini', push_to_talk_enabled: false });
    win.webContents.send('hud:state', { state: 'LISTENING' });
  });
  win = new BrowserWindow({
    show: false,
    width: 1180,
    height: 780,
    webPreferences: {
      preload: path.join(root, 'build', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  win.webContents.on('preload-error', (_e, file, error) => errors.push(`preload ${file}: ${error.message}`));
  win.webContents.on('did-fail-load', (_e, code, desc, url) => errors.push(`load ${code} ${desc} ${url}`));
  win.webContents.on('render-process-gone', (_e, details) => errors.push(`renderer gone: ${details.reason}`));
  win.webContents.on('console-message', (...args) => {
    const d = args[0];
    const message = d && typeof d === 'object' ? d.message : args[2];
    const level = d && typeof d === 'object' ? d.level : args[1];
    if (message && (level === 'error' || level === 3)) errors.push(String(message));
  });
  win.loadFile(path.join(root, 'build', 'index.html')).catch(e => fail(e.message));
  const poll = setInterval(async () => {
    if (!ready || finished) return;
    clearInterval(poll);
    await new Promise(r => setTimeout(r, 1300));
    try {
      const result = await win.webContents.executeJavaScript(`({
        ready: document.documentElement.dataset.hudReady === '1',
        bridge: typeof window.jarvis === 'object',
        state: document.getElementById('state').textContent,
        clock: document.getElementById('clock').textContent,
        cpu: document.getElementById('cpu-value').textContent,
        log: document.getElementById('activity-log').textContent
      })`);
      if (errors.length) return fail('console/preload errors: ' + errors.join(' | '));
      if (!result.ready || !result.bridge) return fail('renderer/preload did not boot: ' + JSON.stringify(result));
      if (result.state !== 'LISTENING') return fail('state not applied: ' + JSON.stringify(result));
      if (!result.clock) return fail('clock never ticked');
      if (result.cpu !== '1%') return fail('telemetry not applied: ' + JSON.stringify(result));
      if (/HUD failed|HUD ERROR/.test(result.log + result.state)) return fail('fatal HUD error: ' + JSON.stringify(result));
      ok(result);
    } catch (e) { fail(e.message); }
  }, 100);
}).catch(e => fail(e.message));
app.on('window-all-closed', () => { if (!finished) app.exit(1); });
