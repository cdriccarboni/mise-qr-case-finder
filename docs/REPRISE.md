# Reprise

Version livrée sur cette branche : **0.2.2-beta.1** (`versionCode` Android 4). Schéma IndexedDB toujours **4** : une base 0.2.1 s’ouvre sans migration destructrice.

État vérifié le 27 septembre 2026, commit construit `5b5a700` (`android.useAndroidX=true`). La pré-version GitHub cible ce commit, pas `main`.

## Liens vérifiés

Pré-version de test : https://github.com/cdriccarboni/mise-qr-case-finder/releases/tag/v0.2.2-beta.1-test

Téléchargements (HTTP 200, SHA-256 recalculé sur le fichier reçu) :

| Fichier | Octets | SHA-256 |
| --- | ---: | --- |
| [MISE-0.2.2-beta.1-TEST-debug.apk](https://github.com/cdriccarboni/mise-qr-case-finder/releases/download/v0.2.2-beta.1-test/MISE-0.2.2-beta.1-TEST-debug.apk) | 19 713 134 | `a0c39fe80ca6631320df89657fa14b0b58bea145060e2f0ae184650a27b58557` |
| [MISE-0.2.2-beta.1-TEST-release-signe-debug.apk](https://github.com/cdriccarboni/mise-qr-case-finder/releases/download/v0.2.2-beta.1-test/MISE-0.2.2-beta.1-TEST-release-signe-debug.apk) | 19 151 070 | `91f5d61d5ae15d5dca695bec49b739a2dffa2dd6a651da83b29f4ebbcf484277` |
| [MISE-0.2.2-beta.1-TEST-release-signe-debug.aab](https://github.com/cdriccarboni/mise-qr-case-finder/releases/download/v0.2.2-beta.1-test/MISE-0.2.2-beta.1-TEST-release-signe-debug.aab) | 19 145 733 | `341c09e4c09950901c411e9b74370908f17810b8dcc5ce3b6a6c2bdf9bc76467` |
| [MISE-0.2.2-beta.1-TEST-web.zip](https://github.com/cdriccarboni/mise-qr-case-finder/releases/download/v0.2.2-beta.1-test/MISE-0.2.2-beta.1-TEST-web.zip) | 18 252 431 | `bb92982f722fe23b68096d13d4a7b3fad8682d45c8440bdcf59ae20e549fd8d1` |

L’APK debug est celui à installer. Les trois binaires Android sont signés `CN=Android Debug` (certificat créé le 27 septembre 2026 à 10:47:50 UTC sur le runner). Ce n’est pas la clé Play.

Le zip web est le `dist/` du job Pages `build` (script `assets/index-DzpFITSL.js`). Servir le dossier décompressé avec `python3 -m http.server` depuis sa racine.

## Workflows sur `5b5a700`

| Workflow | Run | Résultat |
| --- | --- | --- |
| Validate MISE Web (push) | [36313629678](https://github.com/cdriccarboni/mise-qr-case-finder/actions/runs/36313629678) | succès |
| Validate MISE Web (pull request) | [36313632361](https://github.com/cdriccarboni/mise-qr-case-finder/actions/runs/36313632361) | succès |
| Build MISE Android (push) | [36313629669](https://github.com/cdriccarboni/mise-qr-case-finder/actions/runs/36313629669) | succès |
| Build MISE Android (pull request) | [36313632481](https://github.com/cdriccarboni/mise-qr-case-finder/actions/runs/36313632481) | succès |
| Deploy GitHub Pages | [36313629806](https://github.com/cdriccarboni/mise-qr-case-finder/actions/runs/36313629806) | `build` succès, `deploy` refusé |

Le refus Pages : « Branch grok/mise-finalisation-20260927 is not allowed to deploy to github-pages due to environment protection rules. » Les réglages du dépôt n’ont pas été modifiés.

https://cdriccarboni.github.io/mise-qr-case-finder/ répond HTTP 200. Contrôle du 27 septembre 2026 à 10:49 UTC : `Last-Modified: Sun, 27 Sep 2026 09:24:22 GMT`, script `assets/index-DasaFSSw.js`. C’est la publication de `main` (0.2.1-beta.1, run `36309232785`). Le JavaScript servi ne contient ni « son à imaginer » ni « MISE-Classeur ». L’interface n’affiche pas de numéro de version.

Merger la PR #7 dans `main` pousse sur `main`. Le workflow `Deploy GitHub Pages` se déclenche alors sur une branche autorisée par l’environnement `github-pages` et remplace le site public par le build `0.2.2-beta.1`.

## Déjà en place

Voir `docs/COMMENCER.md`, `docs/MESURES.md`, `docs/PLATEFORMES.md` et `docs/DEMANDES.md`.

Les tests `npm test` (19) et `npm run test:browser` (4) ont été exécutés sur le build de cette branche.

## Inventaire Mac

Reçu et classé le 27 septembre 2026. Détail : `docs/MIGRATION-BASE.md`.

Déjà couvert par `fb8ffd4` / `main` : logo carton, préférences, stash « Contrôle photo · bêta ». Repris en plus sur cette branche : toast de synchro locale, état vide des mises. Non repris : wordmark à lettre i de police, manifeste raccourci, dossier « import à venir », retour à `0.2.1-beta.1`.

`MISE-CODEX-084120` et ses WIP sont contenus dans `ba8db5d`, déjà dans `main`. Le modèle `public/models/` se régénère avec `scripts/prepare-vision.mjs`. Les autres copies n’ont rien en attente.

Les 29 documents privés ne sont pas dans le dépôt. Format du classeur à construire à part : `docs/FORMAT-IMPORT.md`.

## Limites assumées

- OCR absent (PDF image, texte dans une photo).
- Détection photo = COCO-SSD généraliste. Les accessoires de bruitage spécialisés sont souvent « aucun objet » ou une classe trop large. La correction humaine est une mémoire d’association, pas un réentraînement.
- CSV = index. La restauration complète des tables passe par le classeur XLSX ou le JSON.
- Doublons signalés, pas fusionnés.
- APK de test signé debug, publié : voir le tableau ci-dessus. Clé Play absente. Le certificat debug du runner n’est pas stable d’un build à l’autre.
- Pages public : toujours `main` / 0.2.1-beta.1. Le zip `0.2.2-beta.1` est sur la pré-version, pas sur l’URL GitHub Pages.
- Pas de binaire macOS/iOS.
- Google OAuth non retesté de bout en bout (popup, domaine autorisé).
- Imprimante thermique non retestée sur appareil.
- Scan QR caméra non retesté (pas de caméra ici). Le QR d’une valise s’affiche et son image est une data-URL PNG.
- Les dossiers Mac ci-dessus ne sont pas dans le dépôt.

## Après le merge

Le merge de la PR #7 dans `main` publie `0.2.2-beta.1` sur https://cdriccarboni.github.io/mise-qr-case-finder/ (workflow Pages, branche `main` autorisée). Brancher les secrets de signature Play seulement lorsqu’ils sont disponibles, sans les écrire dans git.
