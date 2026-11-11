# OpenChamber Android Builder

非官方 OpenChamber Android stable APK。

Unofficial OpenChamber Android stable APKs.

Builds run daily at 02:00 UTC (11:00 JST) and whenever a new upstream stable release appears.

## 修改与风险 / Changes and risks

- **修改更新源**：构建时将 Android 应用更新检查改为本仓库的 `https://api.github.com/repos/OWNER/REPO/releases/latest`，不再获取上游 canary。
- **私有发布密钥**：APK 使用本仓库的私有发布密钥签名，证书 SHA-256 见 `build-info.json` 的 `signing_key_sha256`。与官方 APK 签名不同，无法直接覆盖安装；旧版公开 testkey 构建也需先卸载。
- **风险自担**：非官方构建，包含上述源码修改，不保证安全性或兼容性。上游依据为 `d4a5a0e`，该提交移除了 stable 移动端构建。

- **Modified update URL**: the Android app checks this repository's `https://api.github.com/repos/OWNER/REPO/releases/latest`, not upstream canary.
- **Private release key**: the APK is signed with this repository's private release key; its certificate SHA-256 is recorded in `build-info.json` as `signing_key_sha256`. It differs from the official APK, so an in-place upgrade is impossible, and builds signed with the old public test key must be uninstalled first.
- **Use at your own risk**: unofficial, modified builds without security or compatibility guarantees. Upstream removed stable mobile builds in `d4a5a0e`.

## 签名密钥 / Signing key

The release job reads the keystore from repository secrets. Set them once; the key and its passwords never enter git.

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Base64 of the PKCS#12 keystore, single line |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias inside the keystore |
| `ANDROID_KEY_PASSWORD` | Key password |

```bash
base64 -w0 key.p12 | gh secret set ANDROID_KEYSTORE_BASE64 --repo OWNER/REPO
read -rs KEYSTORE_PASSWORD && printf '%s' "$KEYSTORE_PASSWORD" \
  | gh secret set ANDROID_KEYSTORE_PASSWORD --repo OWNER/REPO
printf '%s' YOUR_ALIAS | gh secret set ANDROID_KEY_ALIAS --repo OWNER/REPO
read -rs KEY_PASSWORD && printf '%s' "$KEY_PASSWORD" \
  | gh secret set ANDROID_KEY_PASSWORD --repo OWNER/REPO
```

`scripts/sign-apk.sh` refuses to publish unless the signed APK's certificate matches the pinned `release_sha256` and is not the public AOSP test key. When rotating the key, update `release_sha256` there.

## 验证 / Verify

将仓库名和版本替换为实际值 / Replace the repository and version:

```bash
gh attestation verify OpenChamber-2.7.0-android.apk \
  --repo OWNER/REPO --signer-workflow OWNER/REPO/.github/workflows/android.yml
gh attestation verify build-info.json --repo OWNER/REPO
sha256sum --check SHA256SUMS
apksigner verify --print-certs OpenChamber-2.7.0-android.apk
```

The certificate SHA-256 printed by `apksigner` must equal `signing_key_sha256` in `build-info.json`.
