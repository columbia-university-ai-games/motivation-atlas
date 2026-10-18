# Existing game and Atlas adaptation

This contribution adapts Oscar O'Donnell's existing **Autumn Drive** project
from `game-dev-f26/racing/`, as it stood on October 18, 2026. It preserves the
BMW M3 E30 model, Rapier vehicle simulation, steering, procedurally generated
Amberwater road, forest, terrain, chase camera and synthesized audio.

`source-manifest.json` records SHA-256 hashes of the original source files
and model. The corresponding readable JavaScript files in `drive/` were
transpiled from those TypeScript files with esbuild 0.25.12. They remain
editable source. The original project was not modified.

The Atlas-specific code is `game.ts` (deadline and ordered-gate rules),
`main.ts` (mount, controls, run notes and cleanup), `style.css`, and
`drive/runtime.js` (a small adapter around the existing engine). The view
now sizes to its container, parses an embedded model, and releases resources.
Unused multiplayer presentation was removed; the original multiplayer game
remains in Autumn Drive. Medium-detail geometry and low graphics settings
are used for the embedded version. The car handling is unchanged.

Three.js 0.186.1 and Rapier 0.21.0 are bundled locally in `vendor/`; the
existing GLB is embedded in `drive/model.js`. No CDN, runtime API, WebSocket,
model request, or downloaded game asset is needed. Keeping dependencies
inside this minigame avoids changes to the shared Atlas package manifest.
The tradeoff is a large game module. It loads from the Atlas site's own
static build only when Start is pressed, so it does not weigh down the map
or other minigames. The car's embedded textures are decoded from in-memory
blob URLs. There are no external requests or runtime services.

To regenerate the library bundles, install esbuild 0.25.12, three 0.186.1,
and @dimforge/rapier3d-compat 0.21.0 in a temporary npm directory, then run
`node tools/build-vendor.mjs /absolute/path/to/that/node_modules` from this
minigame folder. The committed bundles need no regeneration to run CI.

Run `npm run typecheck`, `npm test`, and `npm run build` at the Atlas root.
The central-rule and UI lifecycle tests are `test/autumn-drive.test.ts`.
The README records Oscar's dictated playtest: no deadline, then 30 seconds.
Its account remains editable for student review.
