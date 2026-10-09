# MISES! — Dossier Google Play Console 0.4.x

> **État officiel : `0.4.0-beta.2` · versionCode `14` · package `fr.acousmatictheatre.mises` · targetSdk 36.**  
> Objectif : **test fermé uniquement** — aucune production.  
> Textes prêts à copier/coller. Ne pas inventer de retours testeurs ni de captures.

Mis à jour le **29/09/2026** sur `cursor/mises-next-20260929` à partir du `main` `1c1b116`.  
Archive / anciennes identités : `docs/PLAY-CONSOLE.md` (section Archive) et historiques 0.2.x / 0.3.x.

---

## 0. Identité technique

| Champ | Valeur | Statut |
|---|---|---|
| Nom affiché | **MISES!** | vérifié |
| Package | `fr.acousmatictheatre.mises` | vérifié |
| versionName / versionCode | `0.4.0-beta.2` / `14` | vérifié (`package.json`, `src/version.js`, `public/version.json`, `android/app/build.gradle.kts`) |
| minSdk / targetSdk / compileSdk | 26 / 36 / 36 | vérifié |
| APK TEST | [MISES-0.4.0-beta.2-TEST.apk](https://github.com/cdriccarboni/mise-qr-case-finder/releases/download/v0.4.0-beta.2/MISES-0.4.0-beta.2-TEST.apk) · pré-release · signature **debug** | vérifié |
| AAB Play signé upload | **non produit dans cette reprise** sans `MISE_UPLOAD_*` | bloqué |
| Clé d’upload dans Git | absente (volontaire) | vérifié |
| Permissions manifeste source | `INTERNET`, `CAMERA`, `RECORD_AUDIO`, `BLUETOOTH` (maxSdk 30), `BLUETOOTH_ADMIN` (maxSdk 30), `BLUETOOTH_CONNECT` | vérifié |
| `AD_ID` | absent | vérifié (source) |
| Google Sign-In Android | désactivé (WebView) | vérifié |
| PWA LIVE | https://cdriccarboni.github.io/mise-qr-case-finder/ | vérifié |
| Confidentialité | https://cdriccarboni.github.io/mise-qr-case-finder/privacy.html | vérifié (HTTP 200) |

### Build Play / signature

- `assembleRelease` / `bundleRelease` **échouent** sans `MISE_UPLOAD_STORE_FILE`, `MISE_UPLOAD_STORE_PASSWORD`, `MISE_UPLOAD_KEY_ALIAS`, `MISE_UPLOAD_KEY_PASSWORD`.
- Aucun artefact signé debug ne doit être présenté comme PLAY.
- Workflow diagnostic unsigned (branche `chatgpt/play-aab-0.4.0-beta.2`) : utile pour vérifier qu’un `.aab` se construit ; **ce n’est pas** un artefact publiable Play.
- Certificat d’upload public connu (historique local beta.3) : SHA-256 `91:1F:5B:04:6A:51:1E:9A:F1:07:7C:E0:45:21:9D:54:FE:C1:AD:FF:A5:84:B1:5C:4C:FD:17:66:5A:E5:D6:CB` · DN `CN=Cedric Carboni, O=Acousmatic Theatre, C=FR`. **Ne pas créer une nouvelle clé** tant que le statut Play de ce certificat n’est pas confirmé.

---

## 1. Fiche Store — textes à coller

### Nom (≤ 30)

```
MISES!
```

### Description courte (≤ 80)

```
Inventaire QR, mises et étiquettes pour le bruitage — offline, sur l’appareil.
```

### Description longue FR

```
MISES! est un outil terrain pour le bruitage et le plateau : inventaire, QR, contenants, kits, mises, étiquettes et préparation — conçu pour fonctionner hors ligne.

Ce que vous pouvez faire :
• Rechercher dans votre base locale (objets, sons, contenants, kits, mises, documents, jeux, recettes publiques)
• Scanner un QR pour ouvrir tout de suite une fiche, une valise ou une mise
• Organiser l’inventaire et le rangement (Data Bruitage reste la source de vérité)
• Créer et imprimer des étiquettes (texte, logo, photo, formats thermiques)
• Importer XLSX, CSV, ODS, DOCX, PDF textuel, JSON, ZIP et images à qualifier
• Utiliser la bibliothèque publique (recettes, fabrications, jeux, activités) sans mélanger possession réelle et suggestion
• Analyser une photo localement (Vision) : propositions à confirmer, jamais d’écriture silencieuse
• Sauvegarder et restaurer une copie locale de votre base

Données : stockées sur l’appareil (IndexedDB). Pas de publicité, pas de mesure d’audience. Le développeur ne reçoit pas votre inventaire.

Android : l’application fonctionne sans compte. La synchronisation Google Drive n’est pas proposée dans l’APK (Google bloque l’identification dans la fenêtre intégrée) ; elle reste possible depuis un navigateur si vous le choisissez explicitement.

MISES! 0.4.x — version de test. Ceci n’est pas une publication production.
```

### Description longue EN (optionnelle)

```
MISES! is an offline-first field tool for foley and stage work: inventory, QR codes, containers, kits, cues/mises, labels and prep.

Search your local library, scan QR codes, organize inventory, create thermal-ready labels, import common office formats, use a sourced public library (kept separate from what you own), and get on-device photo proposals that always need your confirmation.

Your data stays on the device. No ads, no analytics. The Android app works without an account; Google Drive sync is browser-only in this release.

MISES! 0.4.x — closed testing build. Not a production release.
```

### Catégorie / langue

- Type : Application  
- Catégorie : **Outils** (alt. Productivité)  
- Langue par défaut : **Français (France)**

### Coordonnées

- E-mail : `cdric.carboni@gmail.com` (**à confirmer** si une adresse Acousmatic doit être la publique)
- Site : https://cdriccarboni.github.io/mise-qr-case-finder/
- Confidentialité : https://cdriccarboni.github.io/mise-qr-case-finder/privacy.html
- Téléphone : laisser vide

### Notes de version (test fermé)

```
0.4.0-beta.2 (versionCode 14). Étiquettes libres, imports élargis, index global, bibliothèque publique, Vision locale avec validation humaine. APK de test / AAB upload selon clé. Test fermé uniquement — pas de production.
```

EN :

```
0.4.0-beta.2 (versionCode 14). Free labels, broader imports, global index, public library, on-device Vision with human confirmation. Closed testing only — not production.
```

---

## 2. App access

**Réponse : Toutes les fonctionnalités sont disponibles sans compte** (pour l’APK).

Texte d’aide Console :

```
Aucun compte n’est nécessaire dans l’application Android. Recherche, inventaire, QR, photos, mémos, imports, étiquettes, jeux et sauvegarde locale fonctionnent hors ligne après installation.

La synchronisation Google Drive existe uniquement dans la PWA navigateur, après connexion volontaire au compte Google de l’utilisateur. Elle n’est pas proposée dans l’APK 0.4.x (identification Google refusée dans la WebView). Aucun identifiant de test n’est à fournir pour l’APK.
```

Distinction obligatoire :

| Surface | Compte | Drive |
|---|---|---|
| APK Android | non requis | non disponible |
| PWA navigateur | optionnel | optionnel, compte utilisateur |

---

## 3. Ads

**Votre application contient-elle des annonces ?** → **Non**.

Vérifié : aucun SDK pub dans les dépendances Gradle listées ; aucune permission publicitaire dans le manifeste source.

---

## 4. Advertising ID

**Votre application utilise-t-elle l’identifiant publicitaire ?** → **Non**.

`com.google.android.gms.permission.AD_ID` absent du manifeste source. À recontrôler sur le manifeste **fusionné** du binaire uploadé avant envoi Console.

---

## 5. Data safety — matrice APK 0.4.x

**Question « collectez-vous / partagez-vous des données ? » pour l’APK** → **Non** (comportement actuel).

Dans l’APK 0.4.x, la connexion Google ne démarre pas et les hôtes Google Identity sont bloqués côté pont WebView. Photos, mémos, inventaire et e-mail restent sur l’appareil. Le développeur n’a pas de serveur applicatif qui les reçoit. Le partage système n’agit que si l’utilisateur le lance.

| Donnée | Collectée par l’APK ? | Partagée ? | Finalité | Facultative ? | Locale seulement ? | Transit réseau app ? | Suppression |
|---|---|---|---|---|---|---|---|
| Inventaire / textes | Non (stockage local appareil) | Non | fonctionnement offline | — | Oui | Non | dans l’app / effacer données app |
| Photos choisies | Non (local) | Non | fiches / étiquettes / Vision | Oui (utilisateur) | Oui | Non | dans l’app / effacer données |
| Mémos audio | Non (local) | Non | fiches | Oui | Oui | Non | idem |
| E-mail | Non | Non | — | — | — | Non | — |
| Position | Non | Non | — | — | — | Non | — |
| Identifiant pub | Non | Non | — | — | — | Non | — |
| Analytics / crash | Non | Non | — | — | — | Non | — |

Notes :

- `allowBackup=true` : Android peut sauvegarder les données vers le **compte Google de l’utilisateur**. Le développeur ne les reçoit pas. À traiter selon le libellé exact Console.
- **PWA navigateur** (hors déclaration APK) : si l’utilisateur se connecte, e-mail + base (+ photos/mémos selon sync) vont vers **son** Google Drive. Ce n’est pas le comportement de l’APK.
- Si une version future Android rétablit Drive, **refaire** Data safety avant envoi.

Chiffrement en transit : non applicable tant que « collecte » = Non pour l’APK. `usesCleartextTraffic=false` est en place.

Engagement Familles : Non. Examen de sécurité indépendant : Non.

---

## 6. Politique de confidentialité

- Fichier : `public/privacy.html`
- URL stable : https://cdriccarboni.github.io/mise-qr-case-finder/privacy.html
- Contenu attendu 0.4.x : IndexedDB local ; caméra/micro/Bluetooth appairé ; Vision locale ; imports ; Drive **navigateur** volontaire ; APK sans Drive ; pas de pub/analytics ; suppression / révocation Google.

À faire avant collage Console : ouvrir l’URL LIVE et vérifier que le texte mentionne bien Android sans Drive + Vision locale (déjà le cas sur Pages au 29/09/2026 ; mettre à jour la mention « Android 0.3.0 » → « Android 0.4.x » dans le dépôt).

---

## 7. Content rating / IARC

- E-mail IARC : `cdric.carboni@gmail.com` (**à confirmer**)
- Catégorie : **Toutes les autres catégories** (utilitaire / productivité)
- Violence, peur, sexualité, langage, substances, jeux d’argent, humour cru : **Non**
- Échange de contenu entre utilisateurs **dans l’app** : **Non** (partage Drive = navigateur, hors APK)
- Position : **Non**
- Achats numériques : **Non**
- Navigateur libre intégré : **Non**
- Classification attendue : PEGI 3 / Everyone (attribution IARC)

---

## 8. Audience cible

- Tranches : **18 ans et plus** (**à confirmer par Cédric** — doit coller au produit réel, pas à une facilité de validation)
- Attirer involontairement les enfants : **Non**
- Pas de contenu destiné aux enfants

---

## 9. Store assets

| Élément | État |
|---|---|
| Icône haute rés. / adaptive | **présent** (`public/icon-512.png`, adaptive Android) |
| Feature graphic 1024×500 | **à produire** depuis le logo MISES! (pas inventer) |
| Captures téléphone | **à prendre** sur Pixel réel avec APK TEST 0.4.0-beta.2 |
| Captures tablette | optionnel test fermé |

Procédure captures Pixel (reproductible) :

1. Installer l’APK TEST depuis la pré-release GitHub.
2. Scénarios : accueil 5 cartouches ; recherche ; fiche objet ; scan QR ; éditeur d’étiquette ; import / dossier de travail ; Préférences sauvegarde.
3. Captures système Pixel → exporter sans données personnelles réelles (base fictive `public/exemples/`).

---

## 10. Test fermé — préparation

### Checklist avant envoi Console

- [ ] Identité 0.4.0-beta.2 / v14 synchronisée partout
- [ ] AAB signé avec la **vraie** clé d’upload (empreinte connue)
- [ ] Privacy URL LIVE à jour
- [ ] Data safety / Ads / AD_ID / accès app remplis selon ce dossier
- [ ] Feature graphic + ≥ 2 captures téléphone
- [ ] Liste testeurs + invitation
- [ ] **Ne pas** promouvoir en production

### Invitation (brouillon)

```
Bonjour,

Vous êtes invité·e au test fermé de MISES! (bruitage / inventaire QR, offline).
Installez via le lien Play « testeurs » fourni par la Console.
Scénarios prioritaires : recherche, QR, étiquette, import, sauvegarde/restauration, photo/Vision (confirmer ou corriger).
Retour : [formulaire / e-mail]. Merci — Cédric.
```

### Scénario de recette terrain (court)

1. Installer / ouvrir depuis l’écran d’accueil  
2. Safe areas / rotation / retour navigation  
3. Recherche globale  
4. QR scan  
5. Créer une étiquette (texte + image) + impression système  
6. Import CSV ou XLSX d’exemple  
7. Sauvegarde puis restauration (confirmation)  
8. Photo → propositions Vision → confirmer / ignorer  
9. Jeu / défi sur inventaire réel uniquement  

### Suivi nouveaux comptes personnels (si applicable)

| Champ | Valeur |
|---|---|
| Nombre de testeurs requis | selon exigence Console **au moment de l’exécution** |
| Durée continue | idem |
| Date de début | à renseigner à l’ouverture du test |
| Date minimale théorique production | début + durée exigée |
| Retours / bugs | **ne pas inventer** — journaliser au fil de l’eau |

### Futur formulaire « accès production » (ne pas remplir avec des fictions)

- Recrutement testeurs : à décrire **après** recrutement réel  
- Usage : scénarios ci-dessus effectivement exécutés  
- Retours : citations / tickets réels  
- Changements : versions correctives  
- Pourquoi prêt : critères DoD terrain + stabilité offline  

---

## 11. Google Auth / Drive (état + piste propre)

### État actuel

| Surface | Comportement |
|---|---|
| PWA navigateur | Google Identity Services + scope Drive **complet** `https://www.googleapis.com/auth/drive` (nécessaire pour retrouver `_ART` / `MISES !` et partages par id) |
| APK | `MiseAndroid.googleSignInAvailable() === false` ; message utilisateur clair ; pas de contournement UA |

### Ce qui n’est PAS acceptable

- Falsifier User-Agent / retirer `wv`  
- Injecter cookies  
- Stocker un client secret OAuth dans l’APK  

### Piste architecture propre (à implémenter plus tard)

1. Client OAuth **Android** (package + SHA-1/256 du certificat **upload** ou App Signing)  
2. Auth via **Credential Manager** / flux navigateur système (Custom Tabs) avec retour sécurisé  
3. Échange jeton → stockage session limité → Drive API  
4. UX : demande explicite, révocation, fonctionnement sans compte  

Scope : ne pas passer à `drive.file` tant que la recherche dossiers `_ART` / partages existants n’a pas une alternative UX équivalente (sélecteur de dossier / fichier explicite).

Branche ancienne `mise/google-autonomous-auth-20260925` : **ne pas merger** ; idées déjà partiellement reprises dans le flux web actuel.

---

## 12. Éléments nécessitant une action humaine

1. Localiser / fournir le `.jks` d’upload correspondant au certificat connu (ou confirmer qu’aucune fiche Play n’existe encore).  
2. Configurer secrets CI `MISE_UPLOAD_*` **hors Git**.  
3. Créer la fiche Play / piste test fermé.  
4. Produire feature graphic + captures réelles.  
5. Confirmer e-mail public, audience 18+, IARC.  
6. Recruter testeurs et journaliser les retours réels.  
7. Décider de la suite Auth Android native (Credential Manager).
