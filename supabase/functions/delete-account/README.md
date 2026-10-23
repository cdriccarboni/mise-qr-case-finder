# Fonction `delete-account`

Supprime définitivement un compte MISES! après confirmation. La fonction :

- efface les espaces personnels sans autre membre, leurs fiches/actifs par cascade et toutes les photos du préfixe Storage correspondant ;
- transfère un espace partagé à un `editor`, puis un `member`, puis un `viewer` (à ancienneté égale, le membre le plus ancien est choisi) ;
- retire l'accès de la personne aux espaces partagés qu'elle ne possède pas ;
- anonymise les références `updated_by` et `created_by` conservées, efface ses seeds, puis supprime l'utilisateur Auth.

## Déployer après revue

Depuis la racine du dépôt, avec un accès Supabase déjà configuré :

```sh
supabase functions deploy delete-account --project-ref errsklrioqfovhkdiejd
```

Ne pas exécuter cette commande automatiquement. La vérification JWT par défaut (`verify_jwt=true`) convient ; la fonction vérifie aussi explicitement le Bearer JWT avec `auth.getUser()`.

`SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont injectées automatiquement par Supabase : ne pas créer de secret manuel et ne jamais ajouter la clé `service_role` au dépôt.

La migration optionnelle `20261022000001_mises_account_deletion_fk.sql` améliore la robustesse des futures suppressions, mais cette fonction reste nécessaire pour les objets Storage et les règles d'espaces partagés.
