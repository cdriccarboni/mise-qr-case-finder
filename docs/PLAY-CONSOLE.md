# MISE ! — Dossier Google Play Console (test fermé)

> **Code actuel : 0.3.0-beta.1 (`versionCode` 6).** Les statuts « vérifié » de ce dossier portent sur les binaires `0.2.3-beta.1` déjà mesurés. Ils ne sont pas réécrits. La clé d’envoi Play est toujours absente du dépôt : elle n’a pas été recréée, ni devinée. Les APK de test 0.3.0 restent signés avec la clé debug.

Mis à jour le 27/09/2026 sur la branche `grok/mise-playconsole-20260927`, à partir du code de `0.2.3-beta.1` (`versionCode` 5) et des binaires construits dans cette session. Statuts : **vérifié** / **partiel** / **bloqué** / **non testé**. Les inconnues restent marquées **à confirmer par Cédric**.

Ce document prépare une fiche. Il n’annonce pas une publication Play, n’envoie rien à la Play Console et ne contacte aucun testeur.

## 0. Identité technique

| Champ | Valeur | Statut |
|---|---|---|
| Package | `fr.acousmatictheatre.mise` | **vérifié** (`aapt dump badging` sur l’APK debug) |
| versionCode / versionName | 5 / 0.2.3-beta.1 | **vérifié** (manifeste packagé debug et release, et manifeste du bundle) |
| minSdk / targetSdk / compileSdk | 26 / 36 / 36 | **vérifié** |
| APK debug publié | [MISE-0.2.3-beta.1-TEST-debug.apk](https://github.com/cdriccarboni/mise-qr-case-finder/releases/download/v0.2.3-beta.1-test/MISE-0.2.3-beta.1-TEST-debug.apk) — 19 715 326 octets — SHA-256 `99fdd99b161be01e13d3f125ca085a4c6db0ea47a1bd7357535731f6fda8d723` | **vérifié** (artefact du run CI `36315501940`, retéléchargé) |
| AAB publié | [MISE-0.2.3-beta.1-TEST-release-signe-debug.aab](https://github.com/cdriccarboni/mise-qr-case-finder/releases/download/v0.2.3-beta.1-test/MISE-0.2.3-beta.1-TEST-release-signe-debug.aab) — 19 147 837 octets — SHA-256 `0a9956912fb830bc56c46291df5a3b5c9c8a11d891436babb27208e587bc2043` | **vérifié** (même run, `bundleRelease`) |
| APK release de test | [MISE-0.2.3-beta.1-TEST-release-signe-debug.apk](https://github.com/cdriccarboni/mise-qr-case-finder/releases/download/v0.2.3-beta.1-test/MISE-0.2.3-beta.1-TEST-release-signe-debug.apk) — 19 153 174 octets — SHA-256 `b12ad5739382a4dc4f36d88b5f197e53bb31f52a88b97dc9aa3c828d0f64b8c5`. Même certificat debug. | **vérifié** |
| Signature des fichiers publiés | `C=US, O=Android, CN=Android Debug`. SHA-256 du certificat : `29b8fe2ac7a2cf680fe9bfebcf9af8cfa59ee26ecb6d81e46178884ad266f5d9`. SHA-1 : `29a9da26899ea2cf8de32d795cc6969f1bd447ce`. Créé le 27/09/2026 à 11:23:10 UTC sur le runner du run `36315501940`. | **vérifié** (`apksigner` sur les deux APK, `keytool` sur l’AAB) |
| Clé d’upload Play | **absente**. Aucun `.jks` / `.keystore` dans le dépôt. `PLAY_STORE_PREP.md` dit qu’une clé d’upload existe déjà et n’est pas disponible ici. Elle n’a pas été inventée, ni recréée, ni devinée. | **bloqué** |
| Conséquence Play | Cet AAB est signé avec la clé debug. Play le refusera comme envoi d’une application, et il ne peut pas servir de mise à jour d’une fiche déjà signée avec la clé d’upload. | **vérifié** (certificat) / envoi Play **non testé** (aucun envoi) |
| Permissions du manifeste packagé (debug, release et bundle) | `INTERNET`, `CAMERA`, `RECORD_AUDIO`, `BLUETOOTH` (maxSdk 30), `BLUETOOTH_ADMIN` (maxSdk 30), `BLUETOOTH_CONNECT` | **vérifié** |
| Absents du manifeste fusionné | `AD_ID`, localisation, `READ_MEDIA_*`, `BLUETOOTH_SCAN`, `POST_NOTIFICATIONS`, `FOREGROUND_SERVICE`, `SCHEDULE_EXACT_ALARM`, `USE_FULL_SCREEN_INTENT` | **vérifié** |
| SDK | WebView + `androidx.webkit` 1.12.1 (`WebViewAssetLoader`), PWA Vite + Workbox, `@zxing/browser`, `@tensorflow/tfjs` + coco-ssd embarqué, pdfjs-dist, mammoth, xlsx, idb, fuse.js, qrcode. Google Identity Services reste dans le JavaScript pour le navigateur ; l’APK ne lance pas ce flux. | **vérifié** |
| SDK pub / analytics / crash | Aucun dans le manifeste packagé | **vérifié** |
| allowBackup | `true` | **vérifié** |
| usesCleartextTraffic | `false` | **vérifié** |

Pré-version GitHub (pas un lien Play) : https://github.com/cdriccarboni/mise-qr-case-finder/releases/tag/v0.2.3-beta.1-test

Un build local antérieur, sur une autre machine, a produit les mêmes versionCode, targetSdk et permissions, avec un autre certificat debug (`88abe27f02b21a402da651d020f93d975eb12cf6676b8fef6f3e4de157929960`, créé à 11:18:15 UTC). Ces fichiers-là ne sont pas ceux de la pré-version. Les empreintes ci-dessus sont celles des fichiers publiés.

## 1. Fiche Play Store principale

**Nom de l'application** (6/30) :

```
MISE !
```

**Description courte** (70/80) :

```
Inventaire, QR et préparation de mises pour le bruitage et le plateau.
```

**Description longue** :

```
MISE ! aide à retrouver, préparer et contrôler les objets, valises, kits et mises utiles au bruitage et au travail de plateau.

• Rechercher dans votre base de travail (objets, contenants, kits, sons)
• Organiser objets et contenants, créer et imprimer des QR
• Scanner un QR pour retrouver une valise ou un objet
• Préparer une mise et la rattacher à un projet
• Ajouter des photos et des notes vocales
• Importer un classeur (XLSX/CSV), un PDF ou un document Word
• Reconnaissance d'objets sur l'appareil (modèle embarqué, sans envoi d'image)
• Impression sur imprimante Bluetooth appairée

Vos données restent sur l'appareil. Dans cette version Android, la synchronisation Google Drive n'est pas disponible : Google bloque l'identification dans la fenêtre intégrée. L'application fonctionne sans compte. Pas de publicité, pas de mesure d'audience.

MISE ! est pensée pour le terrain et la répétition : utilisable hors ligne.
```

**Type** : Application · **Catégorie** : Outils (alternative : Productivité) · **Tags** : jusqu’à 5 tags proposés par la Console, proches de inventaire, QR, organisation (**à confirmer par Cédric**).
**Langue par défaut** : Français (France) – fr-FR.

## 2. Coordonnées

- E-mail public : `cdric.carboni@gmail.com` (compte propriétaire du dépôt). L’autre candidat vu dans le dossier initial, `acousmatictheatre@gmail.com`, n’a pas été vérifié et n’est pas utilisé. **À confirmer par Cédric** s’il veut une autre adresse publique.
- Site web : https://cdriccarboni.github.io/mise-qr-case-finder/
- Téléphone : laisser vide.

## 3. Accès à l'application

Réponse : **Certaines fonctionnalités sont limitées**.

```
Aucun compte n'est nécessaire. Recherche, QR, photos, mémos sonores, import et sauvegarde JSON fonctionnent sans connexion.
Dans l'application Android 0.2.3, la connexion Google est désactivée : Google refuse l'identification dans la vue intégrée. Aucun identifiant de test n'est à fournir.
La synchronisation Google Drive existe seulement dans la version ouverte dans un navigateur (Chrome), avec le compte Google de l'utilisateur.
```

### Connexion Google dans la WebView — constat et choix

**Vérifié dans le code** (avant correctif) : l’APK charge la PWA dans une `WebView` (`https://appassets.androidplatform.net/assets/www/index.html`). La connexion appelait Google Identity Services (`initTokenClient` + `requestAccessToken`, script `https://accounts.google.com/gsi/client`) dans cette WebView. L’agent utilisateur Android contient `wv` ; le code ne le retire pas. Les hôtes Google étaient en plus laissés dans la WebView. Google répond dans ce cas `disallowed_useragent`. Aucun onglet Custom Tab, aucun Credential Manager, aucun client OAuth Android.

**Non retenu** : Custom Tabs / navigateur système avec retour du jeton, et Credential Manager. Les deux exigent un client OAuth Android (nom de package + SHA-1) ou une URI de redirection enregistrée dans la console Google. La seule identité présente dans le code est un client Web. La clé d’upload Play n’est pas dans le dépôt, et le certificat debug change selon la machine : aucun SHA-1 stable à déclarer. Ouvrir un navigateur sans pouvoir récupérer le jeton laisserait l’utilisateur devant une erreur Google. Retirer `wv` de l’agent utilisateur pour contourner le refus n’a pas été fait.

**Appliqué** : la connexion Google est désactivée dans l’APK.

- Pont `MiseAndroid.googleSignInAvailable()` renvoie `false`, avec un message en français (`AndroidShellBridge.java`).
- `requestGoogleSession()` s’arrête avant de charger Identity Services. Une session déjà en mémoire est ignorée.
- Les boutons « Connexion Google », « Partager par QR » et les préférences affichent ce message. Le reste de l’app (recherche, QR, photos, mémos, import, sauvegarde JSON) n’est pas coupé.
- La WebView répond 403 aux requêtes vers `accounts.google.com`, `googleapis.com` et `gstatic.com`. Une navigation hors de l’origine locale part vers le navigateur du système.
- Le JavaScript embarqué contient encore le client Drive du navigateur (chaîne `auth/drive` présente, `drive.file` absente, message « fenêtre intégrée » présent). Il n’est pas lancé par l’enveloppe Android.

**Vérifié** : test Node (`tests/google-sync.test.mjs`) et Playwright (`tests/browser/android-google.spec.js`) : le pont affiche le message, le partage Drive ne s’ouvre pas, aucune requête vers `accounts.google.com` / `googleapis.com` / `gstatic.com`. Sans pont, le libellé reste « Connexion Google » et Identity Services n’est pas chargé au démarrage.
**Non testé** : APK installé sur un téléphone. Pas d’émulateur dans cette session.

### Scope Drive

**Non appliqué** : le remplacement de `https://www.googleapis.com/auth/drive` par `drive.file`.

`drive.file` ne voit que les fichiers créés par l’application ou ouverts via le sélecteur Google. Le code de synchro (`src/google-sync.js`) :

- cherche un dossier existant nommé `_ART`, puis `MISE !`, par nom dans tout le Drive (`searchFolders`) ;
- ouvre un partage par identifiant de fichier (`loadSharePackage`).

Ces deux lectures échouent avec `drive.file` si le dossier a été créé hors de ce client, ou si le fichier a été partagé par quelqu’un d’autre. Le scope complet reste celui de la version navigateur. Test unitaire : le scope exporté est exactement `https://www.googleapis.com/auth/drive`.

Conséquence, inchangée pour le web : scope restreint. En mode test OAuth, les comptes qui se connectent dans le navigateur doivent être utilisateurs test du client OAuth (100 maximum). **À confirmer par Cédric** dans la console Google. L’APK Android ne fait plus cet appel.

## 4. Annonces

**Votre application contient-elle des annonces ?** → **Non**. Aucune permission publicitaire, aucun SDK pub dans le manifeste packagé. **Vérifié**.

## 5. Identifiant publicitaire

**Votre application utilise-t-elle l'identifiant publicitaire ?** → **Non**. `com.google.android.gms.permission.AD_ID` absent du manifeste packagé debug, release et bundle. **Vérifié**.

## 6. Classification du contenu (questionnaire IARC)

- E-mail IARC : `cdric.carboni@gmail.com` (**à confirmer par Cédric** s’il en veut un autre).
- Catégorie : **Toutes les autres catégories d’applications (Utilitaire, productivité, communication ou autre)**.
- Violence, peur, sexualité, langage grossier, substances contrôlées, jeux d’argent ou simulés, humour cru : **Non**.
- Interaction ou échange de contenu entre utilisateurs dans l’app : **Non** (le partage Drive du navigateur envoie un fichier au Drive de l’utilisateur ; l’APK ne le fait pas).
- Partage de la position : **Non**.
- Achats numériques : **Non**.
- Accès Internet non restreint (navigateur intégré, moteur de recherche) : **Non**. L’APK n’embarque pas un navigateur libre ; une navigation externe ouvre le navigateur du système.
- Classification attendue : PEGI 3 / USK 0 / ESRB Everyone. Le résultat final est attribué par l’IARC. **Non testé** (formulaire non soumis).

## 7. Public cible et contenu

- Tranches d’âge : **18 ans et plus** (**à confirmer par Cédric**). Ne pas cocher de tranche sous 13 ans.
- Attirer involontairement les enfants : **Non**.
- Fiche Play : pas de contenu destiné aux enfants.

## 8. Règles de confidentialité

- Fichier : `public/privacy.html` (texte du 27/09/2026). Il cite Google Drive, `cdric.carboni@gmail.com`, IndexedDB, les photos, les mémos sonores, le fichier `mise-data.json`, et le fait que l’application Android 0.2.3 ne transmet pas ces données.
- URL prévue : https://cdriccarboni.github.io/mise-qr-case-finder/privacy.html
- **Partiel** : le 27/09/2026, cette URL répond HTTP 200 avec l’ancien texte (pas de Google Drive, pas d’adresse). Le workflow Pages ne déploie que `main`. Le nouveau texte sera en ligne seulement après merge de cette branche dans `main`. Ne pas coller l’URL dans la Console tant que le texte en ligne n’est pas celui du dépôt.

Correspondance avec le code (**vérifié** par lecture, test unitaire sur les phrases du HTML) :

| Ce que dit la page | Code |
|---|---|
| Base locale IndexedDB, pas envoyée au développeur | `src/data-bruitage.js` (`DATA_STORES`) + `kits` + `settings` dans IndexedDB (`src/main.js`) |
| Photos JPEG réduites et mémos audio dans les fiches | `resizePhoto` (JPEG, côté appareil) ; `audioMemo` en data URL via `MediaRecorder` |
| Synchro Drive facultative dans le navigateur : e-mail via userinfo, fichier `mise-data.json` sous `_ART` / `MISE !`, photos et mémos inclus | `connectedGoogleProfile`, `privateStatePayload` = `readData` + `kits` (les champs photo et audio sont dans les objets) |
| Partage : fichier séparé, médias seulement si la case est cochée, adresses envoyées à l’API Permissions | `sharePayload`, `createSharePackage`, `grantFileReader` (`sendNotificationEmail=true`) |
| Android 0.2.3 : pas de connexion, pas d’envoi | `AndroidShellBridge`, blocage des hôtes Google dans `MainActivity` |
| Reconnaissance sur l’appareil, image non envoyée | `src/local-vision.js` charge `models/coco-ssd`. `requestPhotoAnalysis` (`/api/staging-analyse`) n’est appelé par aucun écran. Playwright hors ligne vérifie qu’aucune requête vers cette route ne part |
| Jeton en session navigateur | `sessionStorage`, clé `mise-google-oauth-session-v1` |

## 9. Sécurité des données

Les réponses ci-dessous décrivent **l’APK 0.2.3 (versionCode 5)**, pas le site web.

**L'application collecte-t-elle ou partage-t-elle des données utilisateur ?** → **Non**.

Dans cet APK, la connexion Google ne démarre pas et les hôtes Google sont bloqués. Photos, mémos, inventaire et adresse e-mail restent sur l’appareil. Le développeur n’a pas de serveur qui les reçoit. Le menu Partager du système n’agit que si l’utilisateur le lance.

**Chiffrement en transit** : rien n’est transmis par l’APK vers un serveur de l’application. `usesCleartextTraffic=false` est présent si une requête HTTPS avait lieu. La question Play sur le chiffrement ne se pose que si la réponse « collecte » est Oui.

**Suppression** : dans l’app, ou en effaçant les données de l’application. Le développeur n’en a pas de copie. Pas de création de compte dans l’APK, donc pas d’URL de suppression de compte.

| Type Play | Collecté par l’APK 0.2.3 | Partagé | Pourquoi |
|---|---|---|---|
| Adresse e-mail | Non | Non | userinfo n’est appelé que dans le navigateur, après connexion. L’APK ne lance pas cette connexion. |
| Photos | Non | Non | stockées dans IndexedDB. Incluses dans `mise-data.json` seulement si l’utilisateur synchronise depuis un navigateur. |
| Enregistrements vocaux | Non | Non | même règle que les photos (`audioMemo`). |
| Fichiers et documents | Non | Non | import et base restent locaux. L’export JSON est un fichier que l’utilisateur enregistre lui-même. |

`allowBackup=true` : Android peut sauvegarder les données d’application vers le compte Google **de l’utilisateur**. Le développeur ne les reçoit pas. **À confirmer par Cédric** au moment du formulaire si la Console pose la question du backup.

La version **navigateur** (hors APK), si l’utilisateur se connecte, envoie bien e-mail, base, photos et mémos vers le Drive de cet utilisateur, et les adresses de partage vers l’API Permissions. Ce n’est pas le comportement de l’APK à déclarer dans ce formulaire. Si une prochaine version Android rétablit Drive, il faudra changer cette section avant l’envoi.

Pratiques : « Engagement Familles » Non. « Examen de sécurité indépendant » Non.

## 10. Autres déclarations « Contenu de l'appli »

| Déclaration | Réponse | Statut |
|---|---|---|
| Application gouvernementale | Non | **vérifié** (pas de fonction associée) |
| Fonctionnalités financières | Aucune | **vérifié** |
| Santé | Non | **vérifié** |
| Actualités | Non | **vérifié** |
| COVID-19 / Health Connect / VPN / accessibilité déclarée / gestion d’appareil | Non concerné | **vérifié** (manifeste) |
| Autorisations photos et vidéos (`READ_MEDIA_*`) | Non concerné : absentes. Photo via le sélecteur / la caméra (`CAMERA`, `onShowFileChooser`) | **vérifié** |
| Service de premier plan | Non concerné | **vérifié** |
| Alarmes exactes / plein écran | Non concerné | **vérifié** |
| Localisation | Non concerné | **vérifié** |
| Notifications | Non concerné | **vérifié** |

## 11. Autorisations — manifeste fusionné

Contrôle du 27/09/2026 sur :

- `android/app/build/intermediates/packaged_manifests/debug/processDebugManifestForPackage/AndroidManifest.xml`
- le même fichier en `release`
- `android/app/build/intermediates/bundle_manifest/release/.../AndroidManifest.xml`
- `aapt dump permissions` sur l’APK debug et l’APK release

Aucune permission ajoutée par les bibliothèques au-delà de celles du source. `androidx.webkit` n’en ajoute pas. Aucune permission n’a été retirée : chacune est utilisée.

| Permission | Usage dans le code |
|---|---|
| `CAMERA` | scan QR (`getUserMedia` + `@zxing/browser`), photo, détection locale |
| `RECORD_AUDIO` | mémo sonore (`MediaRecorder`). La dictée (`SpeechRecognition`) n’existe que si la WebView l’expose ; sinon un message s’affiche |
| `BLUETOOTH` maxSdk 30 | adaptateur, appareils appairés, socket RFCOMM sur Android 7 à 11 |
| `BLUETOOTH_ADMIN` maxSdk 30 | `cancelDiscovery()` avant connexion, sur Android ≤ 11 |
| `BLUETOOTH_CONNECT` | nom, appareils appairés et connexion à partir d’Android 12. Pas de recherche d’appareils autour |
| `INTERNET` | la page est chargée en `https://appassets.androidplatform.net/...` (WebViewAssetLoader). La permission est conservée pour cette origine HTTPS. Les hôtes Google sont interceptés et refusés : l’APK ne s’en sert pas pour Drive |

`BLUETOOTH_SCAN` n’est pas déclarée. Sur Android 12+, `cancelDiscovery()` peut lever `SecurityException` ; l’appel est attrapé et l’impression continue vers un appareil déjà appairé. **Non testé** sur imprimante réelle.

## 12. Niveau d'API, version, signature

- targetSdk 36 : conforme à l’exigence Play 2026 pour une nouvelle application (API 35+). **Vérifié** sur le manifeste packagé.
- versionCode 5 : strictement supérieur à 4. **Vérifié**.
- Play App Signing : obligatoire pour un AAB neuf. Choix Console : « Laisser Google gérer et protéger la clé de signature ». **Non fait** (aucun accès Console).
- Clé d’upload : `PLAY_STORE_PREP.md` indique qu’une clé existe et n’est pas disponible dans cet environnement. Recherche dans le dépôt : aucun keystore. Aucune clé n’a été fabriquée pour « remplacer » celle-là. L’AAB de test reste signé `CN=Android Debug`.
- Le certificat des fichiers publiés (SHA-256 `29b8fe2a…`, runner du 27/09/2026 à 11:23:10 UTC) n’est ni la clé d’upload Play, ni le certificat debug du build local de contrôle (`88abe27f…`), ni celui de la pré-version 0.2.2. Chaque runner neuf recrée un debug. Aucune de ces clés n’est la clé d’upload.

## 13. Notes de version (si un test fermé est créé plus tard)

```
<fr-FR>
0.2.3-beta.1 (versionCode 5). Application utilisable sans compte. La connexion Google est désactivée dans l’application Android. Recherche, QR, photos, import et sauvegarde locale sont à tester. Ceci n’est pas une publication Play.
</fr-FR>
<en-US>
0.2.3-beta.1 (versionCode 5). The app works without an account. Google sign-in is disabled inside the Android app. Please try search, QR, photos, import and local backup. This is not a Play release.
</en-US>
```

## 14. Éléments graphiques

| Élément | Exigence | État |
|---|---|---|
| Icône 512×512 | obligatoire | Repris du dossier du 27/09 (Drive `mise-play-icon-512.png`). **Non retéléchargé ici** |
| Image 1024×500 | obligatoire | Repris du dossier (Drive `mise-feature-graphic-1024x500.png`). **Non retéléchargé ici** |
| Captures téléphone (2 minimum) | obligatoire | **Manquant** |

## 15. Checklist test fermé

Rien dans cette liste n’a été exécuté sur la Play Console.

1. [ ] Créer l’application, langue fr-FR, gratuite (**prix à confirmer par Cédric**).
2. [ ] Remplir le contenu de l’appli et la fiche. Attendre que `privacy.html` en ligne soit le texte de cette branche.
3. [ ] Canal de test fermé. Pays : **à confirmer par Cédric**.
4. [ ] Testeurs : liste ou Google Group fournis par Cédric. **Aucun testeur n’a été contacté.**
5. [ ] N’importer l’AAB qu’une fois signé avec la clé d’upload réelle, pas avec le fichier de cette pré-version GitHub.
6. [ ] Examen, puis lien d’adhésion, seulement après décision de Cédric.
7. [ ] Compte créé après le 13/11/2023 : 12 testeurs pendant 14 jours avant la production. Type de compte : **à confirmer par Cédric**.

## 16. Ce que seul Cédric peut faire

- Ouvrir la Play Console, créer l’app, valider les formulaires, soumettre. Rien de cela n’a été fait ici.
- Retrouver la clé d’upload déjà mentionnée dans `PLAY_STORE_PREP.md`, ou décider d’en créer une nouvelle s’il n’y a pas encore de fiche avec ce package. La garder hors de Git.
- Confirmer l’e-mail public s’il ne veut pas `cdric.carboni@gmail.com`.
- Fournir les testeurs ou le Google Group. Ne pas les contacter depuis cet agent.
- Dire si la synchro Drive du navigateur doit un jour revenir dans l’APK (client OAuth Android + SHA-1 de la clé d’upload).

## 17. Preuves de cette session

| Contrôle | Résultat | Statut |
|---|---|---|
| `npm test` (Node, 23 tests) | 23 réussis en local ; le job CI [36315501936](https://github.com/cdriccarboni/mise-qr-case-finder/actions/runs/36315501936) refait `npm test` avec succès | **vérifié** |
| `npm run build` | Vite OK en local et dans les deux jobs CI. Modèle COCO-SSD vérifié par `prepare-vision.mjs` | **vérifié** |
| Playwright (6 tests) | 6 réussis en local et dans [36315501936](https://github.com/cdriccarboni/mise-qr-case-finder/actions/runs/36315501936) | **vérifié** |
| `assembleDebug` + `assembleRelease` + `bundleRelease` | Réussi en local, puis dans [36315501940](https://github.com/cdriccarboni/mise-qr-case-finder/actions/runs/36315501940) (`assembleDebug`, `assembleRelease`, `bundleRelease`) | **vérifié** |
| Téléphone, caméra, QR réel, imprimante, compte Google réel | pas d’appareil, pas de compte utilisé | **non testé** |
| Envoi Play, contact de testeurs | non fait | **non testé** (voulu) |

### Pré-version GitHub

https://github.com/cdriccarboni/mise-qr-case-finder/releases/tag/v0.2.3-beta.1-test

Tag `v0.2.3-beta.1-test` sur le commit `af6707e`, marqué pré-version. Les trois fichiers du §0 y sont joints. Les notes de la pré-version disent que l’AAB n’est pas signé avec la clé d’envoi Play. Ce n’est pas une annonce de publication Play.
