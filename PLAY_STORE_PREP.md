# MISE ! — préparation Google Play

## Identité

- Nom : **MISE !**
- Sous-titre produit : **QR Case Finder**
- Package Android : `fr.acousmatictheatre.mise`
- Catégorie envisagée : Outils
- Version de test actuelle : `0.3.0-beta.3` (`versionCode` 8, package `fr.acousmatictheatre.mise`). La clé d’envoi Play n’est pas dans le dépôt : ne pas la recréer. Si elle est fournie, Gradle la prend via `MISE_UPLOAD_STORE_FILE`, `MISE_UPLOAD_STORE_PASSWORD`, `MISE_UPLOAD_KEY_ALIAS`, `MISE_UPLOAD_KEY_PASSWORD`.
- L’APK/AAB du workflow est signé avec la clé de debug. La clé d’upload Play existante n’est pas disponible ici : elle n’a pas été recréée. Ne pas envoyer cet AAB comme mise à jour d’une fiche déjà signée avec cette clé.
- Cible Android : API 36

## Proposition de fiche Store

### Description courte

Inventaire, QR et préparation de mises pour le bruitage et le plateau.

### Description longue

MISE ! aide à retrouver, préparer et contrôler les objets, valises, kits et mises utiles au bruitage et au travail de plateau.

L’application permet notamment de rechercher dans une base de travail, organiser des objets et des contenants, créer des QR, préparer des mises, scanner des codes, ajouter des photos et rattacher une préparation à un projet.

La base personnelle n’est pas publiée avec l’application. Elle reste locale par défaut et peut être synchronisée volontairement avec un espace privé lorsque la connexion correspondante est activée.

MISE ! est pensée pour une utilisation mobile, y compris sur le terrain et en répétition.

## Éléments visuels déjà prêts

- Logo officiel SVG : `public/icon.svg`
- Icône Play 512 × 512 : générée à partir du logo officiel
- Feature graphic 1024 × 500 : générée à partir du logo officiel

## Data safety — brouillon à vérifier avant soumission

État observé dans le dépôt au 25/09/2026 :

- pas de SDK publicitaire ;
- pas d’outil d’analytics ou de télémétrie repéré ;
- caméra / micro demandés seulement quand une fonction l’utilise ;
- données personnelles non incluses dans le bundle public ;
- stockage local via IndexedDB ;
- synchronisation Drive optionnelle, après action de l’utilisateur ;
- partage explicite et limité à ce que l’utilisateur choisit.

À revalider dans Play Console contre le binaire final et la connexion Google autonome.

## Avant publication

1. Build Android vert.
2. Domaine stable pour MISE !.
3. Connexion Google autonome.
4. Clé d’upload Play durable.
5. Signature AAB release.
6. Tests appareil réel : caméra, QR, photos, import, hors-ligne, sauvegarde/restauration.
7. Politique de confidentialité publique.
8. Fiche Store + captures écran.
9. Test fermé avant production.

## Google OAuth autonome

MISE ! possède maintenant son propre flux Google Identity Services et conserve la compatibilité avec une session ART lorsqu’elle est disponible.

Avant le premier test public de la connexion Google, ajouter dans le client OAuth Web utilisé par ART/MISE les origines JavaScript autorisées correspondant aux surfaces réellement publiées :

- l’origine GitHub Pages actuelle de MISE ! pendant la bêta ;
- le futur domaine stable MISE ! lorsqu’il est activé.

Ne pas créer de Client Secret dans le navigateur. Le Client ID Web peut être public ; les jetons restent des jetons utilisateur de courte durée en session.
