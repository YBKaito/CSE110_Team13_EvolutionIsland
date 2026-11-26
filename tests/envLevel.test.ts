import { describe, expect, it } from 'vitest';
import { changeMarker, envLevelColor, envLevelLabel } from '../src/screens/format';

describe('envLevelLabel (issue #106)', () => {
  it('uses food/rain/cover words', () => {
    expect(envLevelLabel('rainfall', 20)).toBe('Scarce');
    expect(envLevelLabel('softPlants', 40)).toBe('Low');
    expect(envLevelLabel('cover', 50)).toBe('Normal');
    expect(envLevelLabel('insects', 80)).toBe('High');
  });

  it('uses temperature, predator, and competition words', () => {
    expect(envLevelLabel('temperature', 30)).toBe('Very cold');
    expect(envLevelLabel('temperature', 70)).toBe('Hot');
    expect(envLevelLabel('predation', 70)).toBe('High');
    expect(envLevelLabel('competition', 0)).toBe('None');
  });
});

describe('envLevelColor (issue #107)', () => {
  it('food and rain: low is red, plenty is green, normal is white', () => {
    expect(envLevelColor('smallSeeds', 20)).toBe('error');
    expect(envLevelColor('smallSeeds', 40)).toBe('error');
    expect(envLevelColor('smallSeeds', 50)).toBe('normal');
    expect(envLevelColor('smallSeeds', 80)).toBe('success');
  });

  it('predators and competition: more is red, fewer is green', () => {
    expect(envLevelColor('predation', 70)).toBe('error');
    expect(envLevelColor('predation', 50)).toBe('normal');
    expect(envLevelColor('predation', 20)).toBe('success');
    expect(envLevelColor('competition', 0)).toBe('success');
    expect(envLevelColor('competition', 30)).toBe('error');
  });

  it('temperature: too cold or too hot is red', () => {
    expect(envLevelColor('temperature', 30)).toBe('error');
    expect(envLevelColor('temperature', 50)).toBe('normal');
    expect(envLevelColor('temperature', 70)).toBe('error');
  });
});

describe('changeMarker', () => {
  it('shows (+), (-), or nothing after rounding', () => {
    expect(changeMarker(50, 60)).toBe(' (+)');
    expect(changeMarker(50, 40)).toBe(' (-)');
    expect(changeMarker(50, 50.3)).toBe('');
  });
});
