// Add GameState to track current screen and card
// Model: Stores where the player is 
import type { ScreenId } from "../types";

// Holds where the player is. Later stories add the species, generation, and seed here.
export class GameState {
  screen: ScreenId = "menu";
  cardIndex = 0;

  goTo(screen: ScreenId): void {
    this.screen = screen;
    if (screen === "howToPlay") {
      this.cardIndex = 0;
    }
  }
}
