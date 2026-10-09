# MISES! — État actuel 0.4.x

> Document d’**état courant**. L’historique utile reste dans les docs d’archive (`PLAY-CONSOLE.md` section Archive, `COMMENCER.md` sections historiques, `REPRISE.md`, `ULTIMATE-BASELINE.md`).

## Identité

| Champ | Valeur |
|---|---|
| Nom | **MISES!** |
| Sous-titre | QR Case Finder |
| Package Android | `fr.acousmatictheatre.mises` |
| versionName | `0.4.0-beta.2` |
| versionCode | `14` |
| commit `main` de référence | `1c1b11620ac6e38b63d5c442f87010eb5cc6de71` |
| cible Android | compileSdk / targetSdk **36**, minSdk **26** |
| canal | test / pré-version — **pas** de production Play |

## Surfaces

| Surface | URL / artefact | Statut |
|---|---|---|
| PWA LIVE (Pages, branche `main`) | https://cdriccarboni.github.io/mise-qr-case-finder/ | **opérationnel** (`version.json` = 0.4.0-beta.2) |
| Confidentialité publique | https://cdriccarboni.github.io/mise-qr-case-finder/privacy.html | **opérationnel** (texte local-first + Drive navigateur) |
| APK TEST | https://github.com/cdriccarboni/mise-qr-case-finder/releases/download/v0.4.0-beta.2/MISES-0.4.0-beta.2-TEST.apk | **pré-release** GitHub, signature **debug** |
| Release GitHub | https://github.com/cdriccarboni/mise-qr-case-finder/releases/tag/v0.4.0-beta.2 | **pré-release** |
| AAB Play signé upload | dépend de `MISE_UPLOAD_*` hors dépôt | **bloqué** tant que la clé d’upload n’est pas fournie à l’environnement de build |

## Architecture

- PWA Vite + Workbox, installable / offline-first.
- Enveloppe Android native WebView (`android/`), sans Capacitor.
- IndexedDB locale ; Data Bruitage = source de vérité métier.
- Bibliothèque publique embarquée (`public/public-foley.json`, provenance `PUBLIC_WEB`) séparée des données personnelles.
- Vision locale progressive (COCO-SSD) + mémoire visuelle réversible ; Vision avancée **non embarquée** sans benchmark.
- Impression via chaîne système / pont Android ; Bluetooth limité aux appareils déjà appairés.

## Fonctions opérationnelles (couvertes par tests et/ou code livré)

- Accueil : recherche globale unique + cinq intentions (Trouver · Créer · Ranger · Préparer · Partager) + raccourcis terrain dont **Créer une étiquette**.
- Objets, contenants, valises, kits, mises ; distinction son à entendre / son à imaginer.
- QR + scan ; inventaire / rangement.
- Éditeur libre d’étiquettes (texte, images, formats thermiques, rendu N&B / seuil / inversion / tramage, modèles, accès contextuel).
- Imports élargis : XLS/XLSX, ODS, CSV/TSV, JSON, TXT, Markdown, PDF textuel, DOCX, ZIP, images à qualifier.
- Index global + diagnostic / reconstruction depuis Préférences.
- Modes Bruitages & pédagogie / Inventaire · régie.
- Jeux / défis / activités à partir de l’inventaire réel (possession ≠ suggestion publique).
- Sauvegarde / restauration locale avec confirmations.
- Pont ART optionnel (`projectId`) ; MISES fonctionne sans ART.
- Google Drive **navigateur uniquement** ; APK Android bloque volontairement GIS (`disallowed_useragent`).

## Fonctions partielles

| Sujet | État |
|---|---|
| Vision avancée (open-vocabulary / embeddings) | Architecture documentée ; **aucun modèle lourd embarqué** |
| Mémoire visuelle | Stockage local réversible prêt ; similarité embeddings **pas encore** le moteur principal |
| WalkPrint / thermique Bluetooth | UI / pont présents ; **non validé** matériel réel dans cette reprise |
| Feature graphic / captures Play | Icônes présentes ; feature graphic 1024×500 et screenshots Pixel **à produire** |
| Connexion Google Android native | Désactivée ; architecture Credential Manager / Custom Tabs **à concevoir** (pas de contournement UA) |
| AAB Play | Guard Gradle strict (pas de faux PLAY debug) ; signature upload **hors CI** sans secrets |

## Non testé matériellement ici (29/09/2026)

- Pixel 9 réel (aucun appareil `adb` attaché).
- Benchmark Vision sur appareil.
- Impression thermique réelle.
- Envoi Play Console / test fermé (action humaine + clé).
- OAuth Google end-to-end sur domaine Pages (dépend de la Console OAuth).

## Branche de travail Cursor

`cursor/mises-next-20260929` — créée depuis `origin/main` (`1c1b116`).  
Ne pas confondre avec `cursor/mises-reprise-20260928` (ancienne reprise, déjà fusionnée / dépassée).

## Tests constatés sur cette reprise

| Suite | Résultat |
|---|---|
| `npm test` | **82/82** pass |
| `npm run build` | **OK** (PWA + SW) |
| Playwright | en cours / à consigner dans la PR |
| `assembleDebug` | via CI `main` (artefact pré-release v0.4.0-beta.2) |

## Règle produit

Les données réelles et les validations humaines passent toujours avant les suppositions de l’IA.  
« Je ne sais pas » / **À IDENTIFIER** est une réponse valide.
