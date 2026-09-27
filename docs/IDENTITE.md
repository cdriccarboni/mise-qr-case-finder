# Identité visuelle — MISE ! 0.3.0-beta.1

## D’où vient l’esprit

Le nom réel n’est pas dans le dépôt. Il est dans un dossier privé : **Musiques en jeu(x) – LE KIT**, boîte de jeux sonores coopératifs (Odia Normandie). La couverture et les premières pages du dossier de presse et du livret ont servi de référence.

Dans le dépôt public, on ne trouve qu’une mention pédagogique (`inspired_by_musiques_en_jeux` dans `public/data.json`). La branche `codex/modern-project-vision-20260925` est une autre direction, plus sobre. Ce n’est pas cette charte.

C’est une marque tierce. MISE ! n’en reprend ni le logo, ni le mot, ni les photos, ni les dessins, ni les lettres posées dans les jetons. Les images de référence ne sont pas dans ce dépôt.

Ce qui est repris, en formes originales : le magenta saturé avec le blanc, des jetons géométriques vides (cercle, hexagone, pentagone), une trame de points, des ondes, et des blocs francs. Le terrain (recherche, fiches, caisses) reste lisible. Le jeu est réservé au Vibe, aux exercices et à « Crée ton bruitage ». Régie enlève la trame et les jetons.

## Trois directions

Les fichiers sont dans `public/brand/`.

### 1. Caisse vibrante dans un jeton — retenue

![Caisse vibrante](../public/brand/logo.svg)

Une caisse et une onde, posées dans un cercle blanc sur un carré magenta. Un hexagone vide à côté : un jeton, sans lettre. Le nom MISE ! reste le mot, avec ses deux points alignés. L’étiquette thermique reste en noir et blanc, sans la trame, pour que le QR se lise.

### 2. Un objet qui devient une onde — écartée

![Objet qui devient une onde](../public/brand/direction-onde.svg)

Un cercle (l’objet) se prolonge en vagues. Lisible, mais trop générique : on ne voit ni la caisse, ni le rangement, ni le plateau.

### 3. Point d’exclamation scène — écartée

![Point d’exclamation scène](../public/brand/direction-scene.svg)

Le point d’exclamation du nom, posé sur une ligne de scène. Fort comme symbole, faible comme icône d’application : il ne dit pas « objet » ni « bruitage ».

## Système retenu

- Magenta `#e00078` (blanc dessus : contraste 4,7) et `#c40068` pour le texte des boutons sur blanc (contraste 5,9).
- Encre de lecture `#2b0c1c` sur blanc (contraste 16). Le magenta ne sert pas de petit texte sur blanc.
- Sombre : fond `#1a0610`, texte `#fff7fb` (contraste 18), accent `#ff4d9a` (contraste 6,3).
- Clair : fond blanc, blocs magenta, cartes blanches.
- Régie : noir et blanc. Le magenta ne reste que dans les deux points du nom. Pas de trame, pas de jetons.
- Les cartes « possédé », « suggestion » et « incertain » ne se ressemblent pas.
- Les exercices, le Vibe et « Crée ton bruitage » utilisent le panneau plus joueur. Les fiches et les caisses restent plus calmes.
- Modes conservés : Auto / Ordinateur / Mobile, et Système / Sombre / Clair / Régie.

Les contrastes ci-dessus sont mesurés (WCAG). Le magenta très clair du dossier de presse, posé en petit texte sur blanc, ne passe pas : il est réservé aux grands blocs, avec du blanc ou de l’encre sombre pour lire.

## Où le logo est branché

- Maître : `public/brand/logo.svg`, `logo-mono.svg`, `logo-mono-light.svg`.
- PWA : `public/icon.svg`, `favicon.svg`, `icon-maskable.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`. Le manifeste Vite les déclare.
- Application : en-tête (`.miseLogo4`) et écran de démarrage dans `index.html`.
- Android : icône adaptative premier plan / fond / monochrome (`mipmap-anydpi-v26/ic_launcher.xml`).
- Étiquette imprimée : le même dessin, en noir sur blanc, à côté de « MISE ! », du nom et du QR.
