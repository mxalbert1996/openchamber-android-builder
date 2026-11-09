import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const upstream = 'openchamber/openchamber';

export function stableVersion(release) {
  const match = /^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/.exec(release.tag_name);
  if (release.draft || release.prerelease || !match) throw new Error('Not a published stable vX.Y.Z release');
  return match[1];
}

export async function api(path, allowMissing = false) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (allowMissing && response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub ${path}: HTTP ${response.status}`);
  return response.json();
}

export async function resolve(request = api, repository = process.env.GITHUB_REPOSITORY) {
  const release = await request(`/repos/${upstream}/releases/latest`);
  const version = stableVersion(release);
  const tag = release.tag_name;
  const existing = await request(`/repos/${repository}/releases/tags/${tag}`, true);
  if (existing && !existing.draft) {
    const required = [`OpenChamber-${version}-android.apk`, 'build-info.json', 'SHA256SUMS', 'provenance.sigstore.json'];
    if (existing.prerelease || required.some((name) => !existing.assets?.some((asset) => asset.name === name))) {
      throw new Error('Existing release is incomplete; refusing to overwrite a published release');
    }
    return { build: false };
  }

  let object = (await request(`/repos/${upstream}/git/ref/tags/${tag}`)).object;
  for (let depth = 0; object.type === 'tag' && depth < 5; depth += 1) {
    object = (await request(`/repos/${upstream}/git/tags/${object.sha}`)).object;
  }
  if (object.type !== 'commit' || !/^[a-f0-9]{40}$/.test(object.sha)) throw new Error('Invalid upstream commit');
  const file = await request(`/repos/${upstream}/contents/package.json?ref=${object.sha}`);
  const pkg = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
  const bun = /^bun@(\d+\.\d+\.\d+)$/.exec(pkg.packageManager);
  if (pkg.version !== version || !bun) throw new Error('Upstream package version or Bun pin is inconsistent');
  return { build: true, tag, version, commit: object.sha, bun: bun[1], version_code: Math.floor(Date.now() / 60_000) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const values = await resolve();
  await appendFile(process.env.GITHUB_OUTPUT, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''));
  console.log(values.build ? `Build ${values.tag} from ${values.commit}` : 'Latest stable already published');
}
