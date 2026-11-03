import test from 'node:test';
import assert from 'node:assert/strict';
import { game } from './helpers';
const testGlobal: any = globalThis;

function freshFontModule() {
  const file = require.resolve(process.env.US5_COMPILED_ROOT + '/src/screens/EvolutionScreen/loadPixelifySans.js');
  delete require.cache[file];
  return require(file);
}

test('loadPixelifySans resolves safely without browser document', async () => {
  const old = testGlobal.document;
  try {
    delete testGlobal.document;
    await assert.doesNotReject(freshFontModule().loadPixelifySans());
  } finally { testGlobal.document = old; }
});

test('loadPixelifySans adds a stylesheet once and shares the same pending Promise', async () => {
  const old = testGlobal.document;
  let requests = 0;
  const links: any[] = [];
  testGlobal.document = {
    getElementById: () => links[0] || null,
    createElement: () => ({ id: '', rel: '', href: '' }),
    head: { appendChild(link: any) { links.push(link); queueMicrotask(() => link.onload()); } },
    fonts: { load: async () => { requests++; }, ready: Promise.resolve() }
  };
  try {
    const { loadPixelifySans } = freshFontModule();
    const first = loadPixelifySans();
    assert.equal(loadPixelifySans(), first);
    await first;
    assert.equal(links.length, 1);
    assert.equal(links[0].id, 'us5-pixelify-font');
    assert.match(links[0].href, /Pixelify/);
    assert.equal(requests, 1);
  } finally { testGlobal.document = old; }
});

test('loadPixelifySans still resolves if the font stylesheet fails', async () => {
  const old = testGlobal.document;
  testGlobal.document = {
    getElementById: () => null,
    createElement: () => ({}),
    head: { appendChild(link: any) { queueMicrotask(() => link.onerror()); } },
    fonts: { load: async () => [], ready: Promise.resolve() }
  };
  try { await assert.doesNotReject(freshFontModule().loadPixelifySans()); }
  finally { testGlobal.document = old; }
});

test('loadPixelifySans handles an existing stylesheet without duplicating it', async () => {
  const old = testGlobal.document;
  let appended = 0;
  let loaded = 0;
  testGlobal.document = {
    getElementById: () => ({ id: 'us5-pixelify-font' }),
    createElement() { throw new Error('Should not create a duplicate'); },
    head: { appendChild() { appended++; } },
    fonts: { ready: Promise.resolve(), load: async () => { loaded++; } }
  };
  try {
    await assert.doesNotReject(freshFontModule().loadPixelifySans());
    assert.equal(appended, 0);
    assert.equal(loaded, 1);
  } finally { testGlobal.document = old; }
});
