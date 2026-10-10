# mise-qr-case-finder

MISES! — QR Case Finder · PWA de bruitage, inventaire et mises.

Version en cours de validation : **0.4.0-beta.18** (Android versionCode 29).

Pour travailler dans Cursor : [docs/CURSOR.md](docs/CURSOR.md). Prise en main générale : [docs/COMMENCER.md](docs/COMMENCER.md). Dossier Play Console : [docs/PLAY-CONSOLE.md](docs/PLAY-CONSOLE.md).

Les Data Bruitage personnelles ne sont pas dans ce dépôt. L’exemple de `public/exemples/` est fictif.

## Univers thématiques (v0.4.0-beta.18)

Dans **Trouver → Ambiances**, sélectionne parmi 14 univers sonores (Halloween, Noël et fêtes d’hiver, montagne, mer/pirates, forêt, météo, magie, science-fiction, ville, animaux, voyages, cirque, châteaux, enquête). Chaque univers possède des sous-ambiances et un filtre **Tout / Mon inventaire / Recettes et ressources publiques**, ainsi qu’une recherche textuelle affinée. Le classement exige un indice sonore explicite : « bois », « papier », « métal », « pas » et « vent » ne rendent pas à eux seuls un objet « Halloween ». Les 216 recettes sourcées sont conservées sans doublons ; les 93 annotations thématiques de recettes sont des suggestions éditoriales et non des validations terrain ni des preuves de possession. Les données privées synchronisées ne sont pas modifiées.

## Base publique active

MISES! 0.4.0-beta.18 charge `public/public-foley.json` au démarrage. Cette base publique alimente la recherche, les fabrications, les jeux, les activités pédagogiques et les univers aléatoires. Le bundle public contient uniquement le glossaire `PUBLIC_WEB` (`EXPORT_PUBLIC_WEB`) ; le corpus personnel Data Bruitage n'est pas publié dans le dépôt. Détail public/privé et accès propriétaire : [docs/DATA-PUBLIQUE-PRIVEE.md](docs/DATA-PUBLIQUE-PRIVEE.md).


## Halloween & inventaires volumineux

La rubrique **Trouver → Halloween** explore l’index existant : objets, contenants, kits, mises, sons, documents et recettes. Ses filtres par ambiance n’inventent pas de nouveaux objets ni de sources ; les résultats supplémentaires s’affichent par pages de 80, sans limite fixe à 999. La navigation ouvre une fiche existante ou renvoie à la recherche.

La synchronisation **Supabase** lit désormais toutes les pages de 500 enregistrements avant de réconcilier avec le stock local. En cas d’erreur de lecture d’une page, elle échoue au lieu de considérer le nuage comme vide. Une sauvegarde JSON complète reste recommandée avant les premières synchronisations sur deux appareils. Le test de restauration locale de plus de 1 500 objets est maintenu.

**Android :** une modification GitHub/PWA n’installe pas toute seule l’APK. La livraison exige les tests CI réussis, un AAB signé, la publication sur le canal Play interne et l’accès du compte Google comme testeur.


## Impression QR · WalkPrint / YHK · Mac et Android

MISES! 0.4.0-beta.18 propose trois stickers QR : **MISES!**, **ART — Acousmatic Régie Tools** et **Acousmatic Théâtre**. Les QR ouvrent uniquement les trois sites publics correspondants ; l’inventaire reste privé. La création des étiquettes fonctionne même avec un stock vide.

**Android natif :** sélectionner la mini-imprimante WalkPrint/YHK déjà associée, puis « Test logo + QR », « 1 sticker » ou « 3 stickers ». Le pilote natif Bluetooth Classic reste en place. Le sélecteur d’imprimantes Android/Epson n’est plus invoqué depuis les boutons d’étiquettes.

**Mac :** installer et ouvrir l’application compagne indépendante `MISES Mini Printer.app`. Son code et ses instructions sont dans [mac/mini-printer](mac/mini-printer). Sur le Mac de validation, la mini-imprimante `YHK-1CB7` expose le port série Bluetooth `/dev/cu.YHK-1CB7`, auquel le compagnon envoie directement les données au format 384 px ; pas de dialogue macOS Epson. Le compagnon n’écoute que `127.0.0.1:39381`, accepte uniquement les origines MISES!/ART autorisées et ne stocke ni inventaire ni image. Depuis la PWA, autoriser si nécessaire « Accès au réseau local / Loopback » à la première connexion. Le Bluetooth du navigateur seul ne sait pas ouvrir le protocole SPP de ce modèle.

**Distribution multi-Mac, M1/M4 et autres utilisateurs :** dans MISES! → Partager → Imprimante → « Télécharger MISES Mini Printer · Mac M1 / M4 / Intel », ou sur la [release GitHub de la version en cours](https://github.com/cdriccarboni/mise-qr-case-finder/releases). Le ZIP est un exécutable **universel arm64 + x86_64**, macOS 13 minimum : ni Xcode ni compilation requis sur le Mac utilisateur. Dézipper, glisser la .app dans Applications, l’ouvrir, puis associer la mini-imprimante sur **chaque Mac**. Sur un Mac sans identifiant développeur Apple, si macOS demande une exception à l’ouverture de l’app non notarisée, voir Réglages Système → Confidentialité et sécurité → « Ouvrir quand même ». Le paquet est construit en CI macOS et ajouté à la même release que la version PWA.

Chaque Mac conserve son appairage Bluetooth local et peut imprimer indépendamment, mais **une seule connexion Bluetooth active à la mini-imprimante à la fois**. Les données et préférences MISES! nécessitent leur propre synchronisation (Supabase/Drive) : le compagnon d’impression ne synchronise ni inventaire ni préférences.

Pour les développeurs souhaitant compiler les deux architectures depuis le code source : `zsh mac/mini-printer/package-mac-printer.sh`. Les instructions pour les utilisateurs sont dans [INSTALLER-MAC.txt](mac/mini-printer/INSTALLER-MAC.txt).

Pour basculer vers Android, la fenêtre **Partager → Imprimante** de la PWA affiche aussi un QR de transfert du **modèle de sticker**. Le scanner MISES! Android peut l'ouvrir sans transférer de données privées ni déclencher d’impression non sollicitée. L’application Mac et Android peuvent aussi fonctionner séparément.

**Photos :** sélectionner « Galerie / Photos / Drive / Fichiers » pour analyser une photo existante ou « Prendre une photo » pour utiliser l’appareil. Les fournisseurs proposés dépendent des applications installées sur le téléphone. Le choix Android est basé sur le sélecteur de documents du système et non plus sur la capture forcée.

**À vérifier sur le matériel réel :** apparition physique de l’étiquette en sortie, contraste/rotation sur chaque modèle, autorisation locale Chrome/Safari, et vérification de l’application Android installée via test interne Google Play. Conserver une sauvegarde JSON avant les premiers tests de synchronisation Supabase.
