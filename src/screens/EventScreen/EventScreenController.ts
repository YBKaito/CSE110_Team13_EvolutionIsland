// Handles input on an event card: view the island-changes table, or continue the simulation.

import type { GameState } from '../../models/GameState';
import type { EventLogEntry } from '../../types';
import { invalidChoiceMessage, parseChoice } from '../format';
import type { Screen, ScreenNavigator, ScreenSpec } from '../ui/screenSpec';
import { EVENT_CARD_CHOICES, eventCardSpec, eventCardView, islandChangesSpec, type EventCardView } from './EventScreenView';

export class EventScreenController implements Screen {
  private mode: 'card' | 'changes' = 'card';
  private error: string | undefined;
  private readonly view: EventCardView;

  constructor(
    private readonly nav: ScreenNavigator,
    state: Readonly<GameState>,
    entry: EventLogEntry,
    private readonly onContinue: () => void,
  ) {
    this.view = eventCardView(state, entry);
  }

  spec(): ScreenSpec {
    return this.mode === 'changes' ? islandChangesSpec(this.view) : eventCardSpec(this.view, this.error);
  }

  submit(input: string): void {
    if (this.mode === 'changes') {
      this.mode = 'card';
      this.nav.refresh();
      return;
    }
    const choice = parseChoice(input, EVENT_CARD_CHOICES);
    if (choice === 2) return this.onContinue();
    if (choice === 1) {
      this.mode = 'changes';
      this.error = undefined;
    } else {
      this.error = invalidChoiceMessage(EVENT_CARD_CHOICES);
    }
    this.nav.refresh();
  }
}
