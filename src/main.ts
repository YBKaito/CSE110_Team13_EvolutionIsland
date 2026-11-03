// Wire start screen into main and remove Hello World code
import "./styles/styles.css";
import { GameState } from "./models/GameState";
import { MenuScreenController } from "./screens/MenuScreen/MenuScreenController";
import { MenuScreenView, renderScreen } from "./screens/MenuScreen/MenuScreenView";

import "@fontsource/pixelify-sans/400.css";
import "@fontsource/pixelify-sans/700.css";
import "@fontsource/silkscreen/400.css";
import "./styles/styles.css";

const output = document.getElementById("terminal-output");
const input = document.getElementById("terminal-input");
const form = document.getElementById("terminal-form");

if (output && input instanceof HTMLInputElement && form) {
  // Create the new model, controller, and view. 
  const state = new GameState();
  const controller = new MenuScreenController(state);
  const view = new MenuScreenView(output, input);

  // Creates the menu on page load
  view.show(renderScreen(state), null);

  form.addEventListener("submit", (e) => {
    // stops the browser from reloading the page, the default for form submits
    e.preventDefault();
    // processes the input and updates the state
    const result = controller.handleInput(input.value);
    // redraws the screen with any error
    view.show(renderScreen(state), result.error);
    // locks the game after End
    if (state.screen === "end") {
      view.disableInput();
    }
  });
}