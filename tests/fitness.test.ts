import { describe, expect, it } from 'vitest';
import {
  exposureRisk,
  feedingFitness,
  predationRisk,
  reproductiveFitness,
  riskProfile,
  starvationRisk,
} from '../src/simulation/Fitness';
import { TRAIT_OPTIONS } from '../src/simulation/traitContent';
import type { Traits } from '../src/types';
import { droughtEnv, envWith, MEDIUM_BIRD } from './helpers/fixtures';

const bird = (changes: Partial<Traits>): Traits => ({ ...MEDIUM_BIRD, ...changes });
const [SHORT, , LONG] = [0, 1, 2];
const [THIN, , THICK] = [0, 1, 2];
const [SMALL, , LARGE] = [0, 1, 2];
const [BROWN, , YELLOW, WHITE] = [0, 1, 2, 3];

describe('feeding fitness', () => {
  it('is exactly normal (1.0) for every beak when all food is at baseline, so no beak is always best', () => {
    for (let beak = 0; beak < TRAIT_OPTIONS.beak.length; beak++) {
      expect(feedingFitness(bird({ beak }), envWith())).toBeCloseTo(1, 10);
    }
  });

  it('favors long beaks during a drought (hard seeds remain, rain-fed food dries up)', () => {
    const env = droughtEnv();
    expect(starvationRisk(bird({ beak: LONG }), env)).toBeLessThan(starvationRisk(bird({ beak: SHORT }), env));
  });

  it('favors short beaks when small seeds and insects are plentiful and hard seeds are scarce', () => {
    const env = envWith({ food: { smallSeeds: 130, insects: 130, hardSeeds: 50 } });
    expect(starvationRisk(bird({ beak: SHORT }), env)).toBeLessThan(starvationRisk(bird({ beak: LONG }), env));
  });

  it('makes large birds need more food than small birds', () => {
    const env = envWith();
    expect(feedingFitness(bird({ body: SMALL }), env)).toBeGreaterThan(feedingFitness(bird({ body: LARGE }), env));
  });
});

describe('thermal fitness', () => {
  it('favors thick feathers in the cold', () => {
    const cold = envWith({ temperature: 60 });
    expect(exposureRisk(bird({ feathers: THICK }), cold)).toBeLessThan(exposureRisk(bird({ feathers: THIN }), cold));
  });

  it('favors thin feathers in the heat (thick feathers are not always better)', () => {
    const hot = envWith({ temperature: 140 });
    expect(exposureRisk(bird({ feathers: THIN }), hot)).toBeLessThan(exposureRisk(bird({ feathers: THICK }), hot));
  });
});

describe('predation fitness', () => {
  it('makes brown birds harder to spot than yellow or white ones in a forest', () => {
    const env = envWith({ predation: 140 });
    const brown = predationRisk(bird({ color: BROWN }), env);
    expect(brown).toBeLessThan(predationRisk(bird({ color: YELLOW }), env));
    expect(brown).toBeLessThan(predationRisk(bird({ color: WHITE }), env));
  });

  it('makes large birds easier to catch than small ones', () => {
    const env = envWith({ predation: 140 });
    expect(predationRisk(bird({ body: LARGE }), env)).toBeGreaterThan(predationRisk(bird({ body: SMALL }), env));
  });

  it('is higher when habitat cover is lost', () => {
    expect(predationRisk(MEDIUM_BIRD, envWith({ cover: 40 }))).toBeGreaterThan(predationRisk(MEDIUM_BIRD, envWith({ cover: 100 })));
  });

  it('is zero with no predators', () => {
    expect(predationRisk(MEDIUM_BIRD, envWith({ predation: 0 }))).toBe(0);
  });
});

describe('risk bounds', () => {
  it('keeps every risk a valid probability across extreme environments and all trait combinations', () => {
    const extremes = [
      envWith(),
      envWith({ temperature: 50, rainfall: 0, cover: 0, predation: 200, food: { softPlants: 0, smallSeeds: 0, hardSeeds: 0, insects: 0 } }),
      envWith({ temperature: 150, rainfall: 150, cover: 150, food: { softPlants: 150, smallSeeds: 150, hardSeeds: 150, insects: 150 } }),
    ];
    for (const env of extremes) {
      for (let beak = 0; beak < 3; beak++)
        for (let body = 0; body < 3; body++)
          for (let feathers = 0; feathers < 3; feathers++)
            for (let color = 0; color < 4; color++) {
              const traits = { beak, body, feathers, color };
              for (const risk of Object.values(riskProfile(traits, env))) {
                expect(risk).toBeGreaterThanOrEqual(0);
                expect(risk).toBeLessThanOrEqual(1);
              }
              expect(reproductiveFitness(traits, env)).toBeGreaterThan(0);
            }
    }
  });
});
