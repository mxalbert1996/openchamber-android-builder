import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import { patchStore } from './patch-updates.mjs';
import { resolve, stableVersion } from './upstream.mjs';

const commit = 'a'.repeat(40);
const stable = { tag_name: 'v2.7.0', draft: false, prerelease: false };
const assets = ['OpenChamber-2.7.0-android.apk', 'build-info.json', 'SHA256SUMS', 'provenance.sigstore.json'];

function mockApi({ existing = null, annotated = false, packageVersion = '2.7.0' } = {}) {
  return async (path, allowMissing) => {
    if (path.endsWith('/releases/latest')) return stable;
    if (path.includes('/releases/tags/')) {
      assert.equal(allowMissing, true);
      return existing;
    }
    if (path.includes('/git/ref/')) return { object: { type: annotated ? 'tag' : 'commit', sha: commit } };
    if (path.includes('/git/tags/')) return { object: { type: 'commit', sha: commit } };
    if (path.includes('/contents/package.json')) {
      assert.ok(path.endsWith(`?ref=${commit}`));
      return { content: Buffer.from(JSON.stringify({ version: packageVersion, packageManager: 'bun@1.4.4' })).toString('base64') };
    }
    throw new Error(`Unexpected API path: ${path}`);
  };
}

test('accepts a published stable release', () => {
  assert.equal(stableVersion(stable), '2.7.0');
});

for (const release of [
  { ...stable, draft: true },
  { ...stable, prerelease: true },
  { ...stable, tag_name: 'canary' },
  { ...stable, tag_name: 'v2.7.0-canary.1' },
  { ...stable, tag_name: 'v02.7.0' },
  { ...stable, tag_name: 'v2.7.0\nINJECT=true' },
]) {
  test(`rejects non-stable or unsafe release ${JSON.stringify(release)}`, () => {
    assert.throws(() => stableVersion(release));
  });
}

test('resolves a new stable to immutable source and its Bun version', async () => {
  const result = await resolve(mockApi(), 'owner/builder');
  assert.equal(result.build, true);
  assert.equal(result.commit, commit);
  assert.equal(result.bun, '1.4.4');
  assert.equal(result.tag, 'v2.7.0');
  assert.ok(result.version_code > 0);
});

test('resolves annotated tags', async () => {
  assert.equal((await resolve(mockApi({ annotated: true }), 'owner/builder')).commit, commit);
});

test('skips a fully published release', async () => {
  const existing = { draft: false, assets: assets.map((name) => ({ name })) };
  assert.deepEqual(await resolve(mockApi({ existing }), 'owner/builder'), { build: false });
});

test('retries an interrupted draft', async () => {
  const result = await resolve(mockApi({ existing: { draft: true, assets: [] } }), 'owner/builder');
  assert.equal(result.build, true);
});

test('refuses to overwrite a published release missing provenance', async () => {
  const existing = { draft: false, assets: [{ name: assets[0] }] };
  await assert.rejects(resolve(mockApi({ existing }), 'owner/builder'), /incomplete/);
});

test('does not build a mismatched upstream package version', async () => {
  await assert.rejects(resolve(mockApi({ packageVersion: '2.6.0' }), 'owner/builder'), /inconsistent/);
});

test('API failures remain failures, not no-update results', async () => {
  await assert.rejects(resolve(async () => { throw new Error('HTTP 403'); }, 'owner/builder'), /403/);
});

test('replaces only the mobile app check, not the connected server check', () => {
  const source = [
    "const server = await runtimeFetch('/api/openchamber/update-check');",
    "info = await checkForWebUpdates('web');",
    "info = await checkForWebUpdates('mobile', appVersion);",
  ].join('\n');
  const patched = patchStore(source);
  assert.ok(patched.includes('info = await checkForBuilderUpdates(appVersion);'));
  assert.ok(patched.includes("info = await checkForWebUpdates('web');"));
  assert.ok(patched.includes("const server = await runtimeFetch('/api/openchamber/update-check');"));
  assert.throws(() => patchStore(patched), /hook changed/);
  assert.throws(() => patchStore('upstream changed'), /hook changed/);
  assert.throws(() => patchStore(`${source}\n${source}`), /hook changed/);
});

test('the injected updater is valid TypeScript with no upstream fallback', async () => {
  const template = await readFile(new URL('./androidBuilderUpdates.ts.in', import.meta.url), 'utf8');
  const code = stripTypeScriptTypes(template.replaceAll('__BUILDER_REPOSITORY__', 'owner/builder'));
  assert.ok(code.includes('https://api.github.com/repos/${repository}/releases/latest'));
  assert.ok(!code.includes('runtimeFetch'));
  assert.ok(!code.includes('openchamber/openchamber'));
  assert.ok(code.includes('nextSuggestedCheckInSec: 3600'));
});
