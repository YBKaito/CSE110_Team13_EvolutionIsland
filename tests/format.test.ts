import { describe, expect, it } from 'vitest';
import { amountLabel, invalidChoiceMessage, parseChoice, predatorLabel, signed, temperatureLabel } from '../src/screens/format';

describe('parseChoice', () => {
  it('accepts whole numbers in range, with surrounding spaces', () => {
    expect(parseChoice('1', 3)).toBe(1);
    expect(parseChoice(' 3 ', 3)).toBe(3);
  });

  it('rejects anything else', () => {
    for (const input of ['', '0', '4', '-1', '1.5', 'one', '1a', '2 2']) {
      expect(parseChoice(input, 3)).toBeNull();
    }
  });
});

describe('invalidChoiceMessage', () => {
  it('matches the mockup wording', () => {
    expect(invalidChoiceMessage(2)).toBe('Invalid. Type 1 or 2.');
    expect(invalidChoiceMessage(3)).toBe('Invalid. Type 1, 2, or 3.');
    expect(invalidChoiceMessage(4)).toBe('Invalid. Type 1, 2, 3, or 4.');
  });
});

describe('labels', () => {
  it('describes amounts relative to the normal level of 50', () => {
    expect(amountLabel(20)).toBe('Scarce');
    expect(amountLabel(35)).toBe('Low');
    expect(amountLabel(50)).toBe('Normal');
    expect(amountLabel(65)).toBe('High');
  });

  it('describes temperature and predators', () => {
    expect(temperatureLabel(30)).toBe('Very cold');
    expect(temperatureLabel(50)).toBe('Normal');
    expect(temperatureLabel(70)).toBe('Hot');
    expect(predatorLabel(50)).toBe('Moderate');
    expect(predatorLabel(65)).toBe('High');
  });

  it('shows a sign on changes', () => {
    expect(signed(5)).toBe('+5');
    expect(signed(-5)).toBe('-5');
    expect(signed(0)).toBe('0');
  });
});
