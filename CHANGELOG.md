# Changelog

## 0.3.0-beta.2 — 2026-09-27

- Le bas de l’écran n’est plus coupé par la barre Android. L’application passe en bord à bord, lit les marges système (`WindowInsets`) et les transmet à la page. Le défilement garde le dernier cartouche entier, avec une marge basse (`dvh`, `env(safe-area-inset-bottom)`).
- L’encre unique passe du bleu au rose d’imprimerie `#D12A74`. Le blanc dessus reste lisible (contraste 4,9). Les cartouches et les cartes ont un liseré rose, plus clair en sombre pour ressortir. Régie reste en noir et blanc. Deux autres roses sont dans `public/brand` pour comparaison (`#E4458C`, `#FF48B0`), ils ne sont pas l’encre de l’application.
- La photo cherche en plusieurs passages : image entière, recadrage, zoom, tuiles, quart de tour. Les détections qui se recouvrent sont fusionnées. Le nom proposé est celui d’une fiche de la base (synonyme français ou anglais, ou objet proche), pas le mot anglais brut. Une correction déjà mémorisée reste prioritaire. Le modèle embarqué n’est pas réentraîné.
- Version `0.3.0-beta.2`, Android `versionCode` 7. La clé d’envoi Play n’est toujours pas disponible. Le binaire de test reste signé avec la clé debug.

## 0.3.0-beta.1 — 2026-09-27

- Inventaire rapide, photo à plusieurs objets, QR continu (objet, caisse, valise, kit, mise) et recherche en français, hors ligne.
- Vibe bruitage, « Crée ton bruitage » et exercices générés. Ce qui est possédé, avec son emplacement, reste séparé de ce qui est seulement suggéré.
- Une correction validée est mémorisée localement et réutilisée. Le modèle photo n’est pas réentraîné. On peut désactiver un apprentissage sans toucher à la fiche.
- Étiquettes : logo, nom, QR, identifiant court. Impression par le service Android. L’essai WalkPrint/YHK reste à part. Le QR de l’étiquette se relit.
- Nouvelle identité : une seule encre (bleu d’imprimerie `#0B3D91`) sur papier. Le logo est le mot « mise ! », en minuscules arrondies (Fredoka, licence SIL OFL, vectorisé). Les points du i et du ! portent l’encre. L’icône est « m! ». L’esprit sérigraphié vient de Musiques en jeu(x) – LE KIT, sans reprendre son logo, ses photos ni ses dessins. Régie reste en noir et blanc.
- Écran « À propos » : création de Cédric Carboni pour Acousmatic Theatre, lien vers acousmatic-theatre.fr, lien vers le site personnel https://carboni-cedric.pages-perso.free.fr/, numéro de version. Accessible depuis l’accueil, le menu et les préférences. Les liens s’ouvrent dans le navigateur.
- Études de logo dans `docs/design/`. La piste retenue est Tampon : le mot « mise ! » avec une seconde passe décalée. L’icône est « m! » avec cet effet. L’étiquette thermique reste en une encre, sans décalage. Régie affiche le tampon en noir sur blanc.
- Version `0.3.0-beta.1`, Android `versionCode` 6. IndexedDB passe en version 5 : les fiches déjà là sont conservées, un espace « apprentissages » est ajouté.
- La clé d’envoi Play n’est toujours pas disponible. Les binaires de test sont signés avec la clé debug.

## 0.2.3-beta.1 — 2026-09-27

- Android `versionCode` 5. Connexion Google désactivée dans la WebView (Google bloque l’OAuth intégré). Message explicite, le reste de l’app reste hors connexion. Le scope Drive de la version web reste `drive` (pas `drive.file`).
- Politique de confidentialité réécrite dans `public/privacy.html`. Dossier Play : `docs/PLAY-CONSOLE.md`.
- Signature des binaires de test : clé debug. Ce n’est pas la clé d’upload Play.

## 0.2.2-beta.1 — 2026-09-27

- Data Bruitage : champs séparés « son à entendre » et « son à imaginer », origine explicite (document de l’utilisateur, source externe, proposition générée, à vérifier), doublons signalés sans fusion.
- Classeur XLSX (index, objets, sons, sources, doublons, tables liées) et index CSV. Réimport du classeur sans perte des sources ni des relations. Exemple public fictif dans `public/exemples/`.
- Fiche : correction, mémo sonore (permission, fichier absent, interruption), recherche sur les deux sons.
- Logo : les deux points rouges sont deux cercles de même `cy` dans un seul SVG.
- Android : `versionCode` 4, `versionName` 0.2.2-beta.1, PWA embarquée via `WebViewAssetLoader`. `android.useAndroidX=true` est requis par `androidx.webkit`. Signature de test (debug), pas la clé Play. Schéma IndexedDB inchangé (v4).
- L’application ne s’ouvre plus sur la page ART.
- Inventaire Mac : le logo carton et les préférences étaient déjà dans `fb8ffd4`. Ajout du toast si la synchro locale échoue, et de l’état vide des mises. Format d’import privé : `docs/FORMAT-IMPORT.md`.

## 0.2.1-beta.1

- Thèmes, modes d’affichage, vision locale, alignement Android, confidentialité des exemples publics.
