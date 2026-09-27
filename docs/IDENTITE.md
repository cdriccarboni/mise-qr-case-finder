# Identité visuelle — MISE ! 0.3.0-beta.1

## Ce qui a été cherché

« Univers en jeu » et « Jeux sonores » ont été cherchés dans le dépôt, l’historique Git et les branches, y compris `codex/modern-project-vision-20260925`.

Aucun système visuel à ce nom n’existe. La branche `codex/modern-project-vision-20260925` est une direction plus sobre, pas une identité rose.

Le plus proche est un texte de pédagogie dans `public/data.json` : `inspired_by_musiques_en_jeux` et `musiques_en_jeux_game_index`. C’est un index de jeux, pas une charte graphique.

L’esprit demandé (rose, graphique, vivant, jouable, contemporain) a donc été construit pour cette version, sans prétendre reprendre un fichier qui n’était pas là.

## Trois directions

Les fichiers sont dans `public/brand/`.

### 1. Caisse vibrante — retenue

![Caisse vibrante](../public/brand/logo.svg)

Une caisse en perspective, une onde au-dessus, un point comme un impact sonore. Ça se lit petit (icône, étiquette thermique, en-tête). Le nom MISE ! reste le mot, avec ses deux points alignés.

### 2. Un objet qui devient une onde — écartée

![Objet qui devient une onde](../public/brand/direction-onde.svg)

Un cercle (l’objet) se prolonge en vagues. Lisible, mais trop générique : on ne voit ni la caisse, ni le rangement, ni le plateau.

### 3. Point d’exclamation scène — écartée

![Point d’exclamation scène](../public/brand/direction-scene.svg)

Le point d’exclamation du nom, posé sur une ligne de scène. Fort comme symbole, faible comme icône d’application : il ne dit pas « objet » ni « bruitage ».

## Système retenu

- Fond sombre `#160910`, texte `#fff7fb`.
- Rose d’action `#9d1458` (bouton sur fond clair) et accent `#ff6aaa` sur fond sombre.
- Clair : fond `#fff7fb`, texte `#2a1020`, bouton `#8f124e`.
- Régie : noir et blanc, le rose ne sert que d’accent. Le logo passe en noir sur blanc.
- Les cartes « possédé », « suggestion » et « incertain » ne se ressemblent pas.
- Les exercices, le Vibe et « Crée ton bruitage » utilisent le panneau plus joueur. Les fiches et les caisses restent plus calmes.
- Modes conservés : Auto / Ordinateur / Mobile, et Système / Sombre / Clair / Régie.

Les contrastes mesurés (WCAG) : texte clair sur fond sombre 18,5 ; texte atténué 13,9 ; bouton sombre sur blanc 7,9 ; accent rose sur fond sombre 7,3 ; texte sombre sur fond clair et bouton clair au-dessus de 8.

## Où le logo est branché

- Maître : `public/brand/logo.svg`, `logo-mono.svg`, `logo-mono-light.svg`.
- PWA : `public/icon.svg`, `favicon.svg`, `icon-maskable.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`. Le manifeste Vite les déclare.
- Application : en-tête (`.miseLogo4`) et écran de démarrage dans `index.html`.
- Android : icône adaptative premier plan / fond / monochrome (`mipmap-anydpi-v26/ic_launcher.xml`).
- Étiquette imprimée : le même dessin, en noir sur blanc, à côté de « MISE ! », du nom et du QR.
