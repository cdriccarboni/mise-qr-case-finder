# MISES! — Android

Première enveloppe Android de MISES!, construite à partir de la page Web publiée.

- Application ID : `fr.acousmatictheatre.mises` (constante `playApplicationId` dans `app/build.gradle.kts`)
- minSdk : 26
- targetSdk / compileSdk : 36
- Version : `0.3.0-beta.3` (`versionCode` 8)
- La PWA est embarquée dans l’APK (`src/main/assets/www`, copiée depuis `dist/` par le workflow). L’application ne charge pas la page ART.
- Signature des artefacts CI : keystore debug, pour test. La clé d’upload Play n’est pas dans le dépôt.
- Le workflow produit un APK debug, un APK release et un AAB, tous signés avec la clé de debug pour installation de test. L’impression passe par le service d’impression Android. L’essai WalkPrint/YHK par Bluetooth Classic/RFCOMM reste disponible à part.

## Nouvelle appli, à côté de l’ancienne

`fr.acousmatictheatre.mises` n’est pas une mise à jour de `fr.acousmatictheatre.mise`. Android installe une seconde appli. Le stockage de l’ancienne n’est pas visible dans la nouvelle. Il n’y a pas de projet Capacitor, ni de FileProvider.

Un intent-filter `VIEW` reçoit `https://cdriccarboni.github.io/mise-qr-case-finder/…` et ouvre la page locale en conservant la query (`projectId`, `projectName`, `returnUrl`). Ce n’est pas un App Link vérifié : le fichier `assetlinks.json` devrait être servi à `https://cdriccarboni.github.io/.well-known/`, en dehors de ce dépôt.

1. Dans l’ancienne appli : Partager, puis Sauvegarde. Garde le fichier.
2. Installe la nouvelle appli, ouvre-la, puis Importer une sauvegarde et choisis ce fichier.
3. Vérifie que tes objets, photos et mises sont là, puis désinstalle l’ancienne.

## Avant Google Play

1. Stabiliser un domaine MISES! dédié.
2. La connexion Google est désactivée dans l’APK (WebView). Elle reste dans la version navigateur. Le scope Drive web est le scope complet, pas `drive.file`.
3. Créer et conserver une clé d'upload Play.
4. Ajouter la signature release via secrets CI.
5. Tester caméra, QR, import photo/PDF, hors-ligne, partage et sauvegarde Drive sur appareil réel.
6. Remplacer si nécessaire l'icône native de test par les rasterisations finales du logo officiel.
