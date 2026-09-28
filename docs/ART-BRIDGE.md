# Pont ART → MISES!

MISES! reste une PWA autonome. ART ne l’embarque pas. ART ne stocke que le lien. Les Data Bruitage (documents, listes, idées, inventaires, tableaux, notes, historiques, valises, kits, objets, checklists, photos, associations, corrections) restent dans MISES!, y compris hors ligne. Le Kit Acoustique n’est qu’une vue sur cette base.

Le dépôt et l’URL ne changent pas : `mise-qr-case-finder`.

## Ouvrir MISES! depuis ART

### Sans spectacle sélectionné

Le bouton MISES! dans ART doit toujours pouvoir ouvrir la PWA, même sans `projectId` :

```
<URL PWA MISES!>/?source=art&returnUrl=<URL ART de retour, optionnelle>
```

Dans ce cas MISES! s’ouvre normalement, conserve sa base locale, affiche un bandeau de continuité ART, et propose **Retour à ART** si `returnUrl` est valide. Aucune mise n’est créée automatiquement. Aucun jeton OAuth n’est placé dans l’URL : la continuité Google repose sur le même client de production et sur un consentement déjà accordé, pas sur un transfert de session.

### Avec un spectacle / EAC

```
<URL PWA MISES!>/?projectId=<id stable ART, encodé URL>&projectName=<nom affiché, optionnel>&source=art&returnUrl=<URL ART de retour, optionnelle>
```

URL prévue, une fois la branche publiée sur GitHub Pages :

`https://cdriccarboni.github.io/mise-qr-case-finder/?projectId=…`

Le même lien fonctionne dans le navigateur et dans la PWA installée : `start_url` et `scope` sont relatifs (`./`). Sur Pages, ils deviennent `/mise-qr-case-finder/`. Dans l’application Android, la page est servie depuis `https://appassets.androidplatform.net/assets/www/`, et un intent-filter `VIEW` reprend la query d’une URL Pages.

| Paramètre | Règle |
| --- | --- |
| `projectId` | Optionnel. Requis seulement pour ouvrir / créer / rattacher une mise liée. 1 à 80 caractères, `A–Z`, `a–z`, `0–9`, `_`, `-`. Sinon le paramètre est ignoré. |
| `projectName` | Optionnel. Caractères de contrôle retirés, 120 caractères maximum. Sert de nom si une mise vide est créée. |
| `source` | Optionnel. `art` documente l’origine et affiche le bandeau de continuité même sans `projectId`. |
| `returnUrl` | Optionnel. Accepté seulement en `http` ou `https`, sans identifiant ni mot de passe dans l’adresse, 2048 caractères maximum. `javascript:`, `data:` et toute autre forme sont ignorés. L’ancien paramètre `return` reste lu. |

À l’ouverture avec `projectId` :

1. si une mise porte déjà ce `projectId`, elle s’ouvre ;
2. sinon, si des mises existent sans projet (créées avant le pont), MISES! propose de rattacher l’une d’elles ;
3. sinon, MISES! crée une mise vide avec `projectName`, ou « Mise » si le nom manque.

Cela vaut pour un spectacle ancien, un spectacle nouveau, ou un EAC : seul l’identifiant stable compte. Aucune donnée de compagnie n’est écrite dans MISES!.

Le bouton **Retour à ART** n’est affiché que lorsque `returnUrl` a passé ces contrôles.

## Résumé, sans envoi

**Exporter le résumé** télécharge `MISES-resume-art.json` sur l’appareil. Rien n’est posté.

```json
{
  "version": 1,
  "kind": "mises-art-summary",
  "projectId": "show-2019",
  "projectName": "Ancien spectacle",
  "objectCount": 12,
  "caseCount": 3,
  "updatedAt": "2026-09-27T12:00:00.000Z"
}
```

`objectCount` est le nombre d’objets de la base locale. `caseCount` est le nombre de valises. `updatedAt` est la dernière modification connue. Le fichier ne contient ni fiches, ni photos, ni nom de compagnie.

Un enregistrement `localStorage` `art-mises-project-v1:<projectId>` existe encore au moment d’enregistrer une mise. Il reste sur l’origine de MISES!. ART, sur une autre origine, ne peut pas le lire. Ce n’est pas un envoi.

## Android

L’activité déclare un intent-filter `https://cdriccarboni.github.io/mise-qr-case-finder`. La query est recopiée vers la page locale. La vérification App Link (`assetlinks.json`) n’est pas possible depuis ce dépôt : Android la demande à `https://cdriccarboni.github.io/.well-known/assetlinks.json`, qui n’est pas la Page de ce projet. L’intent-filter suffit pour proposer MISES! à l’ouverture du lien.
