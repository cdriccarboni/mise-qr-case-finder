# Reprise

Version livrée sur cette branche : **0.2.2-beta.1** (`versionCode` Android 4). Schéma IndexedDB toujours **4** : une base 0.2.1 s’ouvre sans migration destructrice.

## Déjà en place

Voir `docs/COMMENCER.md`, `docs/MESURES.md`, `docs/PLATEFORMES.md` et `docs/DEMANDES.md`.

Les tests `npm test` (19) et `npm run test:browser` (4) ont été exécutés sur le build de cette branche.

## Dossiers Mac non encore reçus

À intégrer seulement après inventaire, sans commit de données réelles :

- `MISE`
- `MISE-clean-20260925`
- `MISE-CODEX-084120` et ses sauvegardes WIP
- `MISE-codex-modern-20260925`

Méthode prévue :

1. Comparer chaque dossier à `grok/mise-finalisation-20260927` (diff de fichiers, pas un remplacement aveugle).
2. Cherry-pick ou copie des correctifs de code uniquement.
3. Laisser les Data Bruitage réelles dans `private-data/` (déjà gitignoré) ou hors dépôt.
4. Ajouter une ligne au tableau de `docs/MIGRATION-BASE.md` : dossier, contenu, intégré ou non, pourquoi.
5. Rejouer `npm test` et `npm run test:browser`. Ne pas retirer une assertion pour faire passer un test.

## Limites assumées

- OCR absent (PDF image, texte dans une photo).
- Détection photo = COCO-SSD généraliste. Les accessoires de bruitage spécialisés sont souvent « aucun objet » ou une classe trop large. La correction humaine est une mémoire d’association, pas un réentraînement.
- CSV = index. La restauration complète des tables passe par le classeur XLSX ou le JSON.
- Doublons signalés, pas fusionnés.
- APK de test signé en debug. Clé Play absente.
- Pas de binaire macOS/iOS.
- Google OAuth non retesté de bout en bout (popup, domaine autorisé).
- Imprimante thermique non retestée sur appareil.
- Scan QR caméra non retesté (pas de caméra ici). Le QR d’une valise s’affiche et son image est une data-URL PNG.
- Les dossiers Mac ci-dessus ne sont pas dans le dépôt.

## Après le merge

Republier Pages depuis `main` confirme l’URL stable. Brancher les secrets de signature Play seulement lorsqu’ils sont disponibles, sans les écrire dans git.
