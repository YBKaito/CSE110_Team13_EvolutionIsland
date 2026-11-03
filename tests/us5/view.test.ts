import test from 'node:test';
import assert from 'node:assert/strict';
import { game, installFakeKonva, walk, labels, clickOption, createModel, checkpoint, fakeKonva } from './helpers';
installFakeKonva();
const { EvolutionScreenView } = game('screens/EvolutionScreen/EvolutionScreenView.js');

function state(model: any, page = 'choice', extras = {}) {
  return {
    model, generation: 10, interval: 10, page,
    selectedTrait: 'beakLength', selectedTarget: null, submitting: false,
    ...extras
  };
}

test('getGroup, show, and hide work without making another Konva Stage', () => {
  const view = new EvolutionScreenView();
  const group = view.getGroup();
  assert.equal(group.visible, false);
  view.show();
  assert.equal(group.visible, true);
  view.hide();
  assert.equal(group.visible, false);
});

test('choice view renders the heading, trait options, three-page links, and feather placeholders', () => {
  const view = new EvolutionScreenView();
  const model = createModel();
  checkpoint(model, 10);
  view.render(state(model));
  const rendered = labels(view.getGroup());
  assert.ok(rendered.includes('Evolution Choice'));
  assert.ok(rendered.some(s => s.includes('future offspring')));
  assert.ok(rendered.some(s => s.includes('Observation every 10 generations')));
  assert.ok(rendered.some(s => s.includes('1. Beak length')));
  assert.ok(rendered.some(s => s.includes('View current stats')));
  assert.ok(rendered.some(s => s.includes('Review previous choices')));
  assert.equal(walk(view.getGroup()).filter(n => n instanceof fakeKonva.Group && n.attrs.scaleX !== undefined).length, 1);
});

test('binding the View connects clickable options to Controller callbacks', () => {
  const view = new EvolutionScreenView();
  const model = createModel();
  checkpoint(model, 10);
  const called: any[] = [];
  view.bind({
    openPage: (p: string) => called.push(['page', p]), back: () => called.push(['back']),
    selectTrait: (key: string) => called.push(['trait', key]),
    selectTarget: (id: string) => called.push(['target', id]), submit: () => called.push(['submit'])
  });
  view.render(state(model, 'choice', { selectedTarget: 'long' }));
  clickOption(view.getGroup(), '2. Body size');
  clickOption(view.getGroup(), '> Long');
  clickOption(view.getGroup(), '5. View current stats');
  clickOption(view.getGroup(), '6. Review previous choices');
  clickOption(view.getGroup(), 'S. Confirm and continue');
  assert.deepEqual(called, [
    ['trait', 'bodySize'], ['target', 'long'], ['page', 'stats'], ['page', 'decisions'], ['submit']
  ]);
});

test('confirm button is disabled without a target and while saving', () => {
  const model = createModel();
  checkpoint(model, 10);
  const view = new EvolutionScreenView();
  let submits = 0;
  view.bind({ openPage() {}, back() {}, selectTrait() {}, selectTarget() {}, submit() { submits++; } });
  view.render(state(model));
  assert.equal(labels(view.getGroup()).includes('S. Confirm and continue'), true);
  assert.equal(walk(view.getGroup()).some(n => n instanceof fakeKonva.Group && n.listeners.has('click') && labels(n).includes('S. Confirm and continue')), false);
  view.render(state(model, 'choice', { selectedTarget: 'long', submitting: true }));
  assert.ok(labels(view.getGroup()).includes('Saving preference...'));
  assert.equal(walk(view.getGroup()).some(n => n instanceof fakeKonva.Group && n.listeners.has('click') && labels(n).includes('Saving preference...')), false);
  assert.equal(submits, 0);
});

test('chosen zero-frequency trait still displays 0% of flock', () => {
  const model = createModel();
  checkpoint(model, 10);
  const view = new EvolutionScreenView();
  view.render(state(model, 'choice', { selectedTarget: 'long' }));
  assert.ok(labels(view.getGroup()).some(s => s.includes('Selected: Long (0% of flock)')));
});

test('stats page shows population difference, trait shares, and current island values', () => {
  const model = createModel();
  checkpoint(model, 10, 9, { rainfall: 27, softPlants: 15 });
  const view = new EvolutionScreenView();
  view.render(state(model, 'stats'));
  const texts = labels(view.getGroup());
  assert.ok(texts.includes('Current Flock & Island Stats'));
  assert.ok(texts.includes('Population: 9'));
  assert.ok(texts.includes('Net change: -3'));
  assert.ok(texts.some(s => s.includes('Medium: 100%')));
  assert.ok(texts.includes('Brown: 100%   Gray: 0%   Yellow: 0%   White: 0%'));
  assert.ok(texts.includes('Rainfall: 27'));
  assert.ok(texts.some(s => s.startsWith('Habitat color: RGB(')));
  assert.ok(walk(view.getGroup()).some(n => n instanceof fakeKonva.Rect && n.attrs.fill === 'rgb(182,155,105)'));
  const bars = walk(view.getGroup()).filter(n => n instanceof fakeKonva.Rect && n.attrs.height === 14);
  assert.equal(bars.length, 24 * 4);
});

test('stats page Back option calls the callback', () => {
  const model = createModel();
  checkpoint(model, 10);
  const view = new EvolutionScreenView();
  let back = 0;
  view.bind({ openPage() {}, back() { back++; }, selectTrait() {}, selectTarget() {}, submit() {} });
  view.render(state(model, 'stats'));
  clickOption(view.getGroup(), 'Return to Evolution Choice');
  assert.equal(back, 1);
});

test('previous choices page handles an empty history and confirmed choices', () => {
  const model = createModel();
  checkpoint(model, 10);
  const view = new EvolutionScreenView();
  view.render(state(model, 'decisions'));
  assert.ok(labels(view.getGroup()).includes('No traits have been favored yet.'));
  model.recordAcceptedChoice({ generation: 10, traitKey: 'beakLength', fromValue: 'medium', targetValue: 'long' });
  view.render(state(model, 'decisions'));
  const texts = labels(view.getGroup());
  assert.ok(texts.some(s => s.includes('Gen 10: Beak length')));
  assert.ok(texts.some(s => s.includes('Beak length: Long')));
});

test('previous choices page shows at most five recent decisions', () => {
  const model = createModel();
  for (let i = 1; i <= 7; i++) {
    const generation = i * 10;
    checkpoint(model, generation);
    const from = i % 2 ? 'medium' : 'long';
    const target = i % 2 ? 'long' : 'medium';
    model.recordAcceptedChoice({ generation, traitKey: 'beakLength', fromValue: from, targetValue: target });
  }
  const view = new EvolutionScreenView();
  view.render(state(model, 'decisions', { generation: 70 }));
  const texts = labels(view.getGroup());
  assert.ok(texts.some(s => s.includes('5 most recent of 7')));
  assert.equal(texts.some(s => s.includes('Gen 10:')), false);
  assert.ok(texts.some(s => s.includes('Gen 70:')));
});

test('Model errors display in red, and rendering again does not pile up old text', () => {
  const model = createModel();
  checkpoint(model, 10);
  model.error = 'Invalid choice';
  const view = new EvolutionScreenView();
  view.render(state(model));
  const first = walk(view.getGroup()).length;
  assert.ok(walk(view.getGroup()).some(n => n instanceof fakeKonva.Text && n.attrs.text === 'Invalid choice' && n.attrs.fill === '#f04444'));
  model.error = null;
  view.render(state(model));
  assert.equal(labels(view.getGroup()).includes('Invalid choice'), false);
  assert.equal(walk(view.getGroup()).length, first - 1);
});

test('hovering an enabled option changes its background and restores it', () => {
  const model = createModel();
  checkpoint(model, 10);
  const view = new EvolutionScreenView();
  view.render(state(model));
  const row = walk(view.getGroup()).find(n => n instanceof fakeKonva.Group && n.listeners.has('mouseenter'));
  assert.ok(row);
  const bg = row.children[0];
  const before = bg.attrs.fill;
  row.fire('mouseenter');
  assert.equal(bg.attrs.fill, '#343434');
  row.fire('mouseleave');
  assert.equal(bg.attrs.fill, before);
});

test('the screen background uses the shared STAGE_WIDTH and STAGE_HEIGHT constants', () => {
  const { STAGE_WIDTH, STAGE_HEIGHT } = game('constants.js');
  const model = createModel();
  checkpoint(model, 10);
  const view = new EvolutionScreenView();
  view.render(state(model));
  const background = view.getGroup().children[0];
  assert.equal(background.attrs.width, STAGE_WIDTH);
  assert.equal(background.attrs.height, STAGE_HEIGHT);
});
