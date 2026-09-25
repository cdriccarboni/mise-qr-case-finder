# MISE ! — Android

Première enveloppe Android de MISE!, construite à partir de la page Web publiée.

- Application ID : `fr.acousmatictheatre.mise`
- minSdk : 26
- targetSdk / compileSdk : 36
- Source Web actuelle : `https://art.acousmatic-theatre.fr/mise-app/`
- Les mises à jour de la page restent la source de vérité.
- Le build produit un APK de test et peut produire un AAB release non signé. Le pilote Android inclut un test expérimental WalkPrint/YHK par Bluetooth Classic/RFCOMM.

## Avant Google Play

1. Stabiliser un domaine MISE! dédié.
2. Rendre la connexion Google autonome dans MISE! ; la session ART en `sessionStorage` ne peut pas être le contrat final d'une app indépendante.
3. Créer et conserver une clé d'upload Play.
4. Ajouter la signature release via secrets CI.
5. Tester caméra, QR, import photo/PDF, hors-ligne, partage et sauvegarde Drive sur appareil réel.
6. Remplacer si nécessaire l'icône native de test par les rasterisations finales du logo officiel.
