# Changelog

## 0.3.0-beta.3 — 2026-09-27

- Le haut de l’écran ne passe plus sous la barre d’état ni la caméra. Android 15 (targetSdk 36, déjà au-dessus de 35) applique une seule fois les vrais insets : barres système, encoche, clavier, en padding de la WebView. La page ne les ajoute pas une seconde fois (`data-native-safe`). La PWA garde `viewport-fit=cover` et `env(safe-area-inset-*)`. Pas de projet Capacitor : il n’y a pas de plugin StatusBar à configurer.
- Le grand padding fixe du bas (8 rem) est retiré. La marge basse est l’inset réel, pas une marge en plus.
- Version `0.3.0-beta.3`, Android `versionCode` 8. La clé d’upload Play est toujours absente. L’APK de test et l’AAB sont signés avec la clé debug si `MISE_UPLOAD_STORE_FILE` n’est pas défini.
- Photo : une bouteille détectée s’affiche comme la catégorie « bouteille d’eau », pas comme le mot anglais ni comme une fiche au hasard. Les boutons proposent les fiches les plus proches de la base (synonymes français) et une recherche trouve le nom exact. Un geste remplace la catégorie par la fiche choisie et mémorise la correction, hors ligne, sans réentraîner le modèle. La prochaine photo de la même catégorie propose d’abord cette fiche.
- Préférences : encre au choix. Rose `#D12A74` par défaut, palette (rose, orange, rouge, vert, bleu, violet) et couleur libre. Liserés, boutons, logo (points du i et du ! et passe Tampon), icône dans l’appli, splash et À propos suivent tout de suite. Le texte sur l’encre passe en blanc ou en noir selon le contraste. Le liseré sombre reste plus clair. Régie reste en noir et blanc. Le choix est sauvé, restauré, et inclus dans la sauvegarde. « Couleur par défaut » revient au rose. L’icône Android de l’écran d’accueil reste rose. Les étiquettes thermiques restent en encre noire, pour que le QR se relise.
- Le nom visible devient **MISES !**. Le logo est « mises ! », toujours en minuscules Fredoka, variante Tampon. Les points du i et du ! suivent l’encre choisie. L’icône « m! » ne change pas.
- Le nom interne suit : textes, identifiants, manifest, cache du service worker, pont Android. Au démarrage, les anciennes clés sont copiées vers les nouvelles si elles sont absentes. Rien n’est écrasé, rien n’est supprimé. Clés copiées : `mise-display-mode`, `mise-theme-mode`, `mise-ink`, `mise-google-oauth-client-id`, `art-mise-project-v1:*`, session `mise-google-oauth-session-v1`, base IndexedDB `mise-db`. Drive : un enregistrement écrit `mises-data.json` dans « MISES ! » et laisse `mise-data.json` dans « MISE ! ». Un ancien export (JSON, classeur `MISE-`, schéma `MISE-Data-Bruitage-v1`) se réimporte. Cette copie de clés vaut pour le web et la PWA. L’`applicationId` est maintenant `fr.acousmatictheatre.mises` : Android installe une appli séparée, et l’export JSON de la beta.2 est le passage vers elle. Le dépôt et l’URL de confidentialité ne changent pas (`src/about.js`).

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
