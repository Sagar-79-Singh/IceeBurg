# IceeBurg — MARK LVII in TypeScript

A cross-platform personal AI assistant that hears, sees, speaks and acts on your
computer. This is a full rewrite of the MARK LVII assistant in **TypeScript +
Electron**: the Python/PyQt runtime is gone, and the same feature set now runs on
Node 22 with a web-tech HUD.

- **Voice**: Gemini Live native audio, or a bring-your-own pipeline (any
  OpenAI-compatible LLM + Whisper STT + system/Piper/ElevenLabs TTS).
- **HUD**: holographic face or reactor core, live telemetry, transcript log,
  content/code panels, quizzes, reviews, camera and media overlays.
- **Agency**: 19 desktop/web/file/media tools, background task engine with
  checkpointed research and cited reports, a routine engine (briefing, check-ins,
  news watch, reminders), memory, undo and a confirmation gate.
- **Remote**: phone dashboard (HTTP/HTTPS + QR pairing), Telegram bridge, optional
  cloud relay with certificate pinning and wake-on-LAN.
- **Extensible**: CommonJS actions and plugins, Markdown agent profiles.

---

## Requirements

- **Node.js 22+** and npm.
- A Gemini API key (from [AI Studio](https://aistudio.google.com)) for the default
  engine, **or** a local/cloud OpenAI-compatible model for the pipeline engine.
- Optional, installed automatically when available:
  - `sherpa-onnx-node` — local Whisper speech-to-text and Piper voices.
  - `openwakeword-js` + `onnxruntime-node` — local "Hey Jarvis" wake word.
  - `@nut-tree-fork/nut-js` — native keyboard/mouse automation.
- Linux desktop automation works best on Xorg with `xdotool`/`wmctrl`; Wayland may
  block synthetic input and screen capture. macOS needs Accessibility permission
  for typing/clicking. `ffmpeg` is needed for some media conversions and
  ElevenLabs MP3 decoding; `espeak-ng` for the system voice on Linux. `tar` is
  used to unpack downloaded speech models.
- Controlled browser sessions use your installed Chrome/Edge/Brave/Opera/Firefox
  through Playwright. If none is found, run `npx playwright install chromium`.

## Install & run

```bash
npm install
npm start          # builds, then launches Electron
```

If the Electron binary was skipped during install (restricted networks, CI):

```bash
npm run fetch:electron
npm start
```

On first launch open **⚙ → Engine** and paste your Gemini key, or choose
**My own setup** and configure providers. Speech/wake models download on demand
into the app's user-data directory the first time you enable them.

### Scripts

| Command | What it does |
|---|---|
| `npm run build` | esbuild → `build/{main,preload,renderer,runtime}.js` + HUD assets |
| `npm run typecheck` | strict TypeScript check (`tsc --noEmit`) |
| `npm test` | build + Node test suite (core, actions, engines, network, packaging) |
| `npm start` / `npm run dev` | build + launch Electron |
| `npm run pack` | unpacked electron-builder directory |
| `npm run dist:linux` | AppImage + deb |
| `npm run dist:win` | NSIS installer + zip |
| `npm run dist:mac` | macOS zip |
| `npm run fetch:electron` | retry the Electron binary download explicitly |

GitHub Releases include packaged desktop builds produced by the `Desktop release`
workflow on Windows, macOS, and Linux runners. To build locally, run the packaging
scripts on the target OS with network access to Electron's release assets.

## Using it

- **Speak** normally, or type in the command box. **Ctrl+Space** (window-scoped)
  or the HUD hold button is push-to-talk; the global shortcut opens an
  eight-second microphone window.
- **Hey Jarvis** wake word sleeps the mic until called and auto-sleeps after two
  minutes of quiet. Enable it in the input panel; models download once.
- **Attach** a file or folder for the file processor / coding agent.
- **Background tasks**: "research this for ten minutes" — the conversation
  carries on while a checkpointed agent works and announces the result.
- **Routines**: "every Friday at 17:00 remind me…", "move the briefing to 08:30",
  "quiet hours 23:00–08:00". Manage them in Settings → Routines.
- **Remote control**: the QR icon pairs your phone on the same network. The
  dashboard serves on port **8000** (HTTP) or **8001** (HTTPS, enable in
  Settings → Remote). Pairing keys expire in ten minutes; devices can be revoked.
- **Cloud / Telegram**: advanced fields in Settings → Remote. A cloud relay listens
  on port **7443** and mirrors reminders to paired phones/Telegram; the client
  pins the relay's certificate from the pairing code.

## Architecture

```
src/
  main.ts              Electron main: conversation, tools, IPC, bootstrap
  preload.ts           allowlisted contextBridge (window.jarvis)
  runtime.ts           shared b.* namespace bundled to build/runtime.js
  gui/                 HUD: index.html, style.css, renderer.ts, mic-worklet.js
  core/                gemini, tasks/, routines/, cloud, screen, wake, echo, …
  providers/           OpenAI-compatible LLM, Whisper, system/Piper/ElevenLabs TTS
  memory/              config + long-term memory
  actions/             inline tool declarations + monitors/proactive engine
  dashboard/           phone dashboard server (static UI in dashboard/static/)
actions/*.cjs          19 desktop/web/file/media tools (CommonJS)
plugins/*.cjs          user plugins (see _template.cjs)
agents/*.md            background-agent profiles
assets/                face mesh, icons
scripts/               esbuild build, Electron fetch, postinstall
tests/                 Node test suite
```

The main process and every action/plugin share **one** compiled runtime
(`build/runtime.js`), so task/routine engines, memory, config and model fallbacks
are singletons. The renderer is sandboxed (`contextIsolation`, no
`nodeIntegration`) and reaches the main process only through named IPC channels.
Local media is served through a restricted `iceeburg-media://` protocol.

## Plugins

Copy `plugins/_template.cjs` to `plugins/my_plugin.cjs`, edit, and restart (or
toggle it in Settings → Plugins). A plugin registers tools through
`ctx.addTool(declaration, handler)` and shows output through `ctx.player`.
Plugin settings are namespaced automatically. See `AGENTS.md` for the full
contract and the rules the built-in coding agent follows.

## Privacy & security

- Memory, config, reports and models live in the OS user-data directory, not the
  repo. API keys are stored locally in `config/api_keys.json` under user data.
- The renderer has a strict CSP, no Node access, and an allowlisted IPC bridge.
- The phone dashboard uses one-time pairing keys, PBKDF2-derived AES-256-GCM
  command encryption, token expiry and login throttling. Enable HTTPS on
  untrusted networks.
- The cloud client pins the server certificate from the pairing code before
  sending anything. Web fetches for research refuse private/loopback addresses.
- Tool results distinguish **done / unverified / failed / ask / started** so the
  assistant never claims an action it could not confirm.

## Development

```bash
npm run typecheck
npm test
```

The test suite covers the async queue, audio helpers, outcome lines, config,
memory, undo, routine rules/engine, agent profiles, research quote verification,
schema conversion, all 19 action declarations, file/desktop/reminder/video
actions, the task engine, the OpenAI-compatible provider, the pipeline engine,
the echo guard, dashboard pairing/auth/uploads/encryption, cloud pairing and
wake-on-LAN, plus build/packaging checks. The Electron GUI itself needs a display
and is not exercised headlessly.

## Credits & license

Feature set and original MARK assistant by **FatihMakes**; TypeScript/Electron
rewrite maintained by **Sagar-79-Singh**. Apache-2.0 — see `LICENSE`.
