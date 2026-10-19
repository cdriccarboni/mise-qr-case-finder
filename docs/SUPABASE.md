# Supabase MISES! — schéma et application des migrations

**Règle absolue : le repo est public. Aucune donnée d'inventaire réelle, aucune clé `service_role` dans Git.**
La clé publishable (anon) côté front est publique par nature ; la sécurité repose sur RLS.

## Fichiers
- `supabase/migrations/20261019000001_mises_core.sql` : tables `mises_spaces`, `mises_memberships`, `mises_records`, `mises_assets`, helpers `mises_is_space_member/owner`, RLS, bucket privé `mises-photos` + policies Storage par appartenance à l'espace (1er segment du chemin = `space_id`).
- `supabase/migrations/20261019000002_mises_container_shares.sql` : table `mises_container_shares` (token aléatoire 192 bits, `revoked_at`, `expires_at`, `created_by`, compteur d'accès) et RPC `get_shared_container(token)` (security definer, lecture seule : le contenant, ses descendants, leurs objets ; photos seulement si `include_photos`).
- `supabase/rls-owner-private.sql` : ancien script, conservé (il contient des `drop policy`, ne plus l'utiliser).

Toutes les migrations sont idempotentes (`if not exists`, policies créées seulement si absentes) et ne contiennent aucun `DROP TABLE`, `DELETE` ni `TRUNCATE`.

## Appliquer (NON fait automatiquement)
1. Sauvegarder : Dashboard → Database → Backups, ou `supabase db dump --data-only > backup.sql` (fichier hors repo).
2. Vérifier l'état réel : `select tablename, policyname from pg_policies where schemaname in ('public','storage');`
3. Appliquer, au choix :
   - CLI : `supabase link --project-ref <ref>` puis `supabase db push` (projet de préprod d'abord) ;
   - Dashboard → SQL editor : coller chaque fichier dans l'ordre.
4. Contrôles :
   - `select public from storage.buckets where id='mises-photos'` → `false` ;
   - en anon : `select * from mises_records` → 0 ligne ; `select get_shared_container('x')` → `null` ;
   - créer un partage, appeler la RPC, puis `update mises_container_shares set revoked_at=now()` → `null`.

Si une policy existante a un autre nom/contenu, la migration ne la modifie pas : comparer manuellement.

## Côté app
- Auth : lien magique email (`signInWithOtp`, `src/supabase-client.js`).
- Sync : `src/sync-core.js` — contrôle de révision, conflits journalisés dans `settings/sync-conflicts`.
- Photos : `photos[]` par objet, upload dans `mises-photos/<space>/<store>/<record>/<photoId>.jpg`, lecture par URL signée.
