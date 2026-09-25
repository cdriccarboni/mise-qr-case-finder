You are the MISE presentation lane. Work only in the MISE repo. The source of truth is all Data Bruitage, not only Kit Acoustique.

Today acceptance:
1. Make the existing mobile-first beta clearly usable around the full Data Bruitage dataset already present in the repo/public data: search, browse, object/sound entries, kits/containers as views rather than the whole model.
2. Pre-depart checklist must be easy to generate/use and persist locally.
3. QR generation/opening must remain functional.
4. The UI must never describe the business core as only "Kit Acoustique".
5. Keep photo analysis explicitly beta/assistive if present; do not fake recognition quality.
6. Keep Bluetooth printer integration behind an adapter/capability check; do not claim native support without a testable implementation.
7. Fix obvious mobile presentation issues and align circular status dots/icons if the current UI contains the reported misalignment.
8. npm build must pass.
9. Commit safe changes with message starting "feat: MISE day lane" and write DAY_RESULT.md with build/test, changed files, remaining hardware-dependent items.

Do not rewrite frameworks and do not modify ART repo.
