# Mesures — 0.2.2-beta.1

Machine de mesure : environnement de build Linux, Node 22, preview Vite local `http://127.0.0.1:4173`. Ce ne sont pas des mesures sur téléphone.

## Démarrage

Playwright, navigation réelle, deuxième passage (cache disque du preview) :

- `domContentLoaded` : **95 ms**
- `load` : **95 ms**

Premier passage de la même suite : **109 ms**. Preuve : journal du test `logo dots stay aligned…` (`{"navigation":{"domContentLoadedMs":95,"loadMs":95}}`).

## Volume fictif — 5 000 fiches

`node --test tests/data-bruitage.test.mjs`, jeu généré en mémoire, aucun fichier personnel :

- import (`planImport`) : **188 ms**, 5 000 ajouts
- recherche Fuse sur `hear` / `imagine` / `name` : **62 ms**, 2 500 correspondances « pluie fictive »

Journal : `{"fictionalRecords":5000,"importMs":188,"searchMs":62,"hits":2500}`.

Seuil codé dans le test : import < 15 s, recherche < 2 s. Les deux sont largement en dessous sur cette machine.

## Taille du build web

`npm run build` puis `du -sb dist` : **23 554 643 octets** (environ 22,5 Mio).

Le modèle COCO-SSD lite déjà présent pèse l’essentiel : quatre shards de 4 194 304 octets, un shard de 1 257 312 octets, `model.json` de 527 315 octets, soit environ 18,6 Mio. Aucun modèle d’OCR n’a été ajouté : le build est déjà dominé par la détection d’objets, et un OCR type Tesseract ajouterait plusieurs mégaoctets pour un gain non mesuré.

Le précache du service worker annonce 28 entrées, 22 966 Kio.

## APK

Non mesuré dans cet environnement : le SDK Android n’y est pas installé. La taille sera celle de l’artefact GitHub Actions `MISE-Android-build` une fois le workflow vert. L’APK embarque ce `dist/`, donc il dépasse la taille web (packaging + modèle).
