
// Add menu controller with input checks and navigation
// Controller: Decides what happens when the player types
import { CARD_ERROR, HOW_TO_PLAY_CARDS, MENU_ERROR } from "../../constants";
import type { MenuState } from "../../models/GameState";
import type { InputResult } from "../../types";

// Pure logic, no DOM. This keeps every rule testable.
export class MenuScreenController {
  constructor(private state: MenuState) {}

  // Main menu: the player types 1 to 4.
  handleMenuInput(raw: string): InputResult {
    const choice = raw.trim();
    const routes: Record<string, InputResult["nextScreen"]> = {
      "1": "creation",
      "2": "howToPlay",
      "3": "minigames",
      "4": "end",
    };

    const next = routes[choice];
    if (next === undefined) {
      return { nextScreen: "menu", error: MENU_ERROR };
    }
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
      case "creation":
      case "minigames":
        return this.handlePlaceholderInput();
      case "simulation":
        return { nextScreen: "simulation", error: null };
      case "end":
        return { nextScreen: "end", error: null };
    }
  }
}
