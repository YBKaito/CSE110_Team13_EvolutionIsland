
import { CREATION_STEPS, TRAIT_OPTIONS } from "../../constants";
import type { ScreenState } from "../../models/GameState";
import type { SpeciesTraits } from "../../types";
import { TRAITS } from "../../traits";

export function renderCreationScreen(state: ScreenState): string[] {
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
    lines.push(`Choose your ${TRAITS[trait].creationLabel}:`);
    lines.push("");

    options.forEach((option, index) => {
      lines.push(`${index + 1}. ${option.label}`);
      lines.push(`   + ${option.advantage}`);
      lines.push(`   - ${option.disadvantage}`);
      lines.push("");
    });

    lines.push(`Enter a number from 1 to ${options.length}.`);
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
    `${TRAITS.beakLength.creationLabel}: ${traits.beakLength}`,
    `${TRAITS.bodySize.creationLabel}: ${traits.bodySize}`,
    `${TRAITS.featherDensity.creationLabel}: ${traits.featherDensity}`,
    `${TRAITS.color.creationLabel}: ${traits.color}`,
    "",
    "Are you ready to begin?",
    "",
    "Y - Start Simulation",
    "N - Restart Creation",
    "B - Return to Menu",
  ];
}
