#!/usr/bin/env bash
set -euo pipefail
umask 077

tools="${ANDROID_HOME:?}/build-tools/35.0.0"
keystore="${RUNNER_TEMP:?}/release.keystore"
apk="dist/OpenChamber-${VERSION:?}-android.apk"

# Public AOSP testkey and this repository's release key. Update the latter when
# rotating the signing key; it keeps a wrong or missing secret from publishing.
testkey_sha256='a40da80a59d170caa950cf15c18c454d47a39b26989d8b640ecd745ba71bf5dc'
release_sha256='7a6e1b71617c60599d34d4b8784142023e2d1f7710ecb213647f8d2c51295fb2'

: "${ANDROID_KEYSTORE_BASE64:?ANDROID_KEYSTORE_BASE64 secret is missing or empty}"
: "${ANDROID_KEYSTORE_PASSWORD:?ANDROID_KEYSTORE_PASSWORD secret is missing or empty}"
: "${ANDROID_KEY_ALIAS:?ANDROID_KEY_ALIAS secret is missing or empty}"
: "${ANDROID_KEY_PASSWORD:?ANDROID_KEY_PASSWORD secret is missing or empty}"

trap 'rm -f "$keystore"' EXIT
mkdir -p dist

printf '%s' "$ANDROID_KEYSTORE_BASE64" | base64 --decode > "$keystore"
test -s "$keystore"

"$tools/zipalign" -P 16 -f 4 unsigned/app-release-unsigned.apk "$RUNNER_TEMP/aligned.apk"
"$tools/apksigner" sign \
  --ks "$keystore" \
  --ks-type PKCS12 \
  --ks-key-alias "$ANDROID_KEY_ALIAS" \
  --ks-pass env:ANDROID_KEYSTORE_PASSWORD \
  --key-pass env:ANDROID_KEY_PASSWORD \
  --v4-signing-enabled false \
  --out "$apk" "$RUNNER_TEMP/aligned.apk"

"$tools/apksigner" verify --verbose --print-certs "$apk"
"$tools/zipalign" -c -P 16 4 "$apk"

digest=$("$tools/apksigner" verify --print-certs "$apk" \
  | sed -n 's/^Signer #1 certificate SHA-256 digest: //p' | tr 'A-F' 'a-f')
if [ "$digest" = "$testkey_sha256" ]; then
  echo 'Refusing to publish an APK signed with the public AOSP test key' >&2
  exit 1
fi
if [ "$digest" != "$release_sha256" ]; then
  echo "Unexpected signing certificate: ${digest:-<none>}" >&2
  echo 'Update release_sha256 in scripts/sign-apk.sh when rotating the key' >&2
  exit 1
fi
