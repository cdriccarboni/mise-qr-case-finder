# Pour commencer — MISES ! 0.3.0-beta.3

MISES ! sert à retrouver et classer tes Data Bruitage : documents, listes, objets, sons, contenants. Le Kit Acoustique, les kits et les mises sont des vues sur cette base, pas la base elle-même.

Cette version ajoute l’inventaire par photo, le rangement par QR, le Vibe bruitage, « Crée ton bruitage » et des exercices générés. Ce que tu possèdes (avec l’endroit) reste séparé de ce qui est seulement suggéré.

Tout ce que tu importes reste sur l’appareil (IndexedDB), sauf si tu connectes toi-même Google Drive ou si tu partages une sélection.

## Ouvrir

1. Ouvre la PWA. Le site public https://cdriccarboni.github.io/mise-qr-case-finder/ suit `main` seulement après un merge. L’URL du dépôt et celle de la confidentialité sont dans `src/about.js` (`REPOSITORY_URL`, `PRIVACY_URL`) : elles ne changent pas avec le nom MISES. Cette branche est `0.3.0-beta.3` (`versionCode` 8). L’APK de test est signé avec la clé debug tant que la clé d’upload Play n’est pas fournie.
2. La première page est vide de tes données. L’application publique n’embarque pas ton inventaire.
3. Un exemple fictif est fourni dans `public/exemples/` (`classeur-fictif.xlsx`, `index-fictif.csv`). Ce n’est pas ta base.

## Importer tes fichiers

Partager & outils → **Data Bruitage · importer / exporter**.

Formats lus sur l’appareil : XLSX, XLS, CSV, JSON, TXT, DOCX, PDF avec texte. Le détail des colonnes et du JSON est dans [docs/FORMAT-IMPORT.md](FORMAT-IMPORT.md). Un PDF scanné sans texte reste « à vérifier » : il n’y a pas d’OCR. Les documents réels ne vont pas dans le dépôt.

Chaque ligne reçoit une origine : document de l’utilisateur, source externe, proposition générée, ou à vérifier. Un conflit ne remplace pas ta version locale.

## Deux sons, jamais un seul champ

Sur une fiche :

- **Son à entendre** : le son que l’objet produit vraiment.
- **Son à imaginer** : le son que tu veux évoquer.
- **Usages déjà saisis** : l’ancienne liste, conservée à part.

Le classeur XLSX reprend ces champs dans des colonnes distinctes, avec les onglets Index, Objets, Sons, Sources et Doublons. Le bouton **Classeur XLSX** est la sauvegarde tableur complète (sources et relations comprises). **Index CSV** reprend l’index lisible. **Sauvegarde** écrit un JSON de tout l’appareil.

## Retrouver et corriger

La recherche regarde le nom, le son à entendre, le son à imaginer, les usages et le contenant. Ouvre la fiche, corrige, enregistre. Ferme, rouvre : la correction est dans la base locale, y compris hors ligne après le premier chargement.

Les doublons de nom sont signalés. Rien n’est fusionné tout seul.

## Photo, inventaire et QR

Ajouter une photo lance une détection d’objets sur l’appareil (modèle COCO-SSD déjà inclus). Le pourcentage est un indice. Les personnes sont ignorées. Rien n’est enregistré sans ta confirmation. Une photo peut proposer plusieurs objets : tu peux les ranger d’un coup dans un contenant, par exemple « Caisse grise n°23 ».

L’inventaire rapide enchaîne photo, fiche, étiquette, objet suivant. « Crée ton bruitage » ne propose des défis qu’avec les objets vus. Vibe bruitage et la recherche en question restent sur l’appareil.

Si tu mémorises une correction, c’est une association locale : le modèle n’est pas réentraîné. Tu peux annuler la dernière fiche créée, ou désactiver un apprentissage sans toucher à la fiche.

Chaque objet, caisse, valise, kit ou mise peut avoir un QR. Scanner ouvre tout de suite la fiche. L’appareil photo est demandé au moment du scan, et le QR est lu sans bouton déclencheur. L’étiquette s’imprime par le service d’impression du téléphone. La mini-imprimante WalkPrint / YHK reste un essai à part.

## Son

Le mémo sonore utilise le micro, seulement si tu le demandes. Permission refusée, fichier absent ou enregistrement interrompu : la fiche reste utilisable, avec un message.

## Ce qui n’est pas dans cette version

- Pas d’OCR de photos ou de PDF scannés.
- Pas de build macOS ni iOS (la PWA s’installe depuis Safari : Partager → Sur l’écran d’accueil).
- La signature Google Play de production n’est pas dans le dépôt. L’APK de test est signé avec la clé de debug.
- La connexion Google reste optionnelle et dépend du domaine autorisé dans la console OAuth.
