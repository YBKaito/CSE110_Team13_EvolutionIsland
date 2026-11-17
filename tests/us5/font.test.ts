
import test from 'node:test';
import assert from 'node:assert/strict';

const testGlobal: any = globalThis;

function freshFontModule() {
  const file = require.resolve(
    process.env.US5_COMPILED_ROOT +
    '/src/screens/EvolutionScreen/loadGameFont.js'
  );

  delete require.cache[file];
  return require(file);
}

test('loadGameFont resolves without a browser document', async () => {
  const old = testGlobal.document;

  try {
    delete testGlobal.document;

    const { loadGameFont } = freshFontModule();
    await assert.doesNotReject(loadGameFont());
  } finally {
    testGlobal.document = old;
  }
});

test('loadGameFont loads the VT323 font', async () => {
  const old = testGlobal.document;
  const requests: string[] = [];

  testGlobal.document = {
    fonts: {
      load: async (font: string) => {
        requests.push(font);
        return [];
      }
    }
  };

  try {
    const { loadGameFont } = freshFontModule();

    await assert.doesNotReject(loadGameFont());

    assert.deepEqual(requests, ['24px "VT323"']);
  } finally {
    testGlobal.document = old;
  }
});

test('loadGameFont resolves even if loading fails', async () => {
  const old = testGlobal.document;

  testGlobal.document = {
    fonts: {
      load: async () => {
        throw new Error('Font failed to load');
      }
    }
  };

  try {
    const { loadGameFont } = freshFontModule();

    await assert.doesNotReject(loadGameFont());
  } finally {
    testGlobal.document = old;
  }
});
