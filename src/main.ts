
import "@fontsource/pixelify-sans/400.css";
import "@fontsource/pixelify-sans/700.css";
import "@fontsource/silkscreen/400.css";
import "./styles/styles.css";

import { GameState } from "./models/GameState";

import { MenuScreenController } from "./screens/MenuScreen/MenuScreenController";
import {
  MenuScreenView,
  renderScreen,
} from "./screens/MenuScreen/MenuScreenView";

import { CreationScreenController } from "./screens/CreationScreen/CreationScreenController";
import { renderCreationScreen } from "./screens/CreationScreen/CreationScreenView";

const output = document.getElementById("terminal-output");
const input = document.getElementById("terminal-input");
const form = document.getElementById("terminal-form");

if (output && input instanceof HTMLInputElement && form) {
  // Shared game state for all screens
  const state = new GameState();

  // Controllers
  const menuController = new MenuScreenController(state);
  const creationController = new CreationScreenController(state);

  // Reuse the existing terminal view
  const view = new MenuScreenView(output, input);

  // Display the appropriate screen
  function renderCurrentScreen(error: string | null = null): void {
    switch (state.screen) {
      case "creation":
        view.show(renderCreationScreen(state), error);
        break;

      case "simulation":
        view.show(
          [
            "=== EVOLUTION ISLAND ===",
            "",
            "Your species has been created!",
            "",
            `Species: ${state.species?.name ?? "Unknown"}`,
            `Beak Length: ${state.species?.traits.beakLength ?? ""}`,
            `Body Size: ${state.species?.traits.bodySize ?? ""}`,
            `Feather Density: ${state.species?.traits.featherDensity ?? ""}`,
            `Color: ${state.species?.traits.color ?? ""}`,
            "",
            "Simulation coming soon!",
          ],
          error,
        );
        break;

      default:
        view.show(renderScreen(state), error);
        break;
    }

    // Disable input when the game ends or reaches
    // the simulation placeholder
    if (state.screen === "end" || state.screen === "simulation") {
      view.disableInput();
    }
  }

  // Initial menu
  renderCurrentScreen();

  // Handle terminal input
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const raw = input.value;
    let error: string | null = null;

    if (state.screen === "creation") {
      // US2: Species creation
      const result = creationController.handleInput(raw);
      error = result.error;
    } else if (state.screen === "simulation") {
      // US6: Simulation will be implemented later
      return;
    } else {
      // US1: Main menu and instructions
      const result = menuController.handleInput(raw);
      error = result.error;

      // Initialize creation when entering from menu
      if (result.nextScreen === "creation") {
        state.resetCreation();
      }
    }

    // Update the terminal
    renderCurrentScreen(error);
  });
}
