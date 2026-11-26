import type { Group } from "konva/lib/Group";


export interface View {
	getGroup(): Group;
	show(): void;
	hide(): void;
}

/**
 * Screen types for navigation
 *
 * - "menu": Main menu screen
 * - "game": Gameplay screen
 * - "evolution-choice": Evolution choice screen
 * - "result": Results screen with final score
 *   - score: Final score to display on results screen
 */
export type Screen =
  | { type: 'menu' }
  | { type: 'game' }
  | { type: 'evolution-choice' }
  | { type: 'result'; score: number };

export abstract class ScreenController {
	/** Visual screens can opt in to the shared terminal-style frame. */
	outerBorder = false;

	abstract getView(): View;

	show(): void {
		this.getView().show();
	}

	hide(): void {
		this.getView().hide();
	}
}

export interface ScreenSwitcher {
	switchToScreen(screen: Screen): void;
}
