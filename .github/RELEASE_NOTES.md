## IceeBurg desktop builds

This release includes packaged desktop applications, not just source code.

### Downloads

- **Windows**: `IceeBurg-*-win-x64.exe` installer, or the portable `.zip`.
- **Linux**: `IceeBurg-*-linux-x64.AppImage` or `.deb`.
- **macOS**: `IceeBurg-*-mac-*.dmg` / `.zip` for Intel and Apple Silicon.

### First run

1. Install/open IceeBurg.
2. Open **Settings → Engine**.
3. Add a Gemini API key, or configure **My own setup** with an OpenAI-compatible
   model, Whisper speech recognition, and a system/Piper/ElevenLabs voice.

Speech and wake-word models download on demand the first time you enable them.

### Notes

- The macOS builds are unsigned; macOS may require right-click → Open the first
  time. Windows builds are also unsigned, so SmartScreen may warn.
- Linux desktop automation works best on Xorg. Wayland may block synthetic input
  and screen capture.
- Optional native providers (local Whisper/Piper, wake word, native input) are
  included when available for the target platform and degrade gracefully when
  not.
- Build from source with `npm install && npm start`; see `readme.md`.
