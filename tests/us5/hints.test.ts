const { TRAITS, traitKeys } = game('traits');
const { hintText } = game('screens/EvolutionScreen/hints');

describe('hints', () => {
  const fallback = hintText('beakLength', '__no_such_option__');

  it('has a specific hint for every option of every trait', () => {
    for (const key of traitKeys) {
      for (const option of TRAITS[key].options) {
        expect(hintText(key, option.id), `${key}/${option.id}`).not.toBe(fallback);
      }
    }
  });

  it('gives each option in a trait a different hint', () => {
    for (const key of traitKeys) {
      const texts = TRAITS[key].options.map((o: any) => hintText(key, o.id));
      expect(new Set(texts).size).toBe(texts.length);
    }
  });

  it('keeps hints short enough for the 3-line hint box', () => {
    for (const key of traitKeys) {
      for (const option of TRAITS[key].options) {
        expect(hintText(key, option.id).length, `${key}/${option.id}`).toBeLessThanOrEqual(130);
      }
    }
  });

  it('falls back to a generic hint for unknown ids instead of throwing', () => {
    expect(hintText('beakLength', '__no_such_option__')).toBeTruthy();
    expect(hintText('__no_such_trait__' as any, 'short')).toBeTruthy();
  });
});
