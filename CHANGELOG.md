## 0.4.0-beta.32 — 20 octobre 2026 (#45)

- Audit UX (P0, P1, P2) : page publique `?case=` autonome (sans accueil propriétaire) avec « Contenant inconnu » / « Inventaire non publié » / « Hors ligne » distincts, jamais « QR valide » sans vérification ; publication de l’inventaire en opt-in propriétaire (☁ → « Publier mon inventaire ») ; accueil : titre MISES! unique, version affichée une fois, parcours 1 · Créer un contenant → 2 · Ajouter des objets → 3 · Imprimer les étiquettes, autres actions dans « Plus d’actions », Ambiances & jeux regroupés ; carte de bienvenue (se connecter / créer son premier contenant) ; « ☁ Se connecter » hors connexion ; Étiquettes : état vide avec « Créer un contenant », Supprimer dans « ⋯ » avec confirmation, sous-titre sans jargon ; casse unifiée ; icônes ⚙ ? libellées ; code mort retiré.

- Connexion Supabase sur Android : retour dans l'app par `fr.acousmatictheatre.mises://auth-callback` (intent-filter MainActivity), code PKCE échangé dans l'app (`exchangeCodeForSession`) au démarrage ; « Continuer avec Google » via Custom Tab (Google refuse les WebView). PWA : retour sur l'URL publique, même échange.
- Synchro automatique juste après la connexion, avec message de réussite (récupérées / envoyées) ou d'échec clair.
- Bouton fermer (×) : abaissé sous la barre d'état / l'encoche (zone sûre), cible tactile 48 dp, sur toutes les fenêtres.

## 0.4.0-beta.28 — 20 octobre 2026 (#45)

- Confidentialité : plus aucun contenant intégré dans le code ni le bundle publics (`src/builtin-containers.js` supprimé). Un nouvel utilisateur voit une liste vide et crée ses contenants. Les contenants du propriétaire vivent uniquement dans SON espace Supabase (seed owner-only, RLS) et dans le cache local de son appareil.
- Supabase : migration idempotente `mises_owner_seeds` (RLS sans policy) + RPC `mises_claim_owner_seed()` appelée à chaque synchro : copie, pour le seul compte à l'e-mail vérifié, les fiches de seed dans son espace sans jamais écraser l'existant. Les contenants supprimés ne sont jamais publiés.
- Étiquettes · Mes contenants : **Archiver** (masque, ID et QR conservés), vue **Archivées** avec **Restaurer**, **Supprimer** (avec confirmation, contenants utilisateur vides uniquement ; suppression douce, aucune donnée effacée). Contenants protégés (seed) : archivables, jamais supprimables. État synchronisé avec le compte, stocké localement hors connexion.
- Compagnon Mac : même correctif d'impression que l'Android (bandes de 64 lignes, marge de coupe 10 mm, attente fin d'impression, pas de lissage).
- Page publique `?case=<ID>` : inchangée et neutre (« pas encore publié », sans nom) tant que l'inventaire n'est pas publié.

## 0.4.0-beta.27 — 20 octobre 2026 (#45)

- Impression Bluetooth Android (WalkPrint/YHK) : le QR manquait ou était coupé. Cause : chaque étiquette partait en un seul bloc raster GS v 0 de ~1100 lignes sans contrôle de flux ; le tampon de l'imprimante débordait, la fin du job (le QR, imprimé en dernier après la rotation 180°) était perdue, puis le ESC @ du job suivant (250 ms plus tard) ou la fermeture du socket effaçait le reste. Désormais : un job par étiquette, envoyé en bandes de 64 lignes avec pauses, attente de la fin d'impression avant l'étiquette suivante / la déconnexion, bitmap approuvé copié sans rééchantillonnage.
- Marge de coupe de 10 mm avant et après chaque étiquette, avec un pointillé fin dans le blanc (l'étiquette approuvée est inchangée).
- Test : les octets envoyés à l'imprimante (encodeur Java `YhkJobEncoder`) redonnent le bitmap approuvé pixel à pixel et le QR se décode, pour une étiquette seule et pour une sélection de 6.

## 0.4.0-beta.26 — 19 octobre 2026 (#45)

- Contenant intégré SAC-MICRO-02 renommé « PETIT SAC TECHNIQUE · MICRO » (ID et QR inchangés) ; empreinte d’étiquette approuvée mise à jour.

## 0.4.0-beta.25 — 19 octobre 2026 (#45)

- Étiquette de contenant **unique et approuvée** partout : la fiche contenant (« Créer / imprimer le QR ») et l’impression d’un contenant utilisent désormais le même rendu que 🏷 ÉTIQUETTES (QR en haut, « mises! », nom sur 2 lignes, ID ; QR `?case=<id>`). L’ancien gabarit reste réservé aux objets.
- Tests d’égalité pixel à pixel (SHA-256 RGBA) des 6 étiquettes approuvées : rendu, aperçu écran et bitmap transmis au pilote WalkPrint/YHK.

## 0.4.0-beta.24 — 19 octobre 2026 (#45)

- Supabase : l’app pointe désormais vers le projet `errsklrioqfovhkdiejd` (migrations MISES! appliquées) avec sa clé publiable publique ; ancien projet `jemqozyqqsgabljnhfvn` abandonné (web, Android : hôte de vérification e-mail / App Link).

## 0.4.0-beta.23 — 19 octobre 2026 (#45)

- **Étiquettes sans aucune étape** : les 6 contenants MISES! (ID + nom d’étiquette uniquement, aucun objet) sont intégrés à l’app — 🏷 ÉTIQUETTES → IMPRIMER, sans compte, sans import, hors ligne. Fusion par ID avec les contenants locaux (jamais de doublon, nom choisi localement prioritaire). QR inchangés `?case=<id>`.

## 0.4.0-beta.22 — 19 octobre 2026 (#45)

- Accueil : bouton direct **🏷 ÉTIQUETTES** (pleine largeur sur mobile) → Étiquettes · Mes contenants (Tout sélectionner, IMPRIMER LA SÉLECTION).
- Page publique d’un QR : message clair au lieu d’une page vide quand l’inventaire public n’est pas encore publié (RPC absente / vide), quand le contenant n’y figure pas encore, ou hors ligne (bouton Réessayer, délai 12 s).
- Import CSV « Nom contenant » : un contenant existant n’est renommé que si son nom est encore son ID.
- Lecture d’un QR depuis une image (import photo / ingestion) : TRY_HARDER + essais à plusieurs échelles — zxing-js ratait certaines étiquettes 384 pts pourtant exactes (cause réelle de l’échec CI de parcours-030).
- Tests : décodeur QR de test plus robuste (zxing-js ratait un QR exact au module près) ; parcours-030 corrigé (menu collant recouvrant le bouton).

## 0.4.0-beta.21 — 19 octobre 2026 (#45)

- Import CSV : colonne optionnelle **« Nom contenant »** — un contenant à ID permanent (ex. `SAC-VIE-QUOT-01`) reçoit un nom lisible pour l’étiquette (ex. « VIE QUOTIDIENNE — 1/2 ») ; l’ID et le QR `?case=<id>` ne changent pas ; un nom déjà choisi n’est jamais écrasé ; réimport idempotent.

## 0.4.0-beta.20 — 19 octobre 2026 (#45)

- **Étiquettes · Mes contenants** (menu Partager) : tous les contenants avec aperçu exact, IMPRIMER à l’unité ou par sélection, réimpression. Étiquette longue horizontale WalkPrint/YHK 384 pts (48 mm), longueur automatique, nom jamais tronqué (2 lignes), QR ≈ 39 mm vers l’URL publique permanente `?case=<id>`.
- **Inventaire public en lecture seule** : le QR d’un contenant ouvre sa page sans compte (objets, quantités, compartiments, photos, recherche), recherche globale publique. RPC Supabase `get_public_inventory` (migration à appliquer).
- Import CSV d’inventaire (aperçu, conflits, sauvegarde automatique, réimport idempotent, IDs permanents conservés).
- Recherche centrale objets / contenants / bruitages / techniques ; photos multiples avec file hors ligne ; synchro par révision avec journal de conflits.
- Migrations Supabase versionnées et idempotentes (`supabase/migrations/`, voir `docs/SUPABASE.md`).

## 0.4.0-beta.19 — 10 octobre 2026

- Corrige la boucle « nouvelle version disponible » de la PWA : plus de reload arbitraire après 900 ms ; la navigation est rechargée uniquement après prise de contrôle du nouveau Service Worker.
- La mise à jour force un vrai contrôle du script SW sans dépendre du cache HTTP du navigateur (updateViaCache: none).
- Empêche les rafales de vérifications de version et les rechargements infinis ; propose un recours sans effacement de données si activation impossible.
- Page indépendante de réparation : https://cdriccarboni.github.io/mises-pwa-recovery/ ; elle retire seulement l’ancien Service Worker de scope MISES ! et ses caches applicatifs, sans toucher à IndexedDB/localStorage ni aux autres applications.
- Versions PWA, Android, Mac universel et cache SW incrémentées.

## 0.4.0-beta.18 — 10 octobre 2026

- Recherche **Ambiances** : 14 univers (Halloween, Noël, hiver, mer/pirates, forêt, météo, magie, science-fiction, ville, animaux, voyages, cirque, châteaux, mystère) ; sous-thèmes, texte, source inventaire/public.
- Critères de correspondance resserrés : suppression des faux positifs fondés sur une seule matière ou un mot générique. Sur l’index public de vérification, Halloween passe de 161/304 à moins de 30/304 références.
- Bibliothèque publique : 216 recettes préservées, 14 packs décrits, 93 recettes annotées à titre éditorial, sans invention de stock ni modification des données privées synchronisées.
- Version PWA/Android et cache Service Worker incrémentés.

## 0.4.0-beta.17 — 10 octobre 2026
- Mac MISES Mini Printer: corrected disappearing printer popup; native floating NSPanel stays visible above Brave, port detected immediately without blocking Bluetooth; direct local PNG picker and dedicated print button as fallback when browser blocks loopback. Only YHK/WalkPrint ports, never Epson.
- Visual search: Android / browser photo picker accepts multiple images from available local/Google Photos/Drive file providers; every selected photo is analysed and human-validated in sequence. Native Android WebView now reads multiple ClipData URIs.
- Labels: remove unnecessary printed-size annotation and size picker in voice workflow; enlarge QR from 280 to 320 dots on 384-dot roll; display SPARE in chosen app color, convert to dark high-contrast ink for B/W thermal printing.
- Fix voice-label Print path: produce the actual PNG QR sticker instead of trying to print an HTML preview.
- No inventory data migration, no system Epson print dialog, Android Play releases stay on internal test track.

## 0.4.0-beta.16 — 2026-10-10 (impression directe Mac + Android / import photo)

- Impression des étiquettes et QR : **aucun appel à la fenêtre d’impression système/Epson** dans l’interface principale et l’éditeur ; priorité au pilote WalkPrint/YHK Android ou au compagnon local Mac.
- Compagnon Mac natif (`mac/mini-printer`) : fenêtre indépendante, périphériques appairés, prévisualisation, serveur strictement local, Bluetooth Classic via port série virtuel `/dev/cu.YHK-1CB7` validé à l’envoi. Aucun transfert au téléphone nécessaire pour imprimer depuis Mac.
- QR promotionnels sélectionnables MISES!, ART, Acousmatic Théâtre, 1/3 stickers, PNG 384 px et code facultatif de transfert de modèle vers le scanner Android.
- Restauration de l’ancien test « logo + QR » sans inventaire. QR du test vers le domaine public MISES! et non vers l’origine interne WebView.
- Photo : suppression de la capture forcée des entrées d’import ; choix explicite galerie/Google Photos/Drive/Fichiers ou caméra. Sélecteur de fournisseur Android mis à jour.
- Version Android 27 ; cache service worker `mises-0.4.0-beta.16`.

## 0.4.0-beta.15 — 2026-10-10 (Halloween + synchronisation des gros inventaires)

- Rubrique « Trouver → Halloween » : parcours de l’index local et des références existantes, avec 4 ambiances thématiques, filtre textuel et résultats progressifs, sans modifier le stock.
- Supabase : pagination ordonnée par blocs de 500 au lieu d'une lecture unique potentiellement plafonnée à 1 000 lignes. Aucune réconciliation ne démarre si une page échoue.
- Tests de non-régression : limites 999 / 1 000 / 1 001 / 2 503, erreur d'une page, filtres Halloween ; test de restauration locale de 1 505 objets conservé.
- Version Android 26 ; cache PWA `mises-0.4.0-beta.15`. Publication Play séparée et conditionnée aux validations.

## 0.4.0-beta.12 — 2026-10-05 (glossaire public V5 + privé Supabase propriétaire)

- Glossaire public : `public/public-foley.json` régénéré depuis `EXPORT_PUBLIC_WEB` uniquement (216 recettes `PUBLIC_WEB`, 12 fabrications, 19 sources). Aucun `PRIVE_ONLY` dans le dépôt.
- Recettes publiques enrichies (préparation / geste / captation) affichées dans « Comment faire ce son ».
- Privé : import local CONSULTATION (`PRIVE_ONLY` / `MIXTE`) + sync Supabase réservée au compte `cdric.carboni@gmail.com` (garde client + script RLS `supabase/rls-owner-private.sql`).
- Scripts : `build-public-foley-from-xlsx.mjs` (pack public) et `build-private-data-bruitage-from-xlsx.mjs` (sortie hors git uniquement).
- Doc : `docs/DATA-PUBLIQUE-PRIVEE.md`.
- Version `0.4.0-beta.12`, Android `versionCode` 23, cache PWA `mises-0.4.0-beta.12`.

## 0.4.0-beta.11 — 2026-10-05 (propositions photo à confirmer)

- Photo : une fiche n’est proposée au premier plan que si le mot vu (valise, chaise, table…) est vraiment dans son nom. Les synonymes plus lâches et les objets seulement « proches » ne prennent plus la place d’une vraie correspondance.
- Photo : une personne, un objet non reconnu ou une classe trop générale (une table sans le mot « table » dans la fiche) ne fabrique plus de fausse fiche.
- Écran : le texte dit clairement que c’est une proposition à confirmer, pas une identification certaine. Rien n’est ajouté à une caisse sans un geste de confirmation.
- Hors ligne : le modèle déjà en cache ne change pas. Aucun service externe.
- Version `0.4.0-beta.11`. Android `versionCode` inchangé à `22` (seul le nom de version suit). Cache PWA `mises-0.4.0-beta.11`.

## 0.4.0-beta.10 — 2026-10-02 (mise à jour PWA auto + diagnostic OAuth)

- PWA : passage du service worker en `autoUpdate`, activation immédiate avec `skipWaiting`.
- PWA : vérification directe de `version.json` sans cache au démarrage, au retour dans l’app et toutes les 60 secondes.
- PWA : si la version publique diffère de la version chargée, MISES force `registration.update()` puis recharge la nouvelle version.
- OAuth Google : le code MISES conserve le Client ID de production ; le domaine GitHub Pages doit être autorisé comme origine JavaScript dans le même client OAuth Google utilisé par ART.
- Recettes publiques : toucher une recette qui contient une technique ouvre « Comment faire ce son » avec geste, objets/matières et source ; « Ajouter à mon stock » préremplit la fiche personnelle tout en gardant la provenance externe.
- Version `0.4.0-beta.10`, Android `versionCode 22`, cache PWA `mises-0.4.0-beta.10`.

## 0.4.0-beta.9 — 2026-10-02 (navigation mobile, partage PWA et Google)

- Accueil : suppression du libellé « Recherche globale MISES! » ; un espace visuel reste entre l’identité et le champ.
- Recherche tactile : ajout d’une flèche de validation en plus d’Entrée et de la dictée ; les réponses restent directement sous le champ.
- Navigation mobile : les rubriques fonctionnent en accordéon sur téléphone et se replient après un choix.
- Fenêtres : bandeau de fermeture réellement sticky et cible de fermeture ≥ 48 px ; largeur mobile sécurisée.
- Android : le bouton Retour ferme d’abord la fenêtre ou le menu MISES! ouvert avant de revenir/quitter.
- Préférences : « À propos » est supprimé et remplacé par « Partager ».
- Partager : QR code vers la PWA publique, partage/copie de l’adresse, ouverture PWA et proposition d’installation.
- Google : la connexion Google Drive reste directe dans la PWA ; dans la coque Android, l’interface propose explicitement d’ouvrir la PWA dans Chrome au lieu d’afficher un cul-de-sac « indisponible ».
- Inventaire photo : fermeture et catalogue complet déjà présents ont été revérifiés ; aucune régression volontaire.
- Jeux / ateliers : sélection du nombre de participant·es déjà présente et conservée.
- Version `0.4.0-beta.9`, Android `versionCode 21`, cache PWA `mises-0.4.0-beta.9`.

## 0.4.0-beta.8 — 2026-10-01 (premier écran compact et réponse immédiate)

- Recherche : les réponses apparaissent désormais immédiatement sous le champ, avant les raccourcis, sans changer la logique de recherche.
- Mobile Android : le logo est légèrement redescendu dans la coque native pour mieux dégager l’heure et le poinçon caméra.
- En-tête : le libellé « En ligne » disparaît ; l’état « Hors ligne » reste affiché uniquement lorsqu’il est utile.
- Footer : informations regroupées sur une seule ligne très compacte pour récupérer de la hauteur.
- Raccourcis terrain : espacement vertical légèrement réduit sur mobile, sans changer les cartouches ni leur hiérarchie.
- Couleur : la préférence d’encre pilote aussi le thème natif Android (barres système/coque) et le thème navigateur, en plus des accents et du logo.
- Logo : rendu SVG adouci à petite taille (précision géométrique, contour noir plus fin et jointures arrondies), sans modifier sa géométrie.
- Version `0.4.0-beta.8`, Android `versionCode 20`, cache PWA `mises-0.4.0-beta.8`.

## 0.4.0-beta.7 — 2026-10-01 (audit mobile, Vibe, safe areas et identité)

- Fermeture des Préférences et de tous les dialogues renforcée : bandeau supérieur sticky, cible tactile ≥ 48 px et respect des safe areas/encoches Pixel.
- Audit géométrique mobile ajouté : débordements, collisions de cartouches, cibles tactiles et bords du viewport sont contrôlés automatiquement.
- Vibe / Exercice : motifs décoratifs recentrés et équilibrés, grilles et boutons normalisés, textes longs protégés contre les chevauchements.
- Les cartouches seules qui occupent toute une ligne centrent désormais leur libellé partout où la règle s’applique.
- La couleur choisie dans Préférences reste l’encre globale de l’interface ; anciens accents fixes remplacés par la variable d’encre quand ils faisaient partie de l’identité.
- Logo inchangé dans sa géométrie, avec un très léger liseré noir pour distinguer lettres, ombre et points.
- Crédit simplifié en « © Cédric Carboni ».
- Version `0.4.0-beta.7`, Android `versionCode 19`, cache PWA `mises-0.4.0-beta.7`.

## 0.4.0-beta.3 — 2026-09-30 (groupes, jeux et ambiances multi-participant·es)

- Sélecteur **Participant·es** dans Jouer, ateliers, jeux publics, Vibe, exercices et création d’ambiance.
- Le moteur garantit désormais une **répartition sonore pour chaque personne**, même lorsque le groupe est plus grand que le nombre d’objets : les objets peuvent être partagés avec gestes, entrées, intensités ou variantes distinctes.
- Les défis A–J, scènes sonores, univers, ateliers, exercices et jeux publics exposent leur plan de répartition dans l’interface.
- Les ateliers propagent le nombre de participant·es à chaque activité et au conducteur.
- Tests ajoutés pour groupes de 8, 9, 10 et 12 participant·es, avec moins d’objets que de personnes.
- Version `0.4.0-beta.3`, Android `versionCode 15`, cache PWA `mises-0.4.0-beta.3`.

## 0.4.0-beta.2 — 2026-09-29 (étiquettes libres + import universel + index + MISES Vision)

- Nouveau raccourci terrain **Créer une étiquette** et éditeur libre tactile : plusieurs textes/images, déplacement, redimensionnement, rotation, ordre avant/arrière, styles texte, formats thermiques mm, orientation, recadrage, modèles locaux, annuler/rétablir et impression système.
- Étiquettes contextuelles depuis objet, contenant, kit et mise. Le moteur QR existant reste séparé pour éviter les régressions.
- Import étendu : XLSX/XLS/ODS/CSV/TSV/JSON/TXT/Markdown/PDF texte/DOCX/ZIP ; images PNG/JPEG/WebP orientées vers MISES Vision ou qualification humaine sans faux OCR.
- Préférences simplifiées : bloc sauvegarde/restauration, formats du dossier de travail, diagnostic **État de l’index** et reconstruction sans toucher aux données métier.
- Index global : objets, sons, contenants, kits, mises, documents, jeux, activités, fabrications, recettes publiques et registre extensible d’instruments.
- MISES Vision : niveaux **IDENTIFIÉ / PROBABLE / SUGGESTION / À IDENTIFIER**, mémoire visuelle locale réversible et vocabulaire métier enrichi. Vision avancée préparée comme module optionnel, non déclarée meilleure sans benchmark Pixel réel.
- Bibliothèque publique active conservée : 99 recettes PUBLIC_WEB, 12 fabrications, 8 jeux et 7 activités pédagogiques, sans corpus privé.
- CI renforcée : unitaires + build PWA + Playwright + APK Android debug avant fusion.
- Version `0.4.0-beta.2`, Android `versionCode 14`, cache PWA `mises-0.4.0-beta.2`.

## 0.4.0-beta.1 — 2026-09-29 (bibliothèque publique + double interface)

- Bibliothèque publique embarquée issue uniquement de `EXPORT_PUBLIC_WEB` : 99 recettes sourcées, 12 fabrications, URLs conservées.
- 8 jeux publics et 7 activités pédagogiques reliés à la même base ; Univers aléatoire enrichi par les nouvelles recettes.
- Les jeux peuvent croiser la bibliothèque publique avec l'inventaire réel sans déclarer qu'un objet Web est possédé.
- Rubriques Bibliothèque publique, Fabrications et Activités pédagogiques dans l'interface Bruitages.
- Deux interfaces dans Préférences : **Bruitages & pédagogie** et **Inventaire / régie**.
- Mode Inventaire / régie : QR, étiquettes, objets, contenants, kits, mises, recherche et catégories personnalisées, sans vocabulaire bruitage.
- Version `0.4.0-beta.1`, versionCode `13`, cache PWA `mises-0.4.0-beta.1`.
- CI PR renforcée : tests unitaires avant build PWA et APK debug Android.

## 0.3.0-beta.7 — 2026-09-28 (jeux ↔ inventaire réel)

- Moteur de jeux / défis / ateliers générés depuis l’inventaire réel (valise, filtres, statuts).
- Parcours Jouer · Atelier · Défi · Surprise depuis contenant / Créer / inventaire global.
- Couche relations SOURCE/NORMALIZED/DERIVED/GAME_DATA prête pour Data Bruitage.
- versionCode 12 · package `fr.acousmatictheatre.mises`.

## 0.3.0-beta.6 — 2026-09-28 (bêta fermée Play · UX anti-doublons)

- Une seule recherche globale MISES! (champ + dictée) : index objets, sons, contenants, mises, kits et Data Bruitage.
- Suppression des cartouches / boutons redondants « Recherche », « Rechercher » et « Dictée vocale ».
- Raccourcis terrain distincts : scanner QR, photo, inventaire photo, dernière mise (plus de doublons Exercice / Vibe / Hands).
- Grille 2 colonnes : dernier cartouche impair en pleine largeur.
- Android `versionCode` 11 · package `fr.acousmatictheatre.mises`.
- Build release/Play échoue sans clé d’upload (`MISE_UPLOAD_*`) — plus de faux AAB « PLAY » signé debug.

## 0.3.0-beta.5 — 2026-09-28 (reprise Cursor)

- Slogan officiel rétabli : « Cherche ta mise ».
- ART sans spectacle : `?source=art` (et `returnUrl` valide) ouvre MISES! avec bandeau de continuité et retour ART, sans créer de mise.
- Défi bruitage : pools élargis + anti-répétition du tirage précédent ; défis photo / univers tirés au hasard parmi les objets réellement vus.
- UI : motifs nodaux plus espacés vers le haut ; libellés QR « Créer / imprimer » clarifiés.
- Navigation : **5 cartouches** séparés — Trouver · Créer · Ranger · Préparer · Partager.
- Logo étapes 1+2 : tampon wordmark renforcé + icône `m!` à tête jeton ; ancien Tampon conservé en `docs/design/legacy/` et `public/brand/legacy/`.
- Direction graphique : suivi dans `docs/design/EVOLUTION-LOGO.md`.

## 0.3.0-beta.5 — 2026-09-27

- Fenêtres : un clic sur le fond autour de n’importe quel dialogue ferme de nouveau la fenêtre et revient au niveau précédent.
- Préférences → À propos : fermer le popup À propos, au clic extérieur comme avec × ou Échap, rouvre les Préférences.
- Scanner : clic extérieur et Échap utilisent la vraie fermeture du scanner afin de libérer la caméra et d’annuler proprement un déplacement en cours.
- Recette navigateur ajoutée pour verrouiller la fermeture par backdrop et le retour au menu précédent.
- Version 0.3.0-beta.5, Android `versionCode` 10.

## 0.3.0-beta.4 — 2026-09-27

- Interface : les trois cartouches « Trouver & créer », « Ranger & préparer » et « Partager & outils » gardent désormais leur hauteur propre et s’alignent en haut. Les champs, listes et boutons des blocs Vibe / Exercice restent dans leur cartouche en desktop comme en mobile. Les cartes de jeu reprennent le même arrondi que les autres cartouches.
- Accueil : suppression du libellé « Rechercher » au-dessus du grand champ. « À propos » n’apparaît plus sur l’accueil ni dans « Partager & outils » ; il reste uniquement dans Préférences.
- À propos : crédit beaucoup plus discret dans le popup. « Cédric Carboni » et « Acousmatic Theatre » sont les deux liens directement intégrés à la phrase, avec un survol/focus léger.
- QR : les libellés disent explicitement « créer / imprimer » un QR code pour les valises et les séries.
- Vibe / Exercice : motifs nodaux plus espacés en haut des cartouches. Le Défi bruitage tire maintenant au hasard l’univers, la durée, le nombre maximal d’objets, une contrainte, un mode de jeu et souvent une surprise.
- ART → MISES ! : l’arrivée avec `source=art` est traitée comme une continuité. MISES ! utilise le même client Google de production, ignore les anciens overrides OAuth locaux en production et évite de redemander un consentement complet quand l’autorisation existe déjà. Aucun jeton Google n’est placé dans l’URL.
- Version 0.3.0-beta.4, Android `versionCode` 9.

# Changelog

## 0.3.0-beta.3 — 2026-09-27

- Le nom officiel est **MISES!** (S et point d’exclamation collés) dans les titres, le manifest, l’interface et les textes publics. Le logo reste « mises ! », avec l’espace. Le dossier Drive reste « MISES ! » pour ne pas perdre les fichiers déjà là. Le dépôt reste `mise-qr-case-finder`.
- La PWA reste autonome. Le manifest demande l’installation (`standalone`, icônes 192, 512 et maskable, `start_url` et `scope` relatifs, donc `/mise-qr-case-finder/` sur GitHub Pages). Le service worker versionne le cache `mises-0.3.0-beta.3`, efface les anciens caches, et affiche « Nouvelle version disponible » avant de recharger.
- Un lien ART ouvre la mise liée à `projectId`, propose de rattacher une mise déjà là, ou crée une mise vide. `returnUrl` n’est suivi que s’il est en http ou https, sans identifiant dans l’adresse. Le bouton « Retour à ART » n’apparaît que dans ce cas. Le résumé JSON (`MISES-resume-art.json`) se télécharge à la demande et n’est pas envoyé. Contrat : `docs/ART-BRIDGE.md`.
- Le haut de l’écran ne passe plus sous la barre d’état ni la caméra. Android 15 (targetSdk 36, déjà au-dessus de 35) applique une seule fois les vrais insets : barres système, encoche, clavier, en padding de la WebView. La page ne les ajoute pas une seconde fois (`data-native-safe`). La PWA garde `viewport-fit=cover` et `env(safe-area-inset-*)`. Pas de projet Capacitor : il n’y a pas de plugin StatusBar à configurer.
- Le grand padding fixe du bas (8 rem) est retiré. La marge basse est l’inset réel, pas une marge en plus.
- Version `0.3.0-beta.3`, Android `versionCode` 8. La clé d’upload Play est toujours absente. L’APK de test et l’AAB sont signés avec la clé debug si `MISE_UPLOAD_STORE_FILE` n’est pas défini.
- Photo : une bouteille détectée s’affiche comme la catégorie « bouteille d’eau », pas comme le mot anglais ni comme une fiche au hasard. Les boutons proposent les fiches les plus proches de la base (synonymes français) et une recherche trouve le nom exact. Un geste remplace la catégorie par la fiche choisie et mémorise la correction, hors ligne, sans réentraîner le modèle. La prochaine photo de la même catégorie propose d’abord cette fiche.
- Préférences : encre au choix. Rose `#D12A74` par défaut, palette (rose, orange, rouge, vert, bleu, violet) et couleur libre. Liserés, boutons, logo (points du i et du ! et passe Tampon), icône dans l’appli, splash et À propos suivent tout de suite. Le texte sur l’encre passe en blanc ou en noir selon le contraste. Le liseré sombre reste plus clair. Régie reste en noir et blanc. Le choix est sauvé, restauré, et inclus dans la sauvegarde. « Couleur par défaut » revient au rose. L’icône Android de l’écran d’accueil reste rose. Les étiquettes thermiques restent en encre noire, pour que le QR se relise.
- Le nom visible devient **MISES!**. Le logo est « mises ! », toujours en minuscules Fredoka, variante Tampon. Les points du i et du ! suivent l’encre choisie. L’icône « m! » ne change pas.
- Le nom interne suit : textes, identifiants, manifest, cache du service worker, pont Android. Au démarrage, les anciennes clés sont copiées vers les nouvelles si elles sont absentes. Rien n’est écrasé, rien n’est supprimé. Clés copiées : `mise-display-mode`, `mise-theme-mode`, `mise-ink`, `mise-google-oauth-client-id`, `art-mise-project-v1:*`, session `mise-google-oauth-session-v1`, base IndexedDB `mise-db`. Drive : un enregistrement écrit `mises-data.json` dans « MISES ! » et laisse `mise-data.json` dans « MISE ! ». Un ancien export (JSON, classeur `MISE-`, schéma `MISE-Data-Bruitage-v1`) se réimporte. Cette copie de clés vaut pour le web et la PWA. L’`applicationId` est maintenant `fr.acousmatictheatre.mises` : Android installe une appli séparée, et l’export JSON de la beta.2 est le passage vers elle. Le dépôt et l’URL de confidentialité ne changent pas (`src/about.js`).

## 0.3.0-beta.2 — 2026-09-27

- Le bas de l’écran n’est plus coupé par la barre Android. L’application passe en bord à bord, lit les marges système (`WindowInsets`) et les transmet à la page. Le défilement garde le dernier cartouche entier, avec une marge basse (`dvh`, `env(safe-area-inset-bottom)`).
- L’encre unique passe du bleu au rose d’imprimerie `#D12A74`. Le blanc dessus reste lisible (contraste 4,9). Les cartouches et les cartes ont un liseré rose, plus clair en sombre pour ressortir. Régie reste en noir et blanc. Deux autres roses sont dans `public/brand` pour comparaison (`#E4458C`, `#FF48B0`), ils ne sont pas l’encre de l’application.
- La photo cherche en plusieurs passages : image entière, recadrage, zoom, tuiles, quart de tour. Les détections qui se recouvrent sont fusionnées. Le nom proposé est celui d’une fiche de la base (synonyme français ou anglais, ou objet proche), pas le mot anglais brut. Une correction déjà mémorisée reste prioritaire. Le modèle embarqué n’est pas réentraîné.
- Version `0.3.0-beta.2`, Android `versionCode` 7. La clé d’envoi Play n’est toujours pas disponible. Le binaire de test reste signé avec la clé debug.

## 0.3.0-beta.1 — 2026-09-27

- Inventaire rapide, photo à plusieurs objets, QR continu (objet, caisse, valise, kit, mise) et recherche en français, hors ligne.
- Vibe bruitage, « Crée ton bruitage » et exercices générés. Ce qui est possédé, avec son emplacement, reste séparé de ce qui est seulement suggéré.
- Une correction validée est mémorisée localement et réutilisée. Le modèle photo n’est pas réentraîné. On peut désactiver un apprentissage sans toucher à la fiche.
- Étiquettes : logo, nom, QR, identifiant court. Impression par le service Android. L’essai WalkPrint/YHK reste à part. Le QR de l’étiquette se relit.
- Nouvelle identité : une seule encre (bleu d’imprimerie `#0B3D91`) sur papier. Le logo est le mot « mise ! », en minuscules arrondies (Fredoka, licence SIL OFL, vectorisé). Les points du i et du ! portent l’encre. L’icône est « m! ». L’esprit sérigraphié vient de Musiques en jeu(x) – LE KIT, sans reprendre son logo, ses photos ni ses dessins. Régie reste en noir et blanc.
- Écran « À propos » : création de Cédric Carboni pour Acousmatic Theatre, lien vers acousmatic-theatre.fr, lien vers le site personnel https://carboni-cedric.pages-perso.free.fr/, numéro de version. Accessible depuis l’accueil, le menu et les préférences. Les liens s’ouvrent dans le navigateur.
- Études de logo dans `docs/design/`. La piste retenue est Tampon : le mot « mise ! » avec une seconde passe décalée. L’icône est « m! » avec cet effet. L’étiquette thermique reste en une encre, sans décalage. Régie affiche le tampon en noir sur blanc.
- Version `0.3.0-beta.1`, Android `versionCode` 6. IndexedDB passe en version 5 : les fiches déjà là sont conservées, un espace « apprentissages » est ajouté.
- La clé d’envoi Play n’est toujours pas disponible. Les binaires de test sont signés avec la clé debug.

## 0.2.3-beta.1 — 2026-09-27

- Android `versionCode` 5. Connexion Google désactivée dans la WebView (Google bloque l’OAuth intégré). Message explicite, le reste de l’app reste hors connexion. Le scope Drive de la version web reste `drive` (pas `drive.file`).
- Politique de confidentialité réécrite dans `public/privacy.html`. Dossier Play : `docs/PLAY-CONSOLE.md`.
- Signature des binaires de test : clé debug. Ce n’est pas la clé d’upload Play.

## 0.2.2-beta.1 — 2026-09-27

- Data Bruitage : champs séparés « son à entendre » et « son à imaginer », origine explicite (document de l’utilisateur, source externe, proposition générée, à vérifier), doublons signalés sans fusion.
- Classeur XLSX (index, objets, sons, sources, doublons, tables liées) et index CSV. Réimport du classeur sans perte des sources ni des relations. Exemple public fictif dans `public/exemples/`.
- Fiche : correction, mémo sonore (permission, fichier absent, interruption), recherche sur les deux sons.
- Logo : les deux points rouges sont deux cercles de même `cy` dans un seul SVG.
- Android : `versionCode` 4, `versionName` 0.2.2-beta.1, PWA embarquée via `WebViewAssetLoader`. `android.useAndroidX=true` est requis par `androidx.webkit`. Signature de test (debug), pas la clé Play. Schéma IndexedDB inchangé (v4).
- L’application ne s’ouvre plus sur la page ART.
- Inventaire Mac : le logo carton et les préférences étaient déjà dans `fb8ffd4`. Ajout du toast si la synchro locale échoue, et de l’état vide des mises. Format d’import privé : `docs/FORMAT-IMPORT.md`.

## 0.2.1-beta.1

- Thèmes, modes d’affichage, vision locale, alignement Android, confidentialité des exemples publics.
