# MISES ! — Android

Première enveloppe Android de MISES !, construite à partir de la page Web publiée.

- Application ID : `fr.acousmatictheatre.mise` (constante `playApplicationId` dans `app/build.gradle.kts`)
- minSdk : 26
- targetSdk / compileSdk : 36
- Version : `0.3.0-beta.3` (`versionCode` 8)
- La PWA est embarquée dans l’APK (`src/main/assets/www`, copiée depuis `dist/` par le workflow). L’application ne charge pas la page ART.
- Signature des artefacts CI : keystore debug, pour test. La clé d’upload Play n’est pas dans le dépôt.
- Le workflow produit un APK debug, un APK release et un AAB, tous signés avec la clé de debug pour installation de test. L’impression passe par le service d’impression Android. L’essai WalkPrint/YHK par Bluetooth Classic/RFCOMM reste disponible à part.

## Changer l’applicationId plus tard

On ne le change pas tant qu’on ne sait pas si une version est déjà sur le Play Store. Un nouvel identifiant est une autre application pour Play.

1. Modifier uniquement `playApplicationId` dans `android/app/build.gradle.kts`. Le `namespace` et l’`applicationId` en dépendent.
2. Déplacer `android/app/src/main/java/fr/acousmatictheatre/mise` vers le dossier du nouveau package.
3. Mettre à jour la ligne `package` de chaque fichier Java de ce dossier.
4. Reconstruire l’APK et l’AAB. Ne pas réutiliser cette constante pour un simple changement de nom visible.

## Avant Google Play

1. Stabiliser un domaine MISES ! dédié.
2. La connexion Google est désactivée dans l’APK (WebView). Elle reste dans la version navigateur. Le scope Drive web est le scope complet, pas `drive.file`.
3. Créer et conserver une clé d'upload Play.
4. Ajouter la signature release via secrets CI.
5. Tester caméra, QR, import photo/PDF, hors-ligne, partage et sauvegarde Drive sur appareil réel.
6. Remplacer si nécessaire l'icône native de test par les rasterisations finales du logo officiel.
