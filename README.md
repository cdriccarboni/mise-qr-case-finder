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


## Impression QR · WalkPrint / YHK · Mac et Android

MISES! 0.4.0-beta.16 propose trois stickers QR : **MISES!**, **ART — Acousmatic Régie Tools** et **Acousmatic Théâtre**. Les QR ouvrent uniquement les trois sites publics correspondants ; l’inventaire reste privé. La création des étiquettes fonctionne même avec un stock vide.

**Android natif :** sélectionner la mini-imprimante WalkPrint/YHK déjà associée, puis « Test logo + QR », « 1 sticker » ou « 3 stickers ». Le pilote natif Bluetooth Classic reste en place. Le sélecteur d’imprimantes Android/Epson n’est plus invoqué depuis les boutons d’étiquettes.

**Mac :** installer et ouvrir l’application compagne indépendante `MISES Mini Printer.app`. Son code et ses instructions sont dans [mac/mini-printer](mac/mini-printer). Sur le Mac de validation, la mini-imprimante `YHK-1CB7` expose le port série Bluetooth `/dev/cu.YHK-1CB7`, auquel le compagnon envoie directement les données au format 384 px ; pas de dialogue macOS Epson. Le compagnon n’écoute que `127.0.0.1:39381`, accepte uniquement les origines MISES!/ART autorisées et ne stocke ni inventaire ni image. Depuis la PWA, autoriser si nécessaire « Accès au réseau local / Loopback » à la première connexion. Le Bluetooth du navigateur seul ne sait pas ouvrir le protocole SPP de ce modèle.

Pour installer sur un autre Mac disposant des outils de compilation Xcode :

```bash
cd mac/mini-printer
zsh build-mac-printer.sh
open "$HOME/Applications/MISES Mini Printer.app"
```

Pour basculer vers Android, la fenêtre Mac affiche aussi un QR de transfert du **modèle de sticker**. Le scanner MISES! Android peut l'ouvrir sans transférer de données privées ni déclencher d’impression non sollicitée. L’application Mac et Android peuvent aussi fonctionner séparément.

**Photos :** sélectionner « Galerie / Photos / Drive / Fichiers » pour analyser une photo existante ou « Prendre une photo » pour utiliser l’appareil. Les fournisseurs proposés dépendent des applications installées sur le téléphone. Le choix Android est basé sur le sélecteur de documents du système et non plus sur la capture forcée.

**À vérifier sur le matériel réel :** apparition physique de l’étiquette en sortie, contraste/rotation sur chaque modèle, autorisation locale Chrome/Safari, et vérification de l’application Android installée via test interne Google Play. Conserver une sauvegarde JSON avant les premiers tests de synchronisation Supabase.
