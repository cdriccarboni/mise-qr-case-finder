# MISES! 0.4.0-beta.3 — test fermé Google Play

État préparé le 30 septembre 2026.

## Identité du binaire

- Nom : **MISES!**
- Sous-titre : **QR Case Finder**
- Package : `fr.acousmatictheatre.mises`
- Version : `0.4.0-beta.3`
- versionCode : `15`
- minSdk : 26
- targetSdk / compileSdk : 36
- Piste visée : **test fermé uniquement**, pas production.

## Contenu de cette bêta

- Nombre de participant·es disponible dans les jeux, ateliers, création d’ambiance et jeux publics.
- Chaque participant·e reçoit un rôle sonore, y compris pour les grands groupes.
- Répartition propagée dans les défis, scènes, univers et conducteurs.
- Data Bruitage reste la source globale ; le Kit Acoustique reste un sous-ensemble.
- Vision locale COCO-SSD et corrections humaines conservées.
- Application Android embarquée localement dans la WebView ; utilisation hors connexion conservée.
- Safe area Android, caméra, micro, QR et impression Bluetooth conservés.

## Recette automatisée

Avant publication, la CI exige :
1. `npm test` ;
2. build PWA Vite ;
3. tests Playwright ;
4. copie de la PWA dans l’APK ;
5. `assembleDebug`.

Sur `main`, si la vraie clé d’upload est configurée dans GitHub :
6. restauration du keystore ;
7. contrôle du certificat SHA-256 ;
8. `bundleRelease` ;
9. vérification `jarsigner` ;
10. artefact AAB `MISES-Play-AAB`.

Empreinte attendue de la clé d’upload :
`91:1F:5B:04:6A:51:1E:9A:F1:07:7C:E0:45:21:9D:54:FE:C1:AD:FF:A5:84:B1:5C:4C:FD:17:66:5A:E5:D6:CB`.

## Secrets GitHub attendus

- `MISE_UPLOAD_KEYSTORE_B64`
- `MISE_UPLOAD_STORE_PASSWORD`
- `MISE_UPLOAD_KEY_ALIAS`
- `MISE_UPLOAD_KEY_PASSWORD`

Le keystore ne doit jamais être commité dans Git.

## Fiche Play

Nom : **MISES!**

Description courte :
> Inventaire, QR et préparation de mises pour le bruitage et le plateau.

Catégorie : **Outils**.

Public cible prévu pour cette bêta : **18+**.

Publicité : **Non**.

Identifiant publicitaire : **Non**.

Politique de confidentialité :
https://cdriccarboni.github.io/mise-qr-case-finder/privacy.html

## Limite connue de la bêta Android

La connexion Google Drive n’est pas proposée dans la WebView Android. L’application fonctionne sans compte ; la synchro Drive reste disponible dans la version navigateur. Une authentification Google Android native propre nécessitera la configuration OAuth Android avec le certificat de l’application distribuée par Play.

## Recette téléphone à faire sur Pixel

- installation / mise à jour ;
- safe area haut et bas ;
- Trouver · Créer · Ranger · Préparer · Partager ;
- sélection du nombre de participant·es ;
- grands groupes : un rôle par personne ;
- QR réel ;
- photo et contrôle de valise ;
- micro / mémo sonore ;
- mode hors ligne ;
- import / export ;
- imprimante Bluetooth appairée si disponible.

## Promotion

Ne pas promouvoir en production pendant cette phase. L’objectif est d’obtenir une vraie bêta fermée installable via Google Play, puis de corriger les retours terrain.
