# ULTIMATE BASELINE — MISES !

Gel de reprise préparé le 28 septembre 2026 pour un travail propre dans Cursor.

## Base retenue

- Dépôt : `cdriccarboni/mise-qr-case-finder`
- Branche de reprise : `cursor/mises-reprise-20260928`
- Base : `main`
- Commit de base : `5ee270805c6b213315cb73871f9f49470c5265ad`
- Version applicative : `0.3.0-beta.7`
- Nom produit : **MISES ! — QR Case Finder**

Cette branche est une reprise additive. Ne pas réécrire l'historique et ne pas fusionner automatiquement les anciennes branches de sauvegarde.

## Branches à conserver pour audit

- `agent/mise-chatbot` : documentation agent unique, mais très en retard sur main.
- `backup/local-20260927/main` : ancienne sauvegarde locale divergente avec modifications UI/code à comparer avant toute récupération.
- `backup/local-20260927/stash-MISE-0` : ancien stash sauvegardé ; contient une structure/WIP distincte.
- `cursor/mise-030-beta-58f3` : ancienne branche Cursor, 4 commits derrière main au moment du gel.

Aucune de ces branches ne doit être supprimée ni fusionnée en bloc. Récupérer uniquement les éléments encore utiles après comparaison fonctionnelle.

## Écarts déjà repérés

- `package.json` indique `0.3.0-beta.7`.
- `README.md` annonce encore `0.3.0-beta.3` : documentation à réaligner lors de la consolidation.
- `docs/REPRISE.md` décrit encore l'ancien cycle `0.2.2-beta.1` et doit être considéré comme historique tant qu'il n'est pas actualisé.

## Reprise locale Cursor

Quand le Mac est disponible :
1. retrouver ou cloner le dépôt dans `~/Projects` sans écraser une copie existante ;
2. faire `fetch --all --prune --tags` ;
3. vérifier arbre Git, stash et fichiers non suivis avant toute bascule ;
4. sauvegarder additivement tout travail local non poussé ;
5. basculer sur `cursor/mises-reprise-20260928` ;
6. installer/vérifier les dépendances puis lancer tests et build ;
7. documenter l'état exact avant toute consolidation fonctionnelle.

## Règle

Source GitHub conservée intacte. Pas de suppression de branche, pas de nettoyage destructif, pas de publication automatique, pas de déploiement Play/Pages pendant le gel.
