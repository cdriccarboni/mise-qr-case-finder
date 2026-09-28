# Évolution progressive du logo MISES!

Décision du 28 septembre 2026 : **étapes 1 + 2**, sans rupture brutale.

## En place maintenant

1. **Wordmark plus affirmé** — décalage tampon renforcé (`56×36` au lieu de `40×26`) et un peu plus d’air avant le `!`. Police Fredoka inchangée.
2. **Icône m!** — la tête du `!` devient un **jeton** à cinq côtés (app / favicon / maskable / PNG Android). L’étiquette thermique reste en une encre, ronds, sans tampon.

## Repli Tampon

L’ancien Tampon est conservé tant que la proposition n’est pas validée visuellement sur Pixel :

- `docs/design/legacy/wordmark-tampon.svg`
- `docs/design/legacy/icon-tampon.svg`
- `docs/design/legacy/favicon-tampon.svg`
- `docs/design/legacy/icon-maskable-tampon.svg`
- `public/brand/legacy/logo-tampon.svg` (+ PNG)

Pour revenir en arrière : recopier ces fichiers vers `src/brand/wordmark.svg` / `public/icon*.svg` et régénérer via `python3 scripts/build-wordmark.py` après restauration des constantes `STAMP_*` si besoin.

## Pas encore

- Étape 3 (accueil brand-first) : optionnelle, après validation visuelle.
- Piste Pile : hors scope.
