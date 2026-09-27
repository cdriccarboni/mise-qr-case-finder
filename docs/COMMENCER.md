# Pour commencer — MISE ! 0.2.2-beta.1

MISE ! sert à retrouver et classer tes Data Bruitage : documents, listes, objets, sons, contenants. Le Kit Acoustique, les kits et les mises sont des vues sur cette base, pas la base elle-même.

Tout ce que tu importes reste sur l’appareil (IndexedDB), sauf si tu connectes toi-même Google Drive ou si tu partages une sélection.

## Ouvrir

1. Ouvre la PWA. Le site public https://cdriccarboni.github.io/mise-qr-case-finder/ sert encore `0.2.1-beta.1`. La `0.2.2-beta.1` de test est la pré-version [v0.2.2-beta.1-test](https://github.com/cdriccarboni/mise-qr-case-finder/releases/tag/v0.2.2-beta.1-test) : APK debug signé debug, et zip web à servir avec `python3 -m http.server` après décompression.
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

## Photo et QR

Ajouter une photo lance une détection d’objets sur l’appareil (modèle COCO-SSD déjà inclus). Le score est un indice. Rien n’est enregistré sans ta confirmation. Si tu mémorises une correction, c’est une association locale pour ce contexte : le modèle n’est pas réentraîné.

Scanner un QR ouvre une valise déjà créée sur cet appareil. L’appareil photo est demandé au moment du scan.

## Son

Le mémo sonore utilise le micro, seulement si tu le demandes. Permission refusée, fichier absent ou enregistrement interrompu : la fiche reste utilisable, avec un message.

## Ce qui n’est pas dans cette version

- Pas d’OCR de photos ou de PDF scannés.
- Pas de build macOS ni iOS (la PWA s’installe depuis Safari : Partager → Sur l’écran d’accueil).
- La signature Google Play de production n’est pas dans le dépôt. L’APK de test est signé avec la clé de debug.
- La connexion Google reste optionnelle et dépend du domaine autorisé dans la console OAuth.
