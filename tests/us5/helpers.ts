/** Small test helpers. */
import path from 'node:path';
import assert from 'node:assert/strict';

const root: string = process.env.US5_COMPILED_ROOT ?? '';
if (!root) throw new Error('Run node tests/us5/run-tests.cjs first.');
function game(file: string): any { return require(path.join(root, 'src', file)); }

/** Stand-in for Konva, so we can check the View without needing a real canvas. */
class Shape {
  attrs: Record<string, any>;
  children: Shape[] = [];
  listeners = new Map<string, Array<() => void>>();
  parent?: Shape;
  visible: boolean;
  destroyed = false;

  constructor(attrs: Record<string, any> = {}) {
    this.attrs = { ...attrs };
    this.children = [];
    this.listeners = new Map();
    this.visible = attrs.visible !== false;
    this.destroyed = false;
  }
  add(child: Shape) { this.children.push(child); child.parent = this; return this; }
  on(names: string, handler: () => void) {
    for (const name of names.split(' ')) {
      const list = this.listeners.get(name) || [];
      list.push(handler);
      this.listeners.set(name, list);
    }
    return this;
  }
  fire(name: string) { for (const handler of (this.listeners.get(name) || [])) handler(); }
  getLayer() { return { batchDraw() {} }; }
  getAttr(name: string) { return this.attrs[name]; }
  fill(value?: any) { if (value === undefined) return this.attrs.fill; this.attrs.fill = value; }
  show() { this.visible = true; }
  hide() { this.visible = false; }
  destroyChildren() { this.children.forEach(child => child.destroy()); this.children.length = 0; }
  destroy() { this.destroyed = true; this.destroyChildren(); }
}
class Group extends Shape {}
class Rect extends Shape {}
class Text extends Shape {}
class Line extends Shape {}
/**
 * A fake Konva image for the feather placeholders. 
 * In the real game, fromURL loads an image asynchronously. 
 * These tests only need the screen to render, so we leave the image unloaded instead of making a web request.
 */
class Image extends Shape {
  static fromURL(_url: string, _onLoad?: (image: Image) => void): void {
    /** No image load is needed for text, navigation, or layout tests. */
  }
}
const fakeKonva = { Group, Rect, Text, Line, Image };

/** Make only imports from Konva use our fake objects. The other code is real. */
function installFakeKonva() {
  const Module = require('node:module');
  const original = Module._load;
  Module._load = function (request: string, parent: any, isMain: boolean) {
    if (request === 'konva') return { __esModule: true, default: fakeKonva };
    return original.call(this, request, parent, isMain);
  };
  return () => { Module._load = original; };
}

/** Flatten Konva's nested groups so we can find text and click handlers. */
function walk(node: Shape): Shape[] { return [node, ...node.children.flatMap(walk)]; }
function labels(node: Shape): string[] { return walk(node).filter(item => item instanceof Text).map(item => item.attrs.text); }
function clickOption(node: Shape, fragment: string) {
  const group = walk(node).find(item => item instanceof Group && labels(item).some(s => s.includes(fragment)) && item.listeners.has('click'));
  assert.ok(group, `Could not find clickable option containing '${fragment}'`);
  group.fire('click');
}

function counts(population = 12): any {
  const { TRAITS, traitKeys } = game('traits.js');
  const obj: Record<string, Record<string, number>> = {};
  for (const key of traitKeys) {
    const options = TRAITS[key].options;
    obj[key] = Object.fromEntries(options.map((item: { id: string }, i: number) => [item.id, i === 1 ? population : 0]));
  }
  return obj;
}
function environment(overrides: Record<string, unknown> = {}): any {
  return {
    temperature: 0, rainfall: 0, softPlants: 0, smallSeeds: 0,
    hardSeeds: 0, insects: 0, predationPressure: 0,
    habitatCover: 0, competition: 0, habitatBackground: [182, 155, 105],
    ...overrides
  };
}
function completed(generation: number, population = 12, extras: any = {}): any {
  return {
    generation,
    results: {
      eventList: [], populationIncrease: 0, populationDecline: 0,
      newPopulation: population, ...(extras.results || {})
    },
    traitCounts: extras.traitCounts || counts(population)
  };
}
function createModel(population = 12): any {
  const { EvolutionScreenModel } = game('screens/EvolutionScreen/EvolutionScreenModel.js');
  return new EvolutionScreenModel(population, counts(population), environment());
}
function checkpoint(model: any, generation: number, population = 12, env: Record<string, unknown> = {}): any {
  model.cacheEnvironment({ generation, state: environment(env) });
  model.recordGeneration(completed(generation, population));
  return model.captureObservation(generation);
}
class Publisher<T = any> {
  listeners = new Set<(value: T) => void>();
  subscribe(listener: (value: T) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  emit(value: T) { for (const listener of Array.from(this.listeners)) listener(value); }
  get size() { return this.listeners.size; }
}
class Coordinator {
  environment = new Publisher();
  generations = new Publisher();
  generation = 0;
  paused = false;
  ended = false;
  pauseCalls = 0;
  endCalls = 0;
  submissionCalls: Array<{ choice: any; profile: any }> = [];
  observationInterval;
  submitBehavior: ((choice: any, profile: any) => Promise<any>) | null = null;
  constructor(interval = 10) { this.observationInterval = interval; }
  getGeneration() { return this.generation; }
  isCheckpoint(g: number) { return g > 0 && g % this.observationInterval === 0; }
  isPaused() { return this.paused; }
  isEnded() { return this.ended; }
  pause() { this.paused = true; this.pauseCalls++; }
  endRun() { this.paused = false; this.ended = true; this.endCalls++; }
  async submitTraitFocus(choice: any, profile: any): Promise<any> {
    this.submissionCalls.push({ choice, profile });
    const result = this.submitBehavior ? await this.submitBehavior(choice, profile) : { ok: true };
    if (result.ok) this.paused = false;
    return result;
  }
  emitEnvironment(g: number, values: Record<string, unknown> = {}) { this.environment.emit({ generation: g, state: environment(values) }); }
  emitGeneration(g: number, pop = 12) { this.generation = g; this.generations.emit(completed(g, pop)); }
}
class FakeView {
  handlers: Record<string, (...args: any[]) => any> = {};
  renders: any[] = [];
  shown = false;
  destroyed = false;
  bind(handlers: Record<string, (...args: any[]) => any>) { this.handlers = handlers; }
  render(state: any) { this.renders.push({ ...state }); }
  getGroup() { return { destroy: () => { this.destroyed = true; } }; }
  show() { this.shown = true; }
  hide() { this.shown = false; }
  last() { return this.renders.at(-1); }
}
function fakeSwitcher() {
  const screens: any[] = [];
  return { screens, switchToScreen(screen: any) { screens.push(screen); } };
}
function createController(interval = 10) {
  const { EvolutionScreenController } = game('screens/EvolutionScreen/EvolutionScreenController.js');
  const model = createModel();
  const view = new FakeView();
  const coordinator = new Coordinator(interval);
  const switcher = fakeSwitcher();
  const controller = new EvolutionScreenController(model, view, coordinator, switcher);
  return { model, view, coordinator, switcher, controller };
}
function openCheckpoint(fixture: ReturnType<typeof createController>, generation = 10, population = 12) {
  fixture.coordinator.emitEnvironment(generation);
  fixture.coordinator.emitGeneration(generation, population);
}
export {
  game, fakeKonva, installFakeKonva, walk, labels, clickOption,
  counts, environment, completed, createModel, checkpoint,
  Coordinator, Publisher, FakeView, fakeSwitcher, createController, openCheckpoint
};
