# Données publiques vs privées — MISES!

## Règle absolue

| Zone | Contenu | Où ça vit |
| --- | --- | --- |
| **Public (glossaire)** | Uniquement `PUBLIC_WEB` / feuille `EXPORT_PUBLIC_WEB` | `public/public-foley.json` dans le dépôt |
| **Privé (Cédric)** | `PRIVE_ONLY`, inventaire, recettes perso, documents Matabon, etc. | **Jamais** dans git. Uniquement appareil + **Supabase** du compte `cdric.carboni@gmail.com` |

Ne jamais committer de CSV/XLSX/JSON issu du corpus privé.

## Glossaire public

Régénération (sur une machine qui a le classeur source, hors git) :

```bash
node scripts/build-public-foley-from-xlsx.mjs /chemin/hors-git/classeur.xlsx --out public/public-foley.json
```

Le script refuse d’écrire si une ligne hors `PUBLIC_WEB` fuit dans le pack.

## Corpus privé — accès Cédric

1. Ouvrir MISES! (PWA).
2. **☁ Synchroniser** → entrer **`cdric.carboni@gmail.com`** → recevoir le magic-link.
3. Sur l’appareil, importer le classeur / pack privé **localement** (Partager → Data Bruitage, ou JSON `MISES-Data-Bruitage-v1` généré hors dépôt).
4. **Synchroniser maintenant** : les fiches privées partent dans ton space personnel.
5. Sur un autre appareil : même e-mail → sync → le privé revient.

RLS côté projet : `supabase/rls-owner-private.sql` (membership obligatoire). Le client refuse aussi de pousser les lignes marquées `PRIVE_ONLY` / `data-bruitage-v5` si la session n’est pas le compte propriétaire.

## Génération locale du pack privé (hors git)

```bash
node scripts/build-private-data-bruitage-from-xlsx.mjs /chemin/hors-git/classeur.xlsx \
  --out /tmp/MISES-private-data-bruitage.json
```

Le fichier de sortie ne doit **pas** être ajouté au dépôt.
