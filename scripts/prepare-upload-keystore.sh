#!/usr/bin/env bash
# Génère une clé d'upload MISES! HORS du dépôt Git.
# NE PAS exécuter si le certificat 91:1F:5B:04… a déjà été enregistré sur Play pour fr.acousmatictheatre.mises —
# dans ce cas, restaurer le .jks d'origine.
set -euo pipefail
OUT_DIR="${MISE_UPLOAD_OUT_DIR:-$HOME/Projects/MISE_PRIVATE_DATA/play-upload}"
mkdir -p "$OUT_DIR"
STORE="$OUT_DIR/mises-upload.jks"
CERT="$OUT_DIR/mises-upload-cert.pem"
if [[ -f "$STORE" ]]; then
  echo "Keystore déjà présent: $STORE"
  exit 0
fi
if [[ "${MISE_CONFIRM_NEW_UPLOAD_KEY:-}" != "yes" ]]; then
  echo "Refus: définis MISE_CONFIRM_NEW_UPLOAD_KEY=yes seulement si aucune fiche Play n'utilise déjà le certificat existant."
  echo "Certificat public connu (beta.3): SHA-256 91:1F:5B:04:6A:51:1E:9A:F1:07:7C:E0:45:21:9D:54:FE:C1:AD:FF:A5:84:B1:5C:4C:FD:17:66:5A:E5:D6:CB"
  exit 1
fi
PASS="${MISE_UPLOAD_STORE_PASSWORD:?définis MISE_UPLOAD_STORE_PASSWORD}"
ALIAS="${MISE_UPLOAD_KEY_ALIAS:-mises-upload}"
KEYPASS="${MISE_UPLOAD_KEY_PASSWORD:-$PASS}"
keytool -genkeypair -v -keystore "$STORE" -storetype JKS -alias "$ALIAS" \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -storepass "$PASS" -keypass "$KEYPASS" \
  -dname "CN=Cedric Carboni, O=Acousmatic Theatre, C=FR"
keytool -exportcert -rfc -keystore "$STORE" -alias "$ALIAS" -storepass "$PASS" -file "$CERT"
echo "Créé: $STORE"
echo "Cert: $CERT"
echo "Exporte ensuite:"
echo "  export MISE_UPLOAD_STORE_FILE=$STORE"
echo "  export MISE_UPLOAD_STORE_PASSWORD=…"
echo "  export MISE_UPLOAD_KEY_ALIAS=$ALIAS"
echo "  export MISE_UPLOAD_KEY_PASSWORD=…"
