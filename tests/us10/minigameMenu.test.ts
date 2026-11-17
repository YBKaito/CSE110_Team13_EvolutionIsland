// US10: main menu option 3 -> minigames list -> Hatching Rhythm -> easy or hard.
import { beforeEach, describe, expect, it } from 'vitest';
import { DIFFICULTY_ERROR, MINIGAME_ERROR } from '../../src/constants';
import { ScreenState } from '../../src/models/GameState';
import { MenuScreenController } from '../../src/screens/MenuScreen/MenuScreenController';
import { renderScreen } from '../../src/screens/MenuScreen/MenuScreenView';

let state: ScreenState;
let controller: MenuScreenController;

beforeEach(() => {
  state = new ScreenState();
  controller = new MenuScreenController(state);
});

describe('minigames menu', () => {
  it('option 3 opens the minigames list with Hatching Rhythm first', () => {
    controller.handleInput('3');
    expect(state.screen).toBe('minigames');
    expect(renderScreen(state)).toContain('  1. Hatching Rhythm');
  });

  it('1 opens the difficulty picker', () => {
    state.goTo('minigames');
    const result = controller.handleInput('1');
    expect(result).toEqual({ nextScreen: 'minigameDifficulty', error: null });
    const text = renderScreen(state).join('\n');
    expect(text).toContain('1. Easy');
    expect(text).toContain('2. Hard');
  });

  it('B goes back to the main menu', () => {
    state.goTo('minigames');
    controller.handleInput('b');
    expect(state.screen).toBe('menu');
  });

  it('anything else shows an error and stays put', () => {
    state.goTo('minigames');
    expect(controller.handleInput('7')).toEqual({ nextScreen: 'minigames', error: MINIGAME_ERROR });
    expect(state.screen).toBe('minigames');
  });
});

describe('difficulty picker', () => {
  beforeEach(() => state.goTo('minigameDifficulty'));

  it.each([
    ['1', 'easy'],
    ['2', 'hard'],
    [' 2 ', 'hard'],
  ] as const)('typing "%s" starts the game on %s', (input, difficulty) => {
    const result = controller.handleInput(input);
    expect(result).toEqual({ nextScreen: 'hatchingRhythm', error: null });
    expect(state.minigameDifficulty).toBe(difficulty);
  });

  it('B goes back to the minigames list', () => {
    controller.handleInput('B');
    expect(state.screen).toBe('minigames');
  });

  it('anything else shows an error and stays put', () => {
    expect(controller.handleInput('3')).toEqual({ nextScreen: 'minigameDifficulty', error: DIFFICULTY_ERROR });
    expect(state.screen).toBe('minigameDifficulty');
  });
});
