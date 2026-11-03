import { Publisher } from '../events/Publisher';
import { clampIndex, copyEnvironment } from '../stats';
import type { EnvironmentState, EnvironmentUpdated } from '../types';

const initialState: EnvironmentState = {
  temperature: 0, rainfall: 0, softPlants: 0, smallSeeds: 0,
  hardSeeds: 0, insects: 0, predationPressure: 0,
  habitatCover: 0, competition: 0, habitatBackground: [182, 155, 105]
};

/** Scripted/mock US4. These indices are sample UI data, NOT the final ecological model.
 * Only the agreed contract and generation-tagged publication semantics matter here.
 */
export class MockEnvironmentPublisher extends Publisher<EnvironmentUpdated> {
  private state: EnvironmentState = copyEnvironment(initialState);
  private lastGeneration = 0;

  getState(): EnvironmentState { return copyEnvironment(this.state); }

  getEventList(generation: number): string[] {
    const events: string[] = [];
    if (generation >= 6 && generation <= 23) events.push('Drought');
    if (generation >= 13) events.push('New predator');
    if (generation >= 24 && generation <= 38) events.push('Hurricane / habitat damage');
    return events;
  }

  advance(generation: number): EnvironmentState {
    if (generation !== this.lastGeneration + 1) {
      throw new Error(`US4 mock must advance sequentially (requested ${generation})`);
    }
    this.lastGeneration = generation;
    const g = generation;
    const drought = g >= 6 && g <= 23;
    const hurricane = g >= 24 && g <= 38;

    this.state = {
      temperature: clampIndex(g * 0.7 + (drought ? 12 : 0)),
      rainfall: clampIndex(drought ? Math.max(0, 12 - (g - 6) * 1.5) : Math.max(0, (g - 23) * 2.0)),
      softPlants: clampIndex(drought ? Math.max(0, 8 - (g - 6)) : Math.max(0, (g - 21) * 1.3 - (hurricane ? 12 : 0))),
      smallSeeds: clampIndex(g * 0.42 - (drought ? 6 : 0)),
      hardSeeds: clampIndex(g * 0.75),
      insects: clampIndex(g * 0.58 - (drought ? 3 : 0)),
      predationPressure: clampIndex(g >= 13 ? 10 + (g - 13) * 1.4 : 0),
      habitatCover: clampIndex(g * 0.52 - (hurricane ? 10 : 0)),
      competition: 0,
      habitatBackground: hurricane ? [148, 121, 89] : [182, 155, 105]
    };
    const state = copyEnvironment(this.state);
    Object.freeze(state.habitatBackground);
    Object.freeze(state);
    this.publish(Object.freeze({ generation, state }));
    return copyEnvironment(this.state);
  }
}
