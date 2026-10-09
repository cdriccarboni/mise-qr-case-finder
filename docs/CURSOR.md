# MISES! dans Cursor

Branche de travail actuelle : **`cursor/mises-next-20260929`** (basée sur `origin/main` `0.4.0-beta.2`).

Anciennes branches Cursor (`cursor/mises-reprise-20260928`, `cursor/mises-play-release-20260928`, etc.) : **archives** — ne pas les reprendre comme source de vérité.

État produit : voir [`docs/STATE-0.4.x.md`](STATE-0.4.x.md).  
Dossier Play : voir [`docs/GOOGLE-PLAY-0.4.x.md`](GOOGLE-PLAY-0.4.x.md).

## Lancements disponibles

Dans Cursor : **Terminal → Run Task…**

- **MISES! · PWA (développement)** : serveur Vite accessible aussi sur le réseau local.
- **MISES! · PWA (preview build)** : construit puis sert la PWA de production.
- **MISES! · Vérifier tout** : tests Node + build PWA.
- **MISES! · Tests navigateur** : Playwright.
- **MISES! · Build PWA** : génère `dist/`.
- **MISES! · Build APK test** : build PWA, synchronise l'enveloppe Android native, puis produit l'APK debug.
- **MISES! · Lancer sur Pixel** : reconstruit, installe via ADB et ouvre MISES! sur le téléphone.

Android Studio n'est pas requis pour le flux quotidien.

## Architecture actuelle

MISES! est une PWA Vite et possède une enveloppe Android native WebView dans `android/`.
Ce projet n'utilise pas Capacitor actuellement. On conserve cette architecture afin d'éviter une migration non nécessaire.

## Première utilisation sur le Mac

```bash
cd /Users/cedriccarboni/Projects/mise-qr-case-finder
git fetch --all --prune --tags
git checkout cursor/mises-next-20260929
npm ci
npm run check
```

Pour le Pixel : activer le débogage USB, brancher le téléphone et accepter l'autorisation ADB. Ensuite lancer la tâche **MISES! · Lancer sur Pixel**.

Le script cherche automatiquement `adb` dans le SDK Android habituel du Mac et Gradle dans les emplacements Homebrew/PATH.

## Règles de reprise

1. Source de vérité = `origin/main`.
2. Auditer → réparer/compléter → seulement ensuite créer.
3. Pas de secrets / `.jks` / credentials dans Git.
4. Pas de fausse validation matérielle ni de fausse publication Play.
