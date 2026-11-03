
# Implementation Plan: US1 (Main Menu) + US2 (Species Creation)

**Branch:** `integration/us2-us3`

## Status

| Feature | State |
|---|---|
| US1: Main menu, input handling, and navigation | Done |
| US2: Species naming, trait selection, and confirmation | Done |
| US2 unit tests | Done, 15 tests passing |
| US1/US2 integration with US3 | Done |

---

## 1. Design Decisions

| Decision | Choice |
|---|---|
| Architecture | Separate controller, view, and model responsibilities to keep input handling, rendering, and state management independent. |
| State management | Use `MenuState` to track the current screen, creation progress, selected traits, and completed species. |
| Species creation | Use a step-by-step process instead of collecting all inputs at once. |
| Trait definitions | Store trait options in shared constants to avoid repeating choices and validation logic. |
| Input validation | Validate species names and numbered trait selections before advancing to the next step. |
| Confirmation | Allow players to review their selected traits before creating the final `Species` object. |
| Integration | Convert US2's string-based traits into US3's numeric indices without modifying the simulation engine. |

---

## 2. File Structure

| File | Purpose | Story |
|---|---|---|
| `src/screens/MenuScreen/MenuScreenController.ts` | Handles menu input and navigation | US1 |
| `src/screens/MenuScreen/MenuScreenView.ts` | Displays menu content and terminal output | US1 |
| `src/screens/CreationScreen/CreationScreenController.ts` | Handles species naming, trait selection, validation, and confirmation | US2 |
| `src/screens/CreationScreen/CreationScreenView.ts` | Displays creation steps, trait advantages/disadvantages, and confirmation | US2 |
| `src/models/Species.ts` | Stores the species name and selected traits | US2 |
| `src/models/GameState.ts` | Contains `MenuState` for menu and creation progress | Shared |
| `src/constants.ts` | Contains creation steps and trait options | US2 |
| `src/types.ts` | Defines `SpeciesTraits` and `SpeciesData` | Shared |
| `src/main.ts` | Connects menu, creation, and simulation | Integration |
| `tests/CreationScreenController.test.ts` | Unit tests for species creation | US2 |

---

## 3. US1: Main Menu

### 3.1 Menu State

`MenuState` tracks the current screen and the information needed during species creation.

The menu and creation screens share this state, allowing navigation without creating separate copies of the player's selections.

### 3.2 Controller and View

- `MenuScreenController` processes player input and handles navigation.
- `MenuScreenView` displays the menu through the terminal interface.
- Invalid inputs produce error messages rather than advancing the game.
- Selecting species creation transitions the player to US2 and initializes the creation state.

### 3.3 Navigation

The menu and creation screens are connected through `main.ts`, which checks the current screen and sends input to the appropriate controller.

The screen is then rendered using the corresponding view.

---

## 4. US2: Species Creation

### 4.1 Creation Process

Species creation follows six steps:

1. Species name
2. Beak length
3. Body size
4. Feather density
5. Color
6. Confirmation

The current step is tracked through `MenuState.creationStep`.

### 4.2 Trait Options

| Trait | Options |
|---|---|
| Beak length | short, medium, long |
| Body size | small, medium, large |
| Feather density | thin, medium, thick |
| Color | brown, gray, yellow, white |

Each option has an associated advantage and disadvantage displayed during creation.

The controller uses `CREATION_STEPS` and `TRAIT_OPTIONS` to determine which choices are available at each step. This avoids implementing separate selection logic for every trait.

### 4.3 Input Validation

- Species names must contain between 2 and 30 characters.
- Leading and trailing whitespace is removed from names.
- Trait selections must be valid numbered options.
- Invalid input does not advance the creation step.
- Players can return to the menu using `B`.

### 4.4 Confirmation and Species Model

After selecting all four traits, the player reviews their choices.

- `Y` confirms the selections and creates a `Species` instance.
- `N` restarts the creation process.
- The completed species contains a name and a `SpeciesTraits` object.

`Species.toData()` returns the species information as plain data, including a copy of its traits.

---

## 5. US2 → US3 Integration

### 5.1 Trait Representation

US2 and US3 initially used different representations for traits.

- **US2:** Descriptive string values such as `"long"` and `"thick"`.
- **US3:** Numeric indices used by the simulation engine.

Rather than changing either implementation, a conversion layer was added to `main.ts`.

For example:

    beak: SIM_TRAIT_OPTIONS.beak.indexOf(traits.beakLength)

The same conversion is applied to body size, feather density, and color.

### 5.2 Starting the Simulation

Once the player confirms their species:

1. `CreationScreenController` creates the `Species` object.
2. `MenuState.screen` changes to `"simulation"`.
3. `main.ts` converts the selected traits into US3's numeric representation.
4. `GameController.startRun()` initializes the simulation using the selected species.
5. `ScreenHost` displays the generation screen.

US3 creates an initial population of 80 birds, with each trait having a 70% chance of matching the player's original selection.

The generation screen also displays the original species name and trait selections so players can compare their choices against the evolving population.

---

## 6. Testing

### 6.1 US2 Unit Tests

**File:** `tests/CreationScreenController.test.ts`

**Framework:** Vitest

15 tests were added covering:

- Species naming and validation
- Trait selection and invalid inputs
- Confirmation, restarting, and navigation

The tests verify that invalid inputs do not advance the creation process, valid traits are stored correctly, and a species is created only after confirmation.

**Result:** 15 tests passing.

### 6.2 Manual Integration Testing

The integrated game was run to verify the transition from species creation into the generation simulation.

The initial population was checked to confirm that the selected species name and traits were carried into US3 and reflected in the population distribution.

---

## 7. Future Improvements

The main area for improvement is consistency between different user stories. Since features were developed separately, some components use different approaches to state management, rendering, and trait representation.

Potential improvements include:

- Consolidating repeated code into shared utilities or components.
- Standardizing controller and view interfaces across screens.
- Using a shared trait representation to remove the conversion layer.
- Adding automated integration tests for the complete menu-to-simulation flow.

These changes would reduce duplication and make future features easier to integrate.

---

# Implementation Plan: US3 (Simulate Generations) + US4 (Environmental Events)

**Branch:** `us3-us4-simulation`
**Sources:** Sprint 1 Plan, Design Mockups, Architecture doc (C&C + module views), and the *Generation & Environment Simulation Design* report. **The report is the authority on how the simulation behaves.**

## Status

| Slice | State |
|---|---|
| 1. Simulation core: setup, contracts, RNG, fitness, engine, environment, 5 events, scheduler, coordinator, tests | **Done.** |
| 2. Screens (Konva): GameScreen (generation screen, low-population warning, quit confirm, extinction) + EventScreen (event card, island changes table) | **Done.** 119 tests pass, `tsc` is clean, `npm run build` works |
| 3. Integration with US1 menu / US2 creation / US5 milestone choice / US6 game over | After the other pairs land their pieces |

**Decisions the report settled:**
- Events are random, staged and seeded. The 6/13/24 schedule is only a scripted mode for tests and demos.
- Generations **don't overlap**: survivors' chicks replace the flock.
- The coordinator belongs to US3/US4.

**Balance notes from building slice 1:**
- Beaks were made more specialized, and small seeds and insects now depend fully on rainfall. Without that, a drought didn't favor any beak.
- Reproduction is softened (`REP_BASE + REP_SLOPE·feeding`) so a drought selects rather than wiping the flock out.
- At the report's predator numbers (+1..3/gen), camouflage selection is weak but real: brown rises in 18 of 20 seeds. Raise `PRED_BASE` in `constants.ts` if hawks should matter more.

**How to run:**
- `npm test`
- `npm run dev`, then open `/?script=mockup` (mockup storyline) or `/?seed=7` (repeatable random run). With no `?seed`, every run is different.
- Type a number and press Enter, like in the mockups.

**Frontend structure (slice 2):**
- `src/screens/ui/`: the shared Konva pieces. `ScreenHost` owns the stage and keyboard input; `TerminalRenderer` draws a `ScreenSpec` (text, tables, trait bars, prompt) in the mockup style; `theme.ts` holds colors, sizes and the font (Google Font "Pixelify Sans").
- `*View.ts` files are pure: game state in, `ScreenSpec` out. `*Controller.ts` files handle typed input and switch screens through a `ScreenNavigator`. Both are tested without a browser.
- Other screens (menu, creation, evolution choice, game over) can reuse the same host and renderer: implement `Screen { spec(); submit(input) }`.
- **Changes from the mockup:**
  - The generation table is "Adults / Died / Chicks born / Change", because generations don't overlap.
  - Trait bars show all 3–4 options for each trait.
  - Decorative feather art isn't in the repo yet, so it isn't drawn.

---

## 0. Where we started

The repo had a folder skeleton (commits `28d36c0`, `4e3bc9f`), and **every source file in it was empty**:

```
src/
  constants.ts            (empty, shared)
  types.ts                (empty, shared)
  main.ts                 (empty)
  models/Environment.ts   (empty)  <- ours (US4)
  models/GameState.ts     (empty)  <- shared, coordinate
  models/Species.ts       (empty)  <- US2
  screens/<Name>/<Name>Controller.ts + <Name>View.ts   (MVC per screen)
    CreationScreen/  GameScreen/  MenuScreen/
  styles/styles.css
graphics/ small_bird.png, medium_bird.png, big_bird.png
```

We follow this layout:
- **Models** hold state.
- **Each screen** has a `View` that only renders the DOM and a `Controller` that handles input and calls the game logic.
- **Our simulation logic** goes in two new folders, `src/simulation/` and `src/events/`. Neither touches the DOM.

---

## 1. Design decisions (answers to report §14)

| Decision | Choice |
|---|---|
| Population representation | **Individual bird records** `{id, traits}`. The population stays at 250 or fewer, so this is cheap. It also keeps trait *combinations* intact, as report §8.3 requires. |
| Trait encoding | Ordered categories, stored as an option index. This matches the module view's `TraitSet {value, minValue, maxValue}` and the mockup menus. |
| Fitness | Three separate components (feeding, thermal, predation), each giving a death probability (§4.3). |
| Generations | **Non-overlapping** (report §8.1 step 8). Each generation, adults face survival, survivors breed, and their chicks become the whole next flock. There's no old-age death. "Died" on the generation screen is every adult; "Died from" lists those that died before breeding. |
| Inheritance | Each trait comes from one of the two parents at random, plus a 2% mutation chance per trait. |
| Starting variation | 80 birds. Each trait matches the player's pick 70% of the time, otherwise a random other option. Otherwise selection has nothing to act on. |
| Population limits | Density-dependent hatching, `(2.0 − survivors/100)`, and a hard cap of 250. A normal island settles around 100–120 birds. |
| Beak specialization | One compatibility table (§4.1), used by fitness, hints and feedback. |
| Resource model | Derived resources move 20% of the way toward a target each generation. The targets are set by rainfall, temperature, competition and capacity (§5.1). |
| Event scheduling | Seeded and random, with rising trigger probability, protected early generations and overlap rules (§5.3). A **scripted scheduler** replays the sprint plan's "Gen 6 / 13 / 24" storyline for tests and demos. |
| Event magnitudes | A triangular distribution (the mean of two uniforms), so moderate values come up most often. Each event also gets one `severity` multiplier (0.8–1.2) per run. |
| Player decision integration | Out of scope (US5). We pause at every 10th generation and expose `GameState` so US5 can change the population. |
| Interface contracts | §3 below. |

The trait option lists below are **provisional until US2 confirms them**. They live in one data file, so changing them doesn't touch the engine.

---

## 2. File plan

| File | Purpose | Story |
|---|---|---|
| `src/types.ts` | **Shared contracts** (§3): traits, Bird, EnvironmentState, GenerationResult, event types | shared |
| `src/constants.ts` | All tunable balance numbers, grouped under `SIM` and `EVENTS` objects | shared |
| `src/models/Environment.ts` | Baseline environment, `regenerate`, `clampEnvironment`, `diffEnvironment` | US4 |
| `src/models/GameState.ts` | `GameState` shape plus `createGameState`. Coordinate with the team; we add the simulation fields. | shared |
| `src/models/Species.ts` | US2 owns this. We only read `{ name, traits }`. If it's still empty when we start, add a minimal interface and tell the US2 pair. | US2 |
| `src/simulation/Random.ts` | `RandomSource`, the seeded RNG | US3 |
| `src/simulation/traitContent.ts` | Trait options, beak↔food table, camouflage table, body/feather values | US3 |
| `src/simulation/Fitness.ts` | Pure fitness and risk functions | US3 |
| `src/simulation/Population.ts` | `createStartingPopulation`, `countTraits`, helpers | US3 |
| `src/simulation/SimulationEngine.ts` | `runGeneration`, `simulateSurvival`, `simulateReproduction` | US3 |
| `src/events/eventDefinitions.ts` | The 5 MVP events as data, plus `MOCKUP_SCRIPT` | US4 |
| `src/events/EventFactory.ts` | `EventScheduler` interface, `RandomScheduler`, `ScriptedScheduler` | US4 |
| `src/events/EventManager.ts` | Moves active events through their stages and applies effects | US4 |
| `src/game/GameController.ts` | Coordinator: `startRun`, `step`, `advance`, pauses, history | shared (we build a minimal version) |
| `src/screens/GameScreen/GameScreenView.ts` + `Controller.ts` | Generation screen (mockup p.15–17) | US3 |
| `src/screens/EventScreen/EventScreenView.ts` + `Controller.ts` | **New.** Event card + island changes table (p.41–44) | US4 |
| `src/screens/format.ts` | Index→label, text bars, number formatting | US3/US4 |
| `tests/**/*.test.ts` | Vitest suites, mirroring `src/` | US3/US4 |

**Dependency direction:** `screens → game → (simulation, events, models) → types/constants`. `simulation/` and `events/` never import from each other. They only communicate through `EnvironmentState` (report §2.4).

---

## 3. Shared contracts (`src/types.ts`)

```ts
export type TraitName = 'beak' | 'body' | 'feathers' | 'color';
export type Traits = Record<TraitName, number>;            // option index per trait

export interface Bird { id: number; traits: Traits }
export interface Population { birds: Bird[]; generation: number; nextId: number }

export type FoodType = 'softPlants' | 'smallSeeds' | 'hardSeeds' | 'insects';
export type Background = 'forest' | 'scrub' | 'sand';

export interface EnvironmentState {
  temperature: number;                  // 100 = island baseline, range 50–150
  rainfall: number;                     // 0–150
  food: Record<FoodType, number>;       // derived, 0–150
  cover: number;                        // derived habitat cover, 0–150
  predation: number;                    // 100 = baseline predators, 0–200
  competition: number;                  // 0 = no competitor, 0–100
  competitorDiet: FoodType | null;
  background: Background;
  capacity: Record<FoodType | 'cover', number>;   // 1.0 = normal; lasting damage lowers it
}

export type DeathCause = 'starvation' | 'exposure' | 'predation' | 'disaster';

export interface GenerationResult {
  generation: number;
  startPopulation: number;
  population: number;
  born: number;
  died: number;
  deathsByCause: Record<DeathCause, number>;
  traitCounts: Record<TraitName, number[]>;       // count per option index
  avgRisk: { starvation: number; exposure: number; predation: number };
  lowPopulation: boolean;
  extinct: boolean;
}

export type EventCategory = 'climate' | 'disturbance' | 'biological' | 'habitat';
export type StageName = 'warning' | 'growing' | 'peak' | 'recovery'
                      | 'impact' | 'aftermath' | 'establishing' | 'established';
export type EnvVariable = 'temperature' | 'rainfall' | 'predation' | 'competition' | 'cover' | FoodType;

export interface EffectSpec { variable: EnvVariable; mode: 'perGen' | 'once'; range: [number, number] }
export interface StageDef {
  name: StageName;
  minDuration: number;
  maxDuration: number | null;           // null = indefinite (established)
  transitionChance: number;             // per gen after minDuration
  effects: EffectSpec[];
  randomMortality?: [number, number];   // fraction of flock, trait-independent
  message: string;                      // player-facing
}
export interface EventDef {
  id: string; name: string; category: EventCategory; weight: number;
  persistence: 'temporary' | 'permanent';
  stages: StageDef[];
  lastingEffect?: { chance: number; capacity: Partial<EnvironmentState['capacity']> };
  setsCompetitorDiet?: FoodType;
  conflictsWith?: string[];
}
export interface ActiveEvent {
  defId: string; stageIndex: number; genInStage: number;
  startedAt: number; severity: number; resolved: boolean;
}
export interface EventLogEntry {
  generation: number; eventId: string;
  kind: 'started' | 'stageChanged' | 'resolved';
  stage: StageName; message: string;
}
export interface EnvChange { variable: EnvVariable; before: number; after: number }
```

---

## 4. US3: Simulate Generations

### 4.1 Trait content (`src/simulation/traitContent.ts`)

| Trait | Options (index order) |
|---|---|
| beak | short, medium, long |
| body | small, medium, large *(matches `graphics/*_bird.png`)* |
| feathers | thin, medium, thick |
| color | brown, gray, yellow, white |

**Beak ↔ food efficiency.** This is the single source of truth (report §7.4). It agrees with the mockups: long beaks win when hard seeds are high (p.15), short beaks can't crack hard seeds (US11), and long beaks suit deep flowers (p.12).

| | softPlants | smallSeeds | hardSeeds | insects |
|---|---|---|---|---|
| short | 0.4 | 1.0 | 0.1 | 1.0 |
| medium | 0.7 | 0.7 | 0.6 | 0.7 |
| long | 1.0 | 0.3 | 1.0 | 0.3 |

**Body (small / medium / large):** food need 0.85 / 1.0 / 1.15. Heat retention −0.5 / 0 / +0.5. Predator vulnerability 0.9 / 1.0 / 1.15.
**Feathers (thin / medium / thick):** insulation −1 / 0 / +1.
**Color detectability:**

| | brown | gray | yellow | white |
|---|---|---|---|---|
| forest | 0.6 | 0.9 | 1.3 | 1.4 |
| scrub | 0.8 | 0.7 | 1.1 | 1.2 |
| sand | 1.1 | 0.9 | 0.8 | 0.7 |

### 4.2 Seeded RNG (`src/simulation/Random.ts`)
- `class RandomSource` (mulberry32) with `next()`, `int(min,max)`, `chance(p)`, `pick(arr)`, `weightedPick(items, weights)`, `shuffle(arr)`, `triangular(min,max)`.
- `getState()` / `setState()` so the Save Manager (Availability QA) can checkpoint a run and resume it exactly.
- **One instance per run, passed in everywhere. No `Math.random()` anywhere in `simulation/` or `events/`.**

### 4.3 Fitness (`src/simulation/Fitness.ts`, report §7)
All functions are pure and clamped. The constants live in `constants.ts`.

- **Feeding (beak + body):**
  - `feedRaw = Σ_f eff[beak][f]·food_f / Σ_f eff[beak][f]·100`. This is exactly 1.0 for **every** beak at baseline, so no beak is best everywhere.
  - `feeding = feedRaw / need[body]`.
  - `pStarve = clamp(0.05 + 0.6·(1 − feeding), 0.02, 0.9)`.
- **Thermal (feathers + body):**
  - `I = insulation[feathers] + retention[body]`.
  - Ideal `I* = clamp((100 − temperature)/20, −1.5, 1.5)`.
  - `pExposure = clamp(0.08·|I − I*|, 0, 0.6)`. Thick feathers carry a small cost at baseline, which gives the trade-off the report asks for.
- **Predation (color + body):**
  - `exposure = 1 − 0.5·min(cover,100)/100`.
  - `pPred = clamp(0.12·(predation/100)·detect[background][color]·exposure·vuln[body], 0, 0.8)`.
- **Reproductive fitness:** `repFit = clamp(0.6 + 0.4·feeding, 0.5, 1.3)`.
- `explainRisk(bird, env)` returns the three numbers. US6/US7 can reuse it for "why did they die" text.

### 4.4 Generation step (`src/simulation/SimulationEngine.ts`, report §8.1 steps 4–9)
`runGeneration(pop, env, rng, opts?: { birthMultiplier?: number }) → { population, result }`

1. **`applyDisaster`:** remove `round(fraction·N)` random birds. This doesn't depend on traits and is counted as `disaster`.
2. **`simulateSurvival`:** go through birds in `id` order. Roll in a fixed order: starvation → exposure → predation. The first failed roll is the cause of death. The fixed order makes seeded runs deterministic.
3. **`simulateReproduction`:**
   - Shuffle the survivors and pair them; an odd one out doesn't breed.
   - Each pair has 4 eggs. Each egg hatches with probability `p = clamp(0.55 · avg(repFit) · (2.0 − survivors/100) · birthMultiplier, 0, 0.95)`.
   - `birthMultiplier` is the US10 Hatching Rhythm hook and defaults to 1.
4. **Inheritance:** each trait comes from a random parent. Mutation is 2% per trait: ordinal traits move ±1 option, color becomes a random different option. Birds never gain traits in response to the environment.
5. **Replacement:** the chicks become the entire next population and get new ids. Hatching stops once there are `MAX_POP = 250` chicks.
6. **Result:** fill in `GenerationResult`: `population = born`, `died = startPopulation`. `lowPopulation` = population ≤ 10 (mockup p.16), `extinct` = population === 0.

`createStartingPopulation(traits, rng)` gives 80 birds with the 70/30 variation from §1.

---

## 5. US4: Environmental Events

### 5.1 Environment model (`src/models/Environment.ts`)
- `createBaselineEnvironment()`: every index at 100. Competition 0, competitorDiet `null`, background `'forest'`, capacity all 1.0.
- `regenerate(env)`: the shared dependency rules (report §3.3–3.4). Each derived value moves 20% of the way toward its target every generation:
  - `softPlants → 100·(rainfall/100)^1.2·cap.softPlants`
  - `smallSeeds → 100·(rainfall/100)·cap.smallSeeds·(diet==='smallSeeds' ? 1 − competition/200 : 1)`
  - `hardSeeds → 100·cap.hardSeeds`. Hard seeds tolerate drought, so they become *relatively* more abundant without being boosted directly (§5.1).
  - `insects → 100·clamp(1 − max(0,100−T)/40, 0.2, 1.2)·(rainfall/100)·cap.insects`
  - `cover → 100·(0.6 + 0.4·rainfall/100)·cap.cover`
- **Primary variables drift back toward baseline** (rainfall and temperature by 10% of the gap per generation) unless an active event changed them this generation. This lets temporary events recover. Predation and competition **don't** drift, so permanent events stay at their new level.
- `clampEnvironment(env)` applies the bounds from §3. `diffEnvironment(a, b): EnvChange[]` feeds the event card and the island changes table.

**Ownership rule (report §3.3):**
- Events change only primary variables, one-time hits to resources/cover, and capacity.
- `regenerate` handles the knock-on effects.
- `Fitness` handles the effects on birds.
- **Events never touch fitness.**

### 5.2 MVP events (`src/events/eventDefinitions.ts`, report §5)

| Event | Category | Stages (gens) | Effects (index pts) | Persistence |
|---|---|---|---|---|
| Drought | climate | warning 3–7 → growing 4–8 → peak 5–12 → recovery 5–15 | warning: rain −2..4/gen, softPlants −0..2; growing: rain −2..5, softPlants −2..4, smallSeeds −0..2, cover −0..2; peak: softPlants −0..2; recovery: rain +2..5, softPlants +1..3 | temporary; 30% chance `cap.softPlants → 0.85` |
| Harsh Winter | climate | warning 2–5 → growing 3–7 → peak 4–10 → recovery 3–8 | temp −2..4 → temp −2..5, insects −1..3, softPlants −0..2 → hold → temp +2..5 | temporary |
| Hurricane | disturbance | warning 1–3 → impact 1 → aftermath 5–12 → recovery 10–25 | rain +5..12/gen; impact (once): cover −15..35, softPlants −10..25, random mortality 10–40% recorded as `disaster`; recovery: cover +1..3/gen | 40% chance `cap.cover → 0.9` |
| New Predator | biological | warning 3–6 → establishing 5–10 → established ∞ | predation +1..3/gen, then ±1 jitter | permanent |
| New Competitor (small-seed finch) | biological | warning 3–6 → establishing 5–10 → established ∞ | sets `competitorDiet = 'smallSeeds'`; competition +1..3 → +2..4/gen, then holds | permanent |

The stage `message`s use the report's player-facing warnings, e.g. "Rainfall is decreasing, and some plants are beginning to disappear." Drought and Hurricane have `conflictsWith` set against each other.

Heat, Flood and Habitat Shift (report §6) can be added later **as data only**; that's the test of Modifiability.

`MOCKUP_SCRIPT = [{ gen: 6, eventId: 'drought' }, { gen: 24, eventId: 'newPredator' }]`. This replays the sprint plan's Gen 6/13/24 story: the drought starts at 6 and reaches its peak around 13.

### 5.3 Scheduling (`src/events/EventFactory.ts`)
`interface EventScheduler { maybeStart(gen, active: ActiveEvent[], rng): EventDef | null }` (module view: `eventFactory.generateEvent(prevEvent)`)

- **`RandomScheduler`** (normal play):
  - Generations 1–4 are protected, with no new events.
  - `p = min(0.5, 0.05 + 0.04·gensSinceLastStart)`.
  - If the roll succeeds, `weightedPick` chooses among the eligible events.
  - Eligibility rules:
    - At most 1 active climate event, 1 active disturbance and 1 *establishing* biological event.
    - An event that's already established can't start again.
    - `conflictsWith` is respected.
    - No new starts at `gen % 10 ∈ {8, 9}`, so the player's first look at an event falls in its warning stage (§4.4 pacing).
- **`ScriptedScheduler(script)`:** starts exactly the listed events at the listed generations. Used for tests and demos.

### 5.4 Event manager (`src/events/EventManager.ts`)
`advanceEvents(env, active, gen, scheduler, rng) → { env, active, log: EventLogEntry[], mortality: number }`

1. Ask the scheduler whether a new event starts. If so: `severity = rng.triangular(0.8, 1.2)`, stage 0, log `started`.
2. For each active event, apply the current stage's effects:
   - `perGen` effects add `triangular(range)·severity`.
   - `once` effects apply only on the stage's first generation.
   - `randomMortality` adds to the returned `mortality` fraction.
3. Increase `genInStage`, then transition:
   - forced when `genInStage ≥ maxDuration`;
   - otherwise, once `genInStage ≥ minDuration`, with probability `transitionChance`.
   - Log `stageChanged`.
4. When a temporary event finishes its last stage, roll for `lastingEffect` and log `resolved`. A permanent event stays `established` with no further growth, which gives it a new equilibrium.

---

## 6. Coordinator (`src/game/GameController.ts`, report §2.3 and §8.1)

Nobody else builds this in Sprint 1, so we write a minimal version with a stable API. US1 (navigation), US5 (gen 10/20/30 choice) and US6 (game over) attach to it.

```ts
startRun(species: { name: string; traits: Traits }, seed: number, scheduler?: EventScheduler): GameState
step(): StepOutcome          // exactly one generation
advance(n: number): StepOutcome[]   // "Skip 5": stops early at the first pause
```

**`step()` order (report §8.1):**
1. `gen += 1`
2. `advanceEvents`
3. `regenerate` + `clampEnvironment`
4. Disaster mortality: remove random birds, counted as `disaster`
5. `runGeneration`
6. Push to history
7. Work out the pauses

**`StepOutcome = { result, events: EventLogEntry[], pauses: Pause[] }`**, where `Pause` is one of:
- `{kind:'event', entry}`: a start or a stage change. This shows the event card.
- `{kind:'milestone', gen}`: when `gen % 10 === 0`. The US5 hook.
- `{kind:'lowPopulation'}`
- `{kind:'extinct'}`: the US6 hook.

**`GameState`:** `{ seed, rngState, generation, species, population, environment, activeEvents, history: { generations: GenerationResult[], environments: EnvironmentState[], events: EventLogEntry[] } }`. Everything in it is plain serializable data, so the Save Manager can save and restore it.

**Helpers for other stories:**
- `envChangePercent(fromGen, toGen)`: US5's "Food Available / Predators" pages.
- `eventHistory()`: US5 "Previous Events" and US6 "What happened?".
- `generationHistory()`: US6's trait history graph.

---

## 7. Screens

Both screens follow the existing `View`/`Controller` split and the mockup's text style: numbered menus, "What is your choice? __", and a red error line for invalid input.

- **Input parsing** is a pure function in each Controller (`parseChoice(text) → action | error`) so it can be tested without the DOM.
- **`src/screens/format.ts`:**
  - Index → label: `<60 Scarce`, `60–85 Low`, `85–115 Normal`, `>115 High`. Predation is labeled Low / Moderate / High.
  - 14-cell `█░` bars.
- **GameScreen = generation screen (p.15–17):**
  - "Generation N" and the island line (Rainfall, Soft plants, Hard seeds, Predators).
  - A Population / Born / Died / Change table.
  - "Died from:" with the non-zero causes (Starvation, Cold/Heat, Hawks, Storm).
  - A bar for each trait option.
  - The low-population warning (p.16).
  - Menu: `1. Next generation  2. Skip 5 generations  3. Quit`, with the error "Invalid. Type 1, 2 or 3".
- **EventScreen (p.41–44):**
  - Card: event title and stage message, "Generation N   Your flock: X birds", and the before→after line for the changed variables.
  - Menu: `1. View island changes  2. Continue`, with the error "Invalid. Type 1 or 2."
  - Island changes view (p.42): a Before/After table, then "Press Enter to return to the event."
- **Quit** goes to US1's quit confirmation once that exists. Until then it returns to the menu.
- **Dev harness:** until US1/US2 are merged, `main.ts` starts a run with a default species and a seed taken from `?seed=`. `?script=mockup` switches to the scripted scheduler. This keeps US3/US4 runnable on their own (AC15).

---

## 8. Setup (done)

1. Vitest installed. `npm test` runs `vitest run` on `tests/**/*.test.ts`.
2. `package.json` is now `"type": "module"`.
3. `vite.config.ts` was an empty file; it now exports a config (`vitest/config`'s `defineConfig`).
4. `tsconfig.json`: `strict`, `target ES2022`, `lib [ES2022, DOM]`, `noEmit`, `skipLibCheck`. It type-checks `src/` and `tests/`.
5. `index.html` has a `<pre id="app">` for the dev harness. `server/index.ts` is left as is.
6. The shared files (`types.ts`, `constants.ts`, `GameState.ts`, `index.html`, `package.json`, `vite.config.ts`, `tsconfig.json`) change for everyone, so call them out in the PR description.

---

## 9. Task breakdown (maps to sprint subtasks)

| # | Task | Sprint subtask | Hrs | Status |
|---|---|---|---|---|
| 0 | Setup (§8), `types.ts`, `constants.ts`, `Random.ts` | — | 2 | done |
| 1 | `traitContent.ts`, `Fitness.ts` | US3 survival formula | 4 | done |
| 2 | `Population.ts`, `SimulationEngine.ts` | US3 reproduction + inheritance + seeded randomness | 4 | done |
| 3 | `models/Environment.ts` | US4 apply effects to environment values | 2 | done |
| 4 | `eventDefinitions.ts` (5 events + script) | US4 Event model + schedule | 2 | done |
| 5 | `EventFactory.ts`, `EventManager.ts` | US4 apply effects | 2 | done |
| 6 | `GameController.ts`, `GameState.ts` | (coordinator) | 2 | done |
| 7 | GameScreen + `format.ts` + low-pop warning | US3 generation screen, low-pop warning | 4 | next |
| 8 | EventScreen (card + island changes) | US4 event card UI | 2 | next |
| 9 | Tests (§10) | US3 and US4 write tests | 5 | done for 0–6; screen parser tests come with 7–8 |
| 10 | Dev harness, balance pass, debug | US3 and US4 run tests and debug | 3 | harness + first balance pass done |

**Order:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 10, with tests written alongside each step.

---

## 10. Tests (Vitest), mapped to report §13 acceptance criteria

**`Random`**
- The same seed gives the same sequence.
- `getState`/`setState` resumes exactly.
- `triangular` stays in range and its mean is near the midpoint.

**`Fitness`** (AC8)
- Every beak has feeding 1.0 at baseline.
- Drought-like food (soft plants and small seeds low, hard seeds normal) → long beak's pStarve < short beak's.
- Cold → thick feathers have lower pExposure than thin; heat → the reverse.
- Forest + high predation → brown pPred < yellow/white, and large > small.
- Every probability is in [0, 1].

**`SimulationEngine`**
- Population is never negative (AC11).
- `start − died + born === population`.
- Each trait's `traitCounts` adds up to the population (AC10).
- The same seed and state give identical results over 50 generations (AC12).
- With mutation off, chicks only carry their parents' options (AC9).
- `extinct` is set at 0.
- The cap is never exceeded.
- **Science check (Testability QA):** in a fixed drought environment, the long-beak share goes up over 20 generations in ≥ 8 of 10 seeds. The failure message prints the start/end shares for each seed.

**`Environment`** (AC1, AC5)
- Baseline is created without the DOM.
- Values stay within bounds.
- Lower rainfall lowers soft plants.
- Hard seeds are never boosted directly.
- A competitor lowers only small seeds.
- Rainfall drifts back to baseline once no event is pushing it.

**`EventManager`**
- Each of the 5 events goes through its stages in order, with durations inside [min, max] across 100 seeds (AC2, AC3).
- `EventManager` only ever returns environment changes (AC4).
- A temporary event's rainfall/temperature returns to within 5 of baseline after it resolves (AC6).
- Predator pressure stops rising once established (AC6).
- Hurricane mortality is the same rate for every trait combination.
- A sixth test-only event defined purely as data runs without any engine changes (AC7).

**`EventFactory`**
- No starts in gens 1–4.
- Overlap and conflict rules hold.
- No starts at `gen % 10 ∈ {8,9}`.
- `ScriptedScheduler(MOCKUP_SCRIPT)` starts the drought at exactly 6 and the predator at exactly 24 (sprint US4 test).

**`GameController`**
- `advance(5)` from gen 7 stops at the gen-10 milestone (AC13, report §9.3).
- `advance` stops on an event start.
- History grows by one entry per step (AC14).
- A full run works with no DOM (AC15).
- A 250-bird `step()` takes under 50 ms (Performance QA, < 1 s).

**Screen controllers**
- `parseChoice` handles valid input, empty input, out-of-range numbers and letters, and returns the exact mockup error strings.

---

## 11. Coordinate with other pairs (doesn't block the next slice)

1. **US2:** the final trait options and the `Species` shape. We read `{ name, traits }` and they write it.
2. **US5:** what "observe chicks with a trait" does to the population. We give them the `milestone` pause, `GameState.population`, `envChangePercent` and `eventHistory`.
3. **US1:** how screens get switched (who owns the router in `main.ts`).
4. **US6:** uses the `extinct` pause, `generationHistory` and `deathsByCause` for the "main pressure" line.
5. **US10:** the `birthMultiplier` hook. **Save Manager:** `GameState` and `rngState` are serializable.

---

## 12. Definition of done

- `npm test` passes, including the science check.
- `npm run build` succeeds (static bundle, Deployability QA).
- In `npm run dev` with `?seed=42&script=mockup`:
  - the drought card appears at Gen 6, and its stage messages follow;
  - the island changes table opens and returns to the card;
  - long beaks visibly increase during the drought;
  - Skip 5 stops at Gen 10.
- Switching to the random scheduler: the same seed gives the same timeline, and different seeds give different ones.
