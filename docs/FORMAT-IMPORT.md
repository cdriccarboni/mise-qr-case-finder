# Format d’import — MISE ! 0.2.2-beta.1

Les fichiers restent sur l’appareil. Ne pas les committer dans ce dépôt public, même fictifs s’ils sont en réalité les 29 documents privés.

Entrée dans l’app : **Partager & outils → Data Bruitage · importer / exporter**, ou **Préférences → Dossier de travail**.

Limite : **40 Mo** par fichier. PDF : **300 pages** avec texte. Un PDF ou une photo sans texte n’est pas lu par OCR : le fichier texte vide part dans « À vérifier ».

Les conflits **ne remplacent pas** la fiche locale. La ligne entrante va dans « À vérifier ».

## Classeur à préparer (recommandé)

Un fichier `.xlsx` dont la feuille de travail s’appelle **`Objets`**.

Colonnes lues (les accents et la casse ne comptent pas) :

| Colonne | Champ enregistré | Règle |
| --- | --- | --- |
| `id` ou `identifiant` | `id` | Stable. Sans id, l’app en fabrique un à partir de l’empreinte du fichier. Réutiliser le même id pour réimporter sans doublon. |
| `nom` ou `objet` | `name` | Obligatoire, sauf si seule la colonne dispositif est remplie : elle sert alors de nom. |
| `son à entendre` | `hear` | Texte libre. Jamais copié dans « son à imaginer ». |
| `son à imaginer` | `imagine` | Texte libre. Jamais copié dans « son à entendre ». |
| `objet ou dispositif nécessaire` | `device` | L’objet ou l’outil. Distinct du nom si les deux colonnes sont remplies. |
| `famille` | `family` | Texte libre. Exemples déjà proposés dans la fiche : Vie quotidienne, Eau & liquides, Feu & textures, À classer. |
| `source` | `source` | Nom lisible du document d’origine. |
| `statut` | `status` | Texte libre. La fiche connaît `available` (Disponible), `review` (À vérifier), `missing` (Manquant). Une autre valeur est conservée. |
| `notes` | `notes` | Texte libre. |
| `provenance` | `provenance` | Une de : `user-document`, `external`, `generated`, `review`. Vide → `user-document`. |
| `contenant` | `caseId` | Id d’une ligne de la feuille Contenants, sinon la fiche est sans contenant. |
| `sons` | `sounds` | Liste d’usages, séparée par `;` ou `|`. Ce n’est ni le son à entendre ni le son à imaginer. |

Une feuille **`Sources`** (optionnelle, recommandée) :

| Colonne | Rôle |
| --- | --- |
| `id` | Identifiant stable, par exemple `source-mallette-fictive`. |
| `nom` / `name` | Nom du document. |
| `format` | `docx`, `pdf`, `xlsx`, etc. |
| `provenance` | `user-document` pour tes documents. |
| `notes` | Repère, sans coller le texte privé si le fichier doit un jour sortir de l’appareil. |

Relie l’objet avec `sourceId` (colonne technique) égal à l’`id` de la source, ou laisse `source` en texte.

Feuille **`Sons`** si tu veux un lexique séparé :

| Colonne | Rôle |
| --- | --- |
| `id` | Stable. |
| `nom` | Obligatoire. |
| `son à entendre` | `hear`, peut rester vide. |
| `son à imaginer` | `imagine`, peut rester vide. |
| `provenance` | `user-document` ou `generated` si c’est une proposition, pas un fait du document. |

Feuille **`Relations Objet-Son`** (aussi acceptée : `objectSounds`, `object_sound_links`) :

| Colonne | Rôle |
| --- | --- |
| `id` | Stable. |
| `objectId` ou `object id` | Id d’un objet de la même importation. |
| `soundId` ou `sound id` | Id d’un son de la même importation. |

Une relation dont l’objet ou le son n’existe pas dans le lot va dans « À vérifier ». L’ordre interne traite d’abord sources, contenants, sons, objets, puis les relations.

Feuille **`Contenants`** : `id`, `nom`. Feuille **`Mises`** : `id`, `nom`, et `objectIds` en liste `id1|id2` si tu prépares déjà une mise.

## Onglets produits par l’app

Le bouton **Classeur XLSX** écrit un classeur `MISE-Classeur.xlsx` :

| Onglet | Rôle à la réimportation |
| --- | --- |
| `_MISE` | Cellule A1 = `MISE-Classeur-v1`. Marqueur. |
| `Index` | Vue. Colonnes : `id`, `nom`, `son à entendre`, `son à imaginer`, `objet ou dispositif nécessaire`, `famille`, `source`, `statut`, `notes`, `provenance`, `relations`, `sons`. **Ignoré** à la réimportation : les fiches sont dans `Objets`. |
| `Objets` | Fiches complètes. Réimportées. |
| `Sons` | Réimporté. |
| `Relations Objet-Son` | Réimporté. |
| `Sources` | Réimporté. |
| `Contenants`, `Mises`, `Alias`, `A verifier`, `Apprentissage` | Réimportés. |
| `Doublons` | Vue calculée (provenance `generated`). **Ignorée** à la réimportation. Les doublons sont recalculés. |

Les cellules qui ne sont pas un simple texte (listes, objets, chaîne vide, valeur qui commence par `json:`) sont écrites `json:…` et relues telles quelles. Un classeur fait main n’a pas besoin de ce préfixe.

Le bouton **Index CSV** est le même index, UTF-8 avec BOM. À l’import, **tout le CSV est lu comme la feuille Objets**. Les colonnes françaises ci-dessus sont reconnues. Les colonnes `relations` et `sons` (ids séparés par `|`) ne reconstruisent pas les feuilles Sons et Relations : pour ne rien perdre, utiliser le XLSX ou le JSON.

## JSON de sauvegarde (restauration complète de l’appareil)

Bouton **Sauvegarde** → `MISE-backup.json`. **Importer une sauvegarde** demande confirmation puis **remplace** les listes présentes.

```json
{
  "version": 2,
  "exportedAt": "2026-09-27T12:00:00.000Z",
  "objects": [],
  "sounds": [],
  "objectSounds": [],
  "aliases": [],
  "mises": [],
  "cases": [],
  "sources": [],
  "review": [],
  "corrections": [],
  "kits": []
}
```

Chaque élément a un `id` texte. Sans `id`, il est ignoré. Une clé absente ou qui n’est pas une liste n’est pas effacée. `version` est informatif. Les réglages d’appareil (compte Google, dossier lié, thème) ne sont pas dans ce fichier.

Champs utiles d’un objet dans ce JSON : `id`, `name`, `hear`, `imagine`, `device`, `family`, `source`, `sourceId`, `status`, `notes`, `provenance`, `sounds` (liste), `tags`, `contexts`, `caseId`, `owned`, `photo`, `audioMemo`. `hear` et `imagine` sont deux chaînes. Ne pas les mettre dans `sounds`.

## JSON de tables (autre entrée)

Fichier `.json` :

- si `"schema": "MISE-Data-Bruitage-v1"`, les lignes sont prises **telles quelles** (noms de champs techniques : `hear`, `imagine`, pas les titres français) ;
- sinon, les clés françaises du tableau sont traduites, comme pour le CSV.

Les listes peuvent être à la racine (`objects`, `sounds`, …) ou sous `tables`.

## TXT, DOCX, PDF

Le texte extrait devient des lignes **À vérifier**, origine `review`, sans objet inventé. Ce n’est pas le classeur. Pour les 29 documents, le classeur XLSX décrit plus haut est le format à construire à part : une ligne par fiche, les deux sons dans deux colonnes, la source nommée, rien de ces fichiers dans git.
