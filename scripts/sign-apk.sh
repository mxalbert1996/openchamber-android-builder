#!/usr/bin/env bash
set -euo pipefail

tools="${ANDROID_HOME:?}/build-tools/35.0.0"
keys="${RUNNER_TEMP:?}/aosp-testkey"
source_url='https://android.googlesource.com/platform/build/+/874fa586c48ae230ebfcff0df1b9c1b004fa8f7c/target/product/security'
mkdir -p "$keys" dist

# Intentionally public AOSP test keys, pinned by commit and file digest.
for name in testkey.pk8 testkey.x509.pem; do
  curl --fail --silent --show-error --location --retry 3 \
    "$source_url/$name?format=TEXT" | base64 --decode > "$keys/$name"
done
(
  cd "$keys"
  sha256sum --check <<'CHECKSUMS'
495675d32e89a149d5abe191f4e9c0e218b9068714e9b53a7c91e164a0741a23  testkey.pk8
a4384ba815b9499a5ce349b4e33c1755278873fe2eac150a068823f526e6dbde  testkey.x509.pem
CHECKSUMS
)

apk="dist/OpenChamber-${VERSION:?}-android.apk"
"$tools/zipalign" -P 16 -f 4 unsigned/app-release-unsigned.apk "$RUNNER_TEMP/aligned.apk"
"$tools/apksigner" sign --key "$keys/testkey.pk8" --cert "$keys/testkey.x509.pem" \
  --v4-signing-enabled false --out "$apk" "$RUNNER_TEMP/aligned.apk"
"$tools/apksigner" verify --verbose --print-certs "$apk"
"$tools/zipalign" -c -P 16 4 "$apk"
