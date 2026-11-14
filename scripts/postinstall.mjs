// Native optional providers are built for the host Node ABI. Electron's own
// postinstall fetches the binary; if it was skipped (ELECTRON_SKIP_BINARY_DOWNLOAD=1
// or a restricted network), run `npm run fetch:electron` before `npm start`.
console.log('IceeBurg dependencies installed. If the Electron binary was skipped, run: npm run fetch:electron');
