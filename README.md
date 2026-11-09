# OpenChamber Android Builder

非官方 OpenChamber Android stable APK。

Unofficial OpenChamber Android stable APKs.

## 修改与风险 / Changes and risks

- **修改更新源**：构建时将 Android 应用更新检查改为本仓库的 `https://api.github.com/repos/OWNER/REPO/releases/latest`，不再获取上游 canary。
- **公开测试签名**：使用 AOSP 公开 `testkey`，任何人都能用同一密钥签名。请用 attestation 验证来源，不要信任 APK 签名本身。与官方不同签名的 APK 无法直接覆盖安装。
- **风险自担**：非官方构建，包含上述源码修改，不保证安全性或兼容性。上游依据为 `d4a5a0e`，该提交移除了 stable 移动端构建。

- **Modified update URL**: the Android app checks this repository's `https://api.github.com/repos/OWNER/REPO/releases/latest`, not upstream canary.
- **Public test signature**: uses the public AOSP `testkey`; anyone can sign with it. Verify provenance using attestations, not the APK signature. An official APK with a different signature cannot be upgraded in place.
- **Use at your own risk**: unofficial, modified builds without security or compatibility guarantees. Upstream removed stable mobile builds in `d4a5a0e`.

## 验证 / Verify

将仓库名和版本替换为实际值 / Replace the repository and version:

```bash
gh attestation verify OpenChamber-2.7.0-android.apk \
  --repo OWNER/REPO --signer-workflow OWNER/REPO/.github/workflows/android.yml
gh attestation verify build-info.json --repo OWNER/REPO
sha256sum --check SHA256SUMS
```
