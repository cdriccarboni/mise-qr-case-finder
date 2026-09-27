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

Mesuré sur l’artefact du run [36313629669](https://github.com/cdriccarboni/mise-qr-case-finder/actions/runs/36313629669), puis revérifié par téléchargement de la pré-version `v0.2.2-beta.1-test` :

- APK debug : **19 713 134 octets**, SHA-256 `a0c39fe80ca6631320df89657fa14b0b58bea145060e2f0ae184650a27b58557`
- APK release signé debug : **19 151 070 octets**, SHA-256 `91f5d61d5ae15d5dca695bec49b739a2dffa2dd6a651da83b29f4ebbcf484277`
- AAB release signé debug : **19 145 733 octets**, SHA-256 `341c09e4c09950901c411e9b74370908f17810b8dcc5ce3b6a6c2bdf9bc76467`
- Zip web republé : **18 252 431 octets**, SHA-256 `bb92982f722fe23b68096d13d4a7b3fad8682d45c8440bdcf59ae20e549fd8d1`

Les runs `36313309109` et `36313466568` avaient échoué avant l’assemblage (`android.useAndroidX=false`). Le correctif `5b5a700` est celui qui a produit ces fichiers.
