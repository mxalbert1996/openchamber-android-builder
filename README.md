# openchamber-android-builder

非官方 OpenChamber Android stable APK。每小时检查上游最新正式版，只构建 Android，并自动发布带 GitHub Artifact Attestation 的 Release。可手动运行，也接受 `upstream-release` 类型的 `repository_dispatch`。

Unofficial OpenChamber Android stable APKs. Checks upstream hourly, builds Android only, and publishes GitHub Releases with artifact attestations. Manual runs and `upstream-release` repository dispatches are also supported.

## 使用 / Setup

将本项目推送到公开 GitHub 仓库的 `main` 分支，启用 Actions，运行 **Android stable**。无需配置 Secrets。GitHub Actions 不能直接订阅其他仓库的 Release，因此默认定时检查；接入外部事件转发后可移除 cron。长期无仓库活动时，GitHub 可能暂停定时任务。

Push to `main` in a public GitHub repository, enable Actions, and run **Android stable**. No secrets required. Actions cannot directly subscribe to another repository's releases, so polling is the default. Remove cron if you connect an external event relay. GitHub may pause schedules in inactive repositories.

## 修改与风险 / Changes and risks

- **修改更新源**：构建时将 Android 应用更新检查改为本仓库的 `https://api.github.com/repos/OWNER/REPO/releases/latest`，不再获取上游 canary。服务器自身的更新检查不变。
- **公开测试签名**：使用 AOSP 公开 `testkey`，任何人都能用同一密钥签名。请用 attestation 验证来源，不要信任 APK 签名本身。与官方不同签名的 APK 无法直接覆盖安装。
- **风险自担**：非官方构建，包含上述源码修改，不保证安全性或兼容性。上游依据为 `d4a5a0e`，该提交移除了 stable 移动端构建。

- **Modified update URL**: the Android app checks this repository's `https://api.github.com/repos/OWNER/REPO/releases/latest`, not upstream canary. Connected-server update checks are unchanged.
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

Release 附带 APK、源码与补丁信息、SHA-256 校验及 attestation bundle。应用内更新不会自动校验 attestation，请在安装前自行验证。Attestation 不代表上游背书或代码安全。

Each release includes the APK, source/patch metadata, SHA-256 checksums, and an attestation bundle. In-app updates do not verify attestations automatically; verify before installing. Attestation is not upstream endorsement or a guarantee of code safety.
