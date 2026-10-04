# MISES Vision — architecture 0.4.0-beta.2

## État livré

MISES Vision reste **local-first**. La version 0.4.0-beta.2 conserve la détection généraliste locale existante comme Vision standard et ajoute l'architecture nécessaire pour évoluer sans présenter un résultat incertain comme certain.

### Vision standard
- moteur actuel : COCO-SSD local ;
- rôle : premier passage rapide / fallback ;
- fonctionnement hors ligne après mise en cache ;
- détection multi-objets et boîtes déjà utilisées par l'interface ;
- personnes ignorées par le pipeline métier.

### Mémoire visuelle locale
Une confirmation humaine peut maintenant conserver une référence locale réversible :
- fiche objet ;
- photo locale ;
- zone détectée ;
- contexte ;
- date et provenance de validation.

Cette mémoire **ne prétend pas encore faire des embeddings d'image**. Elle prépare le stockage local pour un futur moteur de similarité mesuré et validé.

### Vision avancée
Statut : **non installée / non sélectionnée**.

Candidats architecturaux à benchmarker : open-vocabulary local (par exemple OWL/OWL-ViT/OWLv2 ou Grounding DINO selon compatibilité réelle) et moteur d'embeddings local. Aucun candidat n'est embarqué dans le Core tant qu'il n'a pas été mesuré sur les cibles MISES.

## Fusion et confiance

Le moteur est prévu en cascade :
1. détection visuelle standard ;
2. candidat open-vocabulary optionnel ;
3. mémoire visuelle / similarité locale ;
4. contexte métier (inventaire, contenant, aliases, Data Bruitage, confirmations).

Le moteur conserve quatre niveaux internes (IDENTIFIÉ, PROBABLE, SUGGESTION, À IDENTIFIER). L'écran photo, lui, ne les affiche pas comme une certitude : il dit que c'est une proposition à confirmer. Le rapprochement se fait par les mots de la fiche, pas par comparaison d'images. La mémoire visuelle stocke toujours une photo confirmée, sans mesurer une similarité d'image.

Aucune proposition n'est validée automatiquement, et rien n'est ajouté à une caisse sans confirmation.

## Vocabulaire métier

Le vocabulaire Vision est construit dynamiquement à partir :
- objets et aliases locaux ;
- sons, tags, familles et dispositifs ;
- bibliothèque publique MISES ;
- registre extensible d'instruments ;
- termes enrichis depuis Data Bruitage après validation.

Le registre initial comprend notamment cordes, guitares/basses, claviers, bois, cuivres, percussions, idiophones, petits instruments et instruments électroniques.

## Benchmark réel

Le benchmark Pixel 9 demandé **n'a pas été exécuté dans cette livraison**, car aucun Pixel / Mac de test n'est connecté au runner GitHub. Aucun taux de réussite, temps, consommation mémoire ou classement de modèle n'est donc inventé.

Le protocole à exécuter sur appareil réel compare :
- Vision standard ;
- open-vocabulary candidat ;
- embeddings seuls ;
- cascade hybride.

Corpus : objets ordinaires, accessoires de bruitage, instruments, objets visuellement proches, occlusions, objets tenus, vrac, valise pleine et lumière médiocre.

Mesures : bonnes identifications, faux positifs, objets ratés, latence, mémoire, poids modèle et comportement hors ligne.

## Règle de décision

Un modèle Vision avancée ne sera ajouté au Core que s'il apporte un gain mesuré compatible avec :
- Pixel 9 / WebView Android ;
- PWA ;
- hors ligne ;
- licence redistribuable ;
- taille raisonnable.

Sinon, il restera un module optionnel explicitement installable.
