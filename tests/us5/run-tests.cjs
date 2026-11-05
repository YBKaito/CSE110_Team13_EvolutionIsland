/**
 * Compiles the evolution choice files into a temporary CommonJS folder,
 * and TypeScript test files into a temporary folder, then runs them with Node's built-in test runner.
 * Nothing in src/ is changed, and we don't need the mock game files.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
/**
 * TypeScript 7 no longer provides the old JavaScript compiler API.
 * Use its CLI for the game, and the TypeScript 6 compatibility API here.
 * The fallback lets this test runner work on older TypeScript projects too.
 */
function loadCompilerApi() {
  const ts = require('typescript');
  if (typeof ts.transpileModule === 'function' && ts.ScriptTarget?.ES2022 !== undefined) {
    return ts;
  }
  try {
    const compatible = require('@typescript/typescript6');
    if (typeof compatible.transpileModule === 'function') return compatible;
  } catch (error) {
    throw new Error(
      'TypeScript 7 needs @typescript/typescript6 to run these tests. ' +
      'Run: npm install -D typescript@latest @typescript/typescript6 @types/node@22',
      { cause: error }
    );
  }
  throw new Error('Could not load a TypeScript compiler API. Install @typescript/typescript6.');
}
const ts = loadCompilerApi();

const root = path.resolve(__dirname, '../..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'evolution-choice-ts-tests-'));
const productionFiles = [
  'src/constants.ts',
  'src/traits.ts',
  'src/stats.ts',
  'src/types.ts',
  'src/screens/ScreenController.ts',
  'src/screens/EvolutionScreen/hints.ts',
  ...[
    'EvolutionScreenController', 'EvolutionScreenModel', 'EvolutionScreenTypes',
    'EvolutionScreenView', 'SimulationCoordinator', 'loadPixelifySans'
  ].map(name => `src/screens/EvolutionScreen/${name}.ts`)
];

const testFiles = fs.readdirSync(__dirname)
  .filter(name => name.endsWith('.test.ts'))
  .map(name => `tests/us5/${name}`);
const files = [...productionFiles, 'tests/us5/helpers.ts', ...testFiles];

let status = 1;
try {
  fs.writeFileSync(path.join(output, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  for (const relative of files) {
    const input = path.join(root, relative);
    if (!fs.existsSync(input)) {
      throw new Error(`Missing ${relative}. Run this from the root of your game repository.`);
    }
    const source = fs.readFileSync(input, 'utf8');
    const result = ts.transpileModule(source, {
      fileName: relative,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        isolatedModules: true,
      },
      reportDiagnostics: true,
    });
    const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
    if (errors.length) {
      throw new Error(`${relative}: ${ts.formatDiagnosticsWithColorAndContext(errors, {
        getCurrentDirectory: () => root,
        getCanonicalFileName: p => p,
        getNewLine: () => '\n'
      })}`);
    }
    const destination = path.join(output, relative.replace(/\.ts$/, '.js'));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, result.outputText);
  }

  const executableTests = testFiles.map(name => path.join(output, name.replace(/\.ts$/, '.js')));
  if (!executableTests.length) throw new Error('No tests found.');
  const child = spawnSync(process.execPath, [
    '--test', '--test-reporter=spec', ...executableTests
  ], {
    encoding: 'utf8',
    env: { ...process.env, US5_COMPILED_ROOT: output },
  });
  const outputText = `${child.stdout || ''}${child.stderr || ''}`;
  process.stdout.write(outputText);
  const logDir = path.join(root, 'test-results');
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, 'evolution-choice-tests.txt'), outputText);

  /* GitHub displays this table at the top of each workflow run. */
  if (process.env.GITHUB_STEP_SUMMARY) {
    const count = (label) => outputText.match(new RegExp(`\\b${label}\\s+(\\d+)`))?.[1] || '?';
    const summary = [
      '## Evolution Choice automated tests',
      '',
      '| Total | Passed | Failed |',
      '| ---: | ---: | ---: |',
      `| ${count('tests')} | ${count('pass')} | ${count('fail')} |`,
      '',
      'The full list of tests is in the **Run evolution choice tests** step and the test log artifact.',
      '',
    ].join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
  }
  status = child.status ?? 1;
  if (child.error) throw child.error;
} catch (error) {
  console.error(error);
} finally {
  fs.rmSync(output, { force: true, recursive: true });
}
process.exitCode = status;
