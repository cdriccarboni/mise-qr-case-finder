# MISES! 0.4.0-beta.2 — recette

## Version
- versionName : `0.4.0-beta.2`
- versionCode : `14`
- package Android : `fr.acousmatictheatre.mises`

## Étiquettes
- raccourci « Créer une étiquette » ;
- éditeur libre texte + image ;
- plusieurs blocs ;
- déplacement / redimensionnement tactiles ;
- rotation, avant/arrière, duplication, suppression ;
- formats thermiques en millimètres + dimensions personnalisées ;
- horizontal / vertical / 90° ;
- gras, italique, souligné, alignement, interligne, marge interne ;
- PNG/JPEG/WebP ;
- recadrage « remplir » / contenir ;
- aperçu noir/blanc, seuil, inversion, tramage ;
- annuler/rétablir, modèles locaux, récentes ;
- impression via la chaîne système MISES ;
- accès contextuel depuis objet, contenant, kit et mise.

Le QR historique reste sur son moteur éprouvé ; il n'est pas brutalement recouplé au canvas libre.

## Import de données
Formats directs : XLSX, XLS, ODS, CSV, TSV, JSON, TXT, Markdown, PDF textuel et DOCX.

ZIP : parcours local des documents pris en charge.

Images PNG/JPEG/WebP : acceptées comme élément à qualifier, sans OCR prétendu. La reconnaissance passe par MISES Vision ou par validation humaine.

Toute fusion conserve la provenance ; les conflits restent « À vérifier ».

## Index global
Indexe objets, sons, contenants, kits, mises, documents déjà indexés, jeux, activités, fabrications, recettes publiques et vocabulaire instruments.

Préférences expose :
- ÉTAT DE L'INDEX ;
- RECONSTRUIRE L'INDEX.

La reconstruction ne supprime ni ne modifie les données métier.

## Vision
Voir `docs/MISES-VISION.md`.

Vision avancée : architecture préparée, aucun modèle lourd embarqué sans benchmark réel.

## Confidentialité
- bibliothèque publique : `PUBLIC_WEB` ;
- corpus personnel non embarqué dans le dépôt ;
- photos et apprentissages restent locaux sauf partage explicite ;
- aucune clé secrète dans le client.

## Recette automatisée
Le workflow Android de PR exécute :
1. `npm ci` ;
2. `npm test` ;
3. `npm run build` ;
4. installation Chromium Playwright ;
5. `npm run test:browser` ;
6. intégration PWA Android ;
7. `:app:assembleDebug`.

Le déploiement Pages est déclenché uniquement après fusion sur `main`.

## Limitations assumées
- benchmark Pixel 9 réel non exécuté sans appareil connecté ;
- Vision avancée open-vocabulary / embeddings non embarquée tant qu'elle n'a pas gagné un benchmark réel ;
- génération AAB Play signée dépend de la présence des secrets d'upload MISES dans l'environnement de build.
