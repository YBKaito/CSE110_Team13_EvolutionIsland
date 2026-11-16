// Builds the result screen's data: how the player's run went, and how their choices differ from the fastest extinction

import {
  CONDITIONS, fastestScenario, islandFor, runScenario, survivalChance, type Scenario,
} from '../../minigames/ExtinctionPrediction/ExtinctionModel';
import type { StartingSpecies } from '../../models/GameState';

export interface ResultView {
  speciesName: string;
  populations: number[];
  extinctAt: number | null;
  fastestAt: number | null;
  happened: string[];
  missed: string[];
  matchedFastest: boolean;
}

const percent = (chance: number): string => `${Math.round(chance * 100)}%`;

/**
 * For each condition where the fastest extinction choice is different, swap in that one choice and report how much
 * less likely the species is to survive a generation. Choices that would not have hurt it more are left out.
 */
function explainMissed(species: StartingSpecies, scenario: Scenario, best: Scenario): string[] {
  const yours = survivalChance(species.traits, islandFor(scenario));
  return CONDITIONS.flatMap((condition) => {
    if (best[condition.key] === scenario[condition.key]) return [];
    const swapped = survivalChance(species.traits, islandFor({ ...scenario, [condition.key]: best[condition.key] }));
    if (swapped >= yours) return [];
    const bestLabel = condition.choices[best[condition.key]].label;
    const yourLabel = condition.choices[scenario[condition.key]].label;
    return [`${condition.title}: ${bestLabel} instead of ${yourLabel}. ${species.name}'s chance of surviving a generation drops from ${percent(yours)} to ${percent(swapped)}.`];
  });
}

export function buildResultView(species: StartingSpecies, scenario: Scenario, seed: number): ResultView {
  const run = runScenario(species.traits, scenario, seed);
  const best = fastestScenario(species.traits, seed);
  const matchedFastest = run.extinctAt === best.run.extinctAt;
  return {
    speciesName: species.name,
    populations: run.populations,
    extinctAt: run.extinctAt,
    fastestAt: best.run.extinctAt,
    missed: matchedFastest ? [] : explainMissed(species, scenario, best.scenario),
    matchedFastest,
  };
}

