
import { beforeEach, describe, expect, it } from "vitest";
import { ScreenState } from "../src/models/GameState";
import { toStartingSpecies } from "../src/models/Species";
import { GameController } from "../src/game/GameController";
import { ScriptedScheduler } from "../src/events/EventFactory";
import { CreationScreenController } from "../src/screens/CreationScreen/CreationScreenController";
import { renderCreationScreen } from "../src/screens/CreationScreen/CreationScreenView";
import { generationViewFromState } from "../src/screens/GameScreen/GameScreenView";

describe("CreationScreenController (US2)", () => {
  let state: ScreenState;
  let controller: CreationScreenController;

  beforeEach(() => {
    state = new ScreenState();
    state.goTo("creation");
    controller = new CreationScreenController(state);
  });

  function selectSpecies(
    name: string,
    beak: string,
    body: string,
    feathers: string,
    color: string,
  ): void {
    controller.handleInput(name);
    controller.handleInput(beak);
    controller.handleInput(body);
    controller.handleInput(feathers);
    controller.handleInput(color);
  }

  describe("Species naming", () => {
    it("accepts a valid species name", () => {
      const result = controller.handleInput("Finches");

      expect(result.error).toBeNull();
      expect(state.birdName).toBe("Finches");
      expect(state.creationStep).toBe(1);
    });

    it("rejects names shorter than 2 characters", () => {
      const result = controller.handleInput("A");

      expect(result.error).not.toBeNull();
      expect(state.creationStep).toBe(0);
    });

    it("rejects names longer than 30 characters", () => {
      const result = controller.handleInput("A".repeat(31));

      expect(result.error).not.toBeNull();
      expect(state.creationStep).toBe(0);
    });

    it("trims whitespace from species names", () => {
      controller.handleInput("  Finches  ");

      expect(state.birdName).toBe("Finches");
    });
  });

  describe("Trait selection", () => {
    beforeEach(() => {
      controller.handleInput("Finches");
    });

    it("stores the selected beak length", () => {
      controller.handleInput("3");

      expect(state.selectedTraits.beakLength).toBe("long");
      expect(state.creationStep).toBe(2);
    });

    it("stores the selected body size", () => {
      controller.handleInput("1");
      controller.handleInput("2");

      expect(state.selectedTraits.bodySize).toBe("medium");
    });

    it("stores the selected feather density", () => {
      controller.handleInput("1");
      controller.handleInput("1");
      controller.handleInput("3");

      expect(state.selectedTraits.featherDensity).toBe("thick");
    });

    it("accepts all four color options", () => {
      const colors = ["brown", "gray", "yellow", "white"];

      colors.forEach((color, index) => {
        const testState = new ScreenState();
        testState.goTo("creation");
        const testController = new CreationScreenController(testState);

        testController.handleInput("Finches");
        testController.handleInput("1");
        testController.handleInput("1");
        testController.handleInput("1");

        const result = testController.handleInput(String(index + 1));

        expect(result.error).toBeNull();
        expect(testState.selectedTraits.color).toBe(color);

        expect(testController.handleInput("y").error).toBeNull();
        const created = testState.species!;
        const species = toStartingSpecies(created.name, created.traits);
        expect(species.traits).toEqual({ beak: 0, body: 0, feathers: 0, color: index });

        const game = GameController.startRun(species, 42, new ScriptedScheduler([]));
        expect(game.state.population.birds).toHaveLength(80);
        expect(generationViewFromState(game.state).traitCounts.color).toHaveLength(4);
        const resultAfterBreeding = game.step().result;
        expect(resultAfterBreeding.traitCounts.color).toHaveLength(4);
        expect(resultAfterBreeding.traitCounts.color.reduce((sum, count) => sum + count, 0))
          .toBe(resultAfterBreeding.population);
      });
    });

    it("shows all four colors and the correct input range", () => {
      controller.handleInput("1");
      controller.handleInput("1");
      controller.handleInput("1");

      expect(renderCreationScreen(state)).toEqual(expect.arrayContaining([
        "1. Brown", "2. Gray", "3. Yellow", "4. White", "Enter a number from 1 to 4.",
      ]));
      expect(controller.handleInput("5").error).toBe("Please select a valid option (1-4).");
      expect(state.creationStep).toBe(4);
    });

    it("rejects invalid trait choices without advancing", () => {
      const result = controller.handleInput("5");

      expect(result.error).not.toBeNull();
      expect(state.creationStep).toBe(1);
      expect(state.selectedTraits.beakLength).toBeUndefined();
    });

    it("rejects non-numeric trait input", () => {
      const result = controller.handleInput("long");

      expect(result.error).not.toBeNull();
      expect(state.creationStep).toBe(1);
    });
  });

  describe("Confirmation and navigation", () => {
    it("creates a Species object after confirmation", () => {
      selectSpecies("Finches", "3", "1", "3", "4");

      const result = controller.handleInput("y");

      expect(result.nextScreen).toBe("simulation");
      expect(state.screen).toBe("simulation");
      expect(state.species).not.toBeNull();

      expect(state.species?.name).toBe("Finches");
      expect(state.species?.traits).toEqual({
        beakLength: "long",
        bodySize: "small",
        featherDensity: "thick",
        color: "white",
      });
    });

    it("does not create a species before confirmation", () => {
      selectSpecies("Finches", "1", "1", "1", "1");

      expect(state.species).toBeNull();
      expect(state.screen).toBe("creation");
    });

    it("restarts creation when the player enters N", () => {
      selectSpecies("Finches", "1", "1", "1", "1");

      const result = controller.handleInput("n");

      expect(result.nextScreen).toBe("creation");
      expect(state.creationStep).toBe(0);
      expect(state.birdName).toBe("");
      expect(state.selectedTraits).toEqual({});
    });

    it("rejects invalid confirmation input", () => {
      selectSpecies("Finches", "1", "1", "1", "1");

      const result = controller.handleInput("maybe");

      expect(result.error).not.toBeNull();
      expect(state.screen).toBe("creation");
      expect(state.species).toBeNull();
    });

    it("returns to the menu when B is entered", () => {
      const result = controller.handleInput("b");

      expect(result.nextScreen).toBe("menu");
      expect(state.screen).toBe("menu");
    });
  });
});
