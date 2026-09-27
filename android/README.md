# MISE ! — Android

Première enveloppe Android de MISE!, construite à partir de la page Web publiée.

- Application ID : `fr.acousmatictheatre.mise`
- minSdk : 26
- targetSdk / compileSdk : 36
- Version : `0.3.0-beta.2` (`versionCode` 7)
- La PWA est embarquée dans l’APK (`src/main/assets/www`, copiée depuis `dist/` par le workflow). L’application ne charge pas la page ART.
- Signature des artefacts CI : keystore debug, pour test. La clé d’upload Play n’est pas dans le dépôt.
- Le workflow produit un APK debug, un APK release et un AAB, tous signés avec la clé de debug pour installation de test. L’impression passe par le service d’impression Android. L’essai WalkPrint/YHK par Bluetooth Classic/RFCOMM reste disponible à part.

## Avant Google Play

1. Stabiliser un domaine MISE! dédié.
2. La connexion Google est désactivée dans l’APK (WebView). Elle reste dans la version navigateur. Le scope Drive web est le scope complet, pas `drive.file`.
3. Créer et conserver une clé d'upload Play.
4. Ajouter la signature release via secrets CI.
5. Tester caméra, QR, import photo/PDF, hors-ligne, partage et sauvegarde Drive sur appareil réel.
6. Remplacer si nécessaire l'icône native de test par les rasterisations finales du logo officiel.
