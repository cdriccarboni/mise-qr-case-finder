MISE final presentation lane.
Work only in this clean MISE repository.
Data Bruitage is the global source of truth; kits are subsets/views.
Implement only these bounded improvements:
1. Photo control on a Mise must be explicitly beta and assistive. The photo is a visual reference and the user manually checks visible expected objects. Do not claim automatic recognition.
2. Persist the checked state and optional control photo locally using the existing IndexedDB model.
3. Bluetooth printer remains capability-gated. Do not claim native printing without a known protocol.
4. Keep the corrected centered logo dots and Data Bruitage corpus wording intact.
5. Do not redesign the app or add frameworks.
Run node --check src/main.js and npm run build.
If green, commit with message "feat: add honest MISE photo control beta".
Do not deploy and do not modify ART. Write DAY_RESULT.md with changed files, build result and remaining hardware-dependent items.