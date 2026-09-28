# MISES! dans Cursor

La branche de travail est `cursor/mises-reprise-20260928`.

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
Ce projet n'utilise pas Capacitor actuellement. On conserve cette architecture pendant la reprise afin d'éviter une migration non nécessaire.

## Première utilisation sur le Mac

```bash
npm ci
npm run check
```

Pour le Pixel : activer le débogage USB, brancher le téléphone et accepter l'autorisation ADB. Ensuite lancer la tâche **MISES! · Lancer sur Pixel**.

Le script cherche automatiquement `adb` dans le SDK Android habituel du Mac et Gradle dans les emplacements Homebrew/PATH.
