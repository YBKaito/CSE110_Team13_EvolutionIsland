import { describe, expect, it, vi } from 'vitest';
import {
  allScenarios, CONDITIONS, conditionOf, DEFAULT_SPECIES, EXTINCTION, fastestScenario, islandFor, startingScenario,
  pickSpecies, runScenario, SPECIES, survivalChance, type ConditionKey, type Scenario,
} from '../src/minigames/ExtinctionPrediction/ExtinctionModel';
import { createBaselineEnvironment } from '../src/models/Environment';
import { buildResultView, type ResultView } from '../src/screens/ExtinctionScreen/ExtinctionExplanation';
import { ExtinctionScreenController } from '../src/screens/ExtinctionScreen/ExtinctionScreenController';
import { whySpec } from '../src/screens/ExtinctionScreen/ExtinctionScreenView';
import { RandomSource } from '../src/simulation/Random';
import { simulateSurvival } from '../src/simulation/SimulationEngine';
import { FakeNavigator, screenText } from './helpers/screens';

const LEMON = DEFAULT_SPECIES;

/** Normal everywhere except the named options, e.g. pick({ rainfall: 'Drought' }). */
function pick(labels: Partial<Record<ConditionKey, string>>): Scenario {
  const scenario = startingScenario();
  for (const condition of CONDITIONS) {
    const label = labels[condition.key] ?? (condition.choices.some((c) => c.label === 'Normal') ? 'Normal' : condition.choices[0].label);
    const index = condition.choices.findIndex((c) => c.label === label);
    if (index < 0) throw new Error(`No ${condition.key} option called ${label}`);
    scenario[condition.key] = index;
  }
  return scenario;
}

const WORST = pick({ rainfall: 'Drought', temperature: 'Hotter', arrival: 'Hawks' });

describe('islands', () => {
  it('with Normal weather, the only change from the main game baseline is the newcomer', () => {
    const island = islandFor(pick({}));
    expect(island.rainfall).toBe(createBaselineEnvironment().rainfall);
    expect(island.temperature).toBe(createBaselineEnvironment().temperature);
    expect(island.food).toEqual(createBaselineEnvironment().food);
  });

  it('drought lowers rain-fed food and cover but never hard seeds', () => {
    const island = islandFor(pick({ rainfall: 'Drought' }));
    expect(island.food.softPlants).toBeLessThan(30);
    expect(island.food.smallSeeds).toBeLessThan(30);
    expect(island.food.insects).toBeLessThan(30);
    expect(island.food.hardSeeds).toBe(50);
    expect(island.cover).toBeLessThan(50);
  });

  it('a warbler eats only insects and a finch only small seeds', () => {
    const warbler = islandFor(pick({ arrival: 'Insect-eating warbler' }));
    expect(warbler.competitorDiet).toBe('insects');
    expect(warbler.food.insects).toBeLessThan(50);
    expect(warbler.food.smallSeeds).toBe(50);
    expect(warbler.predation).toBe(50);

    const finch = islandFor(pick({ arrival: 'Seed-eating finch' }));
    expect(finch.competitorDiet).toBe('smallSeeds');
    expect(finch.food.smallSeeds).toBeLessThan(50);
    expect(finch.food.insects).toBe(50);
  });

  it('cold lowers insects and heat does not', () => {
    expect(islandFor(pick({ temperature: 'Colder' })).food.insects).toBeLessThan(25);
    expect(islandFor(pick({ temperature: 'Hotter' })).food.insects).toBe(50);
  });

  it('keeps every value a whole number from 0 to 100 for every scenario', () => {
    for (const scenario of allScenarios()) {
      const env = islandFor(scenario);
      const values = [env.rainfall, env.temperature, env.predation, env.competition, env.cover, ...Object.values(env.food)];
      for (const v of values) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it('offers 26 distinct scenarios', () => {
    expect(new Set(allScenarios().map((s) => JSON.stringify(s))).size).toBe(27);
  });
});

describe('new arrival', () => {
  it('is one choice: hawks and a competitor never appear together', () => {
    for (const choice of conditionOf('arrival').choices) {
      const env = createBaselineEnvironment();
      choice.apply(env);
      expect(env.predation > 50 && env.competition > 0, choice.label).toBe(false);
    }
  });

  it('hawks raise predation without adding competition', () => {
    const island = islandFor(pick({ arrival: 'Hawks' }));
    expect(island.predation).toBe(EXTINCTION.PREDATOR_STRENGTH);
    expect(island.competition).toBe(0);
    expect(island.competitorDiet).toBeNull();
  });
});

it('every option changes the island: there is no "no newcomer" choice', () => {
    expect(conditionOf('arrival').choices.map((c) => c.label)).toEqual(['Hawks', 'Insect-eating warbler', 'Seed-eating finch']);
    for (const choice of conditionOf('arrival').choices) {
      const env = createBaselineEnvironment();
      choice.apply(env);
      expect(env.predation !== 50 || env.competition > 0, choice.label).toBe(true);
    }
  });

describe('runScenario', () => {
  it('is repeatable for a seed', () => {
    expect(runScenario(LEMON.traits, WORST, 5)).toEqual(runScenario(LEMON.traits, WORST, 5));
  });

  it('starts with the full flock and never runs past the cap', () => {
    for (const scenario of [startingScenario(), WORST]) {
      const run = runScenario(LEMON.traits, scenario, 2);
      expect(run.populations[0]).toBe(EXTINCTION.START_POP);
      expect(run.populations.length).toBeLessThanOrEqual(EXTINCTION.MAX_GENERATIONS);
    }
  });

  it('records extinction as the generation whose flock is empty', () => {
    const run = runScenario(LEMON.traits, WORST, 3);
    expect(run.extinctAt).not.toBeNull();
    expect(run.populations.at(-1)).toBe(0);
    expect(run.extinctAt).toBe(run.populations.length);
  });

  it('wipes Lemon out on its worst island', () => {
    for (let seed = 1; seed <= 8; seed++) {
      expect(runScenario(LEMON.traits, WORST, seed).extinctAt, `seed ${seed}`).not.toBeNull();
    }
  });
});

describe('uses the main simulation rules', () => {
  it('survivalChance matches what the engine actually does to a big flock', () => {
    const env = islandFor(pick({ rainfall: 'Drought', arrival: 'Hawks' }));
    const birds = Array.from({ length: 5000 }, (_, id) => ({ id, traits: { ...LEMON.traits } }));
    const { survivors } = simulateSurvival(birds, env, new RandomSource(3));
    expect(survivors.length / birds.length).toBeCloseTo(survivalChance(LEMON.traits, env), 1);
  });
});

describe('fastestScenario', () => {
  it('is never beaten by another scenario with the same seed', () => {
    const best = fastestScenario(LEMON.traits, 4);
    for (const scenario of allScenarios()) {
      const run = runScenario(LEMON.traits, scenario, 4);
      expect(best.run.extinctAt ?? Infinity).toBeLessThanOrEqual(run.extinctAt ?? Infinity);
    }
  });

  it('is repeatable and actually wipes the species out', () => {
    expect(fastestScenario(LEMON.traits, 4)).toEqual(fastestScenario(LEMON.traits, 4));
    expect(fastestScenario(LEMON.traits, 4).run.extinctAt).not.toBeNull();
  });
});

describe('starting species', () => {
  it('offers five distinct species', () => {
    expect(SPECIES).toHaveLength(5);
    expect(new Set(SPECIES.map((s) => s.name)).size).toBe(5);
    expect(new Set(SPECIES.map((s) => JSON.stringify(s.traits))).size).toBe(5);
  });

  it('picks the same species for the same seed, and eventually offers every one', () => {
    expect(pickSpecies(9)).toEqual(pickSpecies(9));
    expect(new Set(Array.from({ length: 200 }, (_, i) => pickSpecies(i + 1).name)).size).toBe(5);
  });

  it('never repeats the species just played', () => {
    for (let seed = 1; seed <= 50; seed++) expect(pickSpecies(seed, 'Lemon').name).not.toBe('Lemon');
  });

  it('lets every species survive a normal island', () => {
    for (const species of SPECIES) {
      for (let seed = 1; seed <= 8; seed++) {
        expect(runScenario(species.traits, startingScenario(), seed).extinctAt, `${species.name} seed ${seed}`).toBeNull();
      }
    }
  });

  it('lets some island wipe out every species, on every seed', () => {
    for (const species of SPECIES) {
      for (let seed = 1; seed <= 10; seed++) {
        expect(fastestScenario(species.traits, seed).run.extinctAt, `${species.name} seed ${seed}`).not.toBeNull();
      }
    }
  });
});

describe('what you missed', () => {
  it('lists each choice that differed from the fastest island and was easier on the species', () => {
    const view = buildResultView(LEMON, pick({ arrival: 'Seed-eating finch' }), 3);
    expect(view.matchedFastest).toBe(false);
    expect(view.missed.length).toBeGreaterThan(0);
    for (const line of view.missed) {
      expect(line).toMatch(/ instead of .*Lemon's chance of surviving a generation drops from \d+% to \d+%\./);
    }
  });

  it('only lists swaps that really lower survival', () => {
    for (const line of buildResultView(LEMON, startingScenario(), 3).missed) {
      const [, from, to] = line.match(/from (\d+)% to (\d+)%/)!;
      expect(Number(to)).toBeLessThan(Number(from));
    }
  });

  it('says nothing is missed when the player found the fastest island', () => {
    const view = buildResultView(LEMON, fastestScenario(LEMON.traits, 3).scenario, 3);
    expect(view.matchedFastest).toBe(true);
    expect(view.missed).toEqual([]);
  });

  it('reports the generations for the player and for the fastest island', () => {
    const view = buildResultView(LEMON, WORST, 3);
    expect(view.speciesName).toBe('Lemon');
    expect(view.populations).toEqual(runScenario(LEMON.traits, WORST, 3).populations);
    expect(view.fastestAt).toBe(fastestScenario(LEMON.traits, 3).run.extinctAt);
  });
});

describe('comparison screen', () => {
  const base: ResultView = {
    speciesName: 'Lemon', populations: [EXTINCTION.START_POP, 0], extinctAt: 2, fastestAt: 2, missed: [], matchedFastest: true,
  };

  it('shows each missed choice under "What you missed"', () => {
    const missed = ["Rainfall: Drought instead of Normal. Lemon's chance of surviving a generation drops from 80% to 40%."];
    const text = screenText(whySpec({ ...base, matchedFastest: false, missed }));
    expect(text).toEqual(expect.arrayContaining(['What you missed:', ...missed, '1. Try again', '2. Back to minigames']));
  });

  it('congratulates a player who matched the fastest island', () => {
    expect(screenText(whySpec(base))).toContain('You found the fastest way!');
  });

  it('blames the dice when no choice was easier on the species', () => {
    const text = screenText(whySpec({ ...base, matchedFastest: false, fastestAt: 1 }));
    expect(text).toContain('Your choices were just as harsh. The dice made the difference.');
  });

  it('never describes what each choice did', () => {
    expect(screenText(whySpec(base))).not.toContain('What happened:');
  });
});

describe('minigame screens', () => {
  function setup(seed = 7) {
    const nav = new FakeNavigator();
    const onRestart = vi.fn();
    const onExit = vi.fn();
    const screen = new ExtinctionScreenController(nav, { seed, species: LEMON, onRestart, onExit });
    return { nav, screen, onRestart, onExit };
  }

  /** Intro, then Drought, Hotter, warbler, landing on the summary screen. */
  function toSummary() {
    const game = setup();
    for (const input of ['', '3', '3', '2']) game.screen.submit(input);
    return game;
  }

  it('introduces the species and its traits (mockup)', () => {
    const text = screenText(setup().screen.spec());
    expect(text[0]).toBe('Extinction Prediction');
    expect(text).toEqual(expect.arrayContaining(['Species: | Lemon', 'Beak: | Short', 'Body: | Large', 'Feathers: | Thick', 'Color: | Yellow']));
  });

  it('picks its species from the seed when none is given', () => {
    const screen = new ExtinctionScreenController(new FakeNavigator(), { seed: 11, onRestart: vi.fn(), onExit: vi.fn() });
    expect(screenText(screen.spec())).toContain(`Species: | ${pickSpecies(11).name}`);
  });

  it('skips the species it is told to avoid', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const screen = new ExtinctionScreenController(new FakeNavigator(), { seed, avoidSpecies: 'Lemon', onRestart: vi.fn(), onExit: vi.fn() });
      expect(screenText(screen.spec())).not.toContain('Species: | Lemon');
    }
  });

  it('asks about the three conditions in order', () => {
    const { screen } = setup();
    screen.submit('');
    expect(screenText(screen.spec())).toEqual(expect.arrayContaining([
      'Condition 1 of 3: Rainfall', '1. Heavy rain', '2. Normal', '3. Drought', '4. Review species and traits',
    ]));
    screen.submit('3');
    expect(screenText(screen.spec())[0]).toBe('Condition 2 of 3: Temperature');
  });

  it('offers three newcomers, then the review option, and rejects anything else', () => {
    const { screen } = setup();
    for (const input of ['', '3', '3']) screen.submit(input);
    expect(screenText(screen.spec())).toEqual(expect.arrayContaining([
      'Condition 3 of 3: New arrival', '1. Hawks', '2. Insect-eating warbler', '3. Seed-eating finch',
      '4. Review species and traits',
    ]));
    screen.submit('5');
    expect(screen.spec().prompt.error).toBe('Invalid. Type 1, 2, 3, or 4.');
  });

  it('rejects invalid input and stays on the question', () => {
    const { screen, nav } = setup();
    screen.submit('');
    const before = nav.refreshes;
    screen.submit('9');
    expect(screen.spec().prompt.error).toBe('Invalid. Type 1, 2, 3, or 4.');
    expect(nav.refreshes).toBe(before + 1);
    expect(screenText(screen.spec())[0]).toBe('Condition 1 of 3: Rainfall');
  });

  it('summarizes the island the player built', () => {
    expect(screenText(toSummary().screen.spec())).toEqual(expect.arrayContaining([
      'Rainfall: | Drought', 'Temperature: | Hotter', 'New arrival: | Insect-eating warbler',
      '1. Run the simulation', '2. Change my choices', '3. Review species and traits',
    ]));
  });

  it('rejects invalid input on the summary', () => {
    const { screen } = toSummary();
    screen.submit('4');
    expect(screen.spec().prompt.error).toBe('Invalid. Type 1, 2, or 3.');
  });

  it('"Change my choices" goes back to the first condition', () => {
    const { screen } = toSummary();
    screen.submit('2');
    expect(screenText(screen.spec())[0]).toBe('Condition 1 of 3: Rainfall');
  });

  it('runs the simulation, shows each generation, then compares with the fastest island', () => {
    const { screen } = toSummary();
    screen.submit('1');
    const result = screenText(screen.spec());
    expect(result[0]).toMatch(/^Lemon (went extinct in \d+|survived all \d+) generations\.$/);
    expect(result.some((l) => new RegExp(`^Gen 1: +${EXTINCTION.START_POP}$`).test(l))).toBe(true);
    expect(result).toContain('Press Enter to see why.');

    screen.submit('');
    const why = screenText(screen.spec());
    expect(why).toEqual(expect.arrayContaining(['What you missed:', '1. Try again', '2. Back to minigames']));
    expect(why).not.toContain('What happened:');
  });

  it('rejects invalid input on the comparison screen', () => {
    const { screen } = toSummary();
    screen.submit('1');
    screen.submit('');
    screen.submit('x');
    expect(screen.spec().prompt.error).toBe('Invalid. Type 1 or 2.');
  });

  it('"Try again" reports the species played and "Back to minigames" exits', () => {
    const again = toSummary();
    again.screen.submit('1');
    again.screen.submit('');
    again.screen.submit('1');
    expect(again.onRestart).toHaveBeenCalledWith(LEMON);

    const back = toSummary();
    back.screen.submit('1');
    back.screen.submit('');
    back.screen.submit('2');
    expect(back.onExit).toHaveBeenCalledOnce();
  });
});

describe('reviewing the species', () => {
  function setup(seed = 7) {
    const nav = new FakeNavigator();
    const screen = new ExtinctionScreenController(nav, { seed, species: LEMON, onRestart: vi.fn(), onExit: vi.fn() });
    return { nav, screen };
  }

  /** Intro, then Drought, Hotter, warbler, landing on the summary screen. */
  function toSummary() {
    const game = setup();
    for (const input of ['', '3', '3', '3']) game.screen.submit(input);
    return game;
  }

  it('shows the intro screen again from a question, and Enter returns to the same question', () => {
    const { screen } = setup();
    screen.submit('');
    screen.submit('4');
    const review = screenText(screen.spec());
    expect(review[0]).toBe('Extinction Prediction');
    expect(review).toEqual(expect.arrayContaining(['Species: | Lemon', 'Beak: | Short', 'Body: | Large', 'Feathers: | Thick', 'Color: | Yellow']));
    expect(screen.spec().prompt).toMatchObject({ mode: 'enter', label: 'Press Enter to continue.' });

    screen.submit('');
    expect(screenText(screen.spec())[0]).toBe('Condition 1 of 3: Rainfall');
  });

  it('is not an answer: the player stays on the same condition', () => {
    const { screen } = setup();
    screen.submit('');
    screen.submit('4');
    screen.submit('');
    screen.submit('3'); // now answer Rainfall
    expect(screenText(screen.spec())[0]).toBe('Condition 2 of 3: Temperature');
  });

  it('works on the last question too, where it is option 4', () => {
    const { screen } = setup();
    for (const input of ['', '3', '3']) screen.submit(input);
    screen.submit('4');
    expect(screenText(screen.spec())).toContain('Species: | Lemon');
    screen.submit('');
    expect(screenText(screen.spec())[0]).toBe('Condition 3 of 3: New arrival');
  });

  it('keeps earlier answers and clears any error', () => {
    const { screen } = setup();
    for (const input of ['', '3']) screen.submit(input); // Rainfall: Drought
    screen.submit('9');                                   // invalid on Temperature
    expect(screen.spec().prompt.error).toBeDefined();
    screen.submit('4');                                   // review
    screen.submit('');                                    // back
    expect(screen.spec().prompt.error).toBeUndefined();
    for (const input of ['3', '3']) screen.submit(input); // Hotter, warbler
    expect(screenText(screen.spec())).toContain('Rainfall: | Drought');
  });

  it('can be opened from the summary, and Enter returns to the summary', () => {
    const { screen } = toSummary();
    screen.submit('3');
    expect(screenText(screen.spec())[0]).toBe('Extinction Prediction');
    expect(screenText(screen.spec())).toContain('Species: | Lemon');

    screen.submit('');
    expect(screenText(screen.spec())).toEqual(expect.arrayContaining(['Your island:', '1. Run the simulation']));
  });

  it('keeps the island the player built after reviewing from the summary', () => {
    const { screen } = toSummary();
    screen.submit('3');
    screen.submit('');
    expect(screenText(screen.spec())).toEqual(expect.arrayContaining([
      'Rainfall: | Drought', 'Temperature: | Hotter', 'New arrival: | Insect-eating warbler',
    ]));
  });

  it('returns to the screen it came from: question to question, summary to summary', () => {
    const fromQuestion = setup();
    fromQuestion.screen.submit('');
    fromQuestion.screen.submit('4');
    fromQuestion.screen.submit('');
    expect(screenText(fromQuestion.screen.spec())[0]).toBe('Condition 1 of 3: Rainfall');

    const fromSummary = toSummary();
    fromSummary.screen.submit('3');
    fromSummary.screen.submit('');
    expect(screenText(fromSummary.screen.spec())[0]).toBe('Your island:');
  });
});
