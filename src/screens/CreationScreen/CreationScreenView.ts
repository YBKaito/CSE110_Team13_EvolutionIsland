
import { CREATION_STEPS, TRAIT_OPTIONS } from "../../constants";
import type { MenuState } from "../../models/GameState";
import type { SpeciesTraits } from "../../types";

export function renderCreationScreen(state: MenuState): string[] {
  const step = CREATION_STEPS[state.creationStep];

  const lines: string[] = [
    "=== CREATE YOUR BIRD ===",
    "",
  ];

  if (step === "name") {
    return [
      ...lines,
      "What would you like to name your bird species?",
      "",
      "Enter a name (2-30 characters):",
      "",
      "Type B to return to the menu.",
    ];
  }

  if (step !== "confirm") {
    const trait = step as keyof SpeciesTraits;
    const options = TRAIT_OPTIONS[trait];

    lines.push(`Species: ${state.birdName}`);
    lines.push("");
    lines.push(`Choose your ${trait}:`);
    lines.push("");

    options.forEach((option, index) => {
      lines.push(`${index + 1}. ${option.label}`);
      lines.push(`   + ${option.advantage}`);
      lines.push(`   - ${option.disadvantage}`);
      lines.push("");
    });

    lines.push("Enter 1, 2, or 3.");
    lines.push("Type B to return to the menu.");

    return lines;
  }

  // Confirmation screen.
  const traits = state.selectedTraits;

  return [
    ...lines,
    "REVIEW YOUR SPECIES",
    "",
    `Name: ${state.birdName}`,
    `Beak Length: ${traits.beakLength}`,
    `Body Size: ${traits.bodySize}`,
    `Feather Density: ${traits.featherDensity}`,
    `Color: ${traits.color}`,
    "",
    "Are you ready to begin?",
    "",
    "Y - Start Simulation",
    "N - Restart Creation",
    "B - Return to Menu",
  ];
}
