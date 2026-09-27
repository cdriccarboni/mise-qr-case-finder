# Changelog

## 0.3.0-beta.1 — 2026-09-27

- Inventaire rapide, photo à plusieurs objets, QR continu (objet, caisse, valise, kit, mise) et recherche en français, hors ligne.
- Vibe bruitage, « Crée ton bruitage » et exercices générés. Ce qui est possédé, avec son emplacement, reste séparé de ce qui est seulement suggéré.
- Une correction validée est mémorisée localement et réutilisée. Le modèle photo n’est pas réentraîné. On peut désactiver un apprentissage sans toucher à la fiche.
- Étiquettes : logo, nom, QR, identifiant court. Impression par le service Android. L’essai WalkPrint/YHK reste à part. Le QR de l’étiquette se relit.
- Nouvelle identité : rose framboise, logo « caisse vibrante », icône Android adaptative (y compris monochrome) et icônes PWA. Les modes Auto / Ordinateur / Mobile et Système / Sombre / Clair / Régie restent en place.
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
