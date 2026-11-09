import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function patchStore(source) {
  const original = "info = await checkForWebUpdates('mobile', appVersion);";
  if (source.split(original).length !== 2) throw new Error('Upstream Android update hook changed; review patch before building');
  return "import { checkForBuilderUpdates } from './androidBuilderUpdates';\n" +
    source.replace(original, 'info = await checkForBuilderUpdates(appVersion);');
}

export async function patchUpdates(root, repository) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid builder repository');
  const storeDir = path.join(root, 'packages/ui/src/stores');
  const storePath = path.join(storeDir, 'useUpdateStore.ts');
  const patched = patchStore(await readFile(storePath, 'utf8'));
  const template = await readFile(new URL('./androidBuilderUpdates.ts.in', import.meta.url), 'utf8');
  await writeFile(path.join(storeDir, 'androidBuilderUpdates.ts'), template.replaceAll('__BUILDER_REPOSITORY__', repository));
  await writeFile(storePath, patched);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await patchUpdates(process.argv[2], process.argv[3]);
}
