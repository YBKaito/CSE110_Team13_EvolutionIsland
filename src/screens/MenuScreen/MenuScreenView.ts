// Add menu view to render screens and error lines
// View: Shows the text on screen 
import {
    GAME_TITLE,
    HOW_TO_PLAY_CARDS,
    MENU_OPTIONS,
    PLACEHOLDER_TEXT,
  } from "../../constants";
  import type { GameState } from "../../models/GameState";
  
  // Builds the text for each screen. Returns plain strings so tests can check them.
  export function renderScreen(state: GameState): string[] {
    switch (state.screen) {
      case "menu":
        return [
          GAME_TITLE,
          "",
          "You may:",
          ...MENU_OPTIONS.map((opt, i) => `  ${i + 1}. ${opt}`),
          "",
          "What is your choice?",
        ];
      case "howToPlay": {
        const card = HOW_TO_PLAY_CARDS[state.cardIndex];
        const total = HOW_TO_PLAY_CARDS.length;
        return [
          `HOW TO PLAY (${state.cardIndex + 1} of ${total})`,
          "",
          card.title,
          ...card.lines.map((l) => `  ${l}`),
          "",
          "Press Enter to continue, or type B to go back.",
        ];
      }
      case "creation":
      case "minigames":
        return [PLACEHOLDER_TEXT[state.screen], "", "Press Enter to return to the menu."];
      case "end":
        return ["Thanks for playing!", "", "Refresh the page to play again."];
    }
  }
  
  // Draws the screen into the terminal box on the page.
  export class MenuScreenView {
    constructor(
      private output: HTMLElement,
      private input: HTMLInputElement,
    ) {}
  
    // show(lines, error)
    show(lines: string[], error: string | null): void {
      this.output.innerHTML = ""; // clears the old screen
      // The for loop creates one div per line.
      for (const line of lines) {
        const div = document.createElement("div");
        // Sets the text safely
        div.textContent = line === "" ? " " : line;
        this.output.appendChild(div);
      }
      if (error !== null) {
        // The view adds a div with class “error”. The CSS colors this class red.
        const div = document.createElement("div");
        div.className = "error";
        div.textContent = error;
        this.output.appendChild(div);
      }
      // Clears what the player typed.
      this.input.value = "";
      // Puts the cursor back in the box so the player types again with no click.
      this.input.focus();
    }
  
    // Locks the input after the player picks end 
    disableInput(): void {
      this.input.disabled = true;
    }
  }  