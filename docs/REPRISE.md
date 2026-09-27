# Reprise

Version livrée sur cette branche : **0.2.2-beta.1** (`versionCode` Android 4). Schéma IndexedDB toujours **4** : une base 0.2.1 s’ouvre sans migration destructrice.

## Déjà en place

Voir `docs/COMMENCER.md`, `docs/MESURES.md`, `docs/PLATEFORMES.md` et `docs/DEMANDES.md`.

Les tests `npm test` (19) et `npm run test:browser` (4) ont été exécutés sur le build de cette branche.

## Inventaire Mac

Reçu et classé le 27 septembre 2026. Détail : `docs/MIGRATION-BASE.md`.

Déjà couvert par `fb8ffd4` / `main` : logo carton, préférences, stash « Contrôle photo · bêta ». Repris en plus sur cette branche : toast de synchro locale, état vide des mises. Non repris : wordmark à lettre i de police, manifeste raccourci, dossier « import à venir », retour à `0.2.1-beta.1`.

`MISE-CODEX-084120` et ses WIP sont contenus dans `ba8db5d`, déjà dans `main`. Le modèle `public/models/` se régénère avec `scripts/prepare-vision.mjs`. Les autres copies n’ont rien en attente.

Les 29 documents privés ne sont pas dans le dépôt. Format du classeur à construire à part : `docs/FORMAT-IMPORT.md`.

## Limites assumées

- OCR absent (PDF image, texte dans une photo).
- Détection photo = COCO-SSD généraliste. Les accessoires de bruitage spécialisés sont souvent « aucun objet » ou une classe trop large. La correction humaine est une mémoire d’association, pas un réentraînement.
- CSV = index. La restauration complète des tables passe par le classeur XLSX ou le JSON.
- Doublons signalés, pas fusionnés.
- APK de test signé en debug. Clé Play absente. Le premier workflow Android de cette branche échoue tant que `android.useAndroidX` n’est pas `true` (corrigé dans le commit qui suit `d28c558`).
- Pages : l’URL publique sert encore `main` (0.2.1-beta.1). Cette branche n’est pas autorisée sur l’environnement `github-pages`, et l’agent ne peut pas modifier cette politique (HTTP 403).
- Pas de binaire macOS/iOS.
- Google OAuth non retesté de bout en bout (popup, domaine autorisé).
- Imprimante thermique non retestée sur appareil.
- Scan QR caméra non retesté (pas de caméra ici). Le QR d’une valise s’affiche et son image est une data-URL PNG.
- Les dossiers Mac ci-dessus ne sont pas dans le dépôt.

## Après le merge

Republier Pages depuis `main` confirme l’URL stable. Brancher les secrets de signature Play seulement lorsqu’ils sont disponibles, sans les écrire dans git.
