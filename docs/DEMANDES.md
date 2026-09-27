# Demandes antérieures retrouvées

Sources : messages de commits, commentaires de code, `public/data.json`, tests. État au 27 septembre 2026 sur `0.2.2-beta.1`.

| Source | Exigence | État | Preuve | Reste à faire |
| --- | --- | --- | --- | --- |
| `53b8726` | Data Bruitage est le corpus ; les kits sont des sous-ensembles | Vérifié | `src/data-bruitage.js`, libellé kit « un kit n’est qu’une vue » | Dossiers Mac non publiés |
| Mission 27/09 | Son à entendre et son à imaginer distincts | Vérifié | Test « never merged » ; colonnes CSV séparées | — |
| Mission 27/09 | Import local, jamais embarqué | Vérifié | Import navigateur ; `public/data.json` sans objets personnels ; exemple marqué FICTIF | OCR |
| Mission 27/09 | Recherche, classement, rapprochement, dédoublonnage, provenance, correction, sauvegarde, hors ligne | Vérifié pour le parcours fictif ; partiel pour le rapprochement libre | Playwright parcours ; `findDuplicates` ; backup JSON | Fusion manuelle des doublons ; dossiers réels |
| Mission 27/09 | Quatre origines : utilisateur / externe / généré / à vérifier | Vérifié | `PROVENANCE` dans `src/data-bruitage.js` ; libellés UI | — |
| Mission 27/09 | Ne pas inventer de contenu présenté comme source | Vérifié | Idées externes étiquetées « Source externe » ; défi étiqueté « Proposition générée » ; élargissements de recherche annoncés comme tels | — |
| Mission 27/09 | Classeur XLSX/CSV, onglets, identifiants, réimport | Vérifié | `exportBinder` / test de round-trip sources + `objectSounds` ; fichiers `public/exemples/` | Le CSV seul ne restaure pas toutes les tables |
| `60a352a` puis régression du wordmark texte | Points rouges du i et du ! alignés | Vérifié | SVG, écart vertical < 0,75 px à 390, 768, 1280 et 1440 ; captures `logo-*.png` | — |
| `6f0ba6a`, `vision-ui.js` | Photo locale, incertitude, correction, mémoire ≠ réentraînement | Vérifié (logique et parcours sans caméra réelle) | Tests `matchDetections` ; Playwright modèle COCO hors ligne + correction manuelle ; phrase dans le dialogue photo | Objets de bruitage hors classes COCO ; pas de réentraînement (voulu) |
| `textToReview` | OCR non inclus, le dire | Vérifié | Message « OCR non inclus » ; test unitaire ; pas de Tesseract ajouté (build déjà ~22,5 Mio) | OCR léger seulement après une mesure de taille |
| `143090e` et UI valises | QR, rangement, contenants | Partiel | Playwright : création de valise et image QR PNG. Architecture inchangée | Scan caméra réel non fait ici |
| `fad8e6c` | Mémo sonore | Partiel | Contrôles audio, permission refusée, fichier illisible, interruption dans le code. Playwright : refus micro + fichier absent | Micro réel et interruption d’appel non joués sur téléphone |
| `e6d8a80`, `8d98b9e`, `public/data.json` | Pas de données personnelles dans le dépôt public | Vérifié | Exemples fictifs ; `.gitignore` sur `private-data/` et sauvegardes | Inventaire Mac à trier hors git |
| `2c094b5`, `8347df4` | Android, version qui continue | Partiel | `versionCode` 3 → 4, package inchangé, PWA embarquée. CI ancien `sdkmanager` déjà corrigé sur `main` | APK à prendre dans l’artefact du workflow de cette branche ; clé Play absente |
| `5cc68ce` | Google autonome, pas seulement la session ART | Partiel | Code présent dans `src/google-sync.js`. Non rejoué contre un compte | Origines OAuth du nouveau domaine à confirmer dans la console |
| `fad8e6c` | iPhone, imprimante | Partiel / non testé | Notice Safari dans le manuel. Imprimante : code conservé, QR de test vers l’origine MISE | Pas de build iOS ; pas d’essai imprimante |
| Mission 27/09 | macOS / iOS natifs | Non testé, non annoncé comme fait | `docs/PLATEFORMES.md` | Pipeline Xcode non créé |
| `fe5fd19` | Contrat projet ART optionnel | Vérifié | Tests `project-control` inchangés et verts. L’écran ne montre plus le bandeau ART | — |
