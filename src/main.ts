// Wire start screen into main and remove Hello World code
import "./styles/styles.css";
import { GameState } from "./models/GameState";
import { MenuScreenController } from "./screens/MenuScreen/MenuScreenController";
import { MenuScreenView, renderScreen } from "./screens/MenuScreen/MenuScreenView";

const output = document.getElementById("terminal-output");
const input = document.getElementById("terminal-input");
const form = document.getElementById("terminal-form");

if (output && input instanceof HTMLInputElement && form) {
  const state = new GameState();
  const controller = new MenuScreenController(state);
  const view = new MenuScreenView(output, input);

  view.show(renderScreen(state), null);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const result = controller.handleInput(input.value);
    view.show(renderScreen(state), result.error);
    if (state.screen === "end") {
      view.disableInput();
    }
  });
}