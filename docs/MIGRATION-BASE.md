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

## Dossiers locaux non publiés

Les dossiers Mac annoncés (`MISE`, `MISE-clean-20260925`, `MISE-CODEX-084120` et sauvegardes WIP, `MISE-codex-modern-20260925`) ne sont pas dans ce clone. Ils ne sont donc pas intégrés. Le point de reprise est `docs/REPRISE.md`. Aucune donnée privée n’a été ajoutée en attendant.
