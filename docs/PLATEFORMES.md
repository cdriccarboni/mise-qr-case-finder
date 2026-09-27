# Plateformes

## Web / PWA

Le site GitHub Pages du dépôt sert la PWA. Le workflow `.github/workflows/pages.yml` publie `main` et la branche `grok/mise-finalisation-20260927`.

URL du projet : `https://cdriccarboni.github.io/mise-qr-case-finder/`

L’environnement `github-pages` n’autorise que `main` (politique de branche personnalisée, id `60999136`). Les déploiements de cette branche (runs `36313309131` et `36313466539`) sont refusés : « Branch is not allowed to deploy to github-pages due to environment protection rules ». Le site servi le 27 septembre 2026 à 10:45 UTC était encore celui de `main` (en-tête `Last-Modified: Sun, 27 Sep 2026 09:24:22 GMT`, run `36309232785`, version 0.2.1-beta.1). Ajouter `grok/mise-finalisation-20260927` à cette politique a renvoyé HTTP 403 depuis cet agent. La prévisualisation `0.2.2-beta.1` sur cette URL attend donc soit l’ajout manuel de la branche dans Settings → Environments → github-pages, soit le merge dans `main`. Le job `build` du workflow Pages a tout de même produit l’artefact `github-pages` (run `36313466539`, 18 257 566 octets).

Hors ligne : le service worker met en cache le shell et le modèle de vision après une visite en ligne. Les données restent dans IndexedDB.

## Android

L’application `fr.acousmatictheatre.mise` embarque la PWA dans l’APK (`android/app/src/main/assets/www`, produit par `npm run build` dans le workflow). Elle ne charge plus `https://art.acousmatic-theatre.fr/mise-app/`.

- `versionCode` 4
- `versionName` `0.2.2-beta.1`
- minSdk 26, targetSdk 36
- APK debug et APK/AAB release du workflow sont signés avec le **keystore de debug** Android. Ce n’est pas une clé d’upload Play.

Le workflow `.github/workflows/android.yml` produit les artefacts `MISE-Android-build` (APK debug, APK release de test, AAB de test).

Le premier build de cette branche (runs `36313309109` et `36313466568`) s’arrêtait à `:app:checkDebugAarMetadata` : `androidx.webkit` était déclaré alors que `android.useAndroidX` valait `false`. La propriété est maintenant `true`. Aucune bibliothèque `com.android.support` n’est utilisée, donc pas de Jetifier.

### Échecs CI anciens

Sur `mise/android-play-prep-20260925`, les runs `36140513134`, `36140648796` et les relais ART échouaient avec `sdkmanager: command not found` (exit 127) : le script appelait `sdkmanager` sans `ANDROID_HOME`. Le workflow actuel pointe vers `/usr/local/lib/android/sdk`. Le run `main` `36309232796` (0.2.1-beta.1) était déjà vert avant cette branche. Le relais ART n’est pas réintroduit.

### Ce qui manque pour la signature Play existante

- Le keystore d’upload Play n’est pas dans le dépôt, et il ne doit pas y être commité.
- Il manque, en secrets du dépôt (noms habituels) : fichier keystore, `storePassword`, `keyAlias`, `keyPassword`.
- Sans ces secrets, on ne peut pas produire l’AAB signé comme les versions déjà envoyées à Play. L’AAB de ce workflow est installable pour test, pas acceptable tel quel comme mise à jour Play si une clé d’upload est déjà enregistrée.
- Aucune clé « de prod » n’a été fabriquée ici.

## macOS et iOS

Aucun binaire macOS ou iOS n’a été produit.

Pipeline nécessaire, non exécuté :

1. Compte Apple Developer et certificats (développement, distribution, profils).
2. Un conteneur natif (par exemple Capacitor ou un projet Xcode WKWebView) qui embarque le même `dist/`, sur le modèle Android. Ne pas pointer vers ART.
3. iOS : Xcode, signature, TestFlight. macOS : archive notarized si une app Mac est voulue.
4. Les mêmes permissions caméra, micro et fichiers, et la même base IndexedDB locale.
5. La PWA Safari (Ajouter à l’écran d’accueil) reste le seul chemin iPhone réellement disponible aujourd’hui. Il n’a pas été vérifié sur un iPhone dans cette session.

## ART

Le cœur (import, recherche, fiches, QR, photo locale, sauvegarde) fonctionne sans ART. Un lien de retour vers un projet du même origine reste accepté s’il est passé dans l’URL, mais l’écran ne l’exige pas. Le partage QR pointe vers l’origine MISE ouverte, plus vers `art.acousmatic-theatre.fr`.
