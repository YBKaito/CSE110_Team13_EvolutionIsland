// Run from the repo root: node dev/playability/run.mjs my-run 100 1 random
// Arguments: output label, seed count, first seed, scenario (random/quiet/mockup/winter).
// Output includes every generation, environment, cause, distribution, and choice.
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const [label = 'latest', countText = '100', startText = '1', scenario = 'random'] = process.argv.slice(2);
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { playthrough, summarize, strategies, neutralGrowth } = await server.ssrLoadModule('/dev/playability/playthrough.ts');
  const runs = [];
  for (let seed = Number(startText); seed < Number(startText) + Number(countText); seed++) {
    for (const strategy of strategies) runs.push(await playthrough(seed, strategy, scenario));
  }
  const summary = summarize(runs);
  const directory = 'output/playability';
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/${label}.json.gz`, gzipSync(JSON.stringify({ ...neutralGrowth(), summary, runs })));
  console.log(JSON.stringify({ label, scenario, ...neutralGrowth(), summary }, null, 2));
} finally { await server.close(); }
