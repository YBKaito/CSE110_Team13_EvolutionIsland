// Add GameState to track current screen and card
// Model: Stores where the player is 
import type { ScreenId } from "../types";
import type { SpeciesTraits } from "../types";
import { Species } from "./Species";

// Holds where the player is. Later stories add the species, generation, and seed here.
export class GameState {
  screen: ScreenId = "menu";
  cardIndex = 0;
  creationStep = 0;
  birdName = "";

  goTo(screen: ScreenId): void {
    this.screen = screen;
    if (screen === "howToPlay") {
      this.cardIndex = 0;
    }
  }

  selectedTraits: Partial<SpeciesTraits> = {};
  species: Species | null = null;

  resetCreation(): void {
    this.creationStep = 0;
    this.birdName = "";
    this.selectedTraits = {};
  }

}

