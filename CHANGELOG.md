# Changelog

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
