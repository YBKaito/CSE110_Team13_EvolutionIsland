// The five MVP environmental events (design report §5), defined as data.
// Adding an event means adding an entry here; the event manager and simulation don't change.
// Effects use the design report's numbers, written for a normal-100 island (per generation for 'perGen',
// once for 'once'). The event manager scales them to this game's 0-100 island where 50 is normal.

import type { EventDef } from '../types';

const STAGE_CHANCE = 0.35;

export const DROUGHT: EventDef = {
  id: 'drought',
  name: 'Drought',
  category: 'climate',
  weight: 3,
  persistence: 'temporary',
  conflictsWith: ['hurricane'],
  lastingEffect: { chance: 0.3, capacity: { softPlants: 0.85 } },
  stages: [
    {
      name: 'warning',
      minDuration: 3,
      maxDuration: 7,
      transitionChance: STAGE_CHANCE,
      effects: [
        { variable: 'rainfall', mode: 'perGen', range: [-4, -2] },
        { variable: 'softPlants', mode: 'perGen', range: [-2, 0] },
      ],
      title: 'The rains are slowing',
      message: 'Rainfall is decreasing, and some plants are beginning to disappear.',
    },
    {
      name: 'growing',
      minDuration: 4,
      maxDuration: 8,
      transitionChance: STAGE_CHANCE,
      effects: [
        { variable: 'rainfall', mode: 'perGen', range: [-5, -2] },
        { variable: 'softPlants', mode: 'perGen', range: [-4, -2] },
        { variable: 'smallSeeds', mode: 'perGen', range: [-2, 0] },
        { variable: 'cover', mode: 'perGen', range: [-2, 0] },
      ],
      title: 'The drought is spreading',
      message: 'The drought is getting worse. Soft plants and small seeds are drying up.',
    },
    {
      name: 'peak',
      minDuration: 5,
      maxDuration: 12,
      transitionChance: STAGE_CHANCE,
      effects: [{ variable: 'softPlants', mode: 'perGen', range: [-2, 0] }],
      holds: ['rainfall'],
      title: 'Drought grips the island',
      message: 'The drought has become severe. Hard seeds are now the easiest food to find.',
    },
    {
      name: 'recovery',
      minDuration: 5,
      maxDuration: 15,
      transitionChance: STAGE_CHANCE,
      effects: [
        { variable: 'rainfall', mode: 'perGen', range: [2, 5] },
        { variable: 'softPlants', mode: 'perGen', range: [1, 3] },
      ],
      title: 'The rains return',
      message: 'Rain is returning, and plants are slowly growing back.',
    },
  ],
};

export const HARSH_WINTER: EventDef = {
  id: 'harshWinter',
  name: 'Harsh Winter',
  category: 'climate',
  weight: 2,
  persistence: 'temporary',
  stages: [
    {
      name: 'warning',
      minDuration: 2,
      maxDuration: 5,
      transitionChance: STAGE_CHANCE,
      effects: [{ variable: 'temperature', mode: 'perGen', range: [-4, -2] }],
      title: 'A cold wind is blowing',
      message: 'Temperatures are falling, and insect activity is declining.',
    },
    {
      name: 'growing',
      minDuration: 3,
      maxDuration: 7,
      transitionChance: STAGE_CHANCE,
      effects: [
        { variable: 'temperature', mode: 'perGen', range: [-5, -2] },
        { variable: 'insects', mode: 'perGen', range: [-3, -1] },
        { variable: 'softPlants', mode: 'perGen', range: [-2, 0] },
      ],
      title: 'Winter is setting in',
      message: 'The cold is deepening. Insects are becoming hard to find.',
    },
    {
      name: 'peak',
      minDuration: 4,
      maxDuration: 10,
      transitionChance: STAGE_CHANCE,
      effects: [],
      holds: ['temperature', 'insects'],
      title: 'A harsh winter grips the island',
      message: 'A harsh winter grips the island. Staying warm is a struggle.',
    },
    {
      name: 'recovery',
      minDuration: 3,
      maxDuration: 8,
      transitionChance: STAGE_CHANCE,
      effects: [{ variable: 'temperature', mode: 'perGen', range: [2, 5] }],
      title: 'Spring is coming',
      message: 'The weather is warming, and insects are returning.',
    },
  ],
};

export const HURRICANE: EventDef = {
  id: 'hurricane',
  name: 'Hurricane',
  category: 'disturbance',
  weight: 2,
  persistence: 'temporary',
  conflictsWith: ['drought'],
  lastingEffect: { chance: 0.4, capacity: { cover: 0.9 } },
  stages: [
    {
      name: 'warning',
      minDuration: 1,
      maxDuration: 3,
      transitionChance: STAGE_CHANCE,
      effects: [{ variable: 'rainfall', mode: 'perGen', range: [5, 12] }],
      title: 'A storm is coming',
      message: 'Strong storms are approaching; vegetation and nesting areas may be damaged.',
    },
    {
      name: 'impact',
      minDuration: 1,
      maxDuration: 1,
      transitionChance: 1,
      effects: [
        { variable: 'cover', mode: 'once', range: [-35, -15] },
        { variable: 'softPlants', mode: 'once', range: [-25, -10] },
      ],
      // Trait-independent losses: luck, not natural selection (a bottleneck).
      randomMortality: [0.1, 0.4],
      title: 'The hurricane hits',
      message: 'A hurricane strikes! Trees are torn down and some birds are lost in the storm.',
    },
    {
      name: 'aftermath',
      minDuration: 5,
      maxDuration: 12,
      transitionChance: STAGE_CHANCE,
      effects: [],
      holds: ['cover'],
      title: 'After the storm',
      message: 'With fewer trees and bushes, birds are easier for predators to spot.',
    },
    {
      name: 'recovery',
      minDuration: 10,
      maxDuration: 25,
      transitionChance: STAGE_CHANCE,
      effects: [{ variable: 'cover', mode: 'perGen', range: [1, 3] }],
      title: 'The island regrows',
      message: 'Plants and shelter are slowly growing back.',
    },
  ],
};

export const NEW_PREDATOR: EventDef = {
  id: 'newPredator',
  name: 'New Predator',
  category: 'biological',
  weight: 2,
  persistence: 'permanent',
  stages: [
    {
      name: 'warning',
      minDuration: 3,
      maxDuration: 6,
      transitionChance: STAGE_CHANCE,
      effects: [{ variable: 'predation', mode: 'perGen', range: [1, 3] }],
      title: 'A new predator appears',
      message: 'An unfamiliar predator has been spotted hunting near the flock.',
    },
    {
      name: 'establishing',
      minDuration: 5,
      maxDuration: 10,
      transitionChance: STAGE_CHANCE,
      effects: [{ variable: 'predation', mode: 'perGen', range: [1, 3] }],
      title: 'The predator is settling in',
      message: 'The new predator is settling in and hunting more often.',
    },
    {
      name: 'established',
      minDuration: 1,
      maxDuration: null,
      transitionChance: 0,
      effects: [],
      title: 'The predator is here to stay',
      message: 'The predator is now a permanent part of the island.',
    },
  ],
};

export const NEW_COMPETITOR: EventDef = {
  id: 'newCompetitor',
  name: 'New Competitor',
  category: 'biological',
  weight: 2,
  persistence: 'permanent',
  setsCompetitorDiet: 'smallSeeds',
  stages: [
    {
      name: 'warning',
      minDuration: 3,
      maxDuration: 6,
      transitionChance: STAGE_CHANCE,
      effects: [
        { variable: 'competition', mode: 'perGen', range: [1, 3] },
        { variable: 'smallSeeds', mode: 'perGen', range: [-2, 0] },
      ],
      title: 'New finches arrive',
      message: "A new finch population has appeared and is feeding on the island's small seeds.",
    },
    {
      name: 'establishing',
      minDuration: 5,
      maxDuration: 10,
      transitionChance: STAGE_CHANCE,
      effects: [{ variable: 'competition', mode: 'perGen', range: [2, 4] }],
      title: 'The finches are spreading',
      message: 'The finches are spreading. Small seeds are getting harder to find.',
    },
    {
      name: 'established',
      minDuration: 1,
      maxDuration: null,
      transitionChance: 0,
      effects: [],
      title: 'The finches are here to stay',
      message: 'The finches are here to stay, eating small seeds alongside your flock.',
    },
  ],
};

export const EVENT_DEFS: Record<string, EventDef> = Object.fromEntries(
  [DROUGHT, HARSH_WINTER, HURRICANE, NEW_PREDATOR, NEW_COMPETITOR].map((def) => [def.id, def]),
);

export interface ScriptEntry {
  generation: number;
  eventId: string;
}

/** Replays the mockup storyline: drought starts at Gen 6 (severe around Gen 13), a predator arrives at Gen 24. */
export const MOCKUP_SCRIPT: ScriptEntry[] = [
  { generation: 6, eventId: 'drought' },
  { generation: 24, eventId: 'newPredator' },
];
