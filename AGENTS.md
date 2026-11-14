# Rules for coding agents working on IceeBurg

The built-in coding agent (`actions/dev_agent.cjs`) reads this file before every
change it makes to this project, and so should any other agent or contributor.
Each rule below exists because breaking it produced code that looked right,
passed a syntax check and did nothing when used.

## How the app runs

- IceeBurg is a **TypeScript + Electron** application. There is no Python runtime.
- `src/main.ts` is the Electron **main process**. It owns the Gemini Live /
  pipeline conversation, the tool registry, the task engine, the routine engine,
  the phone dashboard and the cloud link.
- `src/gui/renderer.ts` is the sandboxed **renderer process** (the HUD). It talks
  to the main process only through the allowlisted `window.jarvis` bridge defined
  in `src/preload.ts`. It never uses Node APIs directly.
- Tools (`actions/*.cjs`) and plugins (`plugins/*.cjs`) are CommonJS modules loaded
  in the **main process**. They share one runtime namespace: `build/runtime.js`
  (compiled from `src/runtime.ts`).
- Long work the user asks for in the background — research, drafting — is the
  task engine's job (`src/core/tasks/`, agents in `agents/*.md`), not a plugin's.

## Threading / process rules

- Code in `actions/` and `plugins/` must **never create a `BrowserWindow`** or
  touch renderer DOM. Use the **`player`** object passed in the tool context.
  Its methods send IPC to the HUD safely:

| Need | Call |
|---|---|
| A line in the activity log | `player.writeLog("text")` |
| Text in the content panel | `player.showContent(title, text)` |
| A quiz the user answers on screen | `player.showQuiz(topic, questions)` |
| A structured review | `player.showReview(title, summary, findings, unclear)` |
| Play a video in the HUD | `player.showVideo(pathOrUrl, title, muted, audioSource)` |
| Show an image | `player.showImage(path, title)` |
| Ask the assistant to speak | `player.requestSay(text)` |

- `showQuiz` takes `questions` as a list of objects:
  `{question, options: [..] (empty for a typed answer), answer, note?}`.
  The user answers at their own pace; the result returns to the conversation by
  itself. The handler returns at once.
- Do **not** spawn a separate GUI program to work around this rule.
- Audio capture/playback lives in the renderer (AudioWorklet 16 kHz mic, 24 kHz
  scheduled playback). Main-process code sends/receives PCM through IPC; it does
  not open native audio devices.

## Actions

An action is one file `actions/<name>.cjs` (no leading underscore) exporting
`TOOL`, built with `actions/_support.cjs`:

```js
const { tool } = require('./_support.cjs');
exports.TOOL = tool('my_tool', async (parameters, ctx) => {
  const b = require('../build/runtime.js');
  try {
    // ... do the work, verify it happened ...
    return b.outcome.done('my_tool', { verified: true });
  } catch (e) {
    return b.outcome.failed('my_tool', e.message);
  }
});
```

- The declaration (name/description/parameters) lives in
  `src/actions/declarations.json`; add it there too.
- Return a **short string** — the assistant turns it into speech.
- **Never throw** out of the handler; catch and return an outcome line.
- Use `outcome.done` only when you verified the effect; `outcome.unverified`
  when the request went out but cannot be confirmed; `outcome.failed` when it did
  not happen; `outcome.started` for long work that continues asynchronously.
- Treat `ctx.player` as possibly absent (tests and the phone dashboard).
- Helper modules may live beside actions with a leading underscore
  (`actions/_support.cjs`); the loader skips those.

## Plugins

A plugin is one file `plugins/<name>.cjs` (no leading underscore) with:

- `exports.NAME = 'my_plugin'`
- `exports.DESCRIPTION = '...'`
- `exports.register = ctx => { ctx.addTool(declaration, handler); }`

`ctx` provides `player`, `runTool`, `toolCatalog`, `wake`, `say`, `addTool`,
`config(key, fallback)` and `setConfig(values)` (namespaced under
`plugin_config[NAME]`). See `plugins/_template.cjs`.

A new plugin is **enabled automatically** the moment its file exists. Toggle it
in Settings → Plugins; never edit the user's config file to enable one.

## Asking a model for something

Always go through the shared runtime's `gemini` namespace — it has deadlines, a
fallback ladder and the user's chosen provider:

```js
const b = require('../build/runtime.js');
const text = await b.gemini.text(prompt, b.gemini.FAST);   // short answers
const data = await b.gemini.asJson(prompt, b.gemini.SMART); // structured, may be null
```

Every call can fail or return empty. Handle that with a small built-in fallback
instead of crashing.

## Changing the HUD (`src/gui/`)

- `index.html` + `style.css` + `renderer.ts` are the whole HUD. Colours come from
  the CSS variables in `:root` (the JARVIS teal palette); the live accent setting
  rewrites `--pri` and friends. Do not hard-code colours outside the palette.
- The renderer is bundled by esbuild to `build/renderer.js`; it must stay free of
  Node imports. Anything it needs from the main process goes through a new
  allowlisted IPC channel in `src/preload.ts` **and** `src/main.ts`.
- The face mesh is shipped as `assets/face_model.obj` and read through the
  `face-mesh` IPC channel; do not `fetch()` local files from the renderer.

## General

- Never report success without checking that the thing actually happened.
- Settings and keys live in the user-data config through
  `src/memory/config_manager.ts`; never write that file directly.
- Keep to the dependencies already in `package.json`. Optional native providers
  (`sherpa-onnx-node`, `openwakeword-js`, `onnxruntime-node`, `@nut-tree-fork/nut-js`)
  must degrade gracefully when absent.
- Validate with `npm run typecheck`, `npm run build` and `npm test` before
  finishing. The Electron GUI cannot be exercised headlessly in CI; rely on the
  Node test suite and syntax checks for the main/preload/renderer bundles.
