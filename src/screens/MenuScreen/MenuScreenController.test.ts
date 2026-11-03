// Testing the menu controller with input checks and navigation
import { beforeEach, describe, expect, it } from "vitest";
import { CARD_ERROR, HOW_TO_PLAY_CARDS, MENU_ERROR } from "../../constants";
import { GameState } from "../../models/GameState";
import { MenuScreenController } from "./MenuScreenController";
import { renderScreen } from "./MenuScreenView";

let state: GameState;
let controller: MenuScreenController;

beforeEach(() => {
  state = new GameState();
  controller = new MenuScreenController(state);
});

describe("main menu", () => {
  it("shows all 4 numbered options", () => {
    const text = renderScreen(state).join("\n");
    expect(text).toContain("1. Start the game");
    expect(text).toContain("2. Learn about the mechanics");
    expect(text).toContain("3. Play the minigames");
    expect(text).toContain("4. End");
  });

  it.each([
    ["1", "creation"],
    ["2", "howToPlay"],
    ["3", "minigames"],
    ["4", "end"],
  ])("typing %s opens %s", (input, screen) => {
    const result = controller.handleInput(input);
    expect(result.error).toBeNull();
    expect(state.screen).toBe(screen);
  });

  it("ignores spaces around the number", () => {
    controller.handleInput("  2 ");
    expect(state.screen).toBe("howToPlay");
  });

  it.each(["", "5", "0", "abc", "1.5", "-1"])(
    "rejects %j and stays on the menu",
    (input) => {
      const result = controller.handleInput(input);
      expect(result.error).toBe(MENU_ERROR);
      expect(state.screen).toBe("menu");
    },
  );
});

describe("How to Play", () => {
  beforeEach(() => controller.handleInput("2"));

  it("starts on card 1", () => {
    expect(state.cardIndex).toBe(0);
    expect(renderScreen(state).join("\n")).toContain("YOUR GOAL");
  });

  it("Enter walks through all 3 cards, then returns to the menu", () => {
    controller.handleInput("");
    expect(renderScreen(state).join("\n")).toContain("HOW A ROUND WORKS");
    controller.handleInput("");
    expect(renderScreen(state).join("\n")).toContain("YOUR CHOICES");
    controller.handleInput("");
    expect(state.screen).toBe("menu");
  });

  it("B returns to the menu from any card", () => {
    controller.handleInput("");
    controller.handleInput("b");
    expect(state.screen).toBe("menu");
  });

  it("rejects other input and stays on the same card", () => {
    const result = controller.handleInput("x");
    expect(result.error).toBe(CARD_ERROR);
    expect(state.cardIndex).toBe(0);
  });

  it("reopening resets to card 1", () => {
    controller.handleInput("");
    controller.handleInput("b");
    controller.handleInput("2");
    expect(state.cardIndex).toBe(0);
  });

  it("has exactly 3 cards", () => {
    expect(HOW_TO_PLAY_CARDS).toHaveLength(3);
  });
});

describe("placeholder screens", () => {
  it.each(["1", "3"])("option %s returns to the menu on Enter", (input) => {
    controller.handleInput(input);
    controller.handleInput("");
    expect(state.screen).toBe("menu");
  });
});
