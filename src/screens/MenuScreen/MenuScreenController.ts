// Add menu controller with input checks and navigation
// Controller: Decides what happens when the player types
import { CARD_ERROR, DIFFICULTY_ERROR, HOW_TO_PLAY_CARDS, MENU_ERROR, MINIGAME_ERROR } from "../../constants";
import type { ScreenState } from "../../models/GameState";
import type { InputResult, MinigameDifficulty } from "../../types";

// Pure logic, no DOM. This keeps every rule testable.
export class MenuScreenController {
  constructor(private state: ScreenState) {}

  // Main menu: the player types 1 to 4.
  handleMenuInput(raw: string): InputResult {
    const choice = raw.trim();
    const routes: Record<string, InputResult["nextScreen"]> = {
      "1": "creation",
      "2": "howToPlay",
      "3": "minigames",
      "4": "end",
    };

    if (!Object.hasOwn(routes, choice)) {
        return { nextScreen: 'menu', error: MENU_ERROR };
    }
    const next = routes[choice];

    this.state.goTo(next);
    return { nextScreen: next, error: null };
  }

  // How to Play: Enter shows the next card, B returns to the menu.
  handleCardInput(raw: string): InputResult {
    const choice = raw.trim().toUpperCase();

    if (choice === "B") {
      this.state.goTo("menu");
      return { nextScreen: "menu", error: null };
    }
    if (choice !== "") {
      return { nextScreen: "howToPlay", error: CARD_ERROR };
    }

    const lastCard = HOW_TO_PLAY_CARDS.length - 1;
    if (this.state.cardIndex >= lastCard) {
      this.state.goTo("menu");
      return { nextScreen: "menu", error: null };
    }
    this.state.cardIndex += 1;
    return { nextScreen: "howToPlay", error: null };
  }

  // US10 minigames list: 1 picks Hatching Rhythm, B returns to the menu.
  handleMinigameInput(raw: string): InputResult {
    const choice = raw.trim().toUpperCase();
    if (choice === "B") {
      this.state.goTo("menu");
      return { nextScreen: "menu", error: null };
    }
    if (choice === "1") {
      this.state.goTo("minigameDifficulty");
      return { nextScreen: "minigameDifficulty", error: null };
    }
    return { nextScreen: "minigames", error: MINIGAME_ERROR };
  }

  // US10 difficulty picker: 1 = easy, 2 = hard, B returns to the minigames list.
  handleDifficultyInput(raw: string): InputResult {
    const choice = raw.trim().toUpperCase();
    if (choice === "B") {
      this.state.goTo("minigames");
      return { nextScreen: "minigames", error: null };
    }
    const difficulties: Record<string, MinigameDifficulty> = { "1": "easy", "2": "hard" };
    if (!Object.hasOwn(difficulties, choice)) {
      return { nextScreen: "minigameDifficulty", error: DIFFICULTY_ERROR };
    }
    this.state.minigameDifficulty = difficulties[choice];
    this.state.goTo("hatchingRhythm");
    return { nextScreen: "hatchingRhythm", error: null };
  }

  // Placeholder screens: any input returns to the menu.
  handlePlaceholderInput(): InputResult {
    this.state.goTo("menu");
    return { nextScreen: "menu", error: null };
  }

  handleInput(raw: string): InputResult {
    switch (this.state.screen) {
      case "menu":
        return this.handleMenuInput(raw);
      case "howToPlay":
        return this.handleCardInput(raw);
      case "minigames":
        return this.handleMinigameInput(raw);
      case "minigameDifficulty":
        return this.handleDifficultyInput(raw);
      case "creation":
      case "simulation":
      case "hatchingRhythm":
        return this.handlePlaceholderInput();
      case "end":
        return { nextScreen: "end", error: null };
    }
  }
}
