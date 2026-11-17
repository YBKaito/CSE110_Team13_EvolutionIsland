// US10 Hatching Rhythm: which egg sprite to show.
// Whole egg until the first good hit, cracked egg while hatching, chick once the song ends with good timing.

import { accuracy, type Tally } from './timingJudge';

export type EggStage = 'egg' | 'cracked' | 'hatched';

export const EGG_SPRITES: Record<EggStage, string> = {
  egg: 'graphics/egg.png',
  cracked: 'graphics/egg_cracked.png',
  hatched: 'graphics/chick_hatched.png',
};

/** Accuracy needed at the end of the song for the chick to hatch. */
export const HATCH_THRESHOLD = 0.5;

export function eggStage(tally: Tally, finished: boolean): EggStage {
  if (finished && accuracy(tally) >= HATCH_THRESHOLD) return 'hatched';
  if (tally.perfect + tally.good > 0) return 'cracked';
  return 'egg';
}
