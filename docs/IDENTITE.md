# Identité visuelle — MISE ! 0.3.0-beta.1

## D’où vient l’esprit

Le nom réel n’est pas dans le dépôt. Il est dans un dossier privé : **Musiques en jeu(x) – LE KIT**, boîte de jeux sonores coopératifs (Odia Normandie). La couverture et les premières pages du dossier de presse et du livret ont servi de référence.

Dans le dépôt public, on ne trouve qu’une mention pédagogique (`inspired_by_musiques_en_jeux` dans `public/data.json`). La branche `codex/modern-project-vision-20260925` est une autre direction, plus sobre. Ce n’est pas cette charte.

C’est une marque tierce. MISE ! n’en reprend ni le logo, ni le mot, ni les photos, ni les dessins, ni les lettres posées dans les jetons. Les images de référence ne sont pas dans ce dépôt.

Ce qui est gardé, c’est le rendu **sérigraphié, une seule encre** : un aplat fort, le blanc du papier, le noir pour lire, des blocs plats, une trame de points, des jetons vides (cercle, hexagone, pentagone), des ondes. Le rose n’est plus demandé. Le terrain (recherche, fiches, caisses) reste lisible. Le jeu est réservé au Vibe, aux exercices et à « Crée ton bruitage ». Régie enlève la trame, les jetons et la couleur.

## Une seule encre

Toute la couleur de l’interface passe par `--ink` dans `src/identity.css`. Pour en changer plus tard : modifier cette ligne, puis lancer `node scripts/export-icons.mjs`. Le script régénère les PNG et recopie la même valeur dans les SVG, l’écran de démarrage, le manifeste et les ressources Android.

Le papier (`--paper`, `#f4f1ea`) et le noir de texte (`--type`, `#161513`) ne sont pas une deuxième encre. Le fond sombre est `#141311`.

L’encre ne sert pas de petit texte sur le fond sombre : le contraste tombe à 1,8. Sur ce fond, l’encre est un bloc (logo, boutons terrain, panneaux Vibe) avec du blanc dedans. Les deux points du nom sont l’encre sur le papier clair, et le blanc du papier sur le fond sombre ou en Régie.

## Encre retenue

Bleu d’imprimerie `#0B3D91`.

![Bleu d'imprimerie](../public/brand/encre-bleu.svg)

Blanc sur ce bleu : contraste 10,0. Bleu sur le papier `#f4f1ea` : contraste 8,9. Lisible sur un téléphone, en clair comme en sombre, et le logo monochrome (`public/brand/logo-mono.svg`) reste le même dessin en noir pour l’étiquette thermique.

## Deux variantes, non utilisées

![Trois encres](../public/brand/encres.svg)

Vermillon `#C23A1B`. Blanc dessus : contraste 5,4. Sur le papier : 4,8. Juste au-dessus du seuil pour un grand texte, plus faible en petit.

![Vermillon](../public/brand/encre-vermillon.svg)

Vert affiche `#0F6E45`. Blanc dessus : contraste 6,3. Sur le papier : 5,6. Lisible, moins tranché que le bleu une fois imprimé en une passe.

![Vert affiche](../public/brand/encre-vert.svg)

## Le logo est le mot

Le mot **mise !** est le logo. Minuscules, sans capitale, dans une sans arrondie. La police est Fredoka (SIL Open Font License), embarquée dans `src/fonts/` avec sa licence `OFL.txt`. Le dessin du logo est vectorisé : il ne dépend pas du chargement de la police, et il reste net hors ligne.

![mise !](../public/brand/logo.svg)

Les lettres prennent la couleur de lecture : noir doux sur le papier, crème sur le fond sombre, blanc en Régie. Les deux points — celui du i, au-dessus, et celui du !, en dessous — prennent l’encre. Sur le fond sombre, l’encre brute est trop proche du noir (contraste 1,8) : les points passent à une teinte claire de la même encre, `#91A8CE`, contraste 7,7. En Régie, lettres et points sont blancs.

L’impression une couleur est `logo-mono.svg` : le même dessin, tout en noir, y compris les deux points. L’étiquette thermique l’imprime ainsi, pour que le QR se lise. `logo-mono-light.svg` est le même trait en blanc.

L’icône de l’application est le mot réduit à **m!**, en blanc sur le carré d’encre, pour rester lisible tout petit.

Les pistes dessinées avant ce choix (caisse dans un jeton, objet qui devient une onde, point d’exclamation sur une ligne) ne sont plus le logo.

Cinq autres études du mot, à choisir, sont dans `docs/design/` : mailloche, jeton, onde, tampon, pile. Elles ne sont pas branchées dans l’application.

## Système retenu

- Encre `#0B3D91` pour les aplats et pour les deux points du mot, sur le papier. Papier `#f4f1ea`, texte `#161513` (contraste 16,2).
- Sombre : fond `#141311`, texte `#f4f1ea` (contraste 16,5). L’encre reste un aplat, pas un filet fin.
- Clair : page papier, cartes presque blanches, blocs de l’encre.
- Régie : noir et blanc. Pas de trame, pas de jetons, pas d’encre. Le logo passe en noir sur blanc, comme l’impression une couleur.
- Les cartes « possédé », « suggestion » et « incertain » ne se ressemblent pas.
- Les exercices, le Vibe et « Crée ton bruitage » utilisent le panneau sérigraphié. Les fiches et les caisses restent plus calmes.
- Modes conservés : Auto / Ordinateur / Mobile, et Système / Sombre / Clair / Régie.

Les contrastes sont mesurés (WCAG, blanc `#ffffff` sur l’encre, encre sur `#f4f1ea`).

## Où le logo est branché

- Maître : `public/brand/logo.svg` (lettres noires, points en encre). Une encre : `logo-mono.svg`. Encre claire : `logo-mono-light.svg`.
- Le fichier servi dans l’en-tête est `src/brand/wordmark.svg` (les mêmes tracés, couleurs laissées au thème).
- PWA : `public/icon.svg` et les PNG, dessinés à partir de « m! ».
- Android : icône adaptative, premier plan « m! », fond encre, couche monochrome noire.
- Étiquette imprimée : le mot « mise ! » en noir, au-dessus du nom et du QR.
- Pour régénérer après un changement de `--ink` : `node scripts/export-icons.mjs`.
