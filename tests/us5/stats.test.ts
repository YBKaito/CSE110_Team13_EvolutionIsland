import test from 'node:test';
import assert from 'node:assert/strict';
import { game, environment, counts } from './helpers';
const {
  clampIndex, environmentDelta, signed, netDelta, validateTraitCounts,
  copyEnvironment, copyTraitCounts, validateEnvironmentState,
  NUMERIC_ENV_KEYS, ENV_LABELS
} = game('stats.js');

test('environment stats expose all nine numbered measurements', () => {
  assert.equal(NUMERIC_ENV_KEYS.length, 9);
  assert.equal(new Set(NUMERIC_ENV_KEYS).size, 9);
  for (const key of NUMERIC_ENV_KEYS) assert.ok(ENV_LABELS[key]);
  assert.equal(NUMERIC_ENV_KEYS.includes('habitatBackground'), false);
});

test('clampIndex rounds numbers and keeps them in the 0–100 range', () => {
  assert.equal(clampIndex(-15), 0);
  assert.equal(clampIndex(110), 100);
  assert.equal(clampIndex(0), 0);
  assert.equal(clampIndex(100), 100);
  assert.equal(clampIndex(42.6), 43);
  assert.equal(clampIndex(42.4), 42);
});

test('environmentDelta returns points, percentage, and handles a zero baseline', () => {
  assert.deepEqual(environmentDelta(60, 40), { points: 20, relativePercent: 50 });
  assert.deepEqual(environmentDelta(30, 60), { points: -30, relativePercent: -50 });
  assert.deepEqual(environmentDelta(5, 0), { points: 5, relativePercent: null });
  assert.deepEqual(environmentDelta(0, 0), { points: 0, relativePercent: null });
});

test('signed formats positive, negative, zero, and decimal changes', () => {
  assert.equal(signed(15), '+15');
  assert.equal(signed(-5), '-5');
  assert.equal(signed(0), '0');
  assert.equal(signed(12.345, 2), '+12.35');
});

test('netDelta uses the agreed net change fields', () => {
  const base = { newPopulation: 12, eventList: [] };
  assert.equal(netDelta({ ...base, populationIncrease: 5, populationDecline: 0 }), 5);
  assert.equal(netDelta({ ...base, populationIncrease: 0, populationDecline: 7 }), -7);
  assert.equal(netDelta({ ...base, populationIncrease: 0, populationDecline: 0 }), 0);
});

test('validateTraitCounts accepts consistent counts including an empty flock', () => {
  assert.doesNotThrow(() => validateTraitCounts(counts(12), 12));
  assert.doesNotThrow(() => validateTraitCounts(counts(0), 0));
});

test('validateTraitCounts rejects mismatched, fractional, and negative counts', () => {
  const mismatch = counts(12);
  mismatch.beakLength.medium = 11;
  assert.throws(() => validateTraitCounts(mismatch, 12), /trait counts/);
  const fraction = counts(12);
  fraction.bodySize.medium = 11.5;
  fraction.bodySize.small = 0.5;
  assert.throws(() => validateTraitCounts(fraction, 12), /nonnegative integers/);
  const negative = counts(12);
  negative.color.gray = -1;
  negative.color.brown = 13;
  assert.throws(() => validateTraitCounts(negative, 12));
});

test('copyEnvironment makes a new object and new RGB array', () => {
  const original = environment({ rainfall: 8 });
  const copy = copyEnvironment(original);
  assert.deepEqual(copy, original);
  assert.notEqual(copy, original);
  assert.notEqual(copy.habitatBackground, original.habitatBackground);
  copy.habitatBackground[0] = 44;
  copy.rainfall = 20;
  assert.equal(original.habitatBackground[0], 182);
  assert.equal(original.rainfall, 8);
});

test('copyTraitCounts makes separate nested objects', () => {
  const original = counts(12);
  const copy = copyTraitCounts(original);
  assert.deepEqual(copy, original);
  for (const key of Object.keys(original)) assert.notEqual(copy[key], original[key]);
  copy.beakLength.medium = 3;
  assert.equal(original.beakLength.medium, 12);
});

test('validateEnvironmentState accepts the 0–100 environment and RGB 0–255', () => {
  assert.doesNotThrow(() => validateEnvironmentState(environment()));
  assert.doesNotThrow(() => validateEnvironmentState(environment({ rainfall: 100, habitatBackground: [0, 255, 15] })));
});

test('validateEnvironmentState rejects invalid indices and RGB values', () => {
  for (const key of NUMERIC_ENV_KEYS) {
    for (const value of [-1, 101, 2.3, NaN]) {
      assert.throws(() => validateEnvironmentState(environment({ [key]: value })), new RegExp(key));
    }
  }
  for (const rgb of [[255, 255], [-1, 0, 0], [1, 2, 256], [1.5, 2, 3], [1, 2, NaN]]) {
    assert.throws(() => validateEnvironmentState(environment({ habitatBackground: rgb })), /RGB/);
  }
});
