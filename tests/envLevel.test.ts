import { describe, expect, it } from 'vitest';
import { envLevelLabel } from '../src/screens/format';

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
