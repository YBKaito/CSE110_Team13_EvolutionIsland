import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Konva from 'konva';
import { ScreenController, type View } from '../src/screens/ScreenController';
import { ScreenHost } from '../src/screens/ui/ScreenHost';
import type { Screen } from '../src/screens/ui/screenSpec';

// Test the screen manager without opening a canvas.
vi.mock('konva', () => {
  class Node {
    children: Node[] = [];
    parent: Node | null = null;
    visible = true;
    constructor(readonly attrs: Record<string, unknown> = {}) {}
    add(...children: Node[]) {
      children.forEach(child => { child.remove(); child.parent = this; this.children.push(child); });
    }
    remove() {
      if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this);
      this.parent = null;
    }
    getParent() { return this.parent; }
    destroyChildren() { this.children.forEach(child => { child.parent = null; }); this.children = []; }
    show() { this.visible = true; }
    hide() { this.visible = false; }
    width(_value: number) {}
    height(_value: number) {}
    scale(_value: { x: number; y: number }) {}
    batchDraw() {}
  }
  return { default: { Stage: class extends Node {}, Layer: class extends Node {},
    Group: class extends Node {}, Rect: class extends Node {} } };
});

vi.mock('../src/screens/ui/TerminalRenderer', () => ({
  TerminalRenderer: class {
    render() {}
    toggleCursor() {}
  },
}));

class VisualScreen extends ScreenController {
  readonly group = new Konva.Group();
  shown = 0;
  hidden = 0;
  readonly view: View = {
    getGroup: () => this.group,
    show: () => { this.shown++; this.group.show(); },
    hide: () => { this.hidden++; this.group.hide(); },
  };
  getView(): View { return this.view; }
}

const keyboard = new Map<string, (event: any) => void>();
const container = { clientWidth: 1280, clientHeight: 800, hidden: false };

beforeEach(() => {
  keyboard.clear();
  container.hidden = false;
  vi.stubGlobal('window', {
    innerWidth: 1280, innerHeight: 800,
    addEventListener: (event: string, callback: (event: any) => void) => keyboard.set(event, callback),
    setInterval: vi.fn(),
  });
});
afterEach(() => vi.unstubAllGlobals());

function press(key: string) {
  keyboard.get('keydown')!({ key, metaKey: false, ctrlKey: false, altKey: false,
    preventDefault: vi.fn() });
}

function terminal(): Screen {
  return { spec: () => ({ blocks: [], prompt: { mode: 'choice', label: 'Choice: ' } }),
    submit: vi.fn() };
}

describe('shared screen host', () => {
  it('switches between terminal-style screens and a visual controller', () => {
    const host = new ScreenHost(container as HTMLDivElement);
    const game = terminal();
    const evolution = new VisualScreen();
    host.show(game);
    press('1');
    press('Enter');
    expect(game.submit).toHaveBeenCalledWith('1');

    host.show(evolution);
    expect(evolution.shown).toBe(1);
    expect(evolution.group.getParent()).toBeTruthy();
    press('2');
    press('Enter');
    expect(game.submit).toHaveBeenCalledTimes(1);

    host.show(game);
    expect(evolution.hidden).toBe(1);
    expect(evolution.group.getParent()).toBeNull();
    press('3');
    press('Enter');
    expect(game.submit).toHaveBeenLastCalledWith('3');
  });

  it('reuses the same visual controller when it opens at another checkpoint', () => {
    const host = new ScreenHost(container as HTMLDivElement);
    const game = terminal();
    const evolution = new VisualScreen();
    host.show(evolution);
    host.show(game);
    host.show(evolution);
    expect(evolution.shown).toBe(2);
    expect(evolution.hidden).toBe(1);
    expect(evolution.group.getParent()).toBeTruthy();
  });

  it('ignores game input while its container is hidden', () => {
    const host = new ScreenHost(container as HTMLDivElement);
    const game = terminal();
    host.show(game);
    container.hidden = true;
    press('1');
    press('Enter');
    expect(game.submit).not.toHaveBeenCalled();
  });
});
