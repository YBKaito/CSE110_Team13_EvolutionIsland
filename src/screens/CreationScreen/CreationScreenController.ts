import { CREATION_STEPS, TRAIT_OPTIONS } from "../../constants";
import type { ScreenState } from "../../models/GameState";
import { Species } from "../../models/Species";
import type { InputResult, SpeciesTraits } from "../../types";

type TraitKey = keyof SpeciesTraits;

export class CreationScreenController {
  constructor(private state: ScreenState) {}

  handleInput(raw: string): InputResult {
    const input = raw.trim();

    // Allow returning to the menu.
    if (input.toLowerCase() === "b") {
      this.state.goTo("menu");
      return { nextScreen: "menu", error: null };
    }

    const step = CREATION_STEPS[this.state.creationStep];

    // Step 1: Name the species.
    if (step === "name") {
      if (input.length < 2 || input.length > 30) {
        return {
          nextScreen: "creation",
          error: "Name must be between 2 and 30 characters.",
        };
      }

      this.state.birdName = input;
      this.state.creationStep++;
      return { nextScreen: "creation", error: null };
    }

    // Steps 2-5: Select traits.
    if (step !== "confirm") {
      const trait = step as TraitKey;
      const options = TRAIT_OPTIONS[trait];

      const choice = Number(input);

      if (
        !Number.isInteger(choice) ||
        choice < 1 ||
        choice > options.length
      ) {
        return {
          nextScreen: "creation",
          error: "Please select a valid option (1-3).",
        };
      }

      const selected = options[choice - 1];

      // Each trait is assigned its corresponding option.
      this.state.selectedTraits = {
        ...this.state.selectedTraits,
        [trait]: selected.value,
      };

      this.state.creationStep++;
      return { nextScreen: "creation", error: null };
    }

    // Final step: Confirm the species.
    if (input.toLowerCase() !== "y") {
      if (input.toLowerCase() === "n") {
        this.state.resetCreation();
        return { nextScreen: "creation", error: null };
      }

      return {
        nextScreen: "creation",
        error: "Enter Y to confirm or N to restart.",
      };
    }

    const traits = this.state.selectedTraits;

    if (
      !this.state.birdName ||
      !traits.beakLength ||
      !traits.bodySize ||
      !traits.featherDensity ||
      !traits.color
    ) {
      return {
        nextScreen: "creation",
        error: "Please complete all four traits.",
      };
    }

    this.state.species = new Species(this.state.birdName, {
      beakLength: traits.beakLength,
      bodySize: traits.bodySize,
      featherDensity: traits.featherDensity,
      color: traits.color,
    });

    this.state.goTo("simulation");

    return { nextScreen: "simulation", error: null };
  }
}
