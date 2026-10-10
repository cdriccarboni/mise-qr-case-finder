# mise-qr-case-finder

MISES! — QR Case Finder · PWA de bruitage, inventaire et mises.

Version en cours de validation : **0.4.0-beta.16** (Android versionCode 27).

Pour travailler dans Cursor : [docs/CURSOR.md](docs/CURSOR.md). Prise en main générale : [docs/COMMENCER.md](docs/COMMENCER.md). Dossier Play Console : [docs/PLAY-CONSOLE.md](docs/PLAY-CONSOLE.md).

Les Data Bruitage personnelles ne sont pas dans ce dépôt. L’exemple de `public/exemples/` est fictif.

## Base publique active

MISES! 0.4.0-beta.16 charge `public/public-foley.json` au démarrage. Cette base publique alimente la recherche, les fabrications, les jeux, les activités pédagogiques et les univers aléatoires. Le bundle public contient uniquement le glossaire `PUBLIC_WEB` (`EXPORT_PUBLIC_WEB`) ; le corpus personnel Data Bruitage n'est pas publié dans le dépôt. Détail public/privé et accès propriétaire : [docs/DATA-PUBLIQUE-PRIVEE.md](docs/DATA-PUBLIQUE-PRIVEE.md).


## Halloween & inventaires volumineux

La rubrique **Trouver → Halloween** explore l’index existant : objets, contenants, kits, mises, sons, documents et recettes. Ses filtres par ambiance n’inventent pas de nouveaux objets ni de sources ; les résultats supplémentaires s’affichent par pages de 80, sans limite fixe à 999. La navigation ouvre une fiche existante ou renvoie à la recherche.

La synchronisation **Supabase** lit désormais toutes les pages de 500 enregistrements avant de réconcilier avec le stock local. En cas d’erreur de lecture d’une page, elle échoue au lieu de considérer le nuage comme vide. Une sauvegarde JSON complète reste recommandée avant les premières synchronisations sur deux appareils. Le test de restauration locale de plus de 1 500 objets est maintenu.

**Android :** une modification GitHub/PWA n’installe pas toute seule l’APK. La livraison exige les tests CI réussis, un AAB signé, la publication sur le canal Play interne et l’accès du compte Google comme testeur.


## Imprimer des étiquettes depuis un ordinateur

Le générateur produit désormais des **étiquettes QR complètes de 384 pixels**, téléchargeables en PNG depuis un objet, une valise ou la préparation d’une planche d’étiquettes. Depuis le Mac, choisir « Exporter PNG 384 px » puis ouvrir l’image avec le logiciel de l’imprimante, ou choisir « Impression système » si un pilote compatible existe dans macOS.

**Attention :** le pilote Android expérimental WalkPrint/YHK passe par Bluetooth Classic SPP/RFCOMM et n’est pas disponible dans la PWA ordinateur. La sélection Bluetooth BLE dans Chrome ne constitue pas un pilote d’impression ; MISES ne prétend plus qu’une imprimante est connectée à partir d’une simple sélection GATT. Une impression directe en un clic depuis le Mac nécessiterait un pont natif vérifié sur le modèle exact.

La gestion Bluetooth et l’impression natives Android restent inchangées. Aucune donnée d’inventaire n’est envoyée à un service pour les exports PNG.
