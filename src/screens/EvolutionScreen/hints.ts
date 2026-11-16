import type { TraitKey } from '../../types';


// hints.ts
const HINTS: Record<string, Record<string, string>> = {
  beakLength: {
    short: "They're very precise, but tough foods are hard to crack.",
    medium: "A bit of everything. Never the best at one food, but rarely left with nothing to eat.",
    long: "Tough seeds won't be a problem, but tiny bites are harder to pick up.",
  },
  // Haven't completed body size
  bodySize:{
    small: "How much food is currently available?",
    medium: "How much food is currently available?",
    big: "How much food is currently available?",
  },
  featherDensity:{
    thin: "Comfortable when it’s warm, but what about the cold?",
    medium: "Great when it's not too hot, not too cold",
    thick: "More feathers helps trap heat",
  },
  color:{
    brown: "The color of tree bark",
    gray: "A very discrete color",
    yellow: "Bright colors might pose a challenge",
    white: "The color of sand",
  },
};

export const hintText = (trait: TraitKey, option: string): string =>
  HINTS[trait]?.[option] ?? 'Think about what the island is like right now.';
