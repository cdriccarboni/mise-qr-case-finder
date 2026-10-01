# MISES ! Google Play Internal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permettre à MISES ! 0.4.0-beta.3 de produire un AAB signé et, sur demande explicite, de l'envoyer vers Google Play Internal Testing.

**Architecture:** Conserver le workflow Android existant et sa vérification de clé d'upload. Ajouter des entrées workflow_dispatch, un secret de compte de service Android Publisher, un garde-fou qui bloque la publication si signature ou authentification manquent, puis publier l'AAB via Android Publisher API.

**Tech Stack:** GitHub Actions, Gradle/Android SDK 36, Python google-api-python-client/google-auth.

**Spec:** Demande utilisateur du 2026-10-01 — MISES ! prioritaire, testable immédiatement et préparée pour Google Play.

## Global Constraints

- Nom produit : **MISES !**
- Package : `fr.acousmatictheatre.mises`
- Version actuelle : `0.4.0-beta.3`, versionCode `15`
- Aucune clé ni JSON de service account ne doit être commis.
- Un push normal ne doit jamais publier sur Google Play.
- La publication n'est permise qu'avec `workflow_dispatch.publish_to_play=true`.

## Review Focus

- Secrets de signature absents : APK debug doit rester constructible, publication Play bloquée.
- Service account absent : publication Play bloquée avant tout appel API.
- Mauvaise clé d'upload : empreinte SHA-256 doit faire échouer le build release.
- Fiche Play absente pour le package : l'API doit échouer clairement sans masquer l'erreur.
- Track choisi : seuls internal, alpha et beta sont permis.

### Task 1: Étendre le workflow Android

**Files:**
- Modify: `.github/workflows/android.yml`

**Interfaces:**
- Consumes: secrets `MISE_UPLOAD_KEYSTORE_B64`, `MISE_UPLOAD_STORE_PASSWORD`, `MISE_UPLOAD_KEY_ALIAS`, `MISE_UPLOAD_KEY_PASSWORD`, `PLAY_SERVICE_ACCOUNT_JSON`
- Produces: AAB signé + publication optionnelle sur le track demandé.

- [ ] Ajouter `workflow_dispatch` avec `publish_to_play` et `track`.
- [ ] Ajouter le garde-fou signature + service account.
- [ ] Ajouter l'upload Android Publisher API v3.
- [ ] Conserver la publication de l'APK TEST sur GitHub.
- [ ] Vérifier le YAML par relecture et lancer la CI de la PR.

### Task 2: Vérifier la livraison

- [ ] Confirmer le workflow de PR vert.
- [ ] Vérifier qu'un build sans secrets ne prétend pas avoir publié.
- [ ] Après création de la fiche Play et configuration des secrets, lancer manuellement Internal Testing.
