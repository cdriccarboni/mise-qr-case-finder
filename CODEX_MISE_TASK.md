# CODEX LOCAL TASK — make MISE usable quickly

Work only in /Users/cedriccarboni/Projects/MISE.
The valuable data layer already exists in public/data.json (mise-meta-db/v1) and dependencies are installed. The current src/main.js is still the Vite starter.

Goal: turn this into a first actually usable mobile-first PWA for a live-performance sound-effects kit.

Priority order:
1. Replace the Vite starter UI with a clean app shell using the existing data.json.
2. Home: kits/containers, tomorrow/pre-depart preparation, search.
3. Container screen: objects, quantities/status, missing/to-confirm indicators.
4. Fast bidirectional search across object/effect/container aliases using Fuse.js.
5. Checklist flow: prepare a selected kit, mark present/missing, persist locally with IndexedDB/localStorage.
6. QR: generate/open container QR identifiers using existing qrcode/zxing dependencies if practical.
7. Add a visible “photo scan — beta” entry only if COCO-SSD integration can be made stable without blocking the core app.
8. Keep Bluetooth printing as a clearly isolated adapter/TODO unless a generic Web Bluetooth implementation is safe and testable; do not fake native support.

Rules: reuse existing dependencies; no framework migration; no unrelated installs; preserve data.json; run npm build; fix all build errors. Do not publish externally. Write CODEX_MISE_RESULT.md with features built, build result, remaining scan/Bluetooth work.
