/**
 * Downloads the filter lists into lists/ and converts them into the files the
 * extension loads:
 *   rules/<id>.json            declarativeNetRequest rules
 *   rules/<id>.allow-ids.json  ids of the allow rules, so the popup counts only blocks
 *   cosmetic/<id>.css          generic element hiding, injected into every page
 *   cosmetic/<id>.json         site element hiding, read by the background
 *
 * `node scripts/lists.mjs --download` downloads fresh copies.
 * The build downloads a list only when lists/ does not have it yet.
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { LISTS } from '../src/lib/lists.js';
import { convertList } from '../src/lib/convert.js';
import { genericExcludedHosts, cssFor } from '../src/lib/cosmetic.js';

// Chrome guarantees every extension this many enabled static rules.
const GUARANTEED_STATIC_RULES = 30_000;

const exists = (path) => access(path).then(() => true, () => false);

async function download(list) {
  const response = await fetch(list.url);
  if (!response.ok) throw new Error(`Downloading ${list.source} from ${list.url} failed: HTTP ${response.status}`);
  await writeFile(`lists/${list.id}.txt`, await response.text());
  console.log(`downloaded lists/${list.id}.txt`);
}

export async function downloadLists({ force = false } = {}) {
  await mkdir('lists', { recursive: true });
  for (const list of LISTS) {
    if (force || !(await exists(`lists/${list.id}.txt`))) await download(list);
  }
}

export async function buildLists(outDir) {
  await downloadLists();
  await mkdir(`${outDir}/rules`, { recursive: true });
  await mkdir(`${outDir}/cosmetic`, { recursive: true });

  let total = 0;
  for (const list of LISTS) {
    const { rules, cosmetic, stats } = convertList(await readFile(`lists/${list.id}.txt`, 'utf8'));
    const allowIds = rules.filter((r) => r.action.type !== 'block').map((r) => r.id);
    const db = { ...cosmetic, genericExcluded: genericExcludedHosts(cosmetic) };

    await writeFile(`${outDir}/rules/${list.id}.json`, JSON.stringify(rules));
    await writeFile(`${outDir}/rules/${list.id}.allow-ids.json`, JSON.stringify(allowIds));
    await writeFile(`${outDir}/cosmetic/${list.id}.css`, cssFor(cosmetic.generic));
    await writeFile(`${outDir}/cosmetic/${list.id}.json`, JSON.stringify(db));

    total += rules.length;
    console.log(
      `${list.source}: ${stats.networkFilters} network filters → ${rules.length} rules, ` +
        `${cosmetic.generic.length} generic and ${Object.keys(cosmetic.specific).length} site cosmetic entries`,
    );
  }
  if (total > GUARANTEED_STATIC_RULES) {
    throw new Error(`${total} rules is more than the ${GUARANTEED_STATIC_RULES} Chrome guarantees. Drop a list.`);
  }
  console.log(`${total} rules in total`);
}

if (process.argv.includes('--download')) await downloadLists({ force: true });
