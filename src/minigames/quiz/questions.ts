import type { QuizQuestion } from './quizTypes';

/** Initial authored order; question count is a content choice, not an engine limit. */
export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 'MUT-01',
    topic: 'mutation',
    prompt: 'A change in the DNA of an egg cell creates a new inherited feather-color variant in a chick. Which mechanism introduced this new variant?',
    options: [
      { id: 'a', text: 'Mutation' },
      { id: 'b', text: 'Natural Selection' },
      { id: 'c', text: 'Migration (gene flow)' },
      { id: 'd', text: 'Genetic Drift' },
    ],
    correctOptionId: 'a',
    explanation: 'A mutation is a change in DNA. A change in an egg cell can be inherited by the chick. The change did not appear because the bird needed a different color.',
  },
  {
    id: 'DRIFT-01',
    topic: 'drift',
    prompt: 'A flood kills most birds regardless of their inherited feather color. By chance, the surviving group carries fewer color variants than the original population. Which mechanism best explains this change?',
    options: [
      { id: 'a', text: 'Mutation' },
      { id: 'b', text: 'Natural Selection' },
      { id: 'c', text: 'Migration (gene flow)' },
      { id: 'd', text: 'Genetic Drift' },
    ],
    correctOptionId: 'd',
    explanation: 'Chance changed which inherited variants remained in the population. This is genetic drift. The sharp population drop is a bottleneck; feather color did not give birds a survival advantage here.',
  },
  {
    id: 'MIG-01',
    topic: 'migration',
    prompt: 'Birds arrive from another island and breed with local birds. Their chicks inherit a color variant that was absent from the local population. Which mechanism brought that existing variant into the population?',
    options: [
      { id: 'a', text: 'Mutation' },
      { id: 'b', text: 'Natural Selection' },
      { id: 'c', text: 'Migration (gene flow)' },
      { id: 'd', text: 'Genetic Drift' },
    ],
    correctOptionId: 'c',
    explanation: 'Breeding birds moved between populations and passed on a variant. This transfer of variants is gene flow. The variant did not need to arise as a new mutation on this island.',
  },
  {
    id: 'SELECT-01',
    topic: 'selection',
    prompt: 'Birds with an inherited brown color blend into dark tree bark. Hawks catch fewer of them, and they leave more chicks than other birds. Over generations, brown birds become more common. Which mechanism best explains this?',
    options: [
      { id: 'a', text: 'Mutation' },
      { id: 'b', text: 'Natural Selection' },
      { id: 'c', text: 'Migration (gene flow)' },
      { id: 'd', text: 'Genetic Drift' },
    ],
    correctOptionId: 'b',
    explanation: 'An inherited trait helped its carriers survive and leave more offspring in this environment. That made the trait more common over generations. This is natural selection.',
  },
];
