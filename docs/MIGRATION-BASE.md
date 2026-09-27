# Base de la finalisation — 27 septembre 2026

Branche de travail : `grok/mise-finalisation-20260927`, créée depuis `main` (`8347df4`).

Le choix ne suit ni le nom ni la date des branches. Il suit le contenu des arbres git (`git diff A B`, pas seulement `git log`).

## Comparaison

| Branche | Contenu propre | Intégré ? | Pourquoi |
| --- | --- | --- | --- |
| `main` | Vision locale, Data Bruitage, thèmes 0.2.1, Android `versionCode` 3 / `0.2.1-beta.1`, confidentialité, Google autonome, partage | Base | Arbre le plus complet. Les autres branches sont des ancêtres ou des variantes déjà reprises. |
| `fix/mise-0.2.1-beta.1-version-alignment` | Alignement Android + CI des pull requests | Oui | `git diff origin/main origin/fix/mise-0.2.1-beta.1-version-alignment` est vide. L’arbre est identique à `main`, seul l’historique diverge. |
| `codex/mise-vision-data-20260926-084120` | Pipeline vision locale et apprentissage Data Bruitage | Oui, sauf versions Android plus anciennes | Le code vision est dans `main` via `6f0ba6a`. Le diff restant est `android.yml` et `versionCode`, déjà dépassés par `8347df4` (`0.2.1-beta.1`, code 3). |
| `release/mise-021-beta1-20260925` | Thèmes, modes d’affichage, passage 0.2.1-beta.1, nettoyage d’exemples | Oui | Ces styles sont dans `src/style.css` de `main`. La branche est antérieure au module vision : la réintégrer écraserait le catalogue. |
| `privacy/clean-public-examples-20260925` | Retrait d’exemples proches d’e-mails personnels | Oui | Repris dans `fb8ffd4`. Le diff résiduel est l’absence des modules plus récents. |
| `mise/google-autonomous-auth-20260925` | OAuth Google propre à MISE | Oui | Repris dans `5cc68ce` puis enrichi. `src/google-sync.js` de `main` contient le flux direct. |
| `mise/android-play-prep-20260925` | Coquille Android, docs Play, premiers workflows | Oui pour l’app et la doc ; non pour le relais ART | Le portage est dans `2c094b5`. Les échecs CI (`sdkmanager: command not found`, runs `36140648796` et voisins) viennent d’un `sdkmanager` hors `ANDROID_HOME`. `main` corrige ça : le run `36309232796` est vert. Le workflow « Relay ART Android » a été retiré volontairement (`1863913`) et n’est pas remis : le cœur de MISE ne doit pas dépendre d’ART. |
| `codex/modern-project-vision-20260925` | Ancêtre du contrat photo / projet | Oui | 0 commit en avance sur `main`. |

## Ce que cette branche ajoute

- Classeur Data Bruitage (champs entendre / imaginer séparés, onglets, réimport).
- Provenance explicite et doublons non fusionnés.
- Logo « MISE ! » dont les deux points rouges partagent la même coordonnée SVG.
- APK qui embarque la PWA, au lieu d’ouvrir la page ART.
- Version `0.2.2-beta.1`, `versionCode` 4 (incrément, pas de remise à zéro). Schéma IndexedDB inchangé (version 4).

## Inventaire Mac (lecture seule, 27 septembre 2026)

Aucune donnée Data Bruitage réelle n’a été copiée. Les 29 documents privés (15 DOCX, 14 PDF) restent hors dépôt. Le format pour un classeur privé à importer dans l’app est `docs/FORMAT-IMPORT.md`.

| Source locale | Contenu | Intégré ? | Pourquoi |
| --- | --- | --- | --- |
| `~/Projects/MISE`, commits absents de GitHub `78bf64e`, `06ce0a6`, `264d02c` (`fad8e6c..264d02c`, +100/−39 sur `src/main.js`, `src/style.css`, `package.json`, `package-lock.json`, `vite.config.js`) | Entrée simplifiée, préférences, logo carton, thèmes, affichage, durcissement 0.2.1 | Déjà dans `fb8ffd4` (sur `main`), sauf trois écarts | `fb8ffd4` rejoue le même passage UX (logo carton `miseLogo4`, préférences affichage/thème, état Google, dossier, `[hidden]`, modes desktop/mobile). Les commits locaux partent de `fad8e6c`, plus ancien que `main`. |
| Écart 1 — toast si la synchro locale échoue | `renderProjectContext` prévient l’utilisateur | Oui, repris ici | `main` cachait le bandeau ART mais n’affichait plus le toast. |
| Écart 2 — état vide des mises | « Aucune mise pour le moment. » | Oui, repris ici | Le texte de `06ce0a6` n’était pas dans l’arbre publié. |
| Écart 3 — `corpusSummary` mort | Badge de corpus retiré du bandeau | Oui, la constante inutilisée est retirée | Le HTML publié ne l’affichait déjà plus. |
| Non repris — description du manifeste | « objets, sons, QR et préparation de tournée » | Non | `fb8ffd4` a gardé la description publiée (bruitage, matériel, QR). On ne la remplace pas. |
| Non repris — wordmark `MISE` + point CSS | Le i redevient une lettre de police | Non | Le carton reste l’icône validée (`miseLogo4`, déjà dans `fb8ffd4`). Les deux points rouges restent le SVG de cette branche : la lettre i de police ne s’aligne pas sur le point du ! au redimensionnement. |
| Non repris — dossier « import à venir » | Le stash / commit 3 mémorise seulement le nom du dossier | Non | La branche ouvre déjà l’import Data Bruitage sur les fichiers choisis. Revenir au message « à venir » serait une régression. |
| Non repris — version `0.2.1-beta.1` | `package.json` local | Non | Dépassé par `0.2.2-beta.1` (`versionCode` 4). |
| Stash `stash@{0}` `9f1a693` (25 sept. 12:17), libellé « Contrôle photo · bêta » | Bouton bêta + `photoTargetMiseId` | Déjà dans `main` | Le bouton et l’affectation de la photo à la mise sont dans `src/main.js` actuel. Rien à rejouer. |
| `MISE-CODEX-084120` et sauvegardes WIP (patch et tgz) | Vision et Data Bruitage | Déjà dans `ba8db5d`, lui-même dans `main` via `6f0ba6a` | Confirmé par l’inventaire : rien d’utile en attente. |
| `public/models/` coco-ssd | Poids du modèle | Non versionné | `.gitignore` ; régénéré par `scripts/prepare-vision.mjs`. |
| Autres copies de travail | — | Non | Inventaire : rien d’utile en attente. |
| 29 documents privés | Mallette, didascalies, conduites, ateliers, inventaire | Jamais | Dépôt public. Ils s’importent dans l’app, en local, via le format de `docs/FORMAT-IMPORT.md`. |
